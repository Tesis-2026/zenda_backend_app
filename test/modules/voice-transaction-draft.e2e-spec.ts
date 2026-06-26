import { classifyTransactionByRules } from "../../src/infra/ai/transaction-category-classifier";
import { ParseVoiceTransactionUseCase } from "../../src/modules/transactions/application/use-cases/parse-voice-transaction.use-case";
import { TransactionType } from "../../src/modules/transactions/domain/transaction-type.enum";

describe("Voice transaction draft parser", () => {
  const ai = {
    classifyTransaction: jest.fn((description: string, amount: number) =>
      Promise.resolve(classifyTransactionByRules(description, amount)),
    ),
  };

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-23T17:00:00.000Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("parses a spoken expense and suggests the expected category", async () => {
    const parser = new ParseVoiceTransactionUseCase(ai as any);

    const result = await parser.execute({
      text: "Gaste 5 soles en bebida ayer",
      timezone: "America/Lima",
    });

    expect(result).toMatchObject({
      type: TransactionType.EXPENSE,
      amount: 5,
      description: "bebida",
      suggestedCategoryName: "Cravings",
      warnings: [],
    });
    expect(result.occurredAt).toBe("2026-06-22T12:00:00.000Z");
  });

  it("parses a spoken income with an explicit date", async () => {
    const parser = new ParseVoiceTransactionUseCase(ai as any);

    const result = await parser.execute({
      text: "Recibi 1500 soles por sueldo el 23/06/2026",
      timezone: "America/Lima",
    });

    expect(result).toMatchObject({
      type: TransactionType.INCOME,
      amount: 1500,
      description: "sueldo",
      suggestedCategoryName: "Part-time work",
      occurredAt: "2026-06-23T12:00:00.000Z",
    });
  });

  it("understands week-relative dates and family income", async () => {
    const parser = new ParseVoiceTransactionUseCase(ai as any);

    const result = await parser.execute({
      text: "Recibi 200 soles de mi mama la semana pasada",
      timezone: "America/Lima",
    });

    expect(result).toMatchObject({
      type: TransactionType.INCOME,
      amount: 200,
      description: "mama",
      suggestedCategoryName: "Family",
      occurredAt: "2026-06-16T12:00:00.000Z",
    });
  });

  it("falls back to local category rules when AI classification fails", async () => {
    ai.classifyTransaction.mockRejectedValueOnce(
      new Error("Azure unavailable"),
    );
    const parser = new ParseVoiceTransactionUseCase(ai as any);

    const result = await parser.execute({
      text: "Pague 4 soles en pasaje Metropolitano",
    });

    expect(result).toMatchObject({
      amount: 4,
      description: "pasaje metropolitano",
      suggestedCategoryName: "Transportation",
    });
  });

  it("returns warnings instead of inventing missing fields", async () => {
    const parser = new ParseVoiceTransactionUseCase(ai as any);

    const result = await parser.execute({
      text: "Gaste en pasaje",
    });

    expect(result.amount).toBeNull();
    expect(result.description).toBe("pasaje");
    expect(result.suggestedCategoryName).toBeNull();
    expect(result.warnings).toContain(
      "No se detecto el monto. Puedes editarlo manualmente.",
    );
  });
});
