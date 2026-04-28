import { ApiProperty } from '@nestjs/swagger';
import { BadgeEntity } from '../../domain/badge.entity';

export class BadgeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty() criteria!: string;
  @ApiProperty({ nullable: true }) iconUrl!: string | null;
  @ApiProperty() isEarned!: boolean;
  @ApiProperty({ nullable: true }) earnedAt!: Date | null;

  static from(e: BadgeEntity): BadgeResponseDto {
    const dto = new BadgeResponseDto();
    dto.id = e.id;
    dto.name = e.name;
    dto.description = e.description;
    dto.criteria = e.criteria;
    dto.iconUrl = e.iconUrl;
    dto.isEarned = e.isEarned;
    dto.earnedAt = e.earnedAt;
    return dto;
  }
}
