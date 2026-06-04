/**
 * Sistema de Rebalanceo — Funciones de Cálculo
 *
 * Implementa la lógica matemática para:
 * - Calcular asignación actual (% CDT vs ETF)
 * - Evaluar desviación vs bandas objetivo
 * - Generar escenarios de rebalanceo
 * - Estimar costos de transacción
 */

import type { AllocationBands } from '@/types/database'

export interface CurrentAllocation {
  cdtPercentage: number
  etfPercentage: number
  cdtValueCOP: number
  etfValueCOP: number
  totalValueCOP: number
}

export interface DeviationAnalysis {
  isOutOfBands: boolean
  cdtDeviation: number  // negativo si bajo mínimo, positivo si sobre máximo
  etfDeviation: number
  severity: 'none' | 'minor' | 'moderate' | 'severe'
}

export interface RebalancingScenario {
  name: string
  description: string
  action: 'maintain' | 'rebalance'
  targetCdtPercentage: number
  targetEtfPercentage: number
  cdtToSell?: number  // COP
  cdtToBuy?: number   // COP
  etfToSell?: number  // USD
  etfToBuy?: number   // USD
  estimatedCommission: number  // COP
  estimatedSpread: number      // COP
  totalCost: number            // COP
  newHurdleRate?: number
  capitalGain?: number         // USD (solo si vende ETF)
}

/**
 * Presets de bandas de asignación
 */
export const ALLOCATION_PRESETS: Record<string, AllocationBands> = {
  conservative: {
    cdt_min: 70,
    cdt_max: 80,
    etf_min: 20,
    etf_max: 30,
  },
  moderate: {
    cdt_min: 50,
    cdt_max: 70,
    etf_min: 30,
    etf_max: 50,
  },
  aggressive: {
    cdt_min: 30,
    cdt_max: 50,
    etf_min: 50,
    etf_max: 70,
  },
}

/**
 * Constantes de costos (según consenso Winston)
 */
export const TRANSACTION_COSTS = {
  ETF_COMMISSION_RATE: 0.005,  // 0.5% sobre valor operado
  FX_SPREAD_RATE: 0.003,       // 0.3% spread USD/COP
  CDT_COMMISSION: 0,           // Sin comisión
}

/**
 * Calcula la asignación actual del portafolio
 */
export function calculateCurrentAllocation(
  cdtValueCOP: number,
  etfValueCOP: number
): CurrentAllocation {
  const totalValueCOP = cdtValueCOP + etfValueCOP

  if (totalValueCOP === 0) {
    return {
      cdtPercentage: 0,
      etfPercentage: 0,
      cdtValueCOP: 0,
      etfValueCOP: 0,
      totalValueCOP: 0,
    }
  }

  return {
    cdtPercentage: (cdtValueCOP / totalValueCOP) * 100,
    etfPercentage: (etfValueCOP / totalValueCOP) * 100,
    cdtValueCOP,
    etfValueCOP,
    totalValueCOP,
  }
}

/**
 * Analiza desviación respecto a bandas objetivo
 *
 * Retorna desviación en puntos porcentuales:
 * - Negativo: está por debajo del mínimo
 * - Positivo: está por encima del máximo
 * - 0: dentro de rango
 */
export function analyzeDeviation(
  current: CurrentAllocation,
  bands: AllocationBands
): DeviationAnalysis {
  let cdtDeviation = 0
  let etfDeviation = 0

  // Calcular desviación CDT
  if (current.cdtPercentage < bands.cdt_min) {
    cdtDeviation = current.cdtPercentage - bands.cdt_min  // negativo
  } else if (current.cdtPercentage > bands.cdt_max) {
    cdtDeviation = current.cdtPercentage - bands.cdt_max  // positivo
  }

  // Calcular desviación ETF
  if (current.etfPercentage < bands.etf_min) {
    etfDeviation = current.etfPercentage - bands.etf_min  // negativo
  } else if (current.etfPercentage > bands.etf_max) {
    etfDeviation = current.etfPercentage - bands.etf_max  // positivo
  }

  const isOutOfBands = cdtDeviation !== 0 || etfDeviation !== 0
  const maxDeviation = Math.max(Math.abs(cdtDeviation), Math.abs(etfDeviation))

  let severity: DeviationAnalysis['severity'] = 'none'
  if (maxDeviation > 0 && maxDeviation <= 5) {
    severity = 'minor'
  } else if (maxDeviation > 5 && maxDeviation <= 10) {
    severity = 'moderate'
  } else if (maxDeviation > 10) {
    severity = 'severe'
  }

  return {
    isOutOfBands,
    cdtDeviation,
    etfDeviation,
    severity,
  }
}

/**
 * Genera escenarios de rebalanceo
 *
 * @param current - Asignación actual
 * @param bands - Bandas objetivo
 * @param trm - TRM actual (COP/USD)
 * @param etfCostBasisUSD - Precio promedio de compra de ETFs (para ganancia de capital)
 */
