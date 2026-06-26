import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProjectClient } from '@azure/ai-projects';
import {
  AgentsClient,
  MessageTextContent,
  MessageTextFileCitationAnnotation,
  MessageTextFilePathAnnotation,
  MessageTextUrlCitationAnnotation,
  ThreadMessage,
  ThreadRun,
} from '@azure/ai-agents';
import { ClientSecretCredential, DefaultAzureCredential, ManagedIdentityCredential } from '@azure/identity';
import { TokenCredential } from '@azure/core-auth';

export interface RagAgentSource {
  type: 'file_citation' | 'file_path' | 'url_citation';
  fileId?: string;
  quote?: string;
  url?: string;
  title?: string;
  text?: string;
}

export interface RagAgentRequest {
  financialContext: string;
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  taskInstructions?: string;
}

export interface RagAgentResponse {
  answer: string;
  sources: RagAgentSource[];
  metadata: {
    agent: string;
    usedRag: boolean;
    mode: 'foundry_agent' | 'classic_assistant';
    runId?: string;
    threadId?: string;
    responseId?: string;
    remoteConversationId?: string;
  };
}

export function sanitizeAgentVisibleCitations(value: string): string {
  return value
    .replace(/\s*【[^】]*(?:source|fuente|citation|cita|†)[^】]*】/gi, '')
    .replace(/\s*\[[^\]\n]*(?:\.md|\.pdf|\.docx|\.txt)[^\]\n]*\]/gi, '')
    .replace(/\s*\[\s*(?:source|fuente|citation|cita)\s*[:\d\w ._-]*\]/gi, '')
    .replace(/[ \t]+([.,;:!?])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export class AzureFoundryAgentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = AzureFoundryAgentConfigurationError.name;
  }
}

export class AzureFoundryAgentAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = AzureFoundryAgentAuthError.name;
  }
}

export class AzureFoundryAgentTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = AzureFoundryAgentTimeoutError.name;
  }
}

export class AzureFoundryAgentEmptyResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = AzureFoundryAgentEmptyResponseError.name;
  }
}

export class AzureFoundryAgentConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = AzureFoundryAgentConnectionError.name;
  }
}

@Injectable()
export class AzureFoundryAgentClient {
  private readonly logger = new Logger(AzureFoundryAgentClient.name);
  private classicClient?: AgentsClient;
  private projectClient?: AIProjectClient;

  constructor(private readonly config: ConfigService) {}

  get agentName(): string {
    return this.config.get<string>('azureAiAgent.agentName') ?? 'ZENDA';
  }

  async ask(request: RagAgentRequest): Promise<RagAgentResponse> {
    const agentId = this.config.get<string>('azureAiAgent.agentId')?.trim() ?? '';

    if (this.isClassicAssistantId(agentId)) {
      return this.askClassicAssistant(agentId, request);
    }

    return this.askFoundryAgent(request);
  }

  private async askFoundryAgent(request: RagAgentRequest): Promise<RagAgentResponse> {
    const timeoutMs = this.config.get<number>('azureAiAgent.timeoutMs') ?? 30_000;
    const abortSignal = AbortSignal.timeout(timeoutMs);
    const openAIClient = this.getProjectClient().getOpenAIClient();
    const agentName = this.requiredAgentName();

    try {
      const response = await openAIClient.responses.create(
        {
          input: this.buildAgentInput(request),
        },
        {
          body: { agent_reference: { name: agentName, type: 'agent_reference' } },
          signal: abortSignal,
          timeout: timeoutMs,
        },
      );

      const parsed = this.parseFoundryResponse(response as unknown);

      if (!parsed.answer.trim()) {
        throw new AzureFoundryAgentEmptyResponseError('Azure AI Foundry Agent returned an empty answer');
      }

      return {
        answer: parsed.answer.trim(),
        sources: parsed.sources,
        metadata: {
          agent: agentName,
          usedRag: true,
          mode: 'foundry_agent',
          responseId: parsed.responseId,
          remoteConversationId: parsed.remoteConversationId,
        },
      };
    } catch (err) {
      throw this.mapAzureError(err);
    }
  }

