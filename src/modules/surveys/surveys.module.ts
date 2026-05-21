import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { ISurveyRepository } from './domain/ports/survey.repository';
import { PrismaSurveyRepository } from './infrastructure/persistence/prisma-survey.repository';
import { GetSurveyUseCase } from './application/use-cases/get-survey.use-case';
import { SubmitPreSurveyUseCase } from './application/use-cases/submit-pre-survey.use-case';
import { SubmitPostSurveyUseCase } from './application/use-cases/submit-post-survey.use-case';
import { SubmitSusSurveyUseCase } from './application/use-cases/submit-sus-survey.use-case';
import { GetSurveyComparisonUseCase } from './application/use-cases/get-survey-comparison.use-case';
import { SurveysController } from './interface/surveys.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SurveysController],
  providers: [
    { provide: ISurveyRepository, useClass: PrismaSurveyRepository },
    GetSurveyUseCase,
    SubmitPreSurveyUseCase,
    SubmitPostSurveyUseCase,
    SubmitSusSurveyUseCase,
    GetSurveyComparisonUseCase,
  ],
})
export class SurveysModule {}
