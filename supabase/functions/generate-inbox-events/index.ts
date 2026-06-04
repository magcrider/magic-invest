import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Edge Function: generate-inbox-events
 *
 * Motor de eventos del Buzón — evalúa condiciones matemáticas contra datos reales
 * y genera eventos educativos cuando se cumplen triggers definidos.
 *
 * Frecuencia: Semanal (lunes 6 AM Colombia)
 * Triggers implementados:
 * 1. CDT próximo a vencer (30/60/90 días)
 * 2. Drawdown estructural ETF (>25% desde pico histórico)
 * 3. Cambio significativo tasa Banrep (≥50 bps)
 * 4. Bandas de asignación fuera de rango
 * 5. ETF cruza Hurdle Rate (ahora justifica capital)
 */

interface CdtPosition {
  id: number
  user_id: string
  bank: string
  amount: number
  rate: number
  term_days: number
  start_date: string
  end_date: string
}

interface EtfPosition {
  id: number
  user_id: string
  ticker: string
  name: string
  shares: number
  average_cost_usd: number
  ter: number
  total_invested_cop: number
  trm_at_purchase: number
}

interface MacroRate {
  type: string
  value: number
  effective_date: string
}

interface EodPrice {
  ticker: string
  date: string
  close: number
  adjusted_close: number
}

interface InboxEvent {
  user_id: string
  type: string
  subtype?: string
  title: string
  body: string
  asset_ref?: string
  asset_type?: string
  metadata: Record<string, any>
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log('Starting inbox events generation...')

    // Obtener todos los usuarios activos (tienen posiciones)
    const { data: users, error: usersError } = await supabase
      .from('cdt_positions')
      .select('user_id')
      .limit(1000)

    if (usersError) throw usersError

    const uniqueUsers = [...new Set(users.map(u => u.user_id))]
    console.log(`Found ${uniqueUsers.length} users with positions`)

    let totalEventsCreated = 0

    for (const userId of uniqueUsers) {
      const events = await generateEventsForUser(supabase, userId)

      if (events.length > 0) {
        // Insertar eventos (sin duplicados: verificar que no existan eventos idénticos recientes)
        for (const event of events) {
          // Verificar si ya existe un evento similar en los últimos 7 días
          let query = supabase
            .from('inbox_events')
            .select('id')
            .eq('user_id', userId)
            .eq('type', event.type)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

          // Manejar asset_ref NULL correctamente
          if (event.asset_ref) {
            query = query.eq('asset_ref', event.asset_ref)
          } else {
            query = query.is('asset_ref', null)
          }

          const { data: existing } = await query.maybeSingle()

          if (!existing) {
            const { error: insertError } = await supabase
              .from('inbox_events')
              .insert(event)

            if (insertError) {
              console.error(`Error inserting event for user ${userId}:`, insertError)
            } else {
              totalEventsCreated++
            }
          } else {
            console.log(`Skipping duplicate event: ${event.type} for user ${userId}`)
          }
        }
      }
    }

    console.log(`Inbox events generation completed. Created ${totalEventsCreated} events.`)

