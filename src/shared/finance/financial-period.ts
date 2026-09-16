import { BadRequestException } from '@nestjs/common';

// The pilot is scoped to Lima (UTC-05:00). Never use the server's local zone.
const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000;
export const DAY_MS = 86_400_000;

export function financialDateKey(instant: Date): string {
  return new Date(instant.getTime() + LIMA_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

export function financialMonth(instant = new Date()): {
  year: number;
  month: number;
} {
  const [year, month] = financialDateKey(instant).split('-').map(Number);
  return { year, month };
}

export function financialMonthBounds(
  year: number,
  month: number,
): { from: Date; to: Date } {
  return {
    from: new Date(Date.UTC(year, month - 1, 1) - LIMA_OFFSET_MS),
    to: new Date(Date.UTC(year, month, 1) - LIMA_OFFSET_MS - 1),
  };
}

export function financialDayBounds(date: string): { from: Date; to: Date } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BadRequestException('date must be a valid YYYY-MM-DD date');
  }
  const from = new Date(`${date}T00:00:00-05:00`);
  if (Number.isNaN(from.getTime()) || financialDateKey(from) !== date) {
    throw new BadRequestException('date must be a valid calendar date');
  }
  return { from, to: new Date(from.getTime() + DAY_MS - 1) };
}

export function financialWeekBounds(
  year: number,
  week: number,
): { from: Date; to: Date } {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = jan4.getTime() - ((jan4.getUTCDay() || 7) - 1) * DAY_MS;
  const from = new Date(monday + (week - 1) * 7 * DAY_MS - LIMA_OFFSET_MS);
  return { from, to: new Date(from.getTime() + 7 * DAY_MS - 1) };
}

export function moneyDifference(income: number, expense: number): number {
  return (Math.round(income * 100) - Math.round(expense * 100)) / 100;
}
