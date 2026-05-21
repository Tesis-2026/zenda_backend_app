import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ISurveyRepository } from '../../domain/ports/survey.repository';
import { parseSurveyQuestions } from '../../domain/survey-question.types';
import {
  literacyLevelFromScore,
  scoreSurveyAnswers,
} from '../../domain/survey-scoring';
import { SurveyType } from '../../domain/survey.types';

@Injectable()
export class SubmitPostSurveyUseCase {
  constructor(private readonly repo: ISurveyRepository) {}

  async execute(
    userId: string,
    answers: Record<string, string>,
  ): Promise<{ score: number; level: string; improvement: number | null }> {
    const survey = await this.repo.findByType(SurveyType.POST);
    if (!survey) throw new NotFoundException('POST survey not configured');

    const existing = await this.repo.findResponse(userId, survey.id);
    if (existing) throw new ConflictException('Survey response already submitted');

    const questions = parseSurveyQuestions(survey.questionsJson);
    const score = scoreSurveyAnswers(questions, answers);
    await this.repo.createResponse({ userId, surveyId: survey.id, answers, score });

    const preSurvey = await this.repo.findByType(SurveyType.PRE);
    const preResponse = preSurvey
      ? await this.repo.findResponse(userId, preSurvey.id)
      : null;
    const improvement =
      preResponse?.score != null
        ? Number((score - preResponse.score).toFixed(2))
        : null;

    return { score, level: literacyLevelFromScore(score), improvement };
  }
}
