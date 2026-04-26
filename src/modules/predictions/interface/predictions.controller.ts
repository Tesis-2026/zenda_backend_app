import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { GetExpensePredictionUseCase } from '../application/use-cases/get-expense-prediction.use-case';
import { GetIncomePredictionUseCase } from '../application/use-cases/get-income-prediction.use-case';
import { PredictionResponseDto } from './dto/prediction.response.dto';

@ApiTags('Predictions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('predictions')
export class PredictionsController {
  constructor(
    private readonly getExpensePrediction: GetExpensePredictionUseCase,
    private readonly getIncomePrediction: GetIncomePredictionUseCase,
  ) {}

  @Get('expenses')
  @ApiOperation({ summary: 'Get expense prediction for next month (US-0801)' })
  async expenses(@UserId() userId: string): Promise<PredictionResponseDto> {
    const entity = await this.getExpensePrediction.execute(userId);
    return PredictionResponseDto.from(entity);
  }

  @Get('income')
  @ApiOperation({ summary: 'Get income prediction for next month (US-0802)' })
  async income(@UserId() userId: string): Promise<PredictionResponseDto> {
    const entity = await this.getIncomePrediction.execute(userId);
    return PredictionResponseDto.from(entity);
  }
}
