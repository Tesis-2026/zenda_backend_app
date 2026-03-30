import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { IBudgetRepository } from './domain/ports/budget.repository';
import { PrismaBudgetsRepository } from './infrastructure/persistence/prisma-budgets.repository';
import { CreateBudgetUseCase } from './application/use-cases/create-budget.use-case';
import { ListBudgetsUseCase } from './application/use-cases/list-budgets.use-case';
import { UpdateBudgetUseCase } from './application/use-cases/update-budget.use-case';
import { DeleteBudgetUseCase } from './application/use-cases/delete-budget.use-case';
import { BudgetsController } from './interface/budgets.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BudgetsController],
  providers: [
    { provide: IBudgetRepository, useClass: PrismaBudgetsRepository },
    CreateBudgetUseCase,
    ListBudgetsUseCase,
    UpdateBudgetUseCase,
    DeleteBudgetUseCase,
  ],
})
export class BudgetsModule {}
