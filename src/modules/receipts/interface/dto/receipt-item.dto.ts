import { ApiProperty } from "@nestjs/swagger";

export class ReceiptItemDto {
  @ApiProperty({ nullable: true, example: "Galleta" })
  name!: string | null;

  @ApiProperty({ nullable: true, example: 2.5 })
  amount!: number | null;

  @ApiProperty({ nullable: true, example: 1 })
  quantity!: number | null;
}
