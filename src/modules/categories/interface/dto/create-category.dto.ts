import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Alimentación', maxLength: 40 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name!: string;
}
