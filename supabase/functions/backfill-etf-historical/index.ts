import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface EodhdDailyPrice {
  date: string
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

    console.log('[backfill-etf] Iniciando backfill histórico ETFs...')

    // ────────────────────────────────────────────────────────────────────────
    // 1. OBTENER LISTA DE TICKERS ÚNICOS
    // ────────────────────────────────────────────────────────────────────────

    const { data: tickers, error: tickersError } = await supabase
      .from('etf_positions')
      .select('ticker')

    if (tickersError) {
      throw new Error(`Error obteniendo tickers: ${tickersError.message}`)
    }

    const uniqueTickers = [...new Set(tickers.map(p => p.ticker))]

    if (uniqueTickers.length === 0) {
      console.log('[backfill-etf] No hay posiciones ETF.')
      return new Response(JSON.stringify({
        success: true,
        message: 'No ETF positions to backfill',
        tickers: []
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`[backfill-etf] Tickers a procesar: ${uniqueTickers.join(', ')}`)

    // ────────────────────────────────────────────────────────────────────────
    // 2. VERIFICAR QUÉ TICKERS YA TIENEN HISTÓRICO COMPLETO
    // ────────────────────────────────────────────────────────────────────────

    const tickersToBackfill: string[] = []

    for (const ticker of uniqueTickers) {
      const { data: oldestPrice } = await supabase
        .from('eod_prices')
        .select('date')
        .eq('ticker', ticker)
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle()

      // Si no tiene datos O el más antiguo es posterior a 2020, necesita backfill
      const needsBackfill = !oldestPrice || oldestPrice.date > '2020-01-01'

      if (needsBackfill) {
        tickersToBackfill.push(ticker)
        console.log(`[backfill-etf] ${ticker}: Requiere backfill (oldest: ${oldestPrice?.date || 'ninguno'})`)
      } else {
        console.log(`[backfill-etf] ${ticker}: Ya tiene histórico completo (desde ${oldestPrice.date})`)
      }
    }

    if (tickersToBackfill.length === 0) {
      console.log('[backfill-etf] Todos los tickers ya tienen histórico completo.')
      return new Response(JSON.stringify({
        success: true,
        message: 'All tickers already have historical data',
        tickers: uniqueTickers.map(t => ({ ticker: t, skipped: true }))
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. BACKFILL HISTÓRICO (10 AÑOS O DESDE INCEPTION)
    // ────────────────────────────────────────────────────────────────────────

    const today = new Date()
    const tenYearsAgo = new Date(today)
    tenYearsAgo.setFullYear(today.getFullYear() - 10)

    const fromDate = tenYearsAgo.toISOString().split('T')[0]
    const toDate = today.toISOString().split('T')[0]

    let totalInserted = 0
    const results: Array<{ ticker: string; records: number; error?: string }> = []

    for (const ticker of tickersToBackfill) {
      try {
        const url = `https://eodhd.com/api/eod/${ticker}.US?api_token=${eodhd_key}&fmt=json&from=${fromDate}&to=${toDate}`

        console.log(`[backfill-etf] Fetching ${ticker} histórico (${fromDate} → ${toDate})...`)

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`EODHD API falló: ${response.status} ${response.statusText}`)
        }

        const data: EodhdDailyPrice[] = await response.json()

        if (!Array.isArray(data) || data.length === 0) {
          console.log(`[backfill-etf] ${ticker}: Sin datos históricos`)
          results.push({ ticker, records: 0 })
          continue
        }

        console.log(`[backfill-etf] ${ticker}: ${data.length} registros obtenidos`)

        // Insertar en bloques de 500 registros
        const BATCH_SIZE = 500
        let inserted = 0

        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          const batch = data.slice(i, i + BATCH_SIZE)
          const records = batch.map(price => ({
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
            console.error(`[backfill-etf] Error insertando batch ${i}-${i + batch.length}:`, insertError)
          } else {
            inserted += batch.length
            console.log(`[backfill-etf] ${ticker}: ${inserted}/${data.length} insertados`)
          }
        }

        totalInserted += inserted
        results.push({ ticker, records: inserted })

        // Rate limiting: 1 segundo entre tickers
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[backfill-etf] Error procesando ${ticker}:`, errorMessage)
        results.push({ ticker, records: 0, error: errorMessage })
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 4. RESULTADO FINAL
    // ────────────────────────────────────────────────────────────────────────

    const result = {
      success: true,
      total_inserted: totalInserted,
      tickers: results,
      timestamp: new Date().toISOString()
    }

    console.log('[backfill-etf] Completado:', JSON.stringify(result, null, 2))

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('[backfill-etf] Error:', error)
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
