import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Edge Function: Evaluación de Rebalanceo
 *
 * Triggers:
 * - Trigger #6: Evaluación Trimestral (primer domingo trimestre, desviación >5%)
 * - Trigger #7: Rebalanceo de Oportunidad (CDT venciendo ≤30 días + fuera de bandas)
 * - Trigger #8: Cambio Macro Significativo (Hurdle Rate cambió >1.5%)
 *
 * Cron: Domingos 8:00 AM (0 0 8 * * 0)
 */

interface AllocationBands {
  cdt_min: number
  cdt_max: number
  etf_min: number
  etf_max: number
}

interface CurrentAllocation {
  cdt_percentage: number
  etf_percentage: number
  cdt_value_cop: number
  etf_value_cop: number
  total_value_cop: number
}

interface DeviationAnalysis {
  is_out_of_bands: boolean
  cdt_deviation: number
  etf_deviation: number
  severity: 'none' | 'minor' | 'moderate' | 'severe'
}

interface CDTPosition {
  id: string
  purchase_date: string
  maturity_date: string
  initial_amount: number
  annual_rate: number
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log('[evaluate-rebalancing] Starting evaluation...')

    // 1. Obtener todos los usuarios
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) throw usersError

    let eventsCreated = 0
    let snapshotsCreated = 0
    const today = new Date()

    for (const user of users.users) {
      try {
        console.log(`[evaluate-rebalancing] Processing user ${user.id}`)

        // 2. Obtener bandas de asignación (o usar default "moderate")
        const bands = await getAllocationBands(supabase, user.id)

        // 3. Calcular asignación actual
        const allocation = await calculateCurrentAllocation(supabase, user.id)

        // Si el portafolio está vacío, saltar
        if (allocation.total_value_cop === 0) {
          console.log(`[evaluate-rebalancing] User ${user.id} has empty portfolio, skipping`)
          continue
        }

        // 4. Analizar desviación
        const deviation = analyzeDeviation(allocation, bands)

        // 5. Evaluar Trigger #6: Evaluación Trimestral
        if (shouldTriggerQuarterlyReview(today, deviation)) {
          const created = await generateQuarterlyReviewEvent(
            supabase,
            user.id,
            allocation,
            bands,
            deviation
          )
          if (created) eventsCreated++

          // Guardar snapshot trimestral
          await saveSnapshot(supabase, user.id, allocation)
          snapshotsCreated++
        }

        // 6. Evaluar Trigger #7: Rebalanceo de Oportunidad (CDT venciendo)
        const cdtPositions = await getCDTPositions(supabase, user.id)
        for (const cdt of cdtPositions) {
          const daysUntilMaturity = getDaysUntilMaturity(cdt.maturity_date)

          if (shouldTriggerOpportunityRebalance(daysUntilMaturity, deviation)) {
            const created = await generateOpportunityRebalanceEvent(
              supabase,
              user.id,
              cdt,
              allocation,
              bands,
              deviation
            )
            if (created) eventsCreated++
          }
        }

        // 7. Evaluar Trigger #8: Cambio Macro Significativo
        const hurdleRate = await calculateHurdleRate(supabase, allocation)
        const cachedHurdleRate = await getCachedHurdleRate(supabase, user.id)

        if (cachedHurdleRate && shouldTriggerMacroChange(hurdleRate, cachedHurdleRate)) {
          const created = await generateMacroChangeEvent(
            supabase,
            user.id,
            hurdleRate,
            cachedHurdleRate,
            allocation,
            bands
          )
          if (created) eventsCreated++
        }

        // 8. Actualizar cache de Hurdle Rate
        await updateHurdleRateCache(supabase, user.id, hurdleRate)

      } catch (userError) {
        console.error(`[evaluate-rebalancing] Error processing user ${user.id}:`, userError)
        continue
      }
    }

    console.log(`[evaluate-rebalancing] Completed. Events created: ${eventsCreated}, Snapshots: ${snapshotsCreated}`)

    return new Response(JSON.stringify({
      success: true,
      users_processed: users.users.length,
      events_created: eventsCreated,
      snapshots_created: snapshotsCreated,
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[evaluate-rebalancing] Fatal error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// ============================================================================
// Helper Functions
// ============================================================================

async function getAllocationBands(supabase: any, userId: string): Promise<AllocationBands> {
  const { data, error } = await supabase
    .from('user_allocation_bands')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  // Default "moderate" preset
  if (!data) {
    return {
      cdt_min: 50,
      cdt_max: 70,
      etf_min: 30,
      etf_max: 50,
    }
  }

  return data
}

async function calculateCurrentAllocation(
  supabase: any,
  userId: string
): Promise<CurrentAllocation> {
  // Obtener CDTs
  const { data: cdts, error: cdtError } = await supabase
    .from('cdt_positions')
    .select('*')
    .eq('user_id', userId)

  if (cdtError) throw cdtError

  // Obtener ETFs
  const { data: etfs, error: etfError } = await supabase
    .from('etf_positions')
    .select('*')
    .eq('user_id', userId)

  if (etfError) throw etfError

  // Calcular valor CDTs (con interés acumulado)
  let cdtValueCOP = 0
  const today = new Date()

  for (const cdt of cdts || []) {
    const purchaseDate = new Date(cdt.purchase_date)
    const daysDiff = Math.floor((today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24))
    const interestAccrued = cdt.initial_amount * (cdt.annual_rate / 100) * (daysDiff / 365)
    cdtValueCOP += cdt.initial_amount + interestAccrued
  }

  // Calcular valor ETFs (precio actual × cantidad)
  let etfValueCOP = 0
  const { data: macro } = await supabase
    .from('macro_rates')
    .select('value')
    .eq('type', 'trm')
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()

  const trm = macro?.value || 3900

  for (const etf of etfs || []) {
    // Obtener precio actual EOD
    const { data: eodData } = await supabase
      .from('eod_prices')
      .select('close')
      .eq('ticker', etf.ticker)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (eodData) {
      etfValueCOP += eodData.close * etf.quantity * trm
    }
  }

  const totalValueCOP = cdtValueCOP + etfValueCOP

  return {
    cdt_percentage: totalValueCOP > 0 ? (cdtValueCOP / totalValueCOP) * 100 : 0,
    etf_percentage: totalValueCOP > 0 ? (etfValueCOP / totalValueCOP) * 100 : 0,
    cdt_value_cop: cdtValueCOP,
    etf_value_cop: etfValueCOP,
    total_value_cop: totalValueCOP,
  }
}

function analyzeDeviation(
  allocation: CurrentAllocation,
  bands: AllocationBands
): DeviationAnalysis {
  let cdtDeviation = 0
  let etfDeviation = 0

  // CDT deviation
  if (allocation.cdt_percentage < bands.cdt_min) {
    cdtDeviation = allocation.cdt_percentage - bands.cdt_min
  } else if (allocation.cdt_percentage > bands.cdt_max) {
    cdtDeviation = allocation.cdt_percentage - bands.cdt_max
  }

  // ETF deviation
  if (allocation.etf_percentage < bands.etf_min) {
    etfDeviation = allocation.etf_percentage - bands.etf_min
  } else if (allocation.etf_percentage > bands.etf_max) {
    etfDeviation = allocation.etf_percentage - bands.etf_max
  }

  const isOutOfBands = cdtDeviation !== 0 || etfDeviation !== 0
  const maxDeviation = Math.max(Math.abs(cdtDeviation), Math.abs(etfDeviation))

  let severity: DeviationAnalysis['severity'] = 'none'
  if (maxDeviation > 0 && maxDeviation <= 5) severity = 'minor'
  else if (maxDeviation > 5 && maxDeviation <= 10) severity = 'moderate'
  else if (maxDeviation > 10) severity = 'severe'

  return {
    is_out_of_bands: isOutOfBands,
    cdt_deviation: cdtDeviation,
    etf_deviation: etfDeviation,
    severity,
  }
}

function shouldTriggerQuarterlyReview(date: Date, deviation: DeviationAnalysis): boolean {
  const month = date.getMonth() + 1
  const isQuarterStart = [1, 4, 7, 10].includes(month)
  const hasSignificantDeviation = deviation.severity !== 'none' && deviation.severity !== 'minor'

  return isQuarterStart && hasSignificantDeviation
}

function shouldTriggerOpportunityRebalance(
  daysUntilMaturity: number,
  deviation: DeviationAnalysis
): boolean {
  return daysUntilMaturity <= 30 && daysUntilMaturity > 0 && deviation.is_out_of_bands
}

function shouldTriggerMacroChange(currentHR: number, cachedHR: number): boolean {
  return Math.abs(currentHR - cachedHR) > 1.5
}

function getDaysUntilMaturity(maturityDate: string): number {
  const today = new Date()
  const maturity = new Date(maturityDate)
  const diffTime = maturity.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

async function getCDTPositions(supabase: any, userId: string): Promise<CDTPosition[]> {
  const { data, error } = await supabase
    .from('cdt_positions')
    .select('id, purchase_date, maturity_date, initial_amount, annual_rate')
    .eq('user_id', userId)

  if (error) throw error
  return data || []
}

async function calculateHurdleRate(supabase: any, allocation: CurrentAllocation): Promise<number> {
  // Obtener datos macro
  const { data: cdtRateData } = await supabase
    .from('cdt_rates')
    .select('rate')
    .is('bank', null)
    .eq('term_days', 360)
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: trmHistory } = await supabase
    .from('macro_rates')
    .select('value, effective_date')
    .eq('type', 'trm')
    .order('effective_date', { ascending: false })
    .limit(5)

  if (!cdtRateData || !trmHistory || trmHistory.length < 2) {
    return 9.0 // Fallback conservador
  }

  const cdtRate = cdtRateData.rate / 100

  // Calcular devaluación anual (último año)
  const trmNow = trmHistory[0].value
  const trmYear = trmHistory[trmHistory.length - 1].value
  const devaluationRate = (trmNow - trmYear) / trmYear

  // Ecuación de Fisher simplificada
  const TER = 0.005 // 0.5% TER estimado
  const hurdleRate = ((cdtRate * 0.96) - devaluationRate) / (1 + devaluationRate) + TER

  return hurdleRate * 100 // Retornar en porcentaje
}

async function getCachedHurdleRate(supabase: any, userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('hurdle_rate_cache')
    .select('hurdle_rate')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  return data.hurdle_rate
}

async function updateHurdleRateCache(supabase: any, userId: string, hurdleRate: number) {
  await supabase
    .from('hurdle_rate_cache')
    .upsert({
      user_id: userId,
      hurdle_rate: hurdleRate,
      calculated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
}

async function saveSnapshot(supabase: any, userId: string, allocation: CurrentAllocation) {
  const today = new Date().toISOString().split('T')[0]

  await supabase
    .from('portfolio_snapshots')
    .upsert({
      user_id: userId,
      snapshot_date: today,
      cdt_percentage: allocation.cdt_percentage,
      etf_percentage: allocation.etf_percentage,
      total_value_cop: allocation.total_value_cop,
      hurdle_rate: null, // Se puede agregar después
    }, { onConflict: 'user_id,snapshot_date' })
}

// ============================================================================
// Event Generators
// ============================================================================

async function generateQuarterlyReviewEvent(
  supabase: any,
  userId: string,
  allocation: CurrentAllocation,
  bands: AllocationBands,
  deviation: DeviationAnalysis
): Promise<boolean> {
  // Verificar duplicados (ventana 7 días)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: existing } = await supabase
    .from('inbox_events')
    .select('id')
    .eq('user_id', userId)
    .eq('event_type', 'rebalancing')
    .eq('event_subtype', 'quarterly_review')
    .gte('created_at', sevenDaysAgo.toISOString())
    .limit(1)

  if (existing && existing.length > 0) {
    console.log(`[Trigger #6] Duplicate found for user ${userId}, skipping`)
    return false
  }

  const message = `# 📊 Revisión trimestral de tu portafolio

Tu asignación actual:
- **CDTs:** ${allocation.cdt_percentage.toFixed(1)}% (banda ideal: ${bands.cdt_min}-${bands.cdt_max}%)
- **ETFs:** ${allocation.etf_percentage.toFixed(1)}% (banda ideal: ${bands.etf_min}-${bands.etf_max}%)

## Desviación detectada

${deviation.cdt_deviation < 0 ? '⚠️ CDT por debajo del mínimo' : deviation.cdt_deviation > 0 ? '⚠️ CDT sobre el máximo' : ''}
${deviation.etf_deviation < 0 ? '⚠️ ETF por debajo del mínimo' : deviation.etf_deviation > 0 ? '⚠️ ETF sobre el máximo' : ''}

## ¿Consecuencias de mantener?

- **Exposición cambiaria:** ${allocation.etf_percentage.toFixed(1)}% en USD
- **Drawdown potencial** (caída 25% ETF): -${((allocation.etf_value_cop * 0.25) / allocation.total_value_cop * 100).toFixed(1)}% total portafolio

## ¿Qué pasaría si rebalanceas?

Volver al centro (${(bands.cdt_min + bands.cdt_max) / 2}% CDT / ${(bands.etf_min + bands.etf_max) / 2}% ETF) te acercaría a tu perfil de riesgo objetivo.

**Abre la pantalla de Portafolio para ver escenarios detallados.**`

  const { error } = await supabase.from('inbox_events').insert({
    user_id: userId,
    event_type: 'rebalancing',
    event_subtype: 'quarterly_review',
    title: 'Revisión trimestral — Portafolio fuera de bandas',
    message,
    priority: deviation.severity === 'severe' ? 'high' : 'medium',
    is_read: false,
  })

  if (error) throw error
  console.log(`[Trigger #6] Event created for user ${userId}`)
  return true
}

async function generateOpportunityRebalanceEvent(
  supabase: any,
  userId: string,
  cdt: CDTPosition,
  allocation: CurrentAllocation,
  bands: AllocationBands,
  deviation: DeviationAnalysis
): Promise<boolean> {
  const daysUntil = getDaysUntilMaturity(cdt.maturity_date)

  // Verificar duplicados por CDT específico
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: existing } = await supabase
    .from('inbox_events')
    .select('id')
    .eq('user_id', userId)
    .eq('event_type', 'rebalancing')
    .eq('event_subtype', 'opportunity_rebalance')
    .ilike('message', `%${cdt.id}%`)
    .gte('created_at', sevenDaysAgo.toISOString())
    .limit(1)

  if (existing && existing.length > 0) {
    console.log(`[Trigger #7] Duplicate found for CDT ${cdt.id}, skipping`)
    return false
  }

  const maturityValue = cdt.initial_amount * (1 + cdt.annual_rate / 100)

  const message = `# 💰 Tu CDT vence en ${daysUntil} días — Ventana de rebalanceo

**CDT próximo a vencer:**
- Monto inicial: $${cdt.initial_amount.toLocaleString('es-CO')} COP
- Valor al vencimiento: $${maturityValue.toLocaleString('es-CO')} COP
- Fecha vencimiento: ${cdt.maturity_date}

## Tu portafolio hoy

- **CDTs:** ${allocation.cdt_percentage.toFixed(1)}% ${deviation.cdt_deviation > 0 ? '(fuera de banda)' : ''}
- **ETFs:** ${allocation.etf_percentage.toFixed(1)}% ${deviation.etf_deviation < 0 ? '(por debajo de banda)' : ''}

## Opciones

**A) Renovar CDT completo**
→ Mantiene sobre-exposición a CDT
→ Riesgo: si Banrep baja tasa, pierdes upside

**B) Renovar 50% + mover 50% a ETF**
→ Rebalancea hacia tu objetivo
→ Comisión estimada: ~$${(maturityValue * 0.5 * 0.005).toLocaleString('es-CO')}

**Abre Portafolio para ver análisis completo.**`

  const { error } = await supabase.from('inbox_events').insert({
    user_id: userId,
    event_type: 'rebalancing',
    event_subtype: 'opportunity_rebalance',
    title: `CDT vence en ${daysUntil} días — Oportunidad de rebalanceo`,
    message,
    priority: 'medium',
    is_read: false,
  })

  if (error) throw error
  console.log(`[Trigger #7] Event created for CDT ${cdt.id}`)
  return true
}

async function generateMacroChangeEvent(
  supabase: any,
  userId: string,
  currentHR: number,
  cachedHR: number,
  allocation: CurrentAllocation,
  bands: AllocationBands
): Promise<boolean> {
  // Verificar duplicados
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: existing } = await supabase
    .from('inbox_events')
    .select('id')
    .eq('user_id', userId)
    .eq('event_type', 'rebalancing')
    .eq('event_subtype', 'macro_change')
    .gte('created_at', sevenDaysAgo.toISOString())
    .limit(1)

  if (existing && existing.length > 0) {
    console.log(`[Trigger #8] Duplicate found for user ${userId}, skipping`)
    return false
  }

  const change = currentHR - cachedHR
  const direction = change > 0 ? 'subió' : 'bajó'

  const message = `# 🔔 Cambio macro significativo detectado

## Impacto en tu Hurdle Rate

- **Antes:** ${cachedHR.toFixed(2)}% EA
- **Ahora:** ${currentHR.toFixed(2)}% EA
- **Cambio:** ${direction} ${Math.abs(change).toFixed(2)} puntos

## ¿Qué significa?

${change > 0
  ? 'Los CDTs ahora son **más atractivos** vs ETFs. Tu mix actual sigue dentro de bandas, pero podrías considerar inclinar hacia CDTs.'
  : 'Los ETFs ahora son **relativamente más atractivos**. Considera si tu exposición actual sigue alineada con tu perfil.'
}

## Tu portafolio hoy

- **CDTs:** ${allocation.cdt_percentage.toFixed(1)}%
- **ETFs:** ${allocation.etf_percentage.toFixed(1)}%

**Abre Portafolio para revisar escenarios.**`

  const { error } = await supabase.from('inbox_events').insert({
    user_id: userId,
    event_type: 'rebalancing',
    event_subtype: 'macro_change',
    title: `Hurdle Rate ${direction} ${Math.abs(change).toFixed(1)}% — Revisar asignación`,
    message,
    priority: 'medium',
    is_read: false,
  })

  if (error) throw error
  console.log(`[Trigger #8] Event created for user ${userId}`)
  return true
}
