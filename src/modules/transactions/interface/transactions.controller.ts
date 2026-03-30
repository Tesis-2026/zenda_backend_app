import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { CreateTransactionUseCase } from '../application/use-cases/create-transaction.use-case';
import { ListTransactionsUseCase } from '../application/use-cases/list-transactions.use-case';
import { DeleteTransactionUseCase } from '../application/use-cases/delete-transaction.use-case';
import { GetTransactionUseCase } from '../application/use-cases/get-transaction.use-case';
import { UpdateTransactionUseCase } from '../application/use-cases/update-transaction.use-case';
import { TransactionWithCategory } from '../domain/ports/transaction.repository';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionResponseDto } from './dto/transaction.response.dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createTransaction: CreateTransactionUseCase,
    private readonly listTransactions: ListTransactionsUseCase,
    private readonly deleteTransaction: DeleteTransactionUseCase,
    private readonly getTransaction: GetTransactionUseCase,
    private readonly updateTransaction: UpdateTransactionUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a transaction' })
  async create(
    @UserId() userId: string,
    @Body() dto: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    const result = await this.createTransaction.execute({ userId, ...dto });
    return this.toResponse(result);
  }

  @Get()
  @ApiOperation({ summary: 'List transactions with optional filters' })
  async findAll(
    @UserId() userId: string,
    @Query() query: ListTransactionsDto,
  ): Promise<TransactionResponseDto[]> {
    const results = await this.listTransactions.execute({ userId, ...query });
    return results.map((r) => this.toResponse(r));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction by id' })
  async findOne(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransactionResponseDto> {
    const result = await this.getTransaction.execute(id, userId);
    return this.toResponse(result);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a transaction' })
  async update(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<TransactionResponseDto> {
    const result = await this.updateTransaction.execute({ id, userId, ...dto });
    return this.toResponse(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a transaction' })
  remove(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.deleteTransaction.execute(userId, id);
  }

  private toResponse(t: TransactionWithCategory): TransactionResponseDto {
    return {
      id: t.id,
      userId: t.userId,
      categoryId: t.categoryId,
      type: t.type.toLowerCase() as 'income' | 'expense',
      currency: t.currency,
      amount: t.amount,
      description: t.description ?? '',
      occurredAt: t.occurredAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      deletedAt: t.deletedAt?.toISOString() ?? null,
      category: t.category,
    };
  }
}
