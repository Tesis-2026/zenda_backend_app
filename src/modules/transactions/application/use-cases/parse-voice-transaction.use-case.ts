import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { AI_PROVIDER } from "../../../../infra/ai/ai.module";
import {
  AiProvider,
  ClassificationResult,
} from "../../../../infra/ai/AiProvider";
import { classifyTransactionByRules } from "../../../../infra/ai/transaction-category-classifier";
import { detectAccountFromText } from "../../../accounts/domain/account-detection";
import { TransactionType } from "../../domain/transaction-type.enum";

export interface ParseVoiceTransactionCommand {
  text: string;
  timezone?: string;
}

export interface VoiceTransactionDraft {
  type: TransactionType;
  amount: number | null;
  description: string;
  occurredAt: string | null;
  suggestedCategoryName: string | null;
  suggestedAccountName: string | null;
  suggestedAccountType: string | null;
  confidence: number;
  warnings: string[];
}

interface ParsedAmount {
  value: number;
  raw: string;
}

interface ParsedDate {
  iso: string;
  raw: string;
}

const DEFAULT_TIMEZONE = "America/Lima";
const MAX_DESCRIPTION_LENGTH = 255;

const NUMBER_WORDS = new Map<string, number>([
  ["un", 1],
  ["uno", 1],
  ["una", 1],
  ["dos", 2],
  ["tres", 3],
  ["cuatro", 4],
  ["cinco", 5],
  ["seis", 6],
  ["siete", 7],
  ["ocho", 8],
  ["nueve", 9],
  ["diez", 10],
  ["once", 11],
  ["doce", 12],
  ["trece", 13],
  ["catorce", 14],
  ["quince", 15],
  ["dieciseis", 16],
  ["diecisiete", 17],
  ["dieciocho", 18],
  ["diecinueve", 19],
  ["veinte", 20],
  ["treinta", 30],
  ["cuarenta", 40],
  ["cincuenta", 50],
  ["sesenta", 60],
  ["setenta", 70],
  ["ochenta", 80],
  ["noventa", 90],
  ["cien", 100],
]);

const MONTHS = new Map<string, number>([
  ["enero", 1],
  ["febrero", 2],
  ["marzo", 3],
  ["abril", 4],
  ["mayo", 5],
  ["junio", 6],
  ["julio", 7],
  ["agosto", 8],
  ["septiembre", 9],
  ["setiembre", 9],
  ["octubre", 10],
  ["noviembre", 11],
  ["diciembre", 12],
]);

@Injectable()
export class ParseVoiceTransactionUseCase {
  private readonly logger = new Logger(ParseVoiceTransactionUseCase.name);

  constructor(@Inject(AI_PROVIDER) private readonly ai: AiProvider) {}

  async execute(
    command: ParseVoiceTransactionCommand,
  ): Promise<VoiceTransactionDraft> {
    const rawText = command.text.trim();
    if (!rawText) {
      throw new BadRequestException(
        "El texto reconocido por voz es obligatorio.",
      );
    }

    const amount = this.parseAmount(rawText);
    const date = this.parseDate(rawText, command.timezone);
    const type = this.detectType(rawText);
    const description = this.cleanDescription(rawText, amount?.raw, date?.raw);
    const warnings = this.buildWarnings({ amount, description });
    const category = await this.suggestCategory(
      description || rawText,
      amount?.value ?? null,
    );
    const account = detectAccountFromText(rawText);

    return {
      type,
      amount: amount?.value ?? null,
      description,
      occurredAt: date?.iso ?? this.dateToIso(this.today(command.timezone)),
      suggestedCategoryName: category?.categoryName ?? null,
      suggestedAccountName: account?.name ?? null,
      suggestedAccountType: account?.type ?? null,
      confidence: category?.confidence ?? (amount ? 0.5 : 0.25),
      warnings,
    };
  }

