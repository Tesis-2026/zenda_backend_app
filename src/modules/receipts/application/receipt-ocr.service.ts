import {
  Inject,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  AnalyzedDocument,
  DocumentArrayField,
  DocumentField,
  DocumentObjectField,
} from "@azure/ai-form-recognizer";
import { AI_PROVIDER } from "../../../infra/ai/ai.module";
import { AiProvider } from "../../../infra/ai/AiProvider";
import { detectAccountFromText } from "../../accounts/domain/account-detection";
import { ReceiptAnalyzeResponseDto } from "../interface/dto/receipt-analyze-response.dto";
import { ReceiptItemDto } from "../interface/dto/receipt-item.dto";
import { AzureDocumentIntelligenceClient } from "../infrastructure/azure/azure-document-intelligence.client";

const LOW_CONFIDENCE_THRESHOLD = 0.65;

@Injectable()
export class ReceiptOcrService {
  private readonly logger = new Logger(ReceiptOcrService.name);

  constructor(
    private readonly documentIntelligence: AzureDocumentIntelligenceClient,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
  ) {}

  async analyze(file: Express.Multer.File): Promise<ReceiptAnalyzeResponseDto> {
    const result = await this.documentIntelligence.analyzeReceipt(file.buffer);
    const document = result.documents?.[0];

    if (!document) {
      throw new UnprocessableEntityException(
        "No se pudo detectar una boleta valida en el archivo enviado.",
      );
    }

    const draft = await this.toDraft(document);
    return draft;
  }

  async toDraft(
    document: AnalyzedDocument,
  ): Promise<ReceiptAnalyzeResponseDto> {
    const fields = document.fields ?? {};

    const merchantField = this.pickField(
      fields,
      "MerchantName",
      "Merchant",
      "StoreName",
    );
    const dateField = this.pickField(
      fields,
      "TransactionDate",
      "Date",
      "PurchaseDate",
    );
    const timeField = this.pickField(
      fields,
      "TransactionTime",
      "Time",
      "PurchaseTime",
    );
    const amountField = this.pickField(
      fields,
      "Total",
      "AmountDue",
      "GrandTotal",
    );
    const taxField = this.pickField(fields, "TotalTax", "Tax", "TaxAmount");
    const itemsField = this.pickField(fields, "Items");
    const paymentField = this.pickField(
      fields,
      "PaymentMethod",
      "PaymentType",
      "PaymentDetails",
      "CardType",
    );

    const amount = this.numberValue(amountField);
    const date = this.dateValue(dateField);
    const time = this.timeValue(timeField);
    const merchant = this.stringValue(merchantField);
    const tax = this.numberValue(taxField);
    const items = this.itemsValue(itemsField);
    const paymentMethod = this.stringValue(paymentField);
    const warnings = this.buildWarnings({
      amount,
      date,
      amountField,
      dateField,
    });
    const note = merchant
      ? `Compra en ${merchant}`
      : "Compra detectada desde boleta";
    const suggestedCategory = await this.suggestCategory({
      note,
      amount,
      items,
    });
    const account = detectAccountFromText(
      [paymentMethod, note, ...items.map((item) => item.name)].filter(Boolean).join(" "),
    );

    return {
      amount,
      date,
      time,
      merchant,
      tax,
      items,
      suggestedCategory,
      paymentMethod,
      suggestedAccountName: account?.name ?? null,
      suggestedAccountType: account?.type ?? null,
      note,
      confidence: this.overallConfidence(document, [
        amountField,
        dateField,
        merchantField,
        taxField,
      ]),
      warnings,
    };
  }

  private buildWarnings(params: {
    amount: number | null;
    date: string | null;
    amountField?: DocumentField;
    dateField?: DocumentField;
  }): string[] {
    const warnings: string[] = [];
    if (params.amount === null) {
      warnings.push("No se detecto el monto total.");
    }
    if (params.date === null) {
      warnings.push("No se detecto la fecha de la boleta.");
    }
    const lowAmount =
      params.amountField?.confidence !== undefined &&
      params.amountField.confidence < LOW_CONFIDENCE_THRESHOLD;
    const lowDate =
      params.dateField?.confidence !== undefined &&
      params.dateField.confidence < LOW_CONFIDENCE_THRESHOLD;
    if (lowAmount || lowDate) {
      warnings.push("Verifica el monto y la fecha antes de guardar.");
    }
    return [...new Set(warnings)];
  }

