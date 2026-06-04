# Motor de Eventos del Buzón

Edge Function que evalúa condiciones matemáticas contra datos reales del portafolio y genera eventos educativos cuando se cumplen triggers definidos.

## Triggers Implementados

### 1. CDT Próximo a Vencer (30/60/90 días)
**Condición:** `end_date - today IN [30, 60, 90]`

**Genera evento con:**
- Valor al vencimiento (capital + rendimientos - retefuente 4%)
- Hurdle Rate vigente
- Tasa de mercado actual para el plazo
- Comparación con tasa original del CDT

**Metadata:**
```typescript
{
  cdt_id: number
  days_until_maturity: 30 | 60 | 90
  maturity_date: string
  current_amount: number
  current_rate: number
  projected_maturity_value: number
  market_rate: number
  hurdle_rate: number
}
```

---

### 2. Drawdown Estructural ETF (>25%)
**Condición:** `(current_price - peak_price) / peak_price < -0.25`

**Cálculo:**
- Busca pico histórico en últimos 3 años
- Calcula drawdown actual desde ese pico
- Analiza drawdowns históricos similares (>25%)
- Calcula tiempo promedio de recuperación

**Genera evento con:**
- Caída porcentual desde pico
- Fecha del pico
- Número de episodios comparables en la historia del ETF
- Tiempo promedio de recuperación histórica

**Metadata:**
```typescript
{
  etf_id: number
  ticker: string
  current_price_usd: number
  peak_price_usd: number
  peak_date: string
  drawdown_pct: number  // negativo, ej: -27.3
  similar_episodes: number
  avg_recovery_days: number
  current_trm: number
  position_value_cop: number
}
```

---

### 3. Cambio Significativo Tasa Banrep (≥50 bps)
**Condición:** `|current_rate - previous_rate| >= 0.5`

**Genera evento con:**
- Tasa anterior y nueva
- Cambio en puntos básicos
- Nuevo Hurdle Rate recalculado
- Impacto en ETFs en cartera (si existen)

**Metadata:**
```typescript
{
  previous_rate: number
  current_rate: number
  change_bps: number  // ej: -50 (baja de 50 bps)
  new_hurdle_rate: number
  effective_date: string
}
```

---

### 4. Bandas de Asignación Fuera de Rango
**Condición:** `cdt_pct < band.cdt_min OR cdt_pct > band.cdt_max OR etf_pct > band.etf_max`

**Default bands:** CDT 50-70%, ETF 30-50%

**Genera evento con:**
- Distribución actual (% CDT / % ETF)
- Bandas configuradas
- Exceso en puntos porcentuales
- Exceso en valor absoluto COP

**Metadata:**
```typescript
{
  current_cdt_pct: number
  current_etf_pct: number
  band_cdt_min: number
  band_cdt_max: number
  band_etf_min: number
  band_etf_max: number
  excess_pct: number  // cuántos puntos fuera de banda
  excess_amount: number  // valor COP del exceso
  total_portfolio: number
}
```

---

### 5. ETF Cruza Hurdle Rate (pendiente)
**Condición:** `CAGR_5y > hurdle_rate` Y anteriormente no lo superaba

**Estado:** Pendiente — requiere tabla `etf_watchlist`

---

## Deployment

### 1. Deploy de la función
```bash
cd /Users/harvey.botero/GIT/magic-invest
supabase functions deploy generate-inbox-events
```

### 2. Test manual (invocación única)
```bash
supabase functions invoke generate-inbox-events
```

**Respuesta esperada:**
```json
{
  "success": true,
  "users_processed": 1,
  "events_created": 2
}
```

### 3. Configurar Cron Job (Supabase Dashboard)

1. Ir a **Database** → **Cron Jobs**
2. Click **Create Cron Job**
3. Configurar:
   - **Name:** `generate-inbox-events`
   - **Type:** `Supabase Edge Function`
   - **Function:** `generate-inbox-events`
   - **Schedule:** `0 6 * * 1` (lunes 6 AM Colombia)
   - **Timezone:** `America/Bogota` (UTC-5)
   - **Timeout:** `60000` ms (1 minuto)

**Nota:** Frecuencia semanal (no diaria) para no saturar Buzón. Los triggers son condiciones estructurales, no cambios diarios.

---

## Testing Local

### Verificar eventos generados
```sql
-- Ver últimos eventos
SELECT 
  id,
  type,
  title,
  created_at,
  metadata->>'days_until_maturity' as days_to_maturity
FROM inbox_events
ORDER BY created_at DESC
LIMIT 10;

-- Contar eventos por tipo
SELECT 
  type,
  COUNT(*) as total
FROM inbox_events
WHERE dismissed_at IS NULL
GROUP BY type;
```

