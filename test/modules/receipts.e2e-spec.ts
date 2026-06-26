import {
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { INestApplication } from "@nestjs/common";
import request = require("supertest");

import { createTestApp } from "../support/create-test-app";
import { fixtureUser } from "../fixtures";
import { ReceiptOcrService } from "../../src/modules/receipts/application/receipt-ocr.service";
import { AzureDocumentIntelligenceClient } from "../../src/modules/receipts/infrastructure/azure/azure-document-intelligence.client";

describe("Receipt OCR (contract + normalization)", () => {
  let app: INestApplication;
  const receiptOcr = { analyze: jest.fn() };

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  async function bootAuthed() {
    ({ app } = await createTestApp({
      user: fixtureUser,
      overrides: [{ provide: ReceiptOcrService, useValue: receiptOcr }],
    }));
  }

  it("POST /api/receipts/analyze without file -> 400", async () => {
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post("/api/receipts/analyze")
      .set("Authorization", "Bearer test");

    expect(res.status).toBe(400);
    expect(receiptOcr.analyze).not.toHaveBeenCalled();
  });

  it("POST /api/receipts/analyze with invalid format -> 400", async () => {
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post("/api/receipts/analyze")
      .set("Authorization", "Bearer test")
      .attach("file", Buffer.from("hello"), {
        filename: "receipt.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(400);
    expect(receiptOcr.analyze).not.toHaveBeenCalled();
  });

  it("POST /api/receipts/analyze with valid image -> 200 draft", async () => {
    receiptOcr.analyze.mockResolvedValue({
      amount: 12.9,
      date: "2026-06-23",
      time: "18:42:00",
      merchant: "Tambo",
      tax: 2.32,
      items: [{ name: "Galleta", amount: 1, quantity: 1 }],
      suggestedCategory: "Food",
      note: "Compra en Tambo",
      confidence: 0.91,
      warnings: [],
    });
    await bootAuthed();

    const res = await request(app.getHttpServer())
      .post("/api/receipts/analyze")
      .set("Authorization", "Bearer test")
      .attach("file", Buffer.from([0xff, 0xd8, 0xff]), {
        filename: "receipt.jpg",
        contentType: "image/jpeg",
      });

    expect(res.status).toBe(200);
    expect(receiptOcr.analyze).toHaveBeenCalledWith(
      expect.objectContaining({ mimetype: "image/jpeg" }),
    );
    expect(res.body).toMatchObject({
      amount: 12.9,
      date: "2026-06-23",
      merchant: "Tambo",
      suggestedCategory: "Food",
      note: "Compra en Tambo",
    });
  });

  it("throws a clean error when Azure config is missing", async () => {
    const client = new AzureDocumentIntelligenceClient(
      new ConfigService({ azureDocumentIntelligence: {} }),
    );

    await expect(
      client.analyzeReceipt(Buffer.from("x")),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("throws a clean error when OCR returns no documents", async () => {
    const service = new ReceiptOcrService(
      { analyzeReceipt: jest.fn().mockResolvedValue({ documents: [] }) } as any,
      { classifyTransaction: jest.fn() } as any,
    );

    await expect(
      service.analyze({
        buffer: Buffer.from("x"),
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("normalizes amount, merchant, date, tax and items", async () => {
    const service = new ReceiptOcrService(
      { analyzeReceipt: jest.fn() } as any,
      {
        classifyTransaction: jest.fn().mockResolvedValue({
          categoryName: "Food",
          confidence: 0.8,
        }),
      } as any,
    );

    const result = await service.toDraft({
      docType: "prebuilt:receipt",
      confidence: 0.9,
      spans: [],
      fields: {
        MerchantName: { kind: "string", value: "Tambo", confidence: 0.95 },
        TransactionDate: {
          kind: "date",
          value: new Date("2026-06-23T00:00:00.000Z"),
          confidence: 0.9,
        },
        TransactionTime: { kind: "time", value: "18:42:00", confidence: 0.8 },
        Total: {
          kind: "currency",
          value: { amount: 12.9, currencyCode: "PEN" },
          confidence: 0.92,
        },
        TotalTax: {
          kind: "currency",
          value: { amount: 2.32, currencyCode: "PEN" },
          confidence: 0.88,
        },
        Items: {
          kind: "array",
          values: [
            {
              kind: "object",
              properties: {
                Description: { kind: "string", value: "Galleta" },
                TotalPrice: { kind: "currency", value: { amount: 1 } },
                Quantity: { kind: "number", value: 1 },
              },
            },
          ],
        },
      },
    } as any);

    expect(result).toMatchObject({
      amount: 12.9,
      date: "2026-06-23",
      time: "18:42:00",
      merchant: "Tambo",
      tax: 2.32,
      suggestedCategory: "Food",
      note: "Compra en Tambo",
      warnings: [],
    });
    expect(result.items).toEqual([{ name: "Galleta", amount: 1, quantity: 1 }]);
  });
});
