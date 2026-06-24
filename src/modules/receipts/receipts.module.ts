import { Module } from "@nestjs/common";
import { AiModule } from "../../infra/ai/ai.module";
import { ReceiptOcrService } from "./application/receipt-ocr.service";
import { AzureDocumentIntelligenceClient } from "./infrastructure/azure/azure-document-intelligence.client";
import { ReceiptsController } from "./interface/receipts.controller";

@Module({
  imports: [AiModule],
  controllers: [ReceiptsController],
  providers: [ReceiptOcrService, AzureDocumentIntelligenceClient],
})
export class ReceiptsModule {}
