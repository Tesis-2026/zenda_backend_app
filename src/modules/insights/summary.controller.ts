import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserId } from '../auth/decorators/user-id.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MonthSummaryDto } from './dto/month-summary.dto';
import { MonthSummaryResponseDto } from './dto/month-summary.response.dto';
import { SummaryService } from './summary.service';

@ApiTags('summary')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('summary')
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get('month')
  @ApiOperation({ summary: 'Get monthly summary for authenticated user' })
  @ApiQuery({ name: 'year', example: 2026, required: true })
  @ApiQuery({ name: 'month', example: 3, required: true })
  @ApiOkResponse({ type: MonthSummaryResponseDto })
  getMonthSummary(@UserId() userId: string, @Query() query: MonthSummaryDto) {
    return this.summaryService.getMonthSummary(userId, query.year, query.month);
  }
}
