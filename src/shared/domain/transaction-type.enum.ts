/**
 * Shared-kernel enum for the income/expense distinction.
 *
 * `TransactionType` is a concept shared by more than one bounded context
 * (transactions own it, categories classify against it). It lives in the
 * shared kernel so neither context has to import the other's domain —
 * cross-context domain imports break the inward-only dependency rule.
 *
 * Values mirror the Prisma `TransactionType` enum so they serialize 1:1;
 * the cast to the Prisma enum happens only at the infrastructure boundary.
 */
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}
