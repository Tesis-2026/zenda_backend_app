import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min } from 'class-validator';

export class ClassifyTransactionDto {
  @ApiProperty({ example: 'Coffee at Starbucks' })
  @IsString()
  description!: string;

  @ApiProperty({ example: 12.5 })
  @IsNumber()
  @Min(0)
  amount!: number;
}
