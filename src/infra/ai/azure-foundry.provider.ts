import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiProvider,
  ClassificationResult,
  PredictionResult,
  RecommendationResult,
  SpendingContext,
} from './AiProvider';

// ─────────────────────────────────────────────────────────────────────────────
// Azure OpenAI — Foundry Provider
//
// Setup:
//   1. Set AZURE_OPENAI_ENDPOINT in .env   (e.g. https://your-resource.openai.azure.com/)
//   2. Set AZURE_OPENAI_KEY     in .env   (your Azure OpenAI API key)
//   3. Set AZURE_OPENAI_DEPLOYMENT in .env (e.g. gpt-4o-mini  or  phi-4-mini)
//
// The provider uses the Chat Completions API with structured JSON output.
// If the key is not configured, every method falls back gracefully to a
// rules-based response so the rest of the app keeps working during development.
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class AzureFoundryProvider implements AiProvider {
  readonly name = 'azure-foundry';
  private readonly logger = new Logger(AzureFoundryProvider.name);

  private readonly endpoint: string | undefined;
  private readonly apiKey: string | undefined;
  private readonly deployment: string;

  constructor(private readonly config: ConfigService) {
    this.endpoint = config.get<string>('azureOpenAi.endpoint');
    this.apiKey = config.get<string>('azureOpenAi.key');
    this.deployment = config.get<string>('azureOpenAi.deployment') ?? 'gpt-4o-mini';
  }

  private get isConfigured(): boolean {
    return !!(
      this.endpoint &&
      this.apiKey &&
      this.endpoint !== 'https://your-resource.openai.azure.com/' &&
      this.apiKey !== 'replace-with-azure-openai-key'
    );
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildChatUrl(): string {
    // Azure OpenAI Chat Completions URL format:
    // https://{resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version=2024-10-21
    const base = this.endpoint!.replace(/\/$/, '');
    return `${base}/openai/deployments/${this.deployment}/chat/completions?api-version=2024-10-21`;
  }

  private async callAzure(systemPrompt: string, userPrompt: string): Promise<string> {
    const url = this.buildChatUrl();
    const body = JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey!,
      },
      body,
      signal: AbortSignal.timeout(15_000), // 15 s timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure OpenAI ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message?.content ?? '{}';
  }

  private summariseContext(context: SpendingContext): string {
    return context.months
      .map((m) => {
        const cats = m.categories
          .map((c) => `  - ${c.categoryName}: S/${c.totalAmount.toFixed(2)}`)
          .join('\n');
        return `Period ${m.period}: totalExpenses=S/${m.totalExpenses.toFixed(2)}, totalIncome=S/${m.totalIncome.toFixed(2)}\n${cats}`;
      })
      .join('\n');
  }

  // ── Public methods ─────────────────────────────────────────────────────────

  async predictExpenses(context: SpendingContext): Promise<PredictionResult> {
    if (!this.isConfigured) {
      this.logger.warn('Azure OpenAI not configured — using statistical fallback for expense prediction');
      return this.statisticalPrediction(context);
    }

    try {
      const systemPrompt = `Eres un asistente financiero para estudiantes universitarios peruanos.
Analiza el historial de gastos y genera una predicción para el próximo mes en formato JSON.
Responde SOLO con JSON válido con esta estructura exacta:
{
  "predictedTotal": number,
  "predictedByCategory": [{"categoryId": "id", "categoryName": "name", "amount": number}],
  "confidenceLevel": "high"|"medium"|"low",
  "narrative": "string en español explicando la predicción en 2-3 oraciones"
}`;

      const userPrompt = `Historial de gastos del estudiante (últimos ${context.months.length} meses):\n${this.summariseContext(context)}\n\nGenera la predicción de gastos para el próximo mes.`;

      const raw = await this.callAzure(systemPrompt, userPrompt);
      const parsed = JSON.parse(raw) as Omit<PredictionResult, 'modelVersion'>;
      return { ...parsed, modelVersion: `azure-${this.deployment}` };
    } catch (err) {
      this.logger.error('Azure AI expense prediction failed, using fallback', err);
      return this.statisticalPrediction(context);
    }
  }

  async generateRecommendations(context: SpendingContext): Promise<RecommendationResult[]> {
    if (!this.isConfigured) {
      this.logger.warn('Azure OpenAI not configured — using rule-based recommendations');
      return this.ruleBasedRecommendations(context);
    }

    try {
      const systemPrompt = `Eres un asesor financiero para estudiantes universitarios peruanos.
Analiza los patrones de gasto y genera recomendaciones personalizadas en formato JSON.
Responde SOLO con JSON válido con esta estructura exacta:
{
  "recommendations": [
    {
      "type": "SAVINGS"|"BUDGET"|"GOAL",
      "message": "mensaje en español (máximo 80 palabras)",
      "suggestedAction": "acción concreta en español (máximo 30 palabras)"
    }
  ]
}
Genera entre 2 y 5 recomendaciones relevantes.`;

      const userPrompt = `Datos financieros del estudiante:\n${this.summariseContext(context)}`;

      const raw = await this.callAzure(systemPrompt, userPrompt);
      const parsed = JSON.parse(raw) as { recommendations: RecommendationResult[] };
      return parsed.recommendations ?? [];
    } catch (err) {
      this.logger.error('Azure AI recommendations failed, using fallback', err);
      return this.ruleBasedRecommendations(context);
    }
  }

  async classifyTransaction(description: string, amount: number): Promise<ClassificationResult> {
    if (!this.isConfigured) {
      return { categoryName: 'Otros', confidence: 0 };
    }

    try {
      const systemPrompt = `Clasifica transacciones financieras de estudiantes universitarios peruanos.
Categorías disponibles: Comida, Transporte, Educación, Entretenimiento, Salud, Vivienda, Servicios, Ropa, Otros.
Responde SOLO con JSON: {"categoryName": "string", "confidence": number_0_to_1}`;

      const userPrompt = `Descripción: "${description}", Monto: S/${amount}`;
      const raw = await this.callAzure(systemPrompt, userPrompt);
      return JSON.parse(raw) as ClassificationResult;
    } catch (err) {
      this.logger.error('Azure AI classification failed', err);
      return { categoryName: 'Otros', confidence: 0 };
    }
  }

  // ── Statistical fallbacks ──────────────────────────────────────────────────

  private statisticalPrediction(context: SpendingContext): PredictionResult {
    if (context.months.length === 0) {
      return {
        predictedTotal: 0,
        predictedByCategory: [],
        confidenceLevel: 'low',
        narrative: 'No hay suficiente historial para generar una predicción.',
        modelVersion: 'statistical-fallback',
      };
    }

    // 3-month weighted moving average: weights [0.5, 0.3, 0.2] newest-first
    const weights = [0.5, 0.3, 0.2];
    const sorted = [...context.months].sort((a, b) => b.period.localeCompare(a.period));

    let totalWeight = 0;
    let weightedTotal = 0;

    sorted.slice(0, 3).forEach((m, i) => {
      const w = weights[i] ?? 0.1;
      weightedTotal += m.totalExpenses * w;
      totalWeight += w;
    });

    const predictedTotal = totalWeight > 0 ? weightedTotal / totalWeight : 0;

    // Aggregate categories using same weighting
    const catMap = new Map<string, { name: string; total: number; weight: number }>();
    sorted.slice(0, 3).forEach((m, i) => {
      const w = weights[i] ?? 0.1;
      m.categories.forEach((c) => {
        const existing = catMap.get(c.categoryId);
        if (existing) {
          existing.total += c.totalAmount * w;
          existing.weight += w;
        } else {
          catMap.set(c.categoryId, { name: c.categoryName, total: c.totalAmount * w, weight: w });
        }
      });
    });

    const predictedByCategory = Array.from(catMap.entries()).map(([id, v]) => ({
      categoryId: id,
      categoryName: v.name,
      amount: Number((v.total / v.weight).toFixed(2)),
    }));

    const confidence: 'high' | 'medium' | 'low' =
      context.months.length >= 3 ? 'medium' : 'low';

    return {
      predictedTotal: Number(predictedTotal.toFixed(2)),
      predictedByCategory,
      confidenceLevel: confidence,
      narrative: `Basado en tu historial, se estima que gastarás S/${predictedTotal.toFixed(2)} el próximo mes.`,
      modelVersion: 'statistical-fallback',
    };
  }

  private ruleBasedRecommendations(context: SpendingContext): RecommendationResult[] {
    const recs: RecommendationResult[] = [];

    if (context.months.length === 0) {
      recs.push({
        type: 'SAVINGS',
        message: 'Comienza a registrar tus gastos para recibir recomendaciones personalizadas.',
        suggestedAction: 'Registra al menos una transacción hoy.',
      });
      return recs;
    }

    const latest = context.months.sort((a, b) => b.period.localeCompare(a.period))[0]!;
    const savingsRate =
      latest.totalIncome > 0
        ? (latest.totalIncome - latest.totalExpenses) / latest.totalIncome
        : 0;

    if (savingsRate < 0.2) {
      recs.push({
        type: 'SAVINGS',
        message: `Tu tasa de ahorro este mes es del ${(savingsRate * 100).toFixed(0)}%. La regla 50/30/20 recomienda ahorrar al menos el 20% de tus ingresos.`,
        suggestedAction: 'Revisa tus gastos de entretenimiento y reduce al menos un 10%.',
      });
    }

    recs.push({
      type: 'BUDGET',
      message: 'Crear presupuestos por categoría te ayuda a mantener el control de tus gastos y evitar sorpresas al final del mes.',
      suggestedAction: 'Establece un presupuesto para tu categoría de mayor gasto.',
    });

    return recs;
  }
}
