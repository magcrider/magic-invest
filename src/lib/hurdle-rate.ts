/**
 * Cálculo del Hurdle Rate (Tasa de Rechazo)
 *
 * El Hurdle Rate es la tasa mínima que un ETF debe superar para justificar
 * el riesgo adicional vs un CDT. Se calcula usando la Ecuación de Fisher
 * ajustada por devaluación histórica, diferencial de inflación y costos.
 */

/**
 * Calcula la devaluación anualizada del COP frente al USD
 * usando datos históricos de TRM.
 *
 * @param trmHistory Array de {date, trm} ordenado cronológicamente
 * @param years Años a considerar para el cálculo (default: 5)
 * @returns Tasa de devaluación anualizada (ej: 0.05 = 5%)
 */
export function calculateDevaluation(
  trmHistory: Array<{ date: string; trm: number }>,
  years: number = 5
): number {
  if (trmHistory.length < 2) {
    // Fallback: devaluación histórica promedio Colombia (aproximado)
    return 0.045; // 4.5% anual
  }

  // Obtener TRM inicial y final del periodo
  const endTrm = trmHistory[trmHistory.length - 1].trm;
  const startTrm = trmHistory[0].trm;

  // Calcular tasa de crecimiento anualizada (CAGR de TRM)
  const totalYears = years;
  const devaluationRate = Math.pow(endTrm / startTrm, 1 / totalYears) - 1;

  return devaluationRate;
}

/**
 * Calcula el Hurdle Rate usando la Ecuación de Fisher ajustada.
 *
 * Fórmula simplificada:
 * Hurdle Rate ≈ CDT_rate + Devaluación - (Inflación_COP - Inflación_USD) - TER
 *
 * @param cdtRate Tasa CDT promedio mercado (360 días, en decimal ej: 0.11 = 11%)
 * @param devaluationRate Tasa de devaluación histórica COP/USD (decimal)
 * @param inflationCOP Inflación anual Colombia (decimal)
 * @param inflationUSD Inflación anual USA (decimal)
 * @param ter Total Expense Ratio del ETF (decimal, ej: 0.0003 = 0.03%)
 * @returns Hurdle Rate en decimal (ej: 0.095 = 9.5%)
 */
export function calculateHurdleRate({
  cdtRate,
  devaluationRate,
  inflationCOP,
  inflationUSD,
  ter = 0,
}: {
  cdtRate: number;
  devaluationRate: number;
  inflationCOP: number;
  inflationUSD: number;
  ter?: number;
}): number {
  // Ecuación de Fisher ajustada
  // La devaluación favorece al ETF (suma)
  // El diferencial de inflación penaliza si COP > USD (resta)
  const inflationDiff = inflationCOP - inflationUSD;

  const hurdleRate = cdtRate + devaluationRate - inflationDiff - ter;

  return hurdleRate;
}

/**
 * Calcula el Hurdle Rate simplificado para mostrar en UI
 * (sin TER específico de cada ETF, usa promedio representativo)
 *
 * @returns Objeto con hurdle rate y componentes del cálculo
 */
export function calculatePortfolioHurdleRate({
  cdtRate,
  devaluationRate,
  inflationCOP,
  inflationUSD = 0.03, // Default: 3% inflación USA promedio
}: {
  cdtRate: number;
  devaluationRate: number;
  inflationCOP: number;
  inflationUSD?: number;
}): {
  hurdleRate: number;
  components: {
    cdtRate: number;
    devaluationRate: number;
    inflationCOP: number;
    inflationUSD: number;
    inflationDiff: number;
  };
} {
  const avgTER = 0.0005; // 0.05% promedio ETFs indexados (VOO, VTI, etc)
  const inflationDiff = inflationCOP - inflationUSD;

  const hurdleRate = calculateHurdleRate({
    cdtRate,
    devaluationRate,
    inflationCOP,
    inflationUSD,
    ter: avgTER,
  });

  return {
    hurdleRate,
    components: {
      cdtRate,
      devaluationRate,
      inflationCOP,
      inflationUSD,
      inflationDiff,
    },
  };
}
