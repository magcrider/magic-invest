import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Edge Function: fetch-inflation-cop
 *
 * Obtiene la variación anual del IPC de Colombia desde el webservice SDMX
 * del Banco de la República (Banrep).
 *
 * Banrep no publica IPC directamente (eso lo hace DANE), pero sí publica la
 * UVR (Unidad de Valor Real) con periodicidad diaria. La UVR está calculada
 * a partir del IPC mensual y soporta UNIT_MEASURE=APC (Annual Percentage
 * Change), que es exactamente la variación 12m del IPC que necesitamos.
 *
 * Endpoint: SDMX-ML 2.1 Generic Data (XML), sin autenticación.
 * Frecuencia recomendada: diaria.
 */

const BANREP_SDMX_URL =
  'https://totoro.banrep.gov.co/nsi-jax-ws/rest/data/ESTAT,DF_UVR_DAILY_LATEST,1.0/all/ALL/?dimensionAtObservation=TIME_PERIOD&detail=full'

interface ParsedObs {
  date: string // YYYY-MM-DD
  value: number
}

/**
 * Extrae la última observación con UNIT_MEASURE=APC del XML SDMX.
 * El XML tiene dos <generic:Series>: una con APC (variación anual) y otra
 * con CRVU (precio del UVR). Buscamos la primera y tomamos el último Obs
 * con fecha <= hoy.
 */
function extractLatestApc(xml: string): ParsedObs {
  // Aislar el bloque de la serie APC.
  const apcSeriesMatch = xml.match(
    /<generic:Series>(?:(?!<\/generic:Series>)[\s\S])*?UNIT_MEASURE"\s+value="APC"[\s\S]*?<\/generic:Series>/
  )
  if (!apcSeriesMatch) {
    throw new Error('No se encontró la serie UNIT_MEASURE=APC en la respuesta SDMX')
  }
  const apcBlock = apcSeriesMatch[0]

  // Extraer todas las observaciones de la serie APC.
  const obsRegex =
    /<generic:ObsDimension\s+value="(\d{8})"\s*\/>\s*<generic:ObsValue\s+value="([\d.]+)"\s*\/>/g
  const observations: ParsedObs[] = []
  let m: RegExpExecArray | null
  while ((m = obsRegex.exec(apcBlock)) !== null) {
    const yyyymmdd = m[1]
    const date = `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
    observations.push({ date, value: parseFloat(m[2]) })
  }

  if (observations.length === 0) {
    throw new Error('La serie APC no contiene observaciones')
  }

  // Banrep publica UVR con anticipación (depende del IPC del mes anterior).
  // Tomamos la observación más reciente con fecha <= hoy.
  const today = new Date().toISOString().split('T')[0]
  const eligible = observations.filter(o => o.date <= today)
  const pool = eligible.length > 0 ? eligible : observations
  pool.sort((a, b) => (a.date < b.date ? 1 : -1))
  return pool[0]
}

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log('Fetching IPC YoY from Banrep SDMX...')

    const response = await fetch(BANREP_SDMX_URL)
    if (!response.ok) {
      throw new Error(`Banrep SDMX error: HTTP ${response.status}`)
    }
    const xml = await response.text()

    const obs = extractLatestApc(xml)
    console.log(`IPC YoY Colombia: ${obs.value}% (${obs.date})`)

    // Validación de plausibilidad: el IPC histórico de Colombia ha estado entre
    // 1% y 30% en las últimas décadas. Si sale de ese rango, probablemente hay
    // un cambio de formato en la respuesta.
    if (obs.value < 1 || obs.value > 30) {
      throw new Error(
        `Valor IPC fuera de rango plausible: ${obs.value}% (fecha ${obs.date})`
      )
    }

    const { error } = await supabase
      .from('macro_rates')
      .upsert(
        {
          type: 'inflation_cop_yoy_banrep',
          value: obs.value,
          effective_date: obs.date,
          source: 'banrep_sdmx',
        },
        { onConflict: 'type,effective_date', ignoreDuplicates: false }
      )

    if (error) {
      console.error('Error upserting IPC YoY:', error)
      throw error
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: { value: obs.value, date: obs.date },
        message: 'IPC YoY Colombia actualizado desde Banrep SDMX',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in fetch-inflation-cop:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
