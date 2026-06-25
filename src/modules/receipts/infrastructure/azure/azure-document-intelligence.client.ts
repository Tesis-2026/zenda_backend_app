import {
  Injectable,
  Logger,
  RequestTimeoutException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AnalyzeResult,
  AnalyzedDocument,
  AzureKeyCredential,
  DocumentAnalysisClient,
} from "@azure/ai-form-recognizer";

const DEFAULT_MODEL_ID = "prebuilt-receipt";
const DEFAULT_TIMEOUT_MS = 30000;

@Injectable()
export class AzureDocumentIntelligenceClient {
  private readonly logger = new Logger(AzureDocumentIntelligenceClient.name);
  private client: DocumentAnalysisClient | null = null;

  constructor(private readonly config: ConfigService) {}

  async analyzeReceipt(
    buffer: Buffer,
  ): Promise<AnalyzeResult<AnalyzedDocument>> {
    const modelId =
      this.config.get<string>("azureDocumentIntelligence.modelId") ??
      DEFAULT_MODEL_ID;
    const timeoutMs =
      this.config.get<number>("azureDocumentIntelligence.timeoutMs") ??
      DEFAULT_TIMEOUT_MS;
    const client = this.getClient();

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      const poller = await client.beginAnalyzeDocument(modelId, buffer, {
        abortSignal: abortController.signal,
        locale: "es-PE",
      });
      return await poller.pollUntilDone();
    } catch (err) {
      if (abortController.signal.aborted) {
        throw new RequestTimeoutException(
          "No se pudo analizar la boleta a tiempo. Intenta nuevamente.",
        );
      }

      this.logger.error(
        "Azure Document Intelligence receipt analysis failed",
        err instanceof Error ? err.stack : String(err),
      );
      throw new ServiceUnavailableException(
        "No se pudo analizar la boleta en este momento. Intenta nuevamente.",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private getClient(): DocumentAnalysisClient {
    if (this.client) return this.client;

    const endpoint = this.config.get<string>(
      "azureDocumentIntelligence.endpoint",
    );
    const key = this.config.get<string>("azureDocumentIntelligence.key");

    if (!endpoint || !key) {
      throw new ServiceUnavailableException(
        "El analisis de boletas no esta configurado en este entorno.",
      );
    }

    this.client = new DocumentAnalysisClient(
      endpoint,
      new AzureKeyCredential(key),
    );
    return this.client;
  }
}
