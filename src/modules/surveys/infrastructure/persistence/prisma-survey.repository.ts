import { Injectable } from '@nestjs/common';
import {
  FinancialLiteracyLevel as PrismaFinancialLiteracyLevel,
  SurveyType as PrismaSurveyType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import {
  ISurveyRepository,
  SurveyRecord,
  SurveyResponseRecord,
} from '../../domain/ports/survey.repository';
import { FinancialLiteracyLevel, SurveyType } from '../../domain/survey.types';

@Injectable()
export class PrismaSurveyRepository implements ISurveyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByType(type: SurveyType): Promise<SurveyRecord | null> {
    const survey = await this.prisma.survey.findFirst({
      where: { type: type as PrismaSurveyType },
    });
    if (!survey) return null;
    return {
      id: survey.id,
      type: survey.type as SurveyType,
      questionsJson: survey.questionsJson,
    };
  }

  async findResponse(
    userId: string,
    surveyId: string,
  ): Promise<SurveyResponseRecord | null> {
    const response = await this.prisma.surveyResponse.findUnique({
      where: { userId_surveyId: { userId, surveyId } },
    });
    if (!response) return null;
    return { score: response.score ? response.score.toNumber() : null };
  }

  async createResponse(params: {
    userId: string;
    surveyId: string;
    answers: Record<string, string>;
    score: number;
  }): Promise<void> {
    await this.prisma.surveyResponse.create({
      data: {
        userId: params.userId,
        surveyId: params.surveyId,
        answersJson: params.answers,
        score: new Decimal(params.score),
      },
    });
  }

  async markPreSurveyCompleted(
    userId: string,
    level: FinancialLiteracyLevel,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        financialLiteracyLevel: level as PrismaFinancialLiteracyLevel,
        profileCompleted: true,
      },
    });
  }
}