  private detectType(text: string): TransactionType {
    const normalized = normalizeText(text);
    const looksLikeIncome =
      /\b(ingreso|ingrese|recibi|recibido|me pagaron|me depositaron|depositaron|cobre|sueldo|salario|freelance|honorario|propina)\b/.test(
        normalized,
      );
    const looksLikeExpense =
      /\b(gaste|gasto|pague|pago|compre|compra|consumi|consumo|salio|pasaje|recarga)\b/.test(
        normalized,
      );

    return looksLikeIncome && !looksLikeExpense
      ? TransactionType.INCOME
      : TransactionType.EXPENSE;
  }

  private parseAmount(text: string): ParsedAmount | null {
    const normalized = normalizeText(text);
    const withoutDates = this.removeDateFragments(normalized);

    const numericPatterns = [
      /\b(?:s\/|s\.|soles?|pen|lucas?)\s*(\d{1,6}(?:[.,]\d{1,2})?)\b/i,
      /\b(\d{1,6}(?:[.,]\d{1,2})?)\s*(?:soles?|pen|lucas?)\b/i,
      /\b(?:gaste|gasto|pague|pago|compre|compra|recibi|ingreso|cobre|depositaron|me pagaron)\s*(?:s\/|s\.|soles?|pen)?\s*(\d{1,6}(?:[.,]\d{1,2})?)\b/i,
    ];

    for (const pattern of numericPatterns) {
      const match = withoutDates.match(pattern);
      if (!match?.[1]) continue;
      const parsed = this.parseMoney(match[1]);
      if (parsed !== null) return { value: parsed, raw: match[0] };
    }

    const wordMatch = withoutDates.match(
      /\b(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciseis|diecisiete|dieciocho|diecinueve|veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien)\s*(?:soles?|pen|lucas?)\b/i,
    );
    if (wordMatch?.[1]) {
      const value = NUMBER_WORDS.get(normalizeText(wordMatch[1]));
      if (value !== undefined) return { value, raw: wordMatch[0] };
    }

    const fallback = withoutDates.match(/\b(\d{1,6}(?:[.,]\d{1,2})?)\b/i);
    if (fallback?.[1]) {
      const parsed = this.parseMoney(fallback[1]);
      if (parsed !== null) return { value: parsed, raw: fallback[0] };
    }

    return null;
  }

  private parseMoney(value: string): number | null {
    const normalized = value.replace(",", ".");
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.round(parsed * 100) / 100;
  }

  private parseDate(text: string, timezone?: string): ParsedDate | null {
    const normalized = normalizeText(text);
    const base = this.today(timezone);

    const relative = normalized.match(/\b(anteayer|ayer|hoy)\b/);
    if (relative?.[1]) {
      const delta =
        relative[1] === "anteayer" ? -2 : relative[1] === "ayer" ? -1 : 0;
      return {
        iso: this.dateToIso(this.addDays(base, delta)),
        raw: relative[0],
      };
    }

    const weekAgo = normalized.match(/\b(?:la\s+)?semana\s+pasada\b/);
    if (weekAgo?.[0]) {
      return { iso: this.dateToIso(this.addDays(base, -7)), raw: weekAgo[0] };
    }

    const daysAgo = normalized.match(/\bhace\s+(\d{1,2})\s+dias?\b/);
    if (daysAgo?.[1]) {
      return {
        iso: this.dateToIso(this.addDays(base, -Number(daysAgo[1]))),
        raw: daysAgo[0],
      };
    }

    const weeksAgo = normalized.match(/\bhace\s+(\d{1,2})\s+semanas?\b/);
    if (weeksAgo?.[1]) {
      return {
        iso: this.dateToIso(this.addDays(base, -Number(weeksAgo[1]) * 7)),
        raw: weeksAgo[0],
      };
    }

    const numeric = normalized.match(
      /\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/,
    );
    if (numeric?.[1] && numeric[2]) {
      const day = Number(numeric[1]);
      const month = Number(numeric[2]);
      const year = numeric[3]
        ? this.normalizeYear(Number(numeric[3]))
        : base.year;
      const parts = this.validDateParts(year, month, day);
      if (parts) return { iso: this.dateToIso(parts), raw: numeric[0] };
    }

    const monthName = normalized.match(
      /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de\s+(\d{2,4}))?\b/,
    );
    if (monthName?.[1] && monthName[2]) {
      const day = Number(monthName[1]);
      const month = MONTHS.get(monthName[2]) ?? 0;
      const year = monthName[3]
        ? this.normalizeYear(Number(monthName[3]))
        : base.year;
      const parts = this.validDateParts(year, month, day);
      if (parts) return { iso: this.dateToIso(parts), raw: monthName[0] };
    }