### Simular condiciones

#### CDT próximo a vencer
```sql
-- Insertar CDT que vence en 30 días
INSERT INTO cdt_positions (user_id, bank, amount, rate, term_days, start_date, end_date)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'Bancolombia',
  15000000,
  12.5,
  360,
  CURRENT_DATE - INTERVAL '330 days',
  CURRENT_DATE + INTERVAL '30 days'
);
```

#### Drawdown estructural
```sql
-- Verificar precios históricos de un ETF
SELECT ticker, date, adjusted_close
FROM eod_prices
WHERE ticker = 'VOO'
ORDER BY date DESC
LIMIT 30;

-- Si el precio actual es <25% desde pico, trigger se activará
```

#### Cambio tasa Banrep
```sql
-- Insertar cambio significativo en tasa (ejemplo: bajó 50 bps)
INSERT INTO macro_rates (type, value, effective_date, source)
VALUES ('banrep_policy_rate', 10.75, CURRENT_DATE, 'manual');

-- Ejecutar generate-inbox-events → detectará cambio vs valor anterior
```

#### Bandas fuera de rango
```sql
-- Verificar distribución actual
SELECT 
  'CDT' as type,
  SUM(amount) as total
FROM cdt_positions
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
UNION ALL
SELECT 
  'ETF' as type,
  SUM(shares * 
    (SELECT adjusted_close FROM eod_prices 
     WHERE ticker = etf_positions.ticker 
     ORDER BY date DESC LIMIT 1) *
    (SELECT value FROM macro_rates 
     WHERE type = 'trm' 
     ORDER BY effective_date DESC LIMIT 1)
  ) as total
FROM etf_positions
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);
```

---

## Prevención de Duplicados

La función verifica eventos similares en los **últimos 7 días** antes de insertar:
- Mismo `user_id`
- Mismo `type`
- Mismo `asset_ref`

Si existe, **NO inserta** → evita spam de eventos repetidos.

**Permite re-trigger** después de 7 días si la condición persiste (útil para recordatorios de CDT próximo a vencer).

---

## Logs y Debugging

### Ver logs de ejecución
```bash
supabase functions logs generate-inbox-events --tail
```

### Errores comunes

#### Error: "No authenticated user"
**Causa:** Tabla `cdt_positions` vacía o sin usuarios válidos
**Fix:** Insertar al menos un CDT o ETF para usuario autenticado

#### Error: "Cannot read property 'value' of undefined"
**Causa:** Falta data en `macro_rates` (TRM, inflación, etc.)
**Fix:** Ejecutar backfill functions primero:
```bash
supabase functions invoke fetch-banrep-data
supabase functions invoke fetch-inflation-data
```

#### Warning: "0 events created"
**Causa:** Ningún trigger cumplió condiciones
**Fix:** Normal si no hay CDTs próximos a vencer, drawdowns, etc. Simular condiciones con SQL arriba.

---

## Roadmap

### Phase 2 (futuro)
- [ ] Trigger #5: ETF cruza Hurdle Rate (requiere watchlist)
- [ ] Sistema de prioridades (alto/medio/bajo) según urgencia
- [ ] `consequences` estructuradas en metadata para UI avanzada
- [ ] Detección de "oportunidades" (CDT favorable, Sortino mejorado)
- [ ] Histórico de triggers (tabla `trigger_history` para analytics)

### Mejoras de performance
- [ ] Batch processing: procesar N usuarios en paralelo
- [ ] Cache de Hurdle Rate (recalcular solo si cambió macro_rates)
- [ ] Índices adicionales en `eod_prices` para queries de drawdown

---

## Dependencias

**Edge Functions relacionadas:**
- `fetch-banrep-data` — TRM, tasas CDT
- `fetch-inflation-data` — Inflación COP/USD
- `fetch-etf-prices` — Precios EOD para drawdown

**Tablas requeridas:**
- `cdt_positions` — posiciones CDT activas
- `etf_positions` — posiciones ETF activas
- `eod_prices` — precios históricos
- `macro_rates` — TRM, inflación, tasa Banrep
- `cdt_rates` — tasas de mercado
- `user_config` — bandas configuradas (opcional, usa defaults)

**Queries app:**
- `getInboxEvents()` — lee eventos generados
- `markEventAsRead()` — marca leído al abrir detalle
- `dismissEvent()` — soft delete al swipe
