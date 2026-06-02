import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface TrmRecord {
  vigenciadesde: string
  valor: string
}

interface CdtRecord {
  fechacorte: string
  nombreentidad: string
  subcuenta: string
  tasa: string
  monto: string
}

interface WorldBankInflationRecord {
  indicator: { id: string; value: string }
  country: { id: string; value: string }
  countryiso3code: string
  date: string
  value: number | null
  unit: string
  obs_status: string
  decimal: number
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log('[backfill] Iniciando backfill histórico (10 años)...')

    // ────────────────────────────────────────────────────────────────────────
    // 0. DETECTAR QUÉ DATOS YA EXISTEN
    // ────────────────────────────────────────────────────────────────────────

    // Verificar fecha más antigua de TRM
    const { data: oldestTrm } = await supabase
      .from('macro_rates')
      .select('effective_date')
      .eq('type', 'trm')
      .order('effective_date', { ascending: true })
      .limit(1)
      .maybeSingle()

    const trmExists = oldestTrm && oldestTrm.effective_date < '2016-06-01'
    console.log(`[backfill] TRM histórica: ${trmExists ? 'YA EXISTE' : 'FALTA'} (oldest: ${oldestTrm?.effective_date || 'ninguno'})`)

    // Verificar fecha más antigua de CDT
    const { data: oldestCdt } = await supabase
      .from('cdt_rates')
      .select('effective_date')
      .is('bank', null)
      .order('effective_date', { ascending: true })
      .limit(1)
      .maybeSingle()

    const cdtExists = oldestCdt && oldestCdt.effective_date < '2018-06-01'
    console.log(`[backfill] CDT histórico: ${cdtExists ? 'YA EXISTE' : 'FALTA'} (oldest: ${oldestCdt?.effective_date || 'ninguno'})`)

    // Verificar inflación histórica
    const { data: inflationCount } = await supabase
      .from('macro_rates')
      .select('effective_date', { count: 'exact', head: true })
      .eq('type', 'inflation_cop_annual')

    const inflationExists = (inflationCount as any) && inflationCount >= 10
    console.log(`[backfill] Inflación histórica: ${inflationExists ? 'YA EXISTE' : 'FALTA'} (count: ${inflationCount || 0})`)

    // ────────────────────────────────────────────────────────────────────────
    // 1. TRM HISTÓRICA (2016-2026, ~10 años) - SOLO SI FALTA
    // ────────────────────────────────────────────────────────────────────────

    let trmInserted = 0
    let trmData: TrmRecord[] = []

