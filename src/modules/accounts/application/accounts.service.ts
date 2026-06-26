import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Account, AccountType, CategorySource, TransactionType } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { detectAccountFromText, DetectedAccount } from '../domain/account-detection';
import { CreateAccountDto } from '../interface/dto/create-account.dto';
import { TransferAccountsDto } from '../interface/dto/transfer-accounts.dto';

interface AccountTotals {
  income: number;
  expenses: number;
  transferIn: number;
  transferOut: number;
}

export interface AccountSummary {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  debt: number;
  creditLimit: number | null;
  institution: string | null;
  isDefault: boolean;
}

export interface AccountReportItem extends AccountSummary, AccountTotals {
  netChange: number;
}

export interface AccountReport {
  totalAssets: number;
  totalCreditDebt: number;
  accounts: AccountReportItem[];
  insights: string[];
}

const DEFAULT_ACCOUNTS: Array<{
  name: string;
  type: AccountType;
  isDefault: boolean;
}> = [
  { name: 'Efectivo', type: AccountType.CASH, isDefault: true },
  { name: 'Yape / Plin', type: AccountType.DIGITAL_WALLET, isDefault: false },
  { name: 'Cuenta bancaria', type: AccountType.BANK_ACCOUNT, isDefault: false },
  { name: 'Tarjeta de credito', type: AccountType.CREDIT_CARD, isDefault: false },
];

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  detectAccountFromText(text?: string | null): DetectedAccount | null {
    return detectAccountFromText(text);
  }

  async list(userId: string): Promise<AccountSummary[]> {
    const accounts = await this.ensureDefaultAccounts(userId);
    const allTime = await this.computeTotals(
      userId,
      accounts.map((account) => account.id),
    );
    return accounts.map((account) => this.toSummary(account, allTime.get(account.id)));
  }

  async create(userId: string, dto: CreateAccountDto): Promise<AccountSummary> {
    if (dto.isDefault) {
      await this.prisma.account.updateMany({
        where: { userId, deletedAt: null },
        data: { isDefault: false },
      });
    }

    const row = await this.prisma.account.create({
      data: {
        userId,
        name: dto.name.trim(),
        type: dto.type as AccountType,
        currency: dto.currency ?? 'PEN',
        openingBalance: dto.openingBalance ?? 0,
        creditLimit: dto.creditLimit ?? null,
        institution: dto.institution?.trim() || null,
        isDefault: dto.isDefault ?? false,
      },
    });

    return this.toSummary(row, this.emptyTotals());
  }

  async resolveAccountForTransaction(params: {
    userId: string;
    accountId?: string | null;
    type: TransactionType;
    description?: string | null;
  }): Promise<AccountSummary> {
    if (params.type === TransactionType.TRANSFER) {
      throw new BadRequestException('Use the transfer endpoint for account transfers');
    }

    const accounts = await this.ensureDefaultAccounts(params.userId);
    if (params.accountId) {
      const explicit = accounts.find((account) => account.id === params.accountId);
      if (!explicit) {
        throw new BadRequestException('Account not found or not accessible');
      }
      return this.toSummary(explicit, this.emptyTotals());
    }

    const detected = detectAccountFromText(params.description);
    const preferredType = detected?.type
      ? (detected.type as AccountType)
      : params.type === TransactionType.INCOME
        ? AccountType.BANK_ACCOUNT
        : AccountType.CASH;

    const account =
      accounts.find((item) => item.type === preferredType) ??
      accounts.find((item) => item.isDefault) ??
      accounts[0];

    return this.toSummary(account, this.emptyTotals());
  }

  async transfer(userId: string, dto: TransferAccountsDto): Promise<{
    id: string;
    userId: string;
    type: 'transfer';
    amount: number;
    currency: string;
    description: string;
    occurredAt: string;
    accountId: string;
    toAccountId: string;
  }> {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('Source and destination accounts must be different');
    }

    const [from, to] = await Promise.all([
      this.findOwnedAccount(userId, dto.fromAccountId),
      this.findOwnedAccount(userId, dto.toAccountId),
    ]);

    if (from.type === AccountType.CREDIT_CARD) {
      throw new BadRequestException('Credit cards cannot be used as transfer source in this MVP');
    }

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    if (occurredAt > new Date()) {
      throw new BadRequestException('occurredAt cannot be in the future');
    }

    const row = await this.prisma.transaction.create({
      data: {
        userId,
        accountId: from.id,
        toAccountId: to.id,
        categoryId: null,
        budgetId: null,
        type: TransactionType.TRANSFER,
        amount: dto.amount,
        currency: from.currency,
        description: dto.description?.trim() || `Transferencia a ${to.name}`,
        occurredAt,
        categorySource: CategorySource.USER,
      },
    });

    return {
      id: row.id,
      userId: row.userId,
      type: 'transfer',
      amount: this.toNumber(row.amount),
      currency: row.currency,
      description: row.description,
      occurredAt: row.occurredAt.toISOString(),
      accountId: from.id,
      toAccountId: to.id,
    };
  }

  async report(userId: string, params: { month?: number; year?: number }): Promise<AccountReport> {
    const accounts = await this.ensureDefaultAccounts(userId);
    const accountIds = accounts.map((account) => account.id);
    const allTime = await this.computeTotals(userId, accountIds);
    const period = this.periodBounds(params);
    const periodTotals = await this.computeTotals(userId, accountIds, period);

    const items = accounts.map((account) => {
      const summary = this.toSummary(account, allTime.get(account.id));
      const totals = periodTotals.get(account.id) ?? this.emptyTotals();
      return {
        ...summary,
        ...totals,
        netChange:
          account.type === AccountType.CREDIT_CARD
            ? totals.expenses - totals.transferIn
            : totals.income + totals.transferIn - totals.expenses - totals.transferOut,
      };
    });

    return {
      totalAssets: this.roundMoney(
        items
          .filter((item) => item.type !== AccountType.CREDIT_CARD)
          .reduce((sum, item) => sum + item.currentBalance, 0),
      ),
      totalCreditDebt: this.roundMoney(
        items
          .filter((item) => item.type === AccountType.CREDIT_CARD)
          .reduce((sum, item) => sum + item.debt, 0),
      ),
      accounts: items,
      insights: this.buildInsights(items),
    };
  }

  private async ensureDefaultAccounts(userId: string) {
    const existing = await this.prisma.account.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    const existingTypes = new Set(existing.map((account) => account.type));
    const missing = DEFAULT_ACCOUNTS.filter((item) => !existingTypes.has(item.type));
    if (missing.length === 0) return existing;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true },
    });
    const currency = user?.currency ?? 'PEN';

    await this.prisma.account.createMany({
      data: missing.map((account) => ({
        userId,
        name: account.name,
        type: account.type,
        currency,
        isDefault: account.isDefault && !existing.some((item) => item.isDefault),
      })),
    });

    return this.prisma.account.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  private async findOwnedAccount(userId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!account) {
      throw new NotFoundException('Account not found or not accessible');
    }
    return account;
  }

  private async computeTotals(
    userId: string,
    accountIds: string[],
    period?: { from: Date; to: Date },
  ): Promise<Map<string, AccountTotals>> {
    const totals = new Map(accountIds.map((id) => [id, this.emptyTotals()]));
    if (accountIds.length === 0) return totals;

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(period
          ? {
              occurredAt: {
                gte: period.from,
                lt: period.to,
              },
            }
          : {}),
        OR: [
          { accountId: { in: accountIds } },
          { toAccountId: { in: accountIds } },
        ],
      },
      select: {
        type: true,
        amount: true,
        accountId: true,
        toAccountId: true,
      },
    });

    for (const tx of transactions) {
      const amount = this.toNumber(tx.amount);
      if (tx.type === TransactionType.INCOME && tx.accountId) {
        totals.get(tx.accountId)!.income += amount;
      }
      if (tx.type === TransactionType.EXPENSE && tx.accountId) {
        totals.get(tx.accountId)!.expenses += amount;
      }
      if (tx.type === TransactionType.TRANSFER) {
        if (tx.accountId) totals.get(tx.accountId)!.transferOut += amount;
        if (tx.toAccountId) totals.get(tx.toAccountId)!.transferIn += amount;
      }
    }

    for (const [id, value] of totals) {
      totals.set(id, {
        income: this.roundMoney(value.income),
        expenses: this.roundMoney(value.expenses),
        transferIn: this.roundMoney(value.transferIn),
        transferOut: this.roundMoney(value.transferOut),
      });
    }
    return totals;
  }

  private toSummary(account: Account, totals = this.emptyTotals()): AccountSummary {
    const openingBalance = this.toNumber(account.openingBalance);
    const creditLimit = account.creditLimit === null ? null : this.toNumber(account.creditLimit);
    const debt =
      account.type === AccountType.CREDIT_CARD
        ? Math.max(0, openingBalance + totals.expenses - totals.transferIn - totals.income)
        : 0;
    const currentBalance =
      account.type === AccountType.CREDIT_CARD
        ? -debt
        : openingBalance + totals.income + totals.transferIn - totals.expenses - totals.transferOut;

    return {
      id: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      openingBalance,
      currentBalance: this.roundMoney(currentBalance),
      debt: this.roundMoney(debt),
      creditLimit,
      institution: account.institution,
      isDefault: account.isDefault,
    };
  }

  private buildInsights(items: AccountReportItem[]): string[] {
    const insights: string[] = [];
    const topSpending = [...items]
      .filter((item) => item.expenses > 0)
      .sort((a, b) => b.expenses - a.expenses)[0];
    if (topSpending) {
      insights.push(`Gastaste mas desde ${topSpending.name}: S/${topSpending.expenses.toFixed(2)}.`);
    }

    const cash = items.find((item) => item.type === AccountType.CASH);
    if (cash && cash.netChange < 0) {
      insights.push(`Tu efectivo bajo S/${Math.abs(cash.netChange).toFixed(2)} en este periodo.`);
    }

    const creditDebt = items
      .filter((item) => item.type === AccountType.CREDIT_CARD)
      .reduce((sum, item) => sum + item.debt, 0);
    if (creditDebt > 0) {
      insights.push(`Deuda de tarjeta: S/${creditDebt.toFixed(2)}.`);
    }

    return insights;
  }

  private periodBounds(params: { month?: number; year?: number }): { from: Date; to: Date } | undefined {
    if (!params.month || !params.year) return undefined;
    if (params.month < 1 || params.month > 12) {
      throw new BadRequestException('month must be between 1 and 12');
    }
    return {
      from: new Date(Date.UTC(params.year, params.month - 1, 1)),
      to: new Date(Date.UTC(params.year, params.month, 1)),
    };
  }

  private emptyTotals(): AccountTotals {
    return { income: 0, expenses: 0, transferIn: 0, transferOut: 0 };
  }

  private toNumber(value: { toNumber(): number } | number): number {
    return typeof value === 'number' ? value : value.toNumber();
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