export function generateRebalancingScenarios(
  current: CurrentAllocation,
  bands: AllocationBands,
  trm: number,
  etfCostBasisUSD?: number
): RebalancingScenario[] {
  const scenarios: RebalancingScenario[] = []

  // Escenario 1: Mantener (no hacer nada)
  scenarios.push({
    name: 'Mantener',
    description: 'No realizar ninguna acción. Mantener asignación actual.',
    action: 'maintain',
    targetCdtPercentage: current.cdtPercentage,
    targetEtfPercentage: current.etfPercentage,
    estimatedCommission: 0,
    estimatedSpread: 0,
    totalCost: 0,
  })

  // Escenario 2: Rebalancear al centro de las bandas (60/40 por defecto)
  const targetCdtPercentage = (bands.cdt_min + bands.cdt_max) / 2
  const targetEtfPercentage = (bands.etf_min + bands.etf_max) / 2

  const targetCdtValue = current.totalValueCOP * (targetCdtPercentage / 100)
  const targetEtfValue = current.totalValueCOP * (targetEtfPercentage / 100)

  const cdtDiff = targetCdtValue - current.cdtValueCOP
  const etfDiff = targetEtfValue - current.etfValueCOP

  let cdtToSell: number | undefined
  let cdtToBuy: number | undefined
  let etfToSell: number | undefined
  let etfToBuy: number | undefined
  let capitalGain: number | undefined

  // Determinar acción
  if (cdtDiff > 0) {
    // Necesito más CDT → vender ETF y comprar CDT
    etfToSell = Math.abs(etfDiff) / trm  // USD
    cdtToBuy = Math.abs(cdtDiff)         // COP

    // Calcular ganancia de capital si tenemos costo base
    if (etfCostBasisUSD && etfToSell) {
      const currentEtfPriceUSD = current.etfValueCOP / trm
      capitalGain = (currentEtfPriceUSD - etfCostBasisUSD) * etfToSell
    }
  } else if (cdtDiff < 0) {
    // Necesito menos CDT → vender CDT y comprar ETF
    cdtToSell = Math.abs(cdtDiff)        // COP
    etfToBuy = Math.abs(etfDiff) / trm   // USD
  }

  // Calcular costos de transacción
  const etfOperationCOP = etfToSell
    ? etfToSell * trm
    : etfToBuy
    ? etfToBuy * trm
    : 0

  const estimatedCommission = etfOperationCOP * TRANSACTION_COSTS.ETF_COMMISSION_RATE
  const estimatedSpread = etfOperationCOP * TRANSACTION_COSTS.FX_SPREAD_RATE
  const totalCost = estimatedCommission + estimatedSpread

  scenarios.push({
    name: 'Rebalancear al centro',
    description: `Ajustar a ${targetCdtPercentage.toFixed(0)}% CDT / ${targetEtfPercentage.toFixed(0)}% ETF`,
    action: 'rebalance',
    targetCdtPercentage,
    targetEtfPercentage,
    cdtToSell,
    cdtToBuy,
    etfToSell,
    etfToBuy,
    estimatedCommission,
    estimatedSpread,
    totalCost,
    capitalGain,
  })

  return scenarios
}

/**
 * Verifica si debe dispararse el Trigger #6 (Evaluación Trimestral)
 *
 * Solo dispara si:
 * - Es inicio de trimestre (enero, abril, julio, octubre)
 * - Desviación >5% fuera de bandas
 */
export function shouldTriggerQuarterlyReview(
  date: Date,
  deviation: DeviationAnalysis
): boolean {
  const month = date.getMonth() + 1  // 1-12
  const isQuarterStart = [1, 4, 7, 10].includes(month)
  const hasSignificantDeviation = deviation.severity !== 'none' && deviation.severity !== 'minor'

  return isQuarterStart && hasSignificantDeviation
}

/**
 * Verifica si debe dispararse el Trigger #7 (Rebalanceo de Oportunidad)
 *
 * Solo dispara si:
 * - Hay un CDT venciendo en ≤30 días
 * - Asignación está fuera de bandas
 */
export function shouldTriggerOpportunityRebalance(
  daysUntilMaturity: number,
  deviation: DeviationAnalysis
): boolean {
  return daysUntilMaturity <= 30 && deviation.isOutOfBands
}

/**
 * Verifica si debe dispararse el Trigger #8 (Cambio Macro Significativo)
 *
 * Solo dispara si:
 * - Hurdle Rate cambió >1.5% vs último cálculo
 */
export function shouldTriggerMacroChange(
  currentHurdleRate: number,
  cachedHurdleRate: number
): boolean {
  const change = Math.abs(currentHurdleRate - cachedHurdleRate)
  return change > 1.5
}

/**
 * Calcula drawdown potencial (pérdida máxima esperada)
 * Asume caída de 25% en ETFs (conservador según análisis histórico)
 */
export function calculatePotentialDrawdown(
  etfValueCOP: number,
  totalValueCOP: number
): { drawdownCOP: number; drawdownPercentage: number } {
  const ETF_CRASH_SCENARIO = 0.25  // 25% caída
  const drawdownCOP = etfValueCOP * ETF_CRASH_SCENARIO
  const drawdownPercentage = (drawdownCOP / totalValueCOP) * 100

  return {
    drawdownCOP,
    drawdownPercentage,
  }
}

/**
 * Calcula riesgo TRM (pérdida no realizada por devaluación)
 * Asume devaluación de 10% (escenario conservador)
 */
export function calculateTRMRisk(
  etfValueCOP: number,
  trmChangePercentage: number = 10
): number {
  return etfValueCOP * (trmChangePercentage / 100)
}