  private async askClassicAssistant(
    agentId: string,
    request: RagAgentRequest,
  ): Promise<RagAgentResponse> {
    const timeoutMs = this.config.get<number>('azureAiAgent.timeoutMs') ?? 30_000;
    const abortSignal = AbortSignal.timeout(timeoutMs);
    const client = this.getClassicClient();

    try {
      const thread = await client.threads.create({ abortSignal });
      await client.messages.create(thread.id, 'user', this.buildAgentInput(request), { abortSignal });

      const poller = client.runs.createAndPoll(thread.id, agentId, {
        additionalInstructions: request.taskInstructions?.trim() || this.defaultTaskInstructions(),
        pollingOptions: { intervalInMs: 1000 },
        abortSignal,
      });
      const run = await poller.pollUntilDone();
      this.ensureCompletedRun(run);

      const messages = client.messages.list(thread.id, {
        runId: run.id,
        limit: 10,
        order: 'desc',
        abortSignal,
      });
      const assistantMessage = await this.findAssistantMessage(messages);
      const parsed = this.parseAssistantMessage(assistantMessage);

      if (!parsed.answer.trim()) {
        throw new AzureFoundryAgentEmptyResponseError('Azure AI Foundry Agent returned an empty answer');
      }

      return {
        answer: parsed.answer.trim(),
        sources: parsed.sources,
        metadata: {
          agent: this.agentName,
          usedRag: true,
          mode: 'classic_assistant',
          runId: run.id,
          threadId: thread.id,
        },
      };
    } catch (err) {
      throw this.mapAzureError(err);
    }
  }

  private getClassicClient(): AgentsClient {
    if (!this.classicClient) {
      const endpoint = this.requiredConfig(
        'azureAiAgent.projectEndpoint',
        'AZURE_AI_PROJECT_ENDPOINT',
      );
      this.classicClient = new AgentsClient(endpoint, this.buildCredential());
    }
    return this.classicClient;
  }

  private getProjectClient(): AIProjectClient {
    if (!this.projectClient) {
      const endpoint = this.requiredConfig(
        'azureAiAgent.projectEndpoint',
        'AZURE_AI_PROJECT_ENDPOINT',
      );
      this.projectClient = new AIProjectClient(endpoint, this.buildCredential());
    }
    return this.projectClient;
  }

  private buildCredential(): TokenCredential {
    const authMode = this.config.get<string>('azureAiAgent.authMode') ?? 'default';
    const useManagedIdentity = this.config.get<boolean>('azureAiAgent.useManagedIdentity') ?? false;
    const tenantId = this.config.get<string>('azureAiAgent.tenantId') ?? '';
    const clientId = this.config.get<string>('azureAiAgent.clientId') ?? '';
    const clientSecret = this.config.get<string>('azureAiAgent.clientSecret') ?? '';
    const hasServicePrincipal = !!(tenantId && clientId && clientSecret);

    if (hasServicePrincipal) {
      return new ClientSecretCredential(tenantId, clientId, clientSecret);
    }

    if (authMode === 'service_principal') {
      throw new AzureFoundryAgentConfigurationError(
        'AZURE_TENANT_ID, AZURE_CLIENT_ID and AZURE_CLIENT_SECRET are required when AZURE_AI_AUTH_MODE=service_principal',
      );
    }

    if (useManagedIdentity || authMode === 'managed_identity') {
      return clientId ? new ManagedIdentityCredential(clientId) : new ManagedIdentityCredential();
    }

    return new DefaultAzureCredential();
  }

  private requiredConfig(configKey: string, envName: string): string {
    const value = this.config.get<string>(configKey);
    if (!value || value.trim().length === 0) {
      throw new AzureFoundryAgentConfigurationError(`${envName} is required for Azure AI Foundry Agent chat`);
    }
    return value;
  }

  private requiredAgentName(): string {
    const value = this.agentName.trim();
    if (!value) {
      throw new AzureFoundryAgentConfigurationError(
        'AZURE_AI_AGENT_NAME is required for Microsoft Foundry Agent chat',
      );
    }
    return value;
  }

  private isClassicAssistantId(value: string): boolean {
    return value.toLowerCase().startsWith('asst');
  }

