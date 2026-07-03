import { ApiProperty } from '@nestjs/swagger';

export class UserDataExportResponseDto {
  @ApiProperty({ example: '2026-07-03T09:00:00.000Z' })
  exportedAt!: string;

  @ApiProperty({ example: 'privacy-2026-07-03' })
  privacyPolicyVersion!: string | null;

  @ApiProperty({ example: 'terms-2026-07-03' })
  termsVersion!: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  profile!: Record<string, unknown>;

  @ApiProperty({ type: 'object', additionalProperties: true })
  data!: Record<string, unknown>;
}
