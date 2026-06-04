import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Edge Function: backfill-inflation-historical
 *
 * Pobla la tabla macro_rates con datos históricos de inflación (últimos 10 años).
 * Solo debe ejecutarse UNA VEZ después del deploy inicial.
 *
 * Fuente: World Bank API
 * - Colombia: COL/FP.CPI.TOTL.ZG
 * - USA: USA/FP.CPI.TOTL.ZG
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

    console.log('Starting historical inflation backfill (2014-2026)...')

    const startYear = 2014
    const endYear = 2026
    const dateRange = `${startYear}:${endYear}`

    // Fetch inflación Colombia (últimos 10 años)
    console.log('Fetching Colombia inflation data...')
    const copUrl = `https://api.worldbank.org/v2/country/COL/indicator/FP.CPI.TOTL.ZG?format=json&date=${dateRange}&per_page=100`
    const copResponse = await fetch(copUrl)

    if (!copResponse.ok) {
      throw new Error(`World Bank API error (COL): ${copResponse.status}`)
    }

    const copData = await copResponse.json()
    const copRecords: WorldBankResponse[] = copData[1] || []

    // Filtrar valores no nulos
    const validCopRecords = copRecords.filter(record => record.value !== null)

    console.log(`Found ${validCopRecords.length} valid COP inflation records`)

    // Fetch inflación USA (últimos 10 años)
    console.log('Fetching USA inflation data...')
    const usaUrl = `https://api.worldbank.org/v2/country/USA/indicator/FP.CPI.TOTL.ZG?format=json&date=${dateRange}&per_page=100`
    const usaResponse = await fetch(usaUrl)

    if (!usaResponse.ok) {
      throw new Error(`World Bank API error (USA): ${usaResponse.status}`)
    }

    const usaData = await usaResponse.json()
    const usaRecords: WorldBankResponse[] = usaData[1] || []

    // Filtrar valores no nulos
    const validUsaRecords = usaRecords.filter(record => record.value !== null)

    console.log(`Found ${validUsaRecords.length} valid USA inflation records`)

    // Preparar registros para inserción Colombia
    const copInserts = validCopRecords.map(record => ({
      type: 'inflation_cop_annual',
      value: record.value!,
      effective_date: `${record.date}-12-31`, // Dato anual, fecha fin de año
      source: 'worldbank_api'
    }))

    // Preparar registros para inserción USA
    const usaInserts = validUsaRecords.map(record => ({
      type: 'inflation_usd_annual',
      value: record.value!,
      effective_date: `${record.date}-12-31`,
      source: 'worldbank_api'
    }))

    // Combinar ambos arrays
    const allInserts = [...copInserts, ...usaInserts]

    console.log(`Upserting ${allInserts.length} total records...`)

    // Upsert en batch (Supabase permite hasta 1000 por batch)
    const { error: upsertError } = await supabase
      .from('macro_rates')
      .upsert(allInserts, {
        onConflict: 'type,effective_date',
        ignoreDuplicates: false
      })

    if (upsertError) {
      console.error('Error upserting historical inflation:', upsertError)
      throw upsertError
    }

    console.log('Historical inflation backfill completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          colombia_records: validCopRecords.length,
          usa_records: validUsaRecords.length,
          total_inserted: allInserts.length,
          date_range: `${startYear}-${endYear}`
        },
        message: 'Historical inflation data backfilled successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in backfill-inflation-historical:', error)

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
