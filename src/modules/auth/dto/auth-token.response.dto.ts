import { ApiProperty } from '@nestjs/swagger';

export class AuthTokenResponseDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3M2FlNzY2OC0xYzVmLTRiN2EtYTE2ZC00MjBhNmE2YTViOTAiLCJlbWFpbCI6InVzZXJAemVuZGEucGUiLCJpYXQiOjE3MDk0NTQ0MDAsImV4cCI6MTcwOTk1OTIwMH0.signature',
  })
  accessToken!: string;
}
