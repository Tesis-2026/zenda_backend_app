// `TransactionType` is a shared-kernel concept (transactions own it, other
// contexts such as categories classify against it). The canonical definition
// lives in `src/shared/domain`; this re-export keeps the transactions-domain
// import path stable for the many call sites inside this context.
export { TransactionType } from '../../../shared/domain/transaction-type.enum';
