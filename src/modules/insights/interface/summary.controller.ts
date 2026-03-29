import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { GetMonthSummaryUseCase } from '../application/use-cases/get-month-summary.use-case';
import { MonthSummaryDto } from './dto/month-summary.dto';
import { MonthSummaryResponseDto } from './dto/month-summary.response.dto';

@ApiTags('Insights')
@UseGuards(JwtAuthGuard)
@Controller('summary')
export class SummaryController {
  constructor(private readonly getMonthSummary: GetMonthSummaryUseCase) {}

  @Get('month')
  @ApiOperation({ summary: 'Get income/expense summary for a given month' })
  getMonth(
    @UserId() userId: string,
    @Query() query: MonthSummaryDto,
  ): Promise<MonthSummaryResponseDto> {
    return this.getMonthSummary.execute({
      userId,
      year: query.year,
      month: query.month,
    });
  }
}
