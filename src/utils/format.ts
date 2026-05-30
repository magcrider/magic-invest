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

// ─────────────────────────────────────────────────────────────────────────────
// Input formatting utilities
// ─────────────────────────────────────────────────────────────────────────────

export type InputType = 'currency-cop' | 'currency-usd' | 'decimal' | 'integer' | 'percent';

/**
 * Sanitiza y formatea input del usuario según el tipo de dato.
 * Previene letras, ceros a la izquierda innecesarios y formatos inválidos.
 */
export function formatInput(raw: string, type: InputType, currentValue: string): string {
  // Si está borrando todo, permitir string vacío
  if (raw === '') return '';

  switch (type) {
    case 'currency-cop':
      return formatCurrencyInput(raw, 'COP');
    case 'currency-usd':
      return formatCurrencyInput(raw, 'USD');
    case 'integer':
      return formatIntegerInput(raw);
    case 'decimal':
    case 'percent':
      return formatDecimalInput(raw);
    default:
      return raw;
  }
}

/**
 * Formatea input de moneda con separadores de miles.
 * COP: solo enteros, formato "2.000.000"
 * USD: permite decimales, formato "2,000.50"
 */
function formatCurrencyInput(raw: string, currency: Currency): string {
  // Remover todo excepto dígitos y punto decimal (solo para USD)
  const onlyDigits = currency === 'COP'
    ? raw.replace(/\D/g, '')
    : raw.replace(/[^0-9.]/g, '');

  if (!onlyDigits) return '';

  if (currency === 'COP') {
    // COP: solo enteros, sin decimales
    const num = parseInt(onlyDigits, 10);
    if (isNaN(num)) return '';
    // Prevenir ceros a la izquierda: "0123" → "123"
    return num.toLocaleString('es-CO');
  } else {
    // USD: permite hasta 2 decimales
    const parts = onlyDigits.split('.');
    const intPart = parts[0] ? parseInt(parts[0], 10).toLocaleString('en-US') : '0';
    const decPart = parts[1] ? parts[1].slice(0, 2) : '';

    // Si el usuario está escribiendo el punto, mantenerlo
    if (raw.endsWith('.') && !raw.endsWith('..')) {
      return intPart + '.';
    }

    return decPart ? `${intPart}.${decPart}` : intPart;
  }
}

/**
 * Formatea input de números enteros sin separadores.
 * Previene ceros a la izquierda y letras.
 */
function formatIntegerInput(raw: string): string {
  const onlyDigits = raw.replace(/\D/g, '');
  if (!onlyDigits) return '';

  // Prevenir ceros a la izquierda: "0123" → "123"
  const num = parseInt(onlyDigits, 10);
  if (isNaN(num)) return '';

  return num.toString();
}

/**
 * Formatea input de números decimales (tasas, porcentajes, multiplicadores).
 * Permite un solo punto decimal, máximo 4 decimales.
 */
function formatDecimalInput(raw: string): string {
  // Remover todo excepto dígitos y primer punto
  let cleaned = raw.replace(/[^0-9.]/g, '');

  // Permitir solo un punto decimal
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }

  if (!cleaned || cleaned === '.') return cleaned === '.' ? '0.' : '';

  // Split en parte entera y decimal
  const [intPart, decPart] = cleaned.split('.');

  // Prevenir ceros a la izquierda en parte entera (excepto "0.")
  let formattedInt = intPart ? parseInt(intPart, 10).toString() : '0';

  // Limitar decimales a 4 dígitos
  const formattedDec = decPart ? decPart.slice(0, 4) : '';

  // Si el usuario está escribiendo el punto, mantenerlo
  if (raw.endsWith('.') && !raw.endsWith('..')) {
    return formattedInt + '.';
  }

  return formattedDec ? `${formattedInt}.${formattedDec}` : formattedInt;
}

/**
 * Extrae el valor numérico de un input formateado.
 * Remueve separadores de miles y convierte a número.
 */
export function parseFormattedInput(formatted: string): number {
  const cleaned = formatted.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
