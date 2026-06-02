import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface TrmRecord {
  vigenciadesde: string  // "2026-06-02T00:00:00.000"
  valor: string          // "3560.24"
}

interface CdtRecord {
  fechacorte: string       // "2026-05-29T00:00:00.000"
  nombreentidad: string    // "BBVA Colombia"
  subcuenta: string        // "130" (360 días)
  tasa: string             // "12.15"
  monto: string            // "22600846"
}

interface WorldBankInflationRecord {
  indicator: { id: string; value: string }
  country: { id: string; value: string }
  countryiso3code: string
  date: string             // "2024"
  value: number            // 6.609085937
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

    console.log('[fetch-banrep-data] Iniciando sincronización (TRM + CDT + Inflación)...')

    // 1. Fetch TRM (últimos 7 días por si hay días no hábiles)
    const trmUrl = `https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde DESC&$limit=7`
    console.log('[fetch-banrep-data] Consultando TRM:', trmUrl)

    const trmResponse = await fetch(trmUrl, {
      headers: getHeaders()
    })

    if (!trmResponse.ok) {
      throw new Error(`API TRM falló: ${trmResponse.status} ${trmResponse.statusText}`)
    }

    const trmData: TrmRecord[] = await trmResponse.json()
    console.log(`[fetch-banrep-data] TRM: ${trmData.length} registros obtenidos`)

    // 2. Upsert TRM en macro_rates
    let trmInserted = 0
    for (const record of trmData) {
      const { error } = await supabase.from('macro_rates').upsert({
        type: 'trm',
        value: parseFloat(record.valor),
        effective_date: record.vigenciadesde.split('T')[0],
        source: 'datos.gov.co'
      }, { onConflict: 'type,effective_date' })

      if (error) {
        console.error('[fetch-banrep-data] Error insertando TRM:', error)
      } else {
        trmInserted++
      }
    }

    // 3. Fetch CDT (últimos 14 días, múltiples plazos)
    const TERM_MAP = {
      '10': 30,   // 30 días
      '50': 60,   // 60 días
      '70': 90,   // 90 días
      '90': 120,  // 120 días
      '110': 180, // 180 días
      '130': 360  // 360 días
    }

    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const cdtUrl = `https://www.datos.gov.co/resource/axk9-g2nh.json?$where=uca='1' AND fechacorte>='${twoWeeksAgo}'&$limit=10000`
    console.log('[fetch-banrep-data] Consultando CDT:', cdtUrl)

    const cdtResponse = await fetch(cdtUrl, {
      headers: getHeaders()
    })

    if (!cdtResponse.ok) {
      throw new Error(`API CDT falló: ${cdtResponse.status} ${cdtResponse.statusText}`)
    }

    const cdtData: CdtRecord[] = await cdtResponse.json()
    console.log(`[fetch-banrep-data] CDT: ${cdtData.length} registros obtenidos`)

    // 4. Calcular promedio ponderado por (fecha, plazo)
    const aggregated = aggregateCdtRates(cdtData, TERM_MAP)
    console.log(`[fetch-banrep-data] CDT: ${aggregated.length} promedios calculados`)

    // 5. Upsert CDT en cdt_rates
    let cdtInserted = 0
    for (const rate of aggregated) {
      const { error } = await supabase.from('cdt_rates').upsert({
        bank: null,  // promedio de mercado
        term_days: rate.term_days,
        rate: rate.avg_rate,
        effective_date: rate.date,
        source: 'datos.gov.co'
      }, { onConflict: 'bank,term_days,effective_date' })

      if (error) {
        console.error('[fetch-banrep-data] Error insertando CDT:', error)
      } else {
        cdtInserted++
      }
    }

    // 6. Fetch Inflación COP anual (World Bank)
    const inflationUrl = 'https://api.worldbank.org/v2/country/COL/indicator/FP.CPI.TOTL.ZG?format=json&per_page=10&date=2020:2030'
    console.log('[fetch-banrep-data] Consultando inflación World Bank:', inflationUrl)

    const inflationResponse = await fetch(inflationUrl)

    if (!inflationResponse.ok) {
      console.error('[fetch-banrep-data] API World Bank falló:', inflationResponse.status)
    }

    let inflationInserted = 0
    let inflationYears: number[] = []

    try {
      const inflationJson = await inflationResponse.json()
      // World Bank retorna [metadata, data]
      const inflationData: WorldBankInflationRecord[] = Array.isArray(inflationJson) && inflationJson.length > 1 ? inflationJson[1] : []

      console.log(`[fetch-banrep-data] Inflación: ${inflationData.length} registros obtenidos`)

      // 7. Upsert inflación en macro_rates
      for (const record of inflationData) {
        if (!record.value || record.value === null) continue // Skip años sin dato

        const year = parseInt(record.date)
        const effectiveDate = `${year}-12-31` // Inflación anual se asigna al último día del año

        const { error } = await supabase.from('macro_rates').upsert({
          type: 'inflation_cop_annual',
          value: record.value,
          effective_date: effectiveDate,
          source: 'worldbank'
        }, { onConflict: 'type,effective_date' })

        if (error) {
          console.error(`[fetch-banrep-data] Error insertando inflación ${year}:`, error)
        } else {
          inflationInserted++
          inflationYears.push(year)
        }
      }
    } catch (inflError) {
      console.error('[fetch-banrep-data] Error procesando inflación:', inflError)
    }

    const result = {
      success: true,
      trm_records: trmData.length,
      trm_inserted: trmInserted,
      cdt_records: cdtData.length,
      cdt_inserted: cdtInserted,
      inflation_inserted: inflationInserted,
      inflation_years: inflationYears,
      timestamp: new Date().toISOString()
    }

    console.log('[fetch-banrep-data] Completado:', result)

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('[fetch-banrep-data] Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
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
    console.log('[fetch-banrep-data] Usando Socrata App Token')
  }
  return headers
}

function aggregateCdtRates(
  data: CdtRecord[],
  termMap: Record<string, number>
): Array<{ date: string; term_days: number; avg_rate: number }> {
  // Filtrar solo subcuentas de interés
  const filtered = data.filter(record => record.subcuenta in termMap)

  // Agrupar por (fecha, plazo)
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

  // Calcular promedio ponderado
  const result = []
  for (const [key, group] of groups) {
    const [date, termDaysStr] = key.split('_')
    result.push({
      date,
      term_days: parseInt(termDaysStr),
      avg_rate: group.totalWeighted / group.totalMonto
    })
  }

  return result
}
