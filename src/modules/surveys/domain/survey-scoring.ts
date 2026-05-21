import { SurveyQuestionJson } from './survey-question.types';
import { FinancialLiteracyLevel } from './survey.types';

/// Scores a knowledge survey (PRE/POST) as a 0–100 percentage.
/// If any question declares a correctAnswer, score is the proportion of
/// gradeable questions answered correctly. Otherwise it falls back to a
/// completion score: 100 when every question is answered, 50 if partial.
export function scoreSurveyAnswers(
  questions: SurveyQuestionJson[],
  answers: Record<string, string>,
): number {
  const total = questions.length;
  const gradeable = questions.filter((q) => q.correctAnswer !== null);

  if (gradeable.length > 0) {
    const correct = gradeable.filter((q) => answers[q.id] === q.correctAnswer).length;
    return Math.round((correct / gradeable.length) * 100);
  }

  return total > 0 && Object.keys(answers).length === total ? 100 : 50;
}

export function literacyLevelFromScore(score: number): FinancialLiteracyLevel {
  if (score >= 70) return FinancialLiteracyLevel.HIGH;
  if (score >= 40) return FinancialLiteracyLevel.MEDIUM;
  return FinancialLiteracyLevel.LOW;
}

/// Standard SUS scoring over 10 Likert items: odd-numbered items contribute
/// (raw - 1), even-numbered items contribute (5 - raw); the sum is scaled by 2.5.
export function computeSusScore(
  questions: SurveyQuestionJson[],
  answers: Record<string, string>,
): number {
  let contributionSum = 0;
  for (const question of questions) {
    const raw = parseInt(answers[question.id] ?? '3', 10);
    const contribution = question.order % 2 !== 0 ? raw - 1 : 5 - raw;
    contributionSum += contribution;
  }
  return Math.round(contributionSum * 2.5);
}

export function susGrade(score: number): string {
  if (score >= 85) return 'Excelente';
  if (score >= 70) return 'Bueno';
  if (score >= 50) return 'Regular';
  return 'Bajo';
}
