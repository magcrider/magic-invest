export type Currency = 'COP' | 'USD';

export function formatCurrency(value: number, currency: Currency): string {
  if (currency === 'COP') {
    return '$ ' + Math.round(value).toLocaleString('es-CO') + ' COP';
  }
  return '$ ' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPercent(value: number): string {
  return value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %';
}

export function formatMonths(months: number): string {
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} año${years !== 1 ? 's' : ''}`);
  if (rem > 0) parts.push(`${rem} mes${rem !== 1 ? 'es' : ''}`);
  return parts.join(' ') || 'menos de 1 mes';
}

export function abbreviateValue(value: number, currency: Currency): string {
  if (currency === 'COP') {
    if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B';
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
    if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K';
    return Math.round(value).toString();
  }
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
  return value.toFixed(0);
}

export function parseNumber(raw: string): number {
  const cleaned = raw.replace(/[^0-9.,]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
