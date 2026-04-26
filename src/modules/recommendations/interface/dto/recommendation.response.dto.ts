import { ApiProperty } from '@nestjs/swagger';
import { RecommendationEntity } from '../../domain/recommendation.entity';

export class RecommendationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ['SAVINGS', 'BUDGET', 'GOAL'] }) type!: string;
  @ApiProperty() message!: string;
  @ApiProperty({ nullable: true }) suggestedAction!: string | null;
  @ApiProperty({ nullable: true }) feedbackAccepted!: boolean | null;
  @ApiProperty() createdAt!: Date;

  static from(e: RecommendationEntity): RecommendationResponseDto {
    const dto = new RecommendationResponseDto();
    dto.id = e.id;
    dto.type = e.type;
    dto.message = e.message;
    dto.suggestedAction = e.suggestedAction;
    dto.feedbackAccepted = e.feedbackAccepted;
    dto.createdAt = e.createdAt;
    return dto;
  }
}
