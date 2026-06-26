export type DetectedAccountType =
  | 'CASH'
  | 'BANK_ACCOUNT'
  | 'DIGITAL_WALLET'
  | 'CREDIT_CARD';

export interface DetectedAccount {
  type: DetectedAccountType;
  name: string;
  confidence: number;
}

export function detectAccountFromText(text?: string | null): DetectedAccount | null {
  const normalized = normalizeText(text ?? '');
  if (!normalized) return null;

  if (/\b(yape|yapear|yapee|plin|plinear|tunki|lukita)\b/.test(normalized)) {
    return { type: 'DIGITAL_WALLET', name: 'Yape / Plin', confidence: 0.92 };
  }

  if (/\b(efectivo|cash|billete|monedas?|sencillo)\b/.test(normalized)) {
    return { type: 'CASH', name: 'Efectivo', confidence: 0.9 };
  }

  if (
    /\b(tarjeta\s+de\s+credito|credito|crediticia|visa|mastercard|amex|cuotas?)\b/.test(
      normalized,
    )
  ) {
    return { type: 'CREDIT_CARD', name: 'Tarjeta de credito', confidence: 0.88 };
  }

  if (
    /\b(banco|cuenta|debito|deposito|transferencia|bcp|bbva|interbank|scotiabank|banbif|nacion)\b/.test(
      normalized,
    )
  ) {
    return { type: 'BANK_ACCOUNT', name: 'Cuenta bancaria', confidence: 0.84 };
  }

  return null;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
