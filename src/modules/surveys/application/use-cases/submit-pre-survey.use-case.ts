import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ISurveyRepository } from '../../domain/ports/survey.repository';
import { parseSurveyQuestions } from '../../domain/survey-question.types';
import {
  literacyLevelFromScore,
  scoreSurveyAnswers,
} from '../../domain/survey-scoring';
import { SurveyType } from '../../domain/survey.types';

@Injectable()
export class SubmitPreSurveyUseCase {
  constructor(private readonly repo: ISurveyRepository) {}

  async execute(
    userId: string,
    answers: Record<string, string>,
  ): Promise<{ score: number; level: string }> {
    const survey = await this.repo.findByType(SurveyType.PRE);
    if (!survey) throw new NotFoundException('PRE survey not configured');

    const existing = await this.repo.findResponse(userId, survey.id);
    if (existing) throw new ConflictException('Survey response already submitted');

    const questions = parseSurveyQuestions(survey.questionsJson);
    const score = scoreSurveyAnswers(questions, answers);
    await this.repo.createResponse({ userId, surveyId: survey.id, answers, score });

    const level = literacyLevelFromScore(score);
    await this.repo.markPreSurveyCompleted(userId, level);

    return { score, level };
  }
}
