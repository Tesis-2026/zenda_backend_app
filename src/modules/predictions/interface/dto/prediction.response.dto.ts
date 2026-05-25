import { ApiProperty } from '@nestjs/swagger';
import { PredictionEntity } from '../../domain/prediction.entity';

class CategoryPredictionDto {
  @ApiProperty() categoryId!: string;
  @ApiProperty() categoryName!: string;
  @ApiProperty() amount!: number;
}

class ConfidenceIntervalDto {
  @ApiProperty() lower!: number;
  @ApiProperty() upper!: number;
}

export class PredictionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() period!: string;
  @ApiProperty({ enum: ['INCOME', 'EXPENSE'] }) type!: string;
  @ApiProperty() predictedTotal!: number;
  @ApiProperty({ type: [CategoryPredictionDto] }) predictedByCategory!: CategoryPredictionDto[];
  @ApiProperty({ enum: ['high', 'medium', 'low'] }) confidenceLevel!: string;
  @ApiProperty({
    type: ConfidenceIntervalDto,
    description:
      'Numerical band around predictedTotal, derived from confidenceLevel. ' +
      'Lets the frontend draw the band without re-implementing the widths.',
  })
  confidenceInterval!: ConfidenceIntervalDto;
  @ApiProperty() narrative!: string;
  @ApiProperty() modelVersion!: string;
  @ApiProperty({ nullable: true }) actualTotal!: number | null;
  @ApiProperty({ nullable: true }) accuracy!: number | null;
  @ApiProperty() createdAt!: Date;

  static from(entity: PredictionEntity): PredictionResponseDto {
    const dto = new PredictionResponseDto();
    dto.id = entity.id;
    dto.period = entity.period;
    dto.type = entity.type;
    dto.predictedTotal = entity.predictedTotal;
    dto.predictedByCategory = entity.predictedByCategory;
    dto.confidenceLevel = entity.confidenceLevel;
    dto.confidenceInterval = entity.confidenceInterval;
    dto.narrative = entity.narrative;
    dto.modelVersion = entity.modelVersion;
    dto.actualTotal = entity.actualTotal;
    dto.accuracy = entity.accuracy;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
