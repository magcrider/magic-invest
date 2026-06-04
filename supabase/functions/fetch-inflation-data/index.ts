import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Edge Function: fetch-inflation-data
 *
 * Obtiene datos de inflación anual desde World Bank API para Colombia y USA.
 * Inserta los valores más recientes en la tabla macro_rates.
 *
 * Fuente: World Bank API (sin autenticación requerida)
 * - Colombia: COL/FP.CPI.TOTL.ZG (Inflation, consumer prices annual %)
 * - USA: USA/FP.CPI.TOTL.ZG
 *
 * Frecuencia recomendada: Mensual (1ra semana del mes)
 */

interface WorldBankResponse {
  indicator: {
    id: string;
    value: string;
  };
  country: {
    id: string;
    value: string;
  };
  countryiso3code: string;
  date: string;
  value: number | null;
  unit: string;
  obs_status: string;
  decimal: number;
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log('Fetching inflation data from World Bank API...')

    // Fetch inflación Colombia (últimos 5 años)
    const copUrl = 'https://api.worldbank.org/v2/country/COL/indicator/FP.CPI.TOTL.ZG?format=json&date=2020:2026&per_page=10'
    const copResponse = await fetch(copUrl)

    if (!copResponse.ok) {
      throw new Error(`World Bank API error (COL): ${copResponse.status}`)
    }

    const copData = await copResponse.json()
    const copRecords: WorldBankResponse[] = copData[1] || []

    // Filtrar solo valores no nulos y tomar el más reciente
    const latestCop = copRecords.find(record => record.value !== null)

    if (!latestCop || latestCop.value === null) {
      throw new Error('No inflation data found for Colombia')
    }

    console.log(`Colombia inflation: ${latestCop.value}% (year ${latestCop.date})`)

    // Fetch inflación USA (últimos 5 años)
    const usaUrl = 'https://api.worldbank.org/v2/country/USA/indicator/FP.CPI.TOTL.ZG?format=json&date=2020:2026&per_page=10'
    const usaResponse = await fetch(usaUrl)

    if (!usaResponse.ok) {
      throw new Error(`World Bank API error (USA): ${usaResponse.status}`)
    }

    const usaData = await usaResponse.json()
    const usaRecords: WorldBankResponse[] = usaData[1] || []

    // Filtrar solo valores no nulos y tomar el más reciente
    const latestUsa = usaRecords.find(record => record.value !== null)

    if (!latestUsa || latestUsa.value === null) {
      throw new Error('No inflation data found for USA')
    }

    console.log(`USA inflation: ${latestUsa.value}% (year ${latestUsa.date})`)

    // Upsert inflación Colombia en macro_rates
    const { error: copError } = await supabase
      .from('macro_rates')
      .upsert({
        type: 'inflation_cop_annual',
        value: latestCop.value,
        effective_date: `${latestCop.date}-12-31`, // Dato anual, fecha fin de año
        source: 'worldbank_api'
      }, {
        onConflict: 'type,effective_date',
        ignoreDuplicates: false
      })

    if (copError) {
      console.error('Error upserting COP inflation:', copError)
      throw copError
    }

    // Upsert inflación USA en macro_rates
    const { error: usaError } = await supabase
      .from('macro_rates')
      .upsert({
        type: 'inflation_usd_annual',
        value: latestUsa.value,
        effective_date: `${latestUsa.date}-12-31`, // Dato anual, fecha fin de año
        source: 'worldbank_api'
      }, {
        onConflict: 'type,effective_date',
        ignoreDuplicates: false
      })

    if (usaError) {
      console.error('Error upserting USA inflation:', usaError)
      throw usaError
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          colombia: {
            value: latestCop.value,
            year: latestCop.date
          },
          usa: {
            value: latestUsa.value,
            year: latestUsa.date
          }
        },
        message: 'Inflation data updated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in fetch-inflation-data:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
