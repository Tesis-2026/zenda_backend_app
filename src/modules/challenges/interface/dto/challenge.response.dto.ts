import { ApiProperty } from '@nestjs/swagger';
import { ChallengeEntity } from '../../domain/challenge.entity';

export class ChallengeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ nullable: true }) reward!: string | null;
  @ApiProperty({ description: 'Gamification points awarded on completion.' }) pointsReward!: number;
  @ApiProperty({ nullable: true, description: 'Badge name awarded, if any (parsed from `reward`).' }) badgeReward!: string | null;
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
    dto.pointsReward = e.pointsReward;
    // Badge rewards are seeded as "Insignia <name>"; expose just the badge name.
    dto.badgeReward = e.reward?.replace(/^Insignia\s+/i, '').trim() || null;
    dto.status = e.status;
    dto.acceptedAt = e.acceptedAt;
    dto.completedAt = e.completedAt;
    dto.expiresAt = e.expiresAt;
    return dto;
  }
}
