import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface EodhdDailyPrice {
  date: string          // "2026-06-02"
  open: number
  high: number
  low: number
  close: number
  adjusted_close: number
  volume: number
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const eodhd_key = Deno.env.get('EODHD_API_KEY')
    if (!eodhd_key) {
      throw new Error('EODHD_API_KEY not configured')
    }

    console.log('[fetch-etf-prices] Iniciando sincronización diaria...')

    // ────────────────────────────────────────────────────────────────────────
    // 1. OBTENER LISTA DE TICKERS ÚNICOS DE POSICIONES DE USUARIOS
    // ────────────────────────────────────────────────────────────────────────

    const { data: tickers, error: tickersError } = await supabase
      .from('etf_positions')
      .select('ticker')

    if (tickersError) {
      throw new Error(`Error obteniendo tickers: ${tickersError.message}`)
    }

    // Obtener tickers únicos
    const uniqueTickers = [...new Set(tickers.map(p => p.ticker))]

    if (uniqueTickers.length === 0) {
      console.log('[fetch-etf-prices] No hay posiciones ETF. Nada que sincronizar.')
      return new Response(JSON.stringify({
        success: true,
        message: 'No ETF positions to sync',
        tickers: []
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`[fetch-etf-prices] Tickers a sincronizar: ${uniqueTickers.join(', ')}`)

    // ────────────────────────────────────────────────────────────────────────
    // 2. OBTENER ÚLTIMOS 7 DÍAS DE CADA TICKER (por si hay días no hábiles)
    // ────────────────────────────────────────────────────────────────────────

    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)

    const fromDate = sevenDaysAgo.toISOString().split('T')[0]
    const toDate = today.toISOString().split('T')[0]

    let totalInserted = 0
    const results: Array<{ ticker: string; records: number; error?: string }> = []

    for (const ticker of uniqueTickers) {
      try {
        // Fetch desde EODHD
        const url = `https://eodhd.com/api/eod/${ticker}.US?api_token=${eodhd_key}&fmt=json&from=${fromDate}&to=${toDate}`

        console.log(`[fetch-etf-prices] Fetching ${ticker}...`)

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`EODHD API falló: ${response.status} ${response.statusText}`)
        }

        const data: EodhdDailyPrice[] = await response.json()

        if (!Array.isArray(data) || data.length === 0) {
          console.log(`[fetch-etf-prices] ${ticker}: Sin datos en rango ${fromDate} - ${toDate}`)
          results.push({ ticker, records: 0 })
          continue
        }

        console.log(`[fetch-etf-prices] ${ticker}: ${data.length} registros obtenidos`)

        // Insertar en base de datos (upsert por ticker + date)
        const records = data.map(price => ({
          ticker: ticker,
          date: price.date,
          open: price.open,
          high: price.high,
          low: price.low,
          close: price.close,
          adjusted_close: price.adjusted_close,
          volume: price.volume,
          currency: 'USD',
          source: 'eodhd'
        }))

        const { error: insertError } = await supabase
          .from('eod_prices')
          .upsert(records, { onConflict: 'ticker,date' })

        if (insertError) {
          console.error(`[fetch-etf-prices] Error insertando ${ticker}:`, insertError)
          results.push({ ticker, records: 0, error: insertError.message })
        } else {
          totalInserted += data.length
          results.push({ ticker, records: data.length })
          console.log(`[fetch-etf-prices] ${ticker}: ${data.length} registros insertados/actualizados`)
        }

        // Rate limiting: esperar 1 segundo entre requests (tier free: 20 req/día)
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[fetch-etf-prices] Error procesando ${ticker}:`, errorMessage)
        results.push({ ticker, records: 0, error: errorMessage })
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. RESULTADO FINAL
    // ────────────────────────────────────────────────────────────────────────

    const result = {
      success: true,
      total_inserted: totalInserted,
      tickers: results,
      timestamp: new Date().toISOString()
    }

    console.log('[fetch-etf-prices] Completado:', JSON.stringify(result, null, 2))

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('[fetch-etf-prices] Error:', error)
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