    if (trmExists) {
      console.log('[backfill] Saltando TRM (ya existe)')
    } else {
      const startDate = '2016-01-01'
    const trmUrl = `https://www.datos.gov.co/resource/32sa-8pi3.json?$where=vigenciadesde>='${startDate}'&$order=vigenciadesde ASC&$limit=50000`

    console.log('[backfill] Consultando TRM histórica:', trmUrl)

    const trmResponse = await fetch(trmUrl, {
      headers: getHeaders()
    })

    if (!trmResponse.ok) {
      throw new Error(`API TRM falló: ${trmResponse.status} ${trmResponse.statusText}`)
    }

      trmData = await trmResponse.json()
      console.log(`[backfill] TRM: ${trmData.length} registros obtenidos`)

      // Insertar TRM en bloques de 500
      const TRM_BATCH_SIZE = 500

      for (let i = 0; i < trmData.length; i += TRM_BATCH_SIZE) {
        const batch = trmData.slice(i, i + TRM_BATCH_SIZE)
        const records = batch.map(record => ({
          type: 'trm',
          value: parseFloat(record.valor),
          effective_date: record.vigenciadesde.split('T')[0],
          source: 'datos.gov.co'
        }))

        const { error } = await supabase
          .from('macro_rates')
          .upsert(records, { onConflict: 'type,effective_date' })

        if (error) {
          console.error(`[backfill] Error insertando TRM batch ${i}-${i + batch.length}:`, error)
        } else {
          trmInserted += batch.length
          console.log(`[backfill] TRM: ${trmInserted}/${trmData.length} insertados`)
        }
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. CDT HISTÓRICO (2018-2026, por año) - SOLO SI FALTA
    // ────────────────────────────────────────────────────────────────────────

    let cdtInserted = 0
    let cdtData: CdtRecord[] = []
    let aggregated: Array<{ date: string; term_days: number; avg_rate: number }> = []

    if (cdtExists) {
      console.log('[backfill] Saltando CDT (ya existe)')
    } else {
      const TERM_MAP = {
        '10': 30,
        '50': 60,
        '70': 90,
        '90': 120,
        '110': 180,
        '130': 360
      }

      const currentYear = new Date().getFullYear()

      // Fetch CDT año por año desde 2018 hasta el año actual
      for (let year = 2018; year <= currentYear; year++) {
        const yearStart = `${year}-01-01`
        const yearEnd = `${year}-12-31`
        const cdtUrl = `https://www.datos.gov.co/resource/axk9-g2nh.json?$where=uca='1' AND fechacorte>='${yearStart}' AND fechacorte<='${yearEnd}'&$order=fechacorte ASC&$limit=50000`

        console.log(`[backfill] Consultando CDT año ${year}...`)

        const cdtResponse = await fetch(cdtUrl, {
          headers: getHeaders()
        })

        if (!cdtResponse.ok) {
          console.error(`[backfill] API CDT falló para año ${year}: ${cdtResponse.status}`)
          continue // Skip this year and continue with next
        }

        const yearData: CdtRecord[] = await cdtResponse.json()
        cdtData.push(...yearData)
        console.log(`[backfill] CDT año ${year}: ${yearData.length} registros obtenidos`)
      }

      console.log(`[backfill] CDT total: ${cdtData.length} registros obtenidos`)

      // Agregar por (fecha, plazo)
      aggregated = aggregateCdtRates(cdtData, TERM_MAP)
      console.log(`[backfill] CDT: ${aggregated.length} promedios calculados`)

      // Insertar CDT en bloques de 500
      const CDT_BATCH_SIZE = 500

      for (let i = 0; i < aggregated.length; i += CDT_BATCH_SIZE) {
      const batch = aggregated.slice(i, i + CDT_BATCH_SIZE)
      const records = batch.map(rate => ({
        bank: null,
        term_days: rate.term_days,
        rate: rate.avg_rate,
        effective_date: rate.date,
        source: 'datos.gov.co'
      }))

      const { error } = await supabase
        .from('cdt_rates')
        .upsert(records, { onConflict: 'bank,term_days,effective_date' })

      if (error) {
        console.error(`[backfill] Error insertando CDT batch ${i}-${i + batch.length}:`, error)
      } else {
        cdtInserted += batch.length
        console.log(`[backfill] CDT: ${cdtInserted}/${aggregated.length} insertados`)
      }
    }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. INFLACIÓN HISTÓRICA (World Bank API, desde 2010) - SOLO SI FALTA
    // ────────────────────────────────────────────────────────────────────────

    let inflationInserted = 0
    let inflationYears: number[] = []

    if (inflationExists) {
      console.log('[backfill] Saltando Inflación (ya existe)')
    } else {
      const inflationUrl = 'https://api.worldbank.org/v2/country/COL/indicator/FP.CPI.TOTL.ZG?format=json&per_page=100&date=2010:2030'
      console.log('[backfill] Consultando inflación histórica World Bank...')

    try {
      const inflationResponse = await fetch(inflationUrl, {
        headers: getHeaders()
      })

      if (!inflationResponse.ok) {
        console.error('[backfill] API World Bank falló:', inflationResponse.status)
      } else {
        const inflationJson = await inflationResponse.json()
        const inflationData: WorldBankInflationRecord[] = Array.isArray(inflationJson) && inflationJson.length > 1 ? inflationJson[1] : []

        console.log(`[backfill] Inflación: ${inflationData.length} registros obtenidos`)

        // Insertar inflación en bloques
        const validRecords = inflationData
          .filter(record => record.value !== null && record.value !== undefined)
          .map(record => ({
            type: 'inflation_cop_annual',
            value: record.value!,
            effective_date: `${record.date}-12-31`,
            source: 'worldbank'
          }))

        if (validRecords.length > 0) {
          const { error } = await supabase
            .from('macro_rates')
            .upsert(validRecords, { onConflict: 'type,effective_date' })

          if (error) {
            console.error('[backfill] Error insertando inflación:', error)
          } else {
            inflationInserted = validRecords.length
            inflationYears = inflationData
              .filter(r => r.value !== null)
              .map(r => parseInt(r.date))
            console.log(`[backfill] Inflación: ${inflationInserted} registros insertados`)
          }
        }
      }
    } catch (inflError) {
      console.error('[backfill] Error procesando inflación:', inflError)
    }
    }

    // ────────────────────────────────────────────────────────────────────────
    // RESULTADO FINAL
    // ────────────────────────────────────────────────────────────────────────

    const result = {
      success: true,
      trm: {
        fetched: trmData.length,
        inserted: trmInserted,
        date_range: trmData.length > 0 ?
          `${trmData[0].vigenciadesde.split('T')[0]} → ${trmData[trmData.length - 1].vigenciadesde.split('T')[0]}`
          : 'N/A'
      },
      cdt: {
        fetched: cdtData.length,
        aggregated: aggregated.length,
        inserted: cdtInserted,
        date_range: aggregated.length > 0 ?
          `${aggregated[0].date} → ${aggregated[aggregated.length - 1].date}`
          : 'N/A'
      },
      inflation: {
        inserted: inflationInserted,
        years: inflationYears
      },
      timestamp: new Date().toISOString()
    }

    console.log('[backfill] Completado:', JSON.stringify(result, null, 2))

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('[backfill] Error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {}
  const token = Deno.env.get('SOCRATA_APP_TOKEN')
  if (token) {
    headers['X-App-Token'] = token
    console.log('[backfill] Usando Socrata App Token')
  }
  return headers
}

function aggregateCdtRates(
  data: CdtRecord[],
  termMap: Record<string, number>
): Array<{ date: string; term_days: number; avg_rate: number }> {
  const filtered = data.filter(record => record.subcuenta in termMap)

  const groups = new Map<string, { totalWeighted: number; totalMonto: number }>()

  for (const record of filtered) {
    const date = record.fechacorte.split('T')[0]
    const termDays = termMap[record.subcuenta]
    const key = `${date}_${termDays}`
    const rate = parseFloat(record.tasa)
    const monto = parseFloat(record.monto)

    if (isNaN(rate) || isNaN(monto) || monto <= 0) continue

    if (!groups.has(key)) {
      groups.set(key, { totalWeighted: 0, totalMonto: 0 })
    }
    const group = groups.get(key)!
    group.totalWeighted += rate * monto
    group.totalMonto += monto
  }

  const result = []
  for (const [key, group] of groups) {
    const [date, termDaysStr] = key.split('_')
    result.push({
      date,
      term_days: parseInt(termDaysStr),
      avg_rate: group.totalWeighted / group.totalMonto
    })
  }

  return result.sort((a, b) => a.date.localeCompare(b.date))
}
