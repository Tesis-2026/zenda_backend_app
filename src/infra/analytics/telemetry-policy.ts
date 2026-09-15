// Only bounded non-content measurements are accepted. Identifiers and answers
// belong in their operational/research tables, never in event metadata.
const NUMERIC_FIELDS = new Set([
  'duration_ms',
  'latency_ms',
  'latencyMs',
  'messageLength',
  'score',
  'rating',
  'confidence',
  'question_count',
  'susScore',
  'averageLikert',
  'likertCount',
  'qualitativeCount',
]);
const BOOLEAN_FIELDS = new Set([
  'usedRag',
  'helpful',
  'clear',
  'personalized',
  'has_account',
  'has_budget',
  'success',
]);
const ENUM_FIELDS: Record<string, readonly string[]> = {
  screen: [
    'dashboard',
    'transactions',
    'reports',
    'education',
    'research',
    'profile',
    'goals',
    'budgets',
    'chat',
  ],
  kind: ['income', 'expense', 'transfer'],
  type: ['INCOME', 'EXPENSE', 'TRANSFER'],
  source: ['manual', 'voice', 'ocr', 'MANUAL', 'VOICE', 'OCR'],
  language: ['es', 'en'],
  mode: ['foundry_agent', 'classic_agent', 'fallback'],
  app_env: ['dev', 'prod', 'staging'],
  field: ['amount', 'date', 'merchant', 'currency', 'category'],
};

export function safeTelemetryMetadata(
  input: Record<string, unknown> = {},
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (
      NUMERIC_FIELDS.has(key) &&
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 86_400_000
    )
      result[key] = value;
    if (BOOLEAN_FIELDS.has(key) && typeof value === 'boolean')
      result[key] = value;
    if (typeof value === 'string' && ENUM_FIELDS[key]?.includes(value))
      result[key] = value;
  }
  return result;
}