    return new Response(
      JSON.stringify({
        success: true,
        users_processed: uniqueUsers.length,
        events_created: totalEventsCreated,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in generate-inbox-events:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

/**
 * Genera eventos para un usuario específico evaluando todas las condiciones
 */
async function generateEventsForUser(supabase: any, userId: string): Promise<InboxEvent[]> {
  const events: InboxEvent[] = []

  // 1. CDTs próximos a vencer
  const cdtEvents = await checkCdtMaturity(supabase, userId)
  events.push(...cdtEvents)

  // 2. Drawdown estructural en ETFs
  const drawdownEvents = await checkEtfDrawdown(supabase, userId)
  events.push(...drawdownEvents)

  // 3. Cambio significativo tasa Banrep
  const banrepEvents = await checkBanrepRateChange(supabase, userId)
  events.push(...banrepEvents)

  // 4. Bandas de asignación fuera de rango
  const rebalanceEvents = await checkAllocationBands(supabase, userId)
  events.push(...rebalanceEvents)

  // 5. ETF cruza Hurdle Rate
  const hurdleEvents = await checkEtfCrossesHurdle(supabase, userId)
  events.push(...hurdleEvents)

  return events
}

/**
 * Trigger #1: CDT próximo a vencer (30/60/90 días)
 */
async function checkCdtMaturity(supabase: any, userId: string): Promise<InboxEvent[]> {
  const events: InboxEvent[] = []

  // Obtener CDTs del usuario
  const { data: cdts, error } = await supabase
    .from('cdt_positions')
    .select('*')
    .eq('user_id', userId)

  if (error || !cdts) return events

  const today = new Date()

  for (const cdt of cdts as CdtPosition[]) {
    const endDate = new Date(cdt.end_date)
    const daysUntilMaturity = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Trigger: 90, 60, 30 días antes
    if ([90, 60, 30].includes(daysUntilMaturity)) {
      // Obtener tasa actual de mercado para el plazo
      const { data: currentRate } = await supabase
        .from('cdt_rates')
        .select('rate')
        .is('bank', null)  // promedio de mercado
        .eq('term_days', cdt.term_days)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      const marketRate = currentRate?.rate || cdt.rate

      // Obtener Hurdle Rate actual
      const hurdleRate = await calculateHurdleRate(supabase)

      // Calcular rendimiento proyectado
      const maturityValue = cdt.amount * Math.pow(1 + cdt.rate / 100, cdt.term_days / 365)
      const grossReturn = maturityValue - cdt.amount
      const withholdingTax = grossReturn * 0.04
      const netMaturityValue = cdt.amount + grossReturn - withholdingTax

      // Generar body en Markdown enriquecido
      const body = `> **💰 ${formatCurrency(cdt.amount)} COP** estarán disponibles el **${formatDate(cdt.end_date)}**.

Este es el momento estratégico para revisar tu distribución y decidir el próximo paso.

---

## 📋 Resumen del vencimiento

|  | **Detalle** |
|---|---:|
| **Capital invertido** | $${formatCurrency(cdt.amount)} |
| **Tasa pactada** | ${cdt.rate.toFixed(2)}% EA |
| **Rendimiento bruto** | $${formatCurrency(grossReturn)} |
| **Retefuente (4%)** | -$${formatCurrency(withholdingTax)} |
| **Valor final** | **$${formatCurrency(netMaturityValue)}** |

---

## 🎯 Contexto de mercado

> **Hurdle Rate vigente:** ${hurdleRate.toFixed(2)}% EA
>
> La línea base que determina si activos de riesgo justifican capital sobre inversiones seguras.

| Indicador | Valor |
|---|---:|
| Tasa mercado CDT ${cdt.term_days}d | ${marketRate.toFixed(2)}% EA |
| Tu CDT actual | ${cdt.rate.toFixed(2)}% EA |
| Diferencia | ${marketRate > cdt.rate ? '🔼' : '🔽'} ${Math.abs(marketRate - cdt.rate).toFixed(2)}pp |

${marketRate < cdt.rate ? `> ℹ️ **La tasa de mercado bajó** desde que abriste este CDT, reflejando el ciclo descendente de tasas del Banco de la República.` : marketRate > cdt.rate ? `> ℹ️ **La tasa de mercado subió** — renovar hoy podría darte mejor rendimiento que el CDT que vence.` : ''}

---

## 🔀 Escenarios posibles

### 1️⃣ Renovar en CDT (${cdt.term_days} días)

**Mantienes tu distribución actual.**

- ✅ Sin costo de transacción
- ✅ Rendimiento predecible
- ${marketRate < cdt.rate ? '⚠️ Tasa menor que tu CDT anterior' : '✅ Tasa igual o mejor'}

---

### 2️⃣ No renovar — Capital disponible

**El dinero queda libre para ajustar distribución.**

Podrías considerar:
- Aumentar exposición a ETFs (si el Hurdle Rate lo justifica)
- Cambiar plazo del CDT (ej: pasar de ${cdt.term_days} días a 360 días)
- Rebalancear según tus bandas configuradas

---

### 3️⃣ Cambiar de entidad

**Comparar tasas en otras instituciones.**

El sistema rastrea tasas promedio del mercado, pero algunos bancos pueden ofrecer más según monto y plazo.

---

> **📝 Nota**
> Las tasas son referenciales y pueden variar al momento de apertura. Este mensaje es educativo, no constituye asesoría financiera.`;

      events.push({
        user_id: userId,
        type: 'cdt_maturity',
        title: `Tu CDT de ${cdt.bank} vence en ${daysUntilMaturity} días`,
        body,
        asset_ref: `CDT ${cdt.bank}`,
        asset_type: 'cdt',
        metadata: {
          cdt_id: cdt.id,
          days_until_maturity: daysUntilMaturity,
          maturity_date: cdt.end_date,
          current_amount: cdt.amount,
          current_rate: cdt.rate,
          projected_maturity_value: netMaturityValue,
          market_rate: marketRate,
          hurdle_rate: hurdleRate,
        },
      })
    }
  }

  return events
}

/**
 * Trigger #2: Drawdown estructural ETF (>25% desde pico histórico)
 */
async function checkEtfDrawdown(supabase: any, userId: string): Promise<InboxEvent[]> {
  const events: InboxEvent[] = []

  // Obtener ETFs del usuario
  const { data: etfs, error } = await supabase
    .from('etf_positions')
    .select('*')
    .eq('user_id', userId)

  if (error || !etfs) return events

  for (const etf of etfs as EtfPosition[]) {
    // Obtener histórico de precios (últimos 3 años)
    const threeYearsAgo = new Date()
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

    const { data: prices, error: pricesError } = await supabase
      .from('eod_prices')
      .select('date, adjusted_close')
      .eq('ticker', etf.ticker)
      .gte('date', threeYearsAgo.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (pricesError || !prices || prices.length === 0) continue

    // Calcular pico histórico y drawdown actual
    let peak = 0
    let peakDate = ''

    for (const price of prices as EodPrice[]) {
      if (price.adjusted_close > peak) {
        peak = price.adjusted_close
        peakDate = price.date
      }
    }

    const currentPrice = prices[prices.length - 1].adjusted_close
    const drawdown = ((currentPrice - peak) / peak) * 100

    // Trigger: drawdown > 25%
    if (drawdown < -25) {
      // Calcular cuántas veces ha caído así en su historia
      const historicalDrawdowns = calculateHistoricalDrawdowns(prices as EodPrice[])
      const similarDrawdowns = historicalDrawdowns.filter(dd => dd.maxDrawdown < -25)

      const avgRecoveryDays = similarDrawdowns.length > 0
        ? Math.round(similarDrawdowns.reduce((sum, dd) => sum + dd.recoveryDays, 0) / similarDrawdowns.length)
        : 0

      // Obtener TRM actual para conversión
      const { data: trmData } = await supabase
        .from('macro_rates')
        .select('value')
        .eq('type', 'trm')
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      const currentTrm = trmData?.value || 3900

      // Generar body en Markdown enriquecido
      const body = `> **📉 Caída estructural detectada**
>
> **${etf.ticker}** (${etf.name}) cerró con una caída del **${Math.abs(drawdown).toFixed(1)}%** desde su máximo histórico, registrado el **${formatDate(peakDate)}**.

El sistema clasifica como **caída estructural** cuando el precio cae >25% desde el último pico.

---

## 📊 Contexto de precios

| Indicador | Valor |
|---|---:|
| **Precio en pico** | USD ${peak.toFixed(2)} |
| **Precio actual** | USD ${currentPrice.toFixed(2)} |
| **Caída total** | **${Math.abs(drawdown).toFixed(1)}%** |
| **Fecha del pico** | ${formatDate(peakDate)} |

---

## 🔍 Análisis histórico

${similarDrawdowns.length > 0 ? `> **${similarDrawdowns.length} episodios similares** registrados en la historia de este ETF.
>
> **Recuperación promedio:** ${avgRecoveryDays} días desde caídas >25%.

### Perspectiva histórica

En **${similarDrawdowns.length} ocasiones anteriores** con caídas similares:

- ✅ El ETF eventualmente **recuperó su valor**
- ⏱️ El tiempo de recuperación **varió significativamente** (desde semanas hasta años)
- 📈 Algunas recuperaciones fueron rápidas (meses), otras tomaron años

` : `> ⚠️ **Primera vez** que este ETF cae >25% en el período analizado.
>
> No hay precedentes históricos directos en los datos disponibles.

`}---

## 🤔 ¿Qué significa esto?

> **No es una señal predictiva.**

Una caída de esta magnitud:
- ❌ **NO indica** que el mercado continuará bajando
- ❌ **NO garantiza** que rebotará pronto
- ✅ **ES** un punto de referencia histórico para contexto

### Tu horizonte importa

| Horizonte | Interpretación |
|---|---|
| **Corto plazo** (1-2 años) | Mayor volatilidad, incertidumbre en tiempo de recuperación |
| **Mediano plazo** (3-5 años) | Históricamente, drawdowns de este nivel se han recuperado |
| **Largo plazo** (10+ años) | Episodios como este son ciclos normales del mercado |

---

> **📝 Nota importante**
> Este análisis se basa exclusivamente en datos históricos. El comportamiento pasado no garantiza ni predice resultados futuros. Mantén tu estrategia alineada con tu horizonte de inversión.`;

      events.push({
        user_id: userId,
        type: 'drawdown_context',
        title: `${etf.ticker} ha caído ${Math.abs(drawdown).toFixed(1)}% desde su máximo histórico`,
        body,
        asset_ref: etf.ticker,
        asset_type: 'etf',
        metadata: {
          etf_id: etf.id,
          ticker: etf.ticker,
          current_price_usd: currentPrice,
          peak_price_usd: peak,
          peak_date: peakDate,
          drawdown_pct: drawdown,
          similar_episodes: similarDrawdowns.length,
          avg_recovery_days: avgRecoveryDays,
          current_trm: currentTrm,
          position_value_cop: etf.shares * currentPrice * currentTrm,
        },
      })
    }
  }

  return events
}

/**
 * Trigger #3: Cambio significativo tasa Banrep (≥50 bps)
 */
async function checkBanrepRateChange(supabase: any, userId: string): Promise<InboxEvent[]> {
  const events: InboxEvent[] = []

  // Obtener las 2 tasas más recientes de política monetaria
  const { data: rates, error } = await supabase
    .from('macro_rates')
    .select('value, effective_date')
    .eq('type', 'banrep_policy_rate')
    .order('effective_date', { ascending: false })
    .limit(2)

  if (error || !rates || rates.length < 2) return events

  const currentRate = rates[0].value
  const previousRate = rates[1].value
  const change = currentRate - previousRate

  // Trigger: cambio ≥ 50 bps (0.5%)
  if (Math.abs(change) >= 0.5) {
    const hurdleRate = await calculateHurdleRate(supabase)

    // Verificar si hay ETFs en posición
    const { data: etfs } = await supabase
      .from('etf_positions')
      .select('ticker')
      .eq('user_id', userId)

    const hasEtfs = etfs && etfs.length > 0

    // Generar body en Markdown enriquecido
    const body = `> **${change > 0 ? '📈' : '📉'} Decisión de política monetaria**
>
> El Banco de la República **${change > 0 ? 'subió' : 'bajó'}** la tasa de política **${Math.abs(change * 100).toFixed(0)} puntos básicos**.

En su última junta, la tasa pasó de **${previousRate.toFixed(2)}%** a **${currentRate.toFixed(2)}%**.

---

## 🎯 Impacto en tu Hurdle Rate

| Indicador | Antes | Ahora |
|---|:---:|:---:|
| **Tasa Banrep** | ${previousRate.toFixed(2)}% | ${currentRate.toFixed(2)}% ${change > 0 ? '🔼' : '🔽'} |
| **Hurdle Rate** | - | **${hurdleRate.toFixed(2)}% EA** |

> **⚙️ Actualización automática**
>
> El Hurdle Rate se recalculó automáticamente con base en el promedio de tasas CDT ajustado por el diferencial inflacionario COP/USD.

---

## 🤔 ¿Qué significa para ti?

### ${change > 0 ? 'Tasa subió → Hurdle Rate más alto' : 'Tasa bajó → Hurdle Rate más bajo'}

Un Hurdle Rate **${change > 0 ? 'más alto' : 'más bajo'}**:

${change > 0 ? `- ⬆️ **Sube la vara** para que activos de riesgo (ETFs) justifiquen capital
- 🔒 CDTs se vuelven más atractivos relativamente
- 📊 ETFs deben ofrecer mayor retorno esperado para superar el umbral` : `- ⬇️ **Baja la vara** — más ETFs pueden justificar capital estadísticamente
- 🔓 La ventana de oportunidad para riesgo se amplía
- 📊 ETFs que antes estaban "justos" ahora superan el umbral más cómodamente`}

${hasEtfs ? `
---

## 📊 Impacto en tus ETFs actuales

> ⚠️ **Tienes ETFs en portafolio.**

Con el nuevo Hurdle Rate de **${hurdleRate.toFixed(2)}% EA**:

- ${change > 0 ? '🔴 ETFs que antes superaban el umbral podrían ahora estar **por debajo** del nuevo Hurdle Rate' : '🟢 ETFs que estaban "justos" ahora tienen **más margen** sobre el Hurdle Rate'}
- ${change > 0 ? '📉 El rendimiento esperado de tus ETFs se evalúa ahora contra una línea base más alta' : '📈 La evaluación de riesgo/retorno de tus ETFs mejora relativamente'}
- 🔄 Considera revisar si tu distribución CDT/ETF sigue alineada con tu estrategia

` : `
---

## 💡 Si estás evaluando agregar ETFs

> El nuevo Hurdle Rate de **${hurdleRate.toFixed(2)}% EA** cambia el umbral de aceptación.

${change > 0 ? 'ETFs candidatos deben ofrecer retorno esperado **mayor** que antes para justificar el riesgo.' : 'Más ETFs califican ahora como candidatos al tener una línea base **más baja** que superar.'}
`}
---

> **📝 Nota**
> Este cambio afecta la evaluación de riesgo/retorno en el modelo. No constituye una recomendación de acción. Las decisiones son responsabilidad del usuario.`;

    events.push({
      user_id: userId,
      type: 'market_trigger',
      subtype: 'banrep_rate_change',
      title: `El Banco de la República ${change > 0 ? 'subió' : 'bajó'} su tasa ${Math.abs(change * 100).toFixed(0)} puntos básicos`,
      body,
      metadata: {
        previous_rate: previousRate,
        current_rate: currentRate,
        change_bps: change * 100,
        new_hurdle_rate: hurdleRate,
        effective_date: rates[0].effective_date,
      },
    })
  }

  return events
}

/**
 * Trigger #4: Bandas de asignación fuera de rango
 */
async function checkAllocationBands(supabase: any, userId: string): Promise<InboxEvent[]> {
  const events: InboxEvent[] = []

  // Obtener configuración de bandas (default: CDT 50-70%, ETF 30-50%)
  const { data: config } = await supabase
    .from('user_config')
    .select('value')
    .eq('user_id', userId)
    .eq('key', 'allocation_bands')
    .maybeSingle()

  const bands = config?.value || {
    cdt_min: 50,
    cdt_max: 70,
    etf_min: 30,
    etf_max: 50,
  }

  // Calcular distribución actual
  const { data: cdts } = await supabase
    .from('cdt_positions')
    .select('amount')
    .eq('user_id', userId)

  const { data: etfs } = await supabase
    .from('etf_positions')
    .select('shares, ticker')
    .eq('user_id', userId)

  if (!cdts || !etfs) return events

  const totalCdt = cdts.reduce((sum: number, cdt: any) => sum + cdt.amount, 0)

  // Obtener precios actuales de ETFs
  let totalEtf = 0
  for (const etf of etfs) {
    const { data: price } = await supabase
      .from('eod_prices')
      .select('adjusted_close')
      .eq('ticker', etf.ticker)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (price) {
      const { data: trm } = await supabase
        .from('macro_rates')
        .select('value')
        .eq('type', 'trm')
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      const currentTrm = trm?.value || 3900
      totalEtf += etf.shares * price.adjusted_close * currentTrm
    }
  }

  const totalPortfolio = totalCdt + totalEtf
  if (totalPortfolio === 0) return events

  const cdtPct = (totalCdt / totalPortfolio) * 100
  const etfPct = (totalEtf / totalPortfolio) * 100

  // Trigger: fuera de bandas
  const outOfBands = cdtPct < bands.cdt_min || cdtPct > bands.cdt_max || etfPct < bands.etf_min || etfPct > bands.etf_max

  if (outOfBands) {
    const excess = etfPct > bands.etf_max ? etfPct - bands.etf_max : 0
    const excessAmount = (excess / 100) * totalPortfolio

    // Generar body en Markdown con formato enriquecido
    const body = `${etfPct > bands.etf_max ? `Los **ETFs** representan el **${etfPct.toFixed(1)}%** del portafolio — **${(etfPct - bands.etf_max).toFixed(1)} puntos por encima** del límite configurado.` : `Los **CDTs** representan el **${cdtPct.toFixed(1)}%** — fuera del rango configurado de ${bands.cdt_min}–${bands.cdt_max}%.`}

---

## 📊 Distribución actual vs Bandas

|  | **Actual** | **Bandas** | **Estado** |
|---|---:|:---:|:---:|
| **CDTs** | ${cdtPct.toFixed(1)}% | ${(bands.cdt_min * 100).toFixed(0)}–${(bands.cdt_max * 100).toFixed(0)}% | ${cdtPct >= bands.cdt_min * 100 && cdtPct <= bands.cdt_max * 100 ? '✅' : '⚠️'} |
| **ETFs** | ${etfPct.toFixed(1)}% | ${(bands.etf_min * 100).toFixed(0)}–${(bands.etf_max * 100).toFixed(0)}% | ${etfPct >= bands.etf_min * 100 && etfPct <= bands.etf_max * 100 ? '✅' : '⚠️'} |

${excess > 0 ? `> **⚠️ Exceso detectado**
>
> **${excess.toFixed(1)} puntos porcentuales** por encima del límite.
> En términos absolutos: **~$${formatCurrency(excessAmount)}** en ETFs sobre la banda máxima.

` : ''}---

## 🤔 ¿Qué significa esto?

> **No es una emergencia.** Tu portafolio sigue siendo estructuralmente sólido.

Esta es una **señal de rebalanceo de oportunidad** — el mercado ha movido la distribución y ahora puedes evaluar si quieres corregirla.

---

## 🛠️ Opciones comunes

### 1️⃣ Rebalancear con venta parcial

Vender el exceso de ETFs y reinvertir en CDT para volver a las bandas.

- ✅ Control inmediato de la distribución
- ⚠️ Costos de transacción + spread

### 2️⃣ Esperar vencimiento de CDT

Cuando un CDT madure, no renovarlo y usar el capital para ajustar naturalmente.

- ✅ Sin costos de transacción
- ⚠️ Toma más tiempo (hasta que venza el CDT más próximo)

### 3️⃣ Ajustar las bandas

Si tu perfil de riesgo cambió, puedes actualizar las bandas en vez de rebalancear.

- ✅ No requiere movimientos de capital
- ⚠️ Solo si tu tolerancia al riesgo realmente cambió

---

> **📝 Nota legal**
> El rebalanceo puede implicar costos de transacción y consecuencias fiscales. Este análisis es puramente informativo y no constituye asesoría financiera.`;

    events.push({
      user_id: userId,
      type: 'rebalance',
      title: 'Tu distribución de activos salió de las bandas configuradas',
      body,
      metadata: {
        current_cdt_pct: cdtPct,
        current_etf_pct: etfPct,
        band_cdt_min: bands.cdt_min,
        band_cdt_max: bands.cdt_max,
        band_etf_min: bands.etf_min,
        band_etf_max: bands.etf_max,
        excess_pct: excess,
        excess_amount: excessAmount,
        total_portfolio: totalPortfolio,
      },
    })
  }

  return events
}

/**
 * Trigger #5: ETF cruza Hurdle Rate (ahora justifica capital)
 */
async function checkEtfCrossesHurdle(supabase: any, userId: string): Promise<InboxEvent[]> {
  const events: InboxEvent[] = []

  // Obtener watchlist del usuario (tabla futura, por ahora skip)
  // TODO: implementar cuando exista tabla etf_watchlist

  return events
}

/**
 * Calcula Hurdle Rate actual usando datos reales
 */
async function calculateHurdleRate(supabase: any): Promise<number> {
  // 1. Tasa CDT promedio a 360 días
  const { data: cdtRate } = await supabase
    .from('cdt_rates')
    .select('rate')
    .is('bank', null)
    .eq('term_days', 360)
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!cdtRate) return 10.0  // fallback

  // 2. TRM histórica (últimos 5 años para calcular devaluación)
  const fiveYearsAgo = new Date()
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)

  const { data: trmHistory } = await supabase
    .from('macro_rates')
    .select('value, effective_date')
    .eq('type', 'trm')
    .gte('effective_date', fiveYearsAgo.toISOString().split('T')[0])
    .order('effective_date', { ascending: true })

  let devaluationRate = 0
  if (trmHistory && trmHistory.length >= 2) {
    const oldestTrm = trmHistory[0].value
    const newestTrm = trmHistory[trmHistory.length - 1].value
    const years = (new Date(trmHistory[trmHistory.length - 1].effective_date).getTime() -
                   new Date(trmHistory[0].effective_date).getTime()) / (365 * 24 * 60 * 60 * 1000)
    devaluationRate = Math.pow(newestTrm / oldestTrm, 1 / years) - 1
  }

  // 3. Inflación COP y USD
  const { data: inflationCOP } = await supabase
    .from('macro_rates')
    .select('value')
    .eq('type', 'inflation_cop_annual')
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: inflationUSD } = await supabase
    .from('macro_rates')
    .select('value')
    .eq('type', 'inflation_usd_annual')
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const infCOP = (inflationCOP?.value || 6.61) / 100
  const infUSD = (inflationUSD?.value || 2.95) / 100

  // 4. TER promedio (asumido 0.04% para ETFs indexados)
  const ter = 0.0004

  // Ecuación de Fisher adaptada
  const hurdleRate = (cdtRate.rate / 100) + devaluationRate - (infCOP - infUSD) - ter

  return hurdleRate * 100
}

/**
 * Calcula drawdowns históricos desde precios EOD
 */
function calculateHistoricalDrawdowns(prices: EodPrice[]): Array<{ maxDrawdown: number; recoveryDays: number }> {
  const drawdowns: Array<{ maxDrawdown: number; recoveryDays: number }> = []

  let peak = 0
  let peakIndex = 0
  let inDrawdown = false
  let maxDrawdownPct = 0

  for (let i = 0; i < prices.length; i++) {
    const price = prices[i].adjusted_close

    if (price > peak) {
      // Nuevo pico — terminar drawdown anterior si existía
      if (inDrawdown && maxDrawdownPct < -25) {
        drawdowns.push({
          maxDrawdown: maxDrawdownPct,
          recoveryDays: i - peakIndex,
        })
      }
      peak = price
      peakIndex = i
      inDrawdown = false
      maxDrawdownPct = 0
    } else {
      // En drawdown
      inDrawdown = true
      const currentDrawdown = ((price - peak) / peak) * 100
      if (currentDrawdown < maxDrawdownPct) {
        maxDrawdownPct = currentDrawdown
      }
    }
  }

  // Si terminamos en drawdown
  if (inDrawdown && maxDrawdownPct < -25) {
    drawdowns.push({
      maxDrawdown: maxDrawdownPct,
      recoveryDays: prices.length - peakIndex,
    })
  }

  return drawdowns
}

/**
 * Formateo de moneda COP
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Formateo de fecha legible
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}
