import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { ISavingsGoalRepository } from './domain/ports/savings-goal.repository';
import { PrismaGoalsRepository } from './infrastructure/persistence/prisma-goals.repository';
import { CreateGoalUseCase } from './application/use-cases/create-goal.use-case';
import { ListGoalsUseCase } from './application/use-cases/list-goals.use-case';
import { ContributeToGoalUseCase } from './application/use-cases/contribute-to-goal.use-case';
import { DeleteGoalUseCase } from './application/use-cases/delete-goal.use-case';
import { GoalsController } from './interface/goals.controller';

@Module({
  imports: [PrismaModule],
  controllers: [GoalsController],
  providers: [
    { provide: ISavingsGoalRepository, useClass: PrismaGoalsRepository },
    CreateGoalUseCase,
    ListGoalsUseCase,
    ContributeToGoalUseCase,
    DeleteGoalUseCase,
  ],
})
export class GoalsModule {}
