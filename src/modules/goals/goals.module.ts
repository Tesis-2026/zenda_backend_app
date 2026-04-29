import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { BadgesModule } from '../badges/badges.module';
import { ISavingsGoalRepository } from './domain/ports/savings-goal.repository';
import { PrismaGoalsRepository } from './infrastructure/persistence/prisma-goals.repository';
import { CreateGoalUseCase } from './application/use-cases/create-goal.use-case';
import { ListGoalsUseCase } from './application/use-cases/list-goals.use-case';
import { ContributeToGoalUseCase } from './application/use-cases/contribute-to-goal.use-case';
import { CompleteGoalUseCase } from './application/use-cases/complete-goal.use-case';
import { DeleteGoalUseCase } from './application/use-cases/delete-goal.use-case';
import { ListGoalContributionsUseCase } from './application/use-cases/list-goal-contributions.use-case';
import { GoalsController } from './interface/goals.controller';

@Module({
  imports: [PrismaModule, BadgesModule],
  controllers: [GoalsController],
  providers: [
    { provide: ISavingsGoalRepository, useClass: PrismaGoalsRepository },
    CreateGoalUseCase,
    ListGoalsUseCase,
    ContributeToGoalUseCase,
    CompleteGoalUseCase,
    DeleteGoalUseCase,
    ListGoalContributionsUseCase,
  ],
})
export class GoalsModule {}
