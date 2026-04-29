import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { BadgesModule } from '../badges/badges.module';
import { CategoriesModule } from '../categories/categories.module';
import { ITransactionRepository } from './domain/ports/transaction.repository';
import { PrismaTransactionRepository } from './infrastructure/persistence/prisma-transaction.repository';
import { CreateTransactionUseCase } from './application/use-cases/create-transaction.use-case';
import { ListTransactionsUseCase } from './application/use-cases/list-transactions.use-case';
import { DeleteTransactionUseCase } from './application/use-cases/delete-transaction.use-case';
import { GetTransactionUseCase } from './application/use-cases/get-transaction.use-case';
import { UpdateTransactionUseCase } from './application/use-cases/update-transaction.use-case';
import { TransactionsController } from './interface/transactions.controller';

@Module({
  imports: [PrismaModule, CategoriesModule, BadgesModule],
  controllers: [TransactionsController],
  providers: [
    { provide: ITransactionRepository, useClass: PrismaTransactionRepository },
    CreateTransactionUseCase,
    ListTransactionsUseCase,
    DeleteTransactionUseCase,
    GetTransactionUseCase,
    UpdateTransactionUseCase,
  ],
  exports: [ITransactionRepository],
})
export class TransactionsModule {}
