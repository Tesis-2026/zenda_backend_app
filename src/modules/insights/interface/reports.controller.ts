import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ApiAuthErrors, ApiValidationError } from '../../../shared/swagger/api-responses.decorator';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { GeneratePdfReportUseCase } from '../application/use-cases/generate-pdf-report.use-case';
import { MonthSummaryDto } from './dto/month-summary.dto';

@ApiTags('Insights')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly generatePdf: GeneratePdfReportUseCase) {}

  @Get('export/pdf')
  @ApiOperation({ summary: 'Export monthly financial report as PDF' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'PDF binary stream (application/pdf)' })
  @ApiValidationError()
  @ApiAuthErrors()
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
