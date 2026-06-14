import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ApiAuthErrors, ApiValidationError } from '../../../shared/swagger/api-responses.decorator';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { GeneratePdfReportUseCase } from '../application/use-cases/generate-pdf-report.use-case';
import { ReportRangeDto } from './dto/report-range.dto';

@ApiTags('Insights')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly generatePdf: GeneratePdfReportUseCase) {}

  @Get('export/pdf')
  @ApiOperation({ summary: 'Export financial report as PDF over a month range (max 6 months)' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'PDF binary stream (application/pdf)' })
  @ApiValidationError()
  @ApiAuthErrors()
  async exportPdf(
    @UserId() userId: string,
    @Query() query: ReportRangeDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.generatePdf.execute({
      userId,
      fromYear: query.fromYear,
      fromMonth: query.fromMonth,
      toYear: query.toYear,
      toMonth: query.toMonth,
    });

    const fromStr = `${query.fromYear}-${String(query.fromMonth).padStart(2, '0')}`;
    const toStr = `${query.toYear}-${String(query.toMonth).padStart(2, '0')}`;
    const filename =
      fromStr === toStr
        ? `zenda-report-${fromStr}.pdf`
        : `zenda-report-${fromStr}_${toStr}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
