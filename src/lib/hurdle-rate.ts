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
 * Calcula el Hurdle Rate usando ecuación rigurosa de equivalencia de retornos.
 *
 * Fórmula correcta (Winston, 2026-06-04):
 * (1 + R_ETF - TER)(1 + e) = 1 + (R_CDT × 0.96)
 *
 * Despejando R_Hurdle_USD:
 * R_Hurdle_USD = [(R_CDT × 0.96) - e] / (1 + e) + TER
 *
 * Donde:
 * - R_CDT × 0.96: Rentabilidad neta CDT después de retefuente 4%
 * - e: Tasa de devaluación anualizada COP/USD
 * - TER: Total Expense Ratio del ETF (reduce retorno neto)
 *
 * Lógica económica:
 * 1. Si COP se devalúa (+e), dólar sube → ETF gana valor en pesos → requiere MENOR rentabilidad USD
 * 2. TER reduce retorno del ETF → requiere MAYOR rentabilidad bruta para igualar CDT neto
 * 3. Inflación diferencial redundante: ambos activos se evalúan en su retorno real COP
 *
 * @param cdtRate Tasa CDT promedio mercado (360 días, en decimal ej: 0.11 = 11%)
 * @param devaluationRate Tasa de devaluación histórica COP/USD (decimal, ej: 0.05 = 5%)
 * @param ter Total Expense Ratio del ETF (decimal, ej: 0.0003 = 0.03%)
 * @returns Hurdle Rate en decimal (ej: 0.095 = 9.5%)
 */
export function calculateHurdleRate({
  cdtRate,
  devaluationRate,
  ter = 0,
}: {
  cdtRate: number;
  devaluationRate: number;
  ter?: number;
}): number {
  // 1. CDT neto después de retefuente 4% sobre rendimientos
  const cdtNet = cdtRate * 0.96;

  // 2. Ecuación rigurosa: ajuste por devaluación (divisor) + TER (sumando)
  const hurdleRate = (cdtNet - devaluationRate) / (1 + devaluationRate) + ter;

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
}: {
  cdtRate: number;
  devaluationRate: number;
}): {
  hurdleRate: number;
  components: {
    cdtRate: number;
    cdtNet: number;
    devaluationRate: number;
    avgTER: number;
  };
} {
  const avgTER = 0.0005; // 0.05% promedio ETFs indexados (VOO, VTI, etc)

  const hurdleRate = calculateHurdleRate({
    cdtRate,
    devaluationRate,
    ter: avgTER,
  });

  return {
    hurdleRate,
    components: {
      cdtRate,
      cdtNet: cdtRate * 0.96, // CDT después de retefuente 4%
      devaluationRate,
      avgTER,
    },
  };
}