    return null;
  }

  private cleanDescription(
    text: string,
    amountRaw?: string,
    dateRaw?: string,
  ): string {
    let cleaned = normalizeText(text);
    for (const fragment of [amountRaw, dateRaw].filter((item): item is string =>
      Boolean(item),
    )) {
      cleaned = cleaned.replace(normalizeText(fragment), " ");
    }

    cleaned = cleaned
      .replace(
        /\b(registrar|registra|registre|anotar|anota|agregar|agrega|nuevo|nueva|transaccion|movimiento)\b/g,
        " ",
      )
      .replace(
        /\b(gaste|gasto|pague|pago|compre|compra|consumi|consumo|recibi|recibido|ingreso|ingrese|cobre|depositaron|me pagaron|me depositaron)\b/g,
        " ",
      )
      .replace(/\b(un|una|el|la|los|las|mi|mis)\b/g, " ")
      .replace(/\b(gasto|compra|pago|ingreso|entrada|salida)\b/g, " ")
      .replace(/\b(de|del|en|por|para|con)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) return "";
    return cleaned.slice(0, MAX_DESCRIPTION_LENGTH);
  }

  private async suggestCategory(
    description: string,
    amount: number | null,
  ): Promise<ClassificationResult | null> {
    if (amount === null || !description.trim()) return null;
    try {
      return await this.ai.classifyTransaction(description, amount);
    } catch (err) {
      this.logger.warn(
        `Voice category suggestion failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return classifyTransactionByRules(description, amount);
    }
  }

  private buildWarnings(params: {
    amount: ParsedAmount | null;
    description: string;
  }): string[] {
    const warnings: string[] = [];
    if (!params.amount)
      warnings.push("No se detecto el monto. Puedes editarlo manualmente.");
    if (!params.description)
      warnings.push("No se detecto una nota clara para la transaccion.");
    return warnings;
  }

  private removeDateFragments(text: string): string {
    return text
      .replace(/\b(anteayer|ayer|hoy)\b/g, " ")
      .replace(/\b(?:la\s+)?semana\s+pasada\b/g, " ")
      .replace(/\bhace\s+\d{1,2}\s+dias?\b/g, " ")
      .replace(/\bhace\s+\d{1,2}\s+semanas?\b/g, " ")
      .replace(/\b\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?\b/g, " ")
      .replace(
        /\b\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de\s+\d{2,4})?\b/g,
        " ",
      );
  }

  private today(timezone?: string): {
    year: number;
    month: number;
    day: number;
  } {
    const safeTimezone = timezone?.trim() || DEFAULT_TIMEZONE;
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: safeTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());
      return {
        year: Number(parts.find((part) => part.type === "year")?.value),
        month: Number(parts.find((part) => part.type === "month")?.value),
        day: Number(parts.find((part) => part.type === "day")?.value),
      };
    } catch {
      return this.today(DEFAULT_TIMEZONE);
    }
  }

  private addDays(
    parts: { year: number; month: number; day: number },
    days: number,
  ): { year: number; month: number; day: number } {
    const date = new Date(
      Date.UTC(parts.year, parts.month - 1, parts.day + days, 12),
    );
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };
  }

  private validDateParts(
    year: number,
    month: number,
    day: number,
  ): { year: number; month: number; day: number } | null {
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day
    ) {
      return null;
    }
    return { year, month, day };
  }

  private normalizeYear(year: number): number {
    return year < 100 ? 2000 + year : year;
  }

  private dateToIso(parts: {
    year: number;
    month: number;
    day: number;
  }): string {
    return new Date(
      Date.UTC(parts.year, parts.month - 1, parts.day, 12),
    ).toISOString();
  }
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9/.,\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
