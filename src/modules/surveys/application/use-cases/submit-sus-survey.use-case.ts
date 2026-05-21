import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ISurveyRepository } from '../../domain/ports/survey.repository';
import { parseSurveyQuestions } from '../../domain/survey-question.types';
import { computeSusScore, susGrade } from '../../domain/survey-scoring';
import { SurveyType } from '../../domain/survey.types';

@Injectable()
export class SubmitSusSurveyUseCase {
  constructor(private readonly repo: ISurveyRepository) {}

  async execute(
    userId: string,
    answers: Record<string, string>,
  ): Promise<{ susScore: number; grade: string }> {
    const survey = await this.repo.findByType(SurveyType.SUS);
    if (!survey) throw new NotFoundException('SUS survey not configured');

    const existing = await this.repo.findResponse(userId, survey.id);
    if (existing) throw new ConflictException('SUS survey already submitted');

    const questions = parseSurveyQuestions(survey.questionsJson);
    const susScore = computeSusScore(questions, answers);
    await this.repo.createResponse({
      userId,
      surveyId: survey.id,
      answers,
      score: susScore,
    });

    return { susScore, grade: susGrade(susScore) };
  }
}
