import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { GeneratePdfReportUseCase } from '../application/use-cases/generate-pdf-report.use-case';
import { MonthSummaryDto } from './dto/month-summary.dto';

@ApiTags('Insights')
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly generatePdf: GeneratePdfReportUseCase) {}

  @Get('export/pdf')
  @ApiOperation({ summary: 'Export monthly financial report as PDF' })
  @ApiProduces('application/pdf')
  async exportPdf(
    @UserId() userId: string,
    @Query() query: MonthSummaryDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.generatePdf.execute({
      userId,
      year: query.year,
      month: query.month,
    });

    const filename = `zenda-report-${query.year}-${String(query.month).padStart(2, '0')}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
