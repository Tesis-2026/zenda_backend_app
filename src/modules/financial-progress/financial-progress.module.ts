import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { GetCurrentPeriodProgressUseCase } from './application/use-cases/get-current-period-progress.use-case';
import { ListUserProgressUseCase } from './application/use-cases/list-user-progress.use-case';
import { IFinancialProgressRepository } from './domain/ports/financial-progress.repository';
import { PrismaFinancialProgressRepository } from './infrastructure/persistence/prisma-financial-progress.repository';
import { FinancialProgressController } from './interface/financial-progress.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FinancialProgressController],
  providers: [
    { provide: IFinancialProgressRepository, useClass: PrismaFinancialProgressRepository },
    ListUserProgressUseCase,
    GetCurrentPeriodProgressUseCase,
  ],
  exports: [IFinancialProgressRepository],
})
export class FinancialProgressModule {}
