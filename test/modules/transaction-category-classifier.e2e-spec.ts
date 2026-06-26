import {
  classifyTransactionByRules,
  normalizeClassificationResult,
} from "../../src/infra/ai/transaction-category-classifier";

describe("Transaction category classifier", () => {
  it("classifies common Peruvian student expense descriptions", () => {
    expect(classifyTransactionByRules("galleta en Tambo", 1).categoryName).toBe(
      "Cravings",
    );
    expect(classifyTransactionByRules("bebida", 3.5).categoryName).toBe(
      "Cravings",
    );
    expect(
      classifyTransactionByRules("recarga tarjeta Metropolitano", 20)
        .categoryName,
    ).toBe("Transportation");
    expect(
      classifyTransactionByRules("Netflix plan mensual", 22.9).categoryName,
    ).toBe("Subscriptions");
    expect(
      classifyTransactionByRules("sueldo part time", 500).categoryName,
    ).toBe("Part-time work");
    expect(
      classifyTransactionByRules("apoyo familiar de mis padres", 200)
        .categoryName,
    ).toBe("Family");
    expect(classifyTransactionByRules("beca Pronabec", 850).categoryName).toBe(
      "Scholarship",
    );
    expect(
      classifyTransactionByRules("proyecto freelance", 300).categoryName,
    ).toBe("Freelance");
  });

  it("normalizes Spanish or non-canonical AI category names", () => {
    expect(
      normalizeClassificationResult(
        { categoryName: "Comida", confidence: 0.9 },
        "almuerzo menu",
        12,
      ),
    ).toEqual({ categoryName: "Food", confidence: 0.9 });

    expect(
      normalizeClassificationResult(
        { categoryName: "Ropa", confidence: 0.9 },
        "zapatillas para clase",
        120,
      ),
    ).toEqual({ categoryName: "Shopping", confidence: 0.9 });
  });

  it("uses rule fallback when AI returns Other but description is specific", () => {
    expect(
      normalizeClassificationResult(
        { categoryName: "Otros", confidence: 0.9 },
        "galleta en Tambo",
        1,
      ).categoryName,
    ).toBe("Cravings");
  });
});
