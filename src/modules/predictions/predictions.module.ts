import { Module } from '@nestjs/common';
import { AiModule } from '../../infra/ai/ai.module';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { BadgesModule } from '../badges/badges.module';
import { IPredictionRepository } from './domain/ports/prediction.repository';
import { PrismaPredictionRepository } from './infrastructure/persistence/prisma-prediction.repository';
import { GetExpensePredictionUseCase } from './application/use-cases/get-expense-prediction.use-case';
import { PredictionsController } from './interface/predictions.controller';

@Module({
  imports: [PrismaModule, AiModule, BadgesModule],
  controllers: [PredictionsController],
  providers: [
    { provide: IPredictionRepository, useClass: PrismaPredictionRepository },
    GetExpensePredictionUseCase,
  ],
  exports: [IPredictionRepository],
})
export class PredictionsModule {}
