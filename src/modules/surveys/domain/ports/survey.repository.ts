import { FinancialLiteracyLevel, SurveyType } from '../survey.types';

export interface SurveyRecord {
  id: string;
  type: SurveyType;
  questionsJson: unknown;
}

export interface SurveyResponseRecord {
  score: number | null;
}

export abstract class ISurveyRepository {
  abstract findByType(type: SurveyType): Promise<SurveyRecord | null>;
  abstract findResponse(
    userId: string,
    surveyId: string,
  ): Promise<SurveyResponseRecord | null>;
  abstract createResponse(params: {
    userId: string;
    surveyId: string;
    answers: Record<string, string>;
    score: number;
  }): Promise<void>;
  abstract markPreSurveyCompleted(
    userId: string,
    level: FinancialLiteracyLevel,
  ): Promise<void>;
}
