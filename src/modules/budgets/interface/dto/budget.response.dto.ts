export class BudgetResponseDto {
  id!: string;
  userId!: string;
  categoryId!: string | null;
  categoryName!: string | null;
  name!: string | null;
  amountLimit!: number;
  month!: number;
  year!: number;
  currentSpent!: number;
  percentageUsed!: number;
  createdAt!: string;
  updatedAt!: string;
}
