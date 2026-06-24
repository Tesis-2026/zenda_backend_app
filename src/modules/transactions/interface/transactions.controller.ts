import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  ApiAuthErrors,
  ApiCreated,
  ApiNoContent,
  ApiNotFoundError,
  ApiOk,
  ApiValidationError,
} from '../../../shared/swagger/api-responses.decorator';
import { AI_PROVIDER } from '../../../infra/ai/ai.module';
import { AiProvider } from '../../../infra/ai/AiProvider';
import { AnalyticsService } from '../../../infra/analytics/analytics.service';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { BudgetsFacade } from '../../budgets/application/budgets.facade';
import { SendNotificationUseCase } from '../../notifications/application/use-cases/send-notification.use-case';
import { CreateTransactionResult, CreateTransactionUseCase } from '../application/use-cases/create-transaction.use-case';
import { ListTransactionsUseCase } from '../application/use-cases/list-transactions.use-case';
import { DeleteTransactionUseCase } from '../application/use-cases/delete-transaction.use-case';
import { GetTransactionUseCase } from '../application/use-cases/get-transaction.use-case';
import { ParseVoiceTransactionUseCase } from '../application/use-cases/parse-voice-transaction.use-case';
import { UpdateTransactionUseCase } from '../application/use-cases/update-transaction.use-case';
import { TransactionWithCategory } from '../domain/ports/transaction.repository';
import { SpendingAlertService } from '../../../infra/spending-alert/spending-alert.service';
import { TransactionType } from '../domain/transaction-type.enum';
import { ClassifyTransactionDto } from './dto/classify-transaction.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionResponseDto } from './dto/transaction.response.dto';
import {
  VoiceTransactionDraftRequestDto,
  VoiceTransactionDraftResponseDto,
} from './dto/voice-transaction-draft.dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createTransaction: CreateTransactionUseCase,
    private readonly listTransactions: ListTransactionsUseCase,
    private readonly deleteTransaction: DeleteTransactionUseCase,
    private readonly getTransaction: GetTransactionUseCase,
    private readonly parseVoiceTransaction: ParseVoiceTransactionUseCase,
    private readonly updateTransaction: UpdateTransactionUseCase,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
    private readonly analytics: AnalyticsService,
    private readonly spendingAlert: SpendingAlertService,
    private readonly budgets: BudgetsFacade,
    private readonly sendNotification: SendNotificationUseCase,
  ) {}

  @Post('classify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'AI-classify a transaction description (US-0702)' })
  @ApiOk(TransactionResponseDto, 'Classification result with suggested category and confidence')
  @ApiValidationError()
  @ApiAuthErrors()
  async classify(
    @UserId() userId: string,
    @Body() dto: ClassifyTransactionDto,
  ): Promise<{ categoryName: string; confidence: number }> {
    this.analytics.track(userId, 'classify_transaction', { description: dto.description });
    return this.ai.classifyTransaction(dto.description, dto.amount);
  }

  @Post('voice-draft')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Parse recognized speech into a transaction draft' })
  @ApiOk(VoiceTransactionDraftResponseDto, 'Voice transaction draft')
  @ApiValidationError()
  @ApiAuthErrors()
  async voiceDraft(
    @UserId() userId: string,
    @Body() dto: VoiceTransactionDraftRequestDto,
  ): Promise<VoiceTransactionDraftResponseDto> {
    this.analytics.track(userId, 'voice_transaction_draft', {
      textLength: dto.text.length,
    });
    return this.parseVoiceTransaction.execute(dto);
  }

  @Post()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a transaction' })
  @ApiCreated(TransactionResponseDto, 'Transaction recorded')
  @ApiValidationError()
  @ApiAuthErrors()
  async create(
    @UserId() userId: string,
    @Body() dto: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    const result = await this.createTransaction.execute({ userId, ...dto });
    this.analytics.track(userId, 'record_transaction', {
      type: dto.type,
      amount: dto.amount,
      categoryId: dto.categoryId ?? null,
    });

    // US-016: check spending anomaly (>20% over 3-month category average)
    const anomalyAlert =
      dto.type === TransactionType.EXPENSE && result.categoryId
        ? await this.spendingAlert
            .checkAnomaly(userId, result.categoryId, result.occurredAt)
            .catch(() => null)
        : null;

    // Dispatch persistent notifications + push (US-016 ANOMALY + US-020 BUDGET).
    // Both fire-and-forget — failures must not roll back the transaction. The
    // monthly idempotency window means each alert is sent at most once per
    // (category|budget) per month, even if 100 transactions cross the threshold.
    if (dto.type === TransactionType.EXPENSE && result.categoryId) {
      const monthStart = new Date(
        result.occurredAt.getFullYear(),
        result.occurredAt.getMonth(),
        1,
      );

      if (anomalyAlert !== null) {
        const pctOver = Math.round(anomalyAlert.pctOver);
        this.sendNotification
          .execute({
            userId,
            type: 'ANOMALY_ALERT',
            title: 'Gasto inusual detectado',
            body: `Tu gasto en ${anomalyAlert.categoryName} este mes está ${pctOver}% por encima de tu promedio.`,
            data: { categoryId: result.categoryId, pctOver: String(pctOver) },
            idempotencySince: monthStart,
            idempotencyDataKey: 'categoryId',
            idempotencyDataValue: result.categoryId,
          })
          .catch(() => null);
      }

      const budgetSnapshot = await this.budgets
        .getSnapshotForCategory(userId, result.categoryId, result.occurredAt)
        .catch(() => null);
      if (budgetSnapshot && budgetSnapshot.percentageUsed >= 80) {
        const remaining = Math.max(0, budgetSnapshot.amountLimit - budgetSnapshot.currentSpent);
        const pct = Math.round(budgetSnapshot.percentageUsed);
        const categoryLabel = budgetSnapshot.categoryName ?? 'esta categoría';
        this.sendNotification
          .execute({
            userId,
            type: 'BUDGET_ALERT',
            title: 'Te acercas al límite de tu presupuesto',
            body: `Has usado el ${pct}% de tu presupuesto en ${categoryLabel}. Te quedan S/${remaining.toFixed(2)} este mes.`,
            data: {
              budgetId: budgetSnapshot.budgetId,
              categoryName: categoryLabel,
              percentageUsed: String(pct),
            },
            idempotencySince: monthStart,
            idempotencyDataKey: 'budgetId',
            idempotencyDataValue: budgetSnapshot.budgetId,
          })
          .catch(() => null);
      }
    }

    return {
      ...this.toResponse(result),
      newlyCompletedChallenges: result.newlyCompletedChallenges,
      anomalyAlert,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List transactions with optional filters' })
  @ApiOk(TransactionResponseDto, 'List of transactions matching the filters')
  @ApiAuthErrors()
  async findAll(
    @UserId() userId: string,
    @Query() query: ListTransactionsDto,
  ): Promise<TransactionResponseDto[]> {
    const results = await this.listTransactions.execute({ userId, ...query });
    return results.map((r) => this.toResponse(r));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction by id' })
  @ApiOk(TransactionResponseDto, 'Transaction details')
  @ApiNotFoundError('Transaction not found or not owned by caller')
  @ApiAuthErrors()
  async findOne(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransactionResponseDto> {
    const result = await this.getTransaction.execute(id, userId);
    return this.toResponse(result);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a transaction' })
  @ApiOk(TransactionResponseDto, 'Transaction updated')
  @ApiValidationError()
  @ApiNotFoundError('Transaction not found or not owned by caller')
  @ApiAuthErrors()
  async update(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<TransactionResponseDto> {
    const result = await this.updateTransaction.execute({ id, userId, ...dto });
    return this.toResponse(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a transaction' })
  @ApiNoContent('Transaction soft-deleted')
  @ApiNotFoundError('Transaction not found or not owned by caller')
  @ApiAuthErrors()
  async remove(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.deleteTransaction.execute(userId, id);
    this.analytics.track(userId, 'delete_transaction', { transactionId: id });
  }

  private toResponse(t: TransactionWithCategory | CreateTransactionResult): TransactionResponseDto {
    return {
      id: t.id,
      userId: t.userId,
      categoryId: t.categoryId,
      accountId: t.accountId,
      toAccountId: t.toAccountId,
      type: t.type.toLowerCase() as 'income' | 'expense' | 'transfer',
      currency: t.currency,
      amount: t.amount,
      description: t.description ?? '',
      occurredAt: t.occurredAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      category: t.category,
      account: t.account,
      toAccount: t.toAccount,
      suggestedCategoryId: t.suggestedCategoryId,
      aiConfidence: t.aiConfidence,
      categorySource: t.categorySource,
    };
  }
}
