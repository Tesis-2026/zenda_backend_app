import { ApiProperty } from '@nestjs/swagger';
import { ChallengeEntity } from '../../domain/challenge.entity';

export class ChallengeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ nullable: true }) reward!: string | null;
  @ApiProperty({ enum: ['AVAILABLE', 'ACTIVE', 'COMPLETED', 'EXPIRED'] }) status!: string;
  @ApiProperty({ nullable: true }) acceptedAt!: Date | null;
  @ApiProperty({ nullable: true }) completedAt!: Date | null;
  @ApiProperty({
    nullable: true,
    description: 'Deadline for an accepted challenge — acceptedAt + durationDays. Null when the challenge is open-ended or not yet accepted.',
  })
  expiresAt!: Date | null;

  static from(e: ChallengeEntity): ChallengeResponseDto {
    const dto = new ChallengeResponseDto();
    dto.id = e.id;
    dto.title = e.title;
    dto.description = e.description;
    dto.reward = e.reward;
    dto.status = e.status;
    dto.acceptedAt = e.acceptedAt;
    dto.completedAt = e.completedAt;
    dto.expiresAt = e.expiresAt;
    return dto;
  }
}
