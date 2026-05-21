// Domain enums for the Surveys bounded context. Mirror the Prisma enum values
// but stay free of any @prisma/client import (domain purity). The mapping to the
// persistence enums happens at the repository boundary.
export enum SurveyType {
  PRE = 'PRE',
  POST = 'POST',
  SUS = 'SUS',
}

export enum FinancialLiteracyLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}