  private async suggestCategory(params: {
    note: string;
    amount: number | null;
    items: ReceiptItemDto[];
  }): Promise<string | null> {
    if (params.amount === null) return null;

    const itemNames = params.items
      .map((item) => item.name)
      .filter((name): name is string => Boolean(name))
      .slice(0, 6)
      .join(", ");
    const description = itemNames
      ? `${params.note}. Items: ${itemNames}`
      : params.note;

    try {
      const result = await this.ai.classifyTransaction(
        description,
        params.amount,
      );
      return result.categoryName || null;
    } catch (err) {
      this.logger.warn(
        `Receipt category suggestion failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  private pickField(
    fields: Record<string, DocumentField | undefined>,
    ...names: string[]
  ): DocumentField | undefined {
    for (const name of names) {
      if (fields[name]) return fields[name];
    }

    const wanted = new Set(names.map((name) => name.toLowerCase()));
    const entry = Object.entries(fields).find(([key]) =>
      wanted.has(key.toLowerCase()),
    );
    return entry?.[1];
  }

  private stringValue(field?: DocumentField): string | null {
    if (!field) return null;
    const value =
      "value" in field && typeof field.value === "string"
        ? field.value
        : field.content;
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private dateValue(field?: DocumentField): string | null {
    if (!field) return null;
    if (field.kind === "date" && field.value instanceof Date) {
      return field.value.toISOString().slice(0, 10);
    }

    const raw = this.stringValue(field);
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime())
      ? raw
      : parsed.toISOString().slice(0, 10);
  }

  private timeValue(field?: DocumentField): string | null {
    if (!field) return null;
    if (field.kind === "time" && typeof field.value === "string") {
      return field.value;
    }
    return this.stringValue(field);
  }

  private numberValue(field?: DocumentField): number | null {
    if (!field) return null;

    if (
      (field.kind === "number" || field.kind === "integer") &&
      typeof field.value === "number"
    ) {
      return this.roundMoney(field.value);
    }

    if (field.kind === "currency" && typeof field.value?.amount === "number") {
      return this.roundMoney(field.value.amount);
    }

    return this.parseNumber(field.content);
  }

  private itemsValue(field?: DocumentField): ReceiptItemDto[] {
    if (!field || field.kind !== "array") return [];

    return (field as DocumentArrayField).values
      .map((itemField) => this.itemValue(itemField))
      .filter(
        (item) =>
          item.name !== null || item.amount !== null || item.quantity !== null,
      );
  }

  private itemValue(field: DocumentField): ReceiptItemDto {
    const properties =
      field.kind === "object" ? (field as DocumentObjectField).properties : {};

    const name = this.stringValue(
      this.pickField(properties, "Name", "Description", "ProductName"),
    );
    const amount = this.numberValue(
      this.pickField(
        properties,
        "TotalPrice",
        "Total",
        "Amount",
        "Price",
        "UnitPrice",
      ),
    );
    const quantity = this.numberValue(
      this.pickField(properties, "Quantity", "Qty"),
    );

    return { name, amount, quantity };
  }

  private parseNumber(value?: string): number | null {
    if (!value) return null;
    const cleaned = value
      .replace(/[^\d,.-]/g, "")
      .replace(/,(?=\d{1,2}$)/, ".")
      .replace(/,/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? this.roundMoney(parsed) : null;
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private overallConfidence(
    document: AnalyzedDocument,
    fields: Array<DocumentField | undefined>,
  ): number {
    const values = [
      document.confidence,
      ...fields
        .map((field) => field?.confidence)
        .filter((value): value is number => typeof value === "number"),
    ];
    if (values.length === 0) return 0;
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.round(avg * 100) / 100;
  }
}
