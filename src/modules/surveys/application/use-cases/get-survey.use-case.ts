import { Injectable, NotFoundException } from '@nestjs/common';
import { ISurveyRepository } from '../../domain/ports/survey.repository';
import { parseSurveyQuestions } from '../../domain/survey-question.types';
import { SurveyType } from '../../domain/survey.types';

export interface SurveyView {
  id: string;
  type: SurveyType;
  questions: { id: string; order: number; text: string; options: string[] }[];
}

@Injectable()
export class GetSurveyUseCase {
  constructor(private readonly repo: ISurveyRepository) {}

  async execute(type: SurveyType): Promise<SurveyView> {
    const survey = await this.repo.findByType(type);
    if (!survey) throw new NotFoundException(`${type} survey not configured`);

    const questions = parseSurveyQuestions(survey.questionsJson);
    return {
      id: survey.id,
      type: survey.type,
      questions: questions.map((q) => ({
        id: q.id,
        order: q.order,
        text: q.text,
        options: q.options,
      })),
    };
  }
}
