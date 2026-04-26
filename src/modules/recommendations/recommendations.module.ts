import { Module } from '@nestjs/common';
import { AiModule } from '../../infra/ai/ai.module';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { IRecommendationRepository } from './domain/ports/recommendation.repository';
import { PrismaRecommendationRepository } from './infrastructure/persistence/prisma-recommendation.repository';
import { GetRecommendationsUseCase } from './application/use-cases/get-recommendations.use-case';
import { SubmitFeedbackUseCase } from './application/use-cases/submit-feedback.use-case';
import { RecommendationsController } from './interface/recommendations.controller';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [RecommendationsController],
  providers: [
    { provide: IRecommendationRepository, useClass: PrismaRecommendationRepository },
    GetRecommendationsUseCase,
    SubmitFeedbackUseCase,
  ],
})
export class RecommendationsModule {}
