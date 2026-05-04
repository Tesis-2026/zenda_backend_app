import { Module } from '@nestjs/common';
import { AiModule } from '../../infra/ai/ai.module';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { BadgesModule } from '../badges/badges.module';
import { IEducationRepository } from './domain/ports/education.repository';
import { PrismaEducationRepository } from './infrastructure/persistence/prisma-education.repository';
import { ListTopicsUseCase } from './application/use-cases/list-topics.use-case';
import { GetTopicUseCase } from './application/use-cases/get-topic.use-case';
import { CompleteTopicUseCase } from './application/use-cases/complete-topic.use-case';
import { GetQuizUseCase } from './application/use-cases/get-quiz.use-case';
import { SubmitQuizUseCase } from './application/use-cases/submit-quiz.use-case';
import { GetPersonalizedQuizUseCase } from './application/use-cases/get-personalized-quiz.use-case';
import { EducationController, PersonalizedQuizController } from './interface/education.controller';
import { FeedbackController } from './interface/feedback.controller';
import { SurveysController } from './interface/surveys.controller';

@Module({
  imports: [PrismaModule, AiModule, BadgesModule],
  controllers: [EducationController, PersonalizedQuizController, FeedbackController, SurveysController],
  providers: [
    { provide: IEducationRepository, useClass: PrismaEducationRepository },
    ListTopicsUseCase,
    GetTopicUseCase,
    CompleteTopicUseCase,
    GetQuizUseCase,
    SubmitQuizUseCase,
    GetPersonalizedQuizUseCase,
  ],
  exports: [IEducationRepository],
})
export class EducationModule {}