  private buildAgentInput(request: RagAgentRequest): string {
    const taskInstructions = request.taskInstructions?.trim() || this.defaultTaskInstructions();
    const recentHistory = (request.conversationHistory ?? [])
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'Usuario' : 'Zenda'}: ${this.safeHistoryText(m.content)}`)
      .join('\n');

    return [
      taskInstructions,
      '',
      request.financialContext,
      '',
      recentHistory ? `Historial reciente resumido:\n${recentHistory}\n` : '',
      'Solicitud del usuario:',
      request.message,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private defaultTaskInstructions(): string {
    return [
      'Usa la base documental de Zenda y el contexto financiero del usuario para responder de forma educativa, segura y personalizada.',
      'Responde en espanol claro con 100 a 150 palabras como maximo. Si el tema es complejo, resume lo esencial y ofrece continuar.',
      'Usa parrafos cortos o hasta 3 bullets. Evita respuestas largas, listas extensas y explicaciones enciclopedicas.',
      'No incluyas citas visibles, nombres de archivos, marcadores entre corchetes ni referencias tipo [1:archivo.md] en el texto. Las fuentes se devuelven solo como metadata.',
      'No solicites datos sensibles. No recomiendes inversiones especificas ni promesas de ganancia rapida.',
      'Si la pregunta es de inversion riesgosa o enriquecimiento rapido, rechaza la recomendacion especifica y orienta a educacion financiera general.',
    ].join('\n');
  }

  private sanitizeAgentAnswer(value: string): string {
    return sanitizeAgentVisibleCitations(value);
  }

  private safeHistoryText(value: string): string {
    return value
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redactado]')
      .replace(/\b(?:\d[\s-]?){8,}\b/g, '[numero]')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500);
  }

  private ensureCompletedRun(run: ThreadRun): void {
    if (run.status === 'completed') return;

    if (run.status === 'failed') {
      throw new AzureFoundryAgentConnectionError(
        `Azure AI Foundry Agent run failed: ${run.lastError?.message ?? 'unknown error'}`,
      );
    }

    throw new AzureFoundryAgentConnectionError(
      `Azure AI Foundry Agent run ended with status ${run.status}`,
    );
  }

  private async findAssistantMessage(
    messages: AsyncIterable<ThreadMessage>,
  ): Promise<ThreadMessage> {
    for await (const message of messages) {
      if (message.role === 'assistant') {
        return message;
      }
    }
    throw new AzureFoundryAgentEmptyResponseError('Azure AI Foundry Agent produced no assistant message');
  }

  private parseAssistantMessage(message: ThreadMessage): {
    answer: string;
    sources: RagAgentSource[];
  } {
    const textParts = message.content.filter(
      (part): part is MessageTextContent => part.type === 'text',
    );

    const answer = this.sanitizeAgentAnswer(textParts.map((part) => part.text.value).join('\n'));
    const sources = textParts.flatMap((part) =>
      part.text.annotations.flatMap((annotation) => this.toSource(annotation)),
    );

    return { answer, sources: this.dedupeSources(sources) };
  }

  private parseFoundryResponse(response: unknown): {
    answer: string;
    sources: RagAgentSource[];
    responseId?: string;
    remoteConversationId?: string;
  } {
    if (!this.isRecord(response)) {
      throw new AzureFoundryAgentConnectionError('Azure AI Foundry Agent returned an invalid response');
    }

    const error = this.recordValue(response, 'error');
    if (this.isRecord(error)) {
      throw new AzureFoundryAgentConnectionError(
        `Azure AI Foundry Agent response failed: ${this.stringValue(error, 'message') ?? 'unknown error'}`,
      );
    }

    const outputText = this.stringValue(response, 'output_text') ?? '';
    const output = this.recordValue(response, 'output');
    const textParts = Array.isArray(output)
      ? output.flatMap((item) => this.extractResponseTextParts(item))
      : [];
    const answer = this.sanitizeAgentAnswer(outputText || textParts.map((part) => part.text).join('\n'));
    const sources = textParts.flatMap((part) =>
      part.annotations.flatMap((annotation) => this.toFoundrySource(annotation)),
    );
    const conversation = this.recordValue(response, 'conversation');

    return {
      answer,
      sources: this.dedupeSources(sources),
      responseId: this.stringValue(response, 'id'),
      remoteConversationId: this.isRecord(conversation) ? this.stringValue(conversation, 'id') : undefined,
    };
  }

  private extractResponseTextParts(value: unknown): Array<{
    text: string;
    annotations: unknown[];
  }> {
    if (!this.isRecord(value) || this.stringValue(value, 'type') !== 'message') {
      return [];
    }

    const content = this.recordValue(value, 'content');
    if (!Array.isArray(content)) return [];

    return content.flatMap((part) => {
      if (!this.isRecord(part)) return [];

      const type = this.stringValue(part, 'type');
      if (type === 'output_text') {
        return [
          {
            text: this.stringValue(part, 'text') ?? '',
            annotations: this.arrayValue(part, 'annotations'),
          },
        ];
      }

      if (type === 'refusal') {
        return [
          {
            text: this.stringValue(part, 'refusal') ?? '',
            annotations: [],
          },
        ];
      }

      return [];
    });
  }

  private toSource(
    annotation:
      | MessageTextFileCitationAnnotation
      | MessageTextFilePathAnnotation
      | MessageTextUrlCitationAnnotation
      | { type: string; text?: string },
  ): RagAgentSource[] {
    if (annotation.type === 'file_citation') {
      const citation = annotation as MessageTextFileCitationAnnotation;
      return [
        {
          type: 'file_citation',
          fileId: citation.fileCitation.fileId,
          quote: citation.fileCitation.quote,
          text: citation.text,
        },
      ];
    }

    if (annotation.type === 'file_path') {
      const filePath = annotation as MessageTextFilePathAnnotation;
      return [
        {
          type: 'file_path',
          fileId: filePath.filePath.fileId,
          text: filePath.text,
        },
      ];
    }

    if (annotation.type === 'url_citation') {
      const citation = annotation as MessageTextUrlCitationAnnotation;
      return [
        {
          type: 'url_citation',
          url: citation.urlCitation.url,
          title: citation.urlCitation.title,
          text: citation.text,
        },
      ];
    }

    return [];
  }

  private toFoundrySource(annotation: unknown): RagAgentSource[] {
    if (!this.isRecord(annotation)) return [];

    const type = this.stringValue(annotation, 'type');
    if (type === 'file_citation') {
      return [
        {
          type: 'file_citation',
          fileId: this.stringValue(annotation, 'file_id'),
          title: this.stringValue(annotation, 'filename'),
        },
      ];
    }

    if (type === 'container_file_citation') {
      return [
        {
          type: 'file_citation',
          fileId: this.stringValue(annotation, 'file_id'),
          title: this.stringValue(annotation, 'filename'),
        },
      ];
    }

    if (type === 'file_path') {
      return [
        {
          type: 'file_path',
          fileId: this.stringValue(annotation, 'file_id'),
        },
      ];
    }

    if (type === 'url_citation') {
      return [
        {
          type: 'url_citation',
          url: this.stringValue(annotation, 'url'),
          title: this.stringValue(annotation, 'title'),
        },
      ];
    }

    return [];
  }

  private dedupeSources(sources: RagAgentSource[]): RagAgentSource[] {
    const seen = new Set<string>();
    return sources.filter((source) => {
      const key = `${source.type}:${source.fileId ?? ''}:${source.url ?? ''}:${source.quote ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private mapAzureError(err: unknown): Error {
    if (
      err instanceof AzureFoundryAgentConfigurationError ||
      err instanceof AzureFoundryAgentAuthError ||
      err instanceof AzureFoundryAgentTimeoutError ||
      err instanceof AzureFoundryAgentEmptyResponseError ||
      err instanceof AzureFoundryAgentConnectionError
    ) {
      return err;
    }

    if (err instanceof Error && err.name === 'AbortError') {
      return new AzureFoundryAgentTimeoutError('Azure AI Foundry Agent request timed out');
    }

    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Invalid 'assistant_id'") && message.includes('asst')) {
      return new AzureFoundryAgentConfigurationError(
        'AZURE_AI_AGENT_ID must be a classic assistant id that starts with asst_. For Microsoft Foundry agents, use AZURE_AI_AGENT_NAME and leave AZURE_AI_AGENT_ID empty or non-asst.',
      );
    }

    if (typeof err === 'object' && err !== null && 'statusCode' in err) {
      const statusCode = Number((err as { statusCode?: number }).statusCode);
      if (statusCode === 401 || statusCode === 403) {
        return new AzureFoundryAgentAuthError('Azure AI Foundry Agent authentication failed');
      }
    }

    this.logger.error('Unexpected Azure AI Foundry Agent error', err instanceof Error ? err.stack : String(err));
    return new AzureFoundryAgentConnectionError('Azure AI Foundry Agent connection failed');
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private recordValue(record: Record<string, unknown>, key: string): unknown {
    return record[key];
  }

  private stringValue(record: Record<string, unknown>, key: string): string | undefined {
    const value = record[key];
    return typeof value === 'string' ? value : undefined;
  }

  private arrayValue(record: Record<string, unknown>, key: string): unknown[] {
    const value = record[key];
    return Array.isArray(value) ? value : [];
  }
}
