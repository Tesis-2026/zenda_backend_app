import { ApiProperty } from "@nestjs/swagger";
import { ReceiptItemDto } from "./receipt-item.dto";

export class ReceiptAnalyzeResponseDto {
  @ApiProperty({ nullable: true, example: 12.9 })
  amount!: number | null;

  @ApiProperty({ nullable: true, example: "2026-06-23" })
  date!: string | null;

  @ApiProperty({ nullable: true, example: "18:42:00" })
  time!: string | null;

  @ApiProperty({ nullable: true, example: "Tambo" })
  merchant!: string | null;

  @ApiProperty({ nullable: true, example: 2.32 })
  tax!: number | null;

  @ApiProperty({ type: [ReceiptItemDto] })
  items!: ReceiptItemDto[];

  @ApiProperty({ nullable: true, example: "Food" })
  suggestedCategory!: string | null;

  @ApiProperty({ nullable: true, example: "Visa" })
  paymentMethod!: string | null;

  @ApiProperty({ nullable: true, example: "Tarjeta de credito" })
  suggestedAccountName!: string | null;

  @ApiProperty({
    nullable: true,
    enum: ["CASH", "BANK_ACCOUNT", "DIGITAL_WALLET", "CREDIT_CARD"],
    example: "CREDIT_CARD",
  })
  suggestedAccountType!: string | null;

  @ApiProperty({ example: "Compra en Tambo" })
  note!: string;

  @ApiProperty({ example: 0.84, minimum: 0, maximum: 1 })
  confidence!: number;

  @ApiProperty({
    type: [String],
    example: ["Verifica el monto y la fecha antes de guardar."],
  })
  warnings!: string[];
}
