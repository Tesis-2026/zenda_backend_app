import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SuccessResponseDto } from '../../common/dto/success-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserId } from '../auth/decorators/user-id.decorator';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { TransactionResponseDto } from './dto/transaction.response.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create transaction for authenticated user' })
  @ApiBody({ type: CreateTransactionDto })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error, invalid category, or categoryId and newCategoryName sent together' })
  create(@UserId() userId: string, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List transactions by filters for authenticated user' })
  @ApiQuery({ name: 'from', required: false, example: '2026-03-01T00:00:00.000Z' })
  @ApiQuery({ name: 'to', required: false, example: '2026-03-31T23:59:59.999Z' })
  @ApiQuery({ name: 'type', required: false, enum: ['expense', 'income'] })
  @ApiQuery({ name: 'categoryId', required: false, example: '8f87bc0f-f046-4e90-bbf9-ed18ed1699a8' })
  @ApiOkResponse({ type: TransactionResponseDto, isArray: true })
  findAll(@UserId() userId: string, @Query() query: ListTransactionsDto) {
    return this.transactionsService.findAll(userId, query);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete transaction of authenticated user' })
  @ApiParam({ name: 'id', example: '0403f4f8-f5e0-4f9b-b9e8-36c33320e8be' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiNotFoundResponse({ description: 'Transaction not found' })
  remove(@UserId() userId: string, @Param('id') id: string) {
    return this.transactionsService.remove(userId, id);
  }
}
