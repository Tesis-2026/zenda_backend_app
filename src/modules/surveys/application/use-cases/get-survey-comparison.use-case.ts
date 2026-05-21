import { Injectable } from '@nestjs/common';
import { ISurveyRepository } from '../../domain/ports/survey.repository';
import { SurveyType } from '../../domain/survey.types';

export interface SurveyComparison {
  preScore: number | null;
  postScore: number | null;
  improvementPercentage: number | null;
}

@Injectable()
export class GetSurveyComparisonUseCase {
  constructor(private readonly repo: ISurveyRepository) {}

  async execute(userId: string): Promise<SurveyComparison> {
    const [preSurvey, postSurvey] = await Promise.all([
      this.repo.findByType(SurveyType.PRE),
      this.repo.findByType(SurveyType.POST),
    ]);

    const [preResponse, postResponse] = await Promise.all([
      preSurvey ? this.repo.findResponse(userId, preSurvey.id) : null,
      postSurvey ? this.repo.findResponse(userId, postSurvey.id) : null,
    ]);

    const preScore = preResponse?.score ?? null;
    const postScore = postResponse?.score ?? null;
    const improvementPercentage =
      preScore !== null && postScore !== null && preScore > 0
        ? Math.round(((postScore - preScore) / preScore) * 100)
        : null;

    return { preScore, postScore, improvementPercentage };
  }
}
