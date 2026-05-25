// Shape of a single embedded question inside Survey.questionsJson.
// `id` is a UUID preserved across migrations — SurveyResponse.answersJson uses it as the key.
// `correctAnswer` is null for open-ended questions (e.g., SUS Likert scale).
export interface SurveyQuestionJson {
  id: string;
  order: number;
  text: string;
  options: string[];
  correctAnswer: string | null;
}

// Type guard for runtime validation when reading the JSON column.
export function isSurveyQuestionJson(value: unknown): value is SurveyQuestionJson {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.order === 'number' &&
    typeof v.text === 'string' &&
    Array.isArray(v.options) && v.options.every((o) => typeof o === 'string') &&
    (v.correctAnswer === null || typeof v.correctAnswer === 'string')
  );
}

// Parse + sort a raw JSON value from the database. Drops malformed entries.
export function parseSurveyQuestions(raw: unknown): SurveyQuestionJson[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isSurveyQuestionJson)
    .sort((a, b) => a.order - b.order);
}
