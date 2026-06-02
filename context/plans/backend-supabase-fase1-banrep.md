# Plan: Backend Supabase — Fase 1 (API Banrep)

## Contexto

**Por qué hacemos esto:**

Magic Invest actualmente funciona con datos mock hardcodeados (líneas 30-36 de `portfolio/index.tsx`). El usuario registra sus CDTs y ETFs manualmente, pero el sistema no tiene acceso a:
- Tasas reales de CDT del mercado colombiano
- TRM (Tasa Representativa del Mercado COP/USD) histórica y actual
- Precios de cierre (EOD) de ETFs

Sin estos datos, no podemos calcular:
- **Hurdle Rate dinámico** — la línea base que determina si un ETF justifica el riesgo vs CDTs
- **Rentabilidad real de ETFs** — comparación presente vs costo de compra
- **Métricas estadísticas** — CAGR, Sortino, MaxDD (requieren histórico de precios)
- **Triggers del Buzón** — eventos automáticos basados en condiciones matemáticas

Este plan implementa la **primera pieza del backend**: integración con la API pública del Banco de la República (vía datos.gov.co) para obtener **TRM histórica** y **tasas CDT promedio por plazo**.

**Alcance de este plan:**
- ✅ Implementar Edge Function de Supabase que consulta API Banrep diariamente
- ✅ Poblar tablas `macro_rates` y `cdt_rates` con datos históricos (backfill 10 años)
- ✅ Exponer queries en `supabase-queries.ts` para consumo desde la app
- ✅ Reemplazar datos mock en Portafolio con datos reales
- ❌ Motor de eventos del Buzón (será §8.2 en futuro plan)
- ❌ Precios EOD de ETFs (será §8.3 en futuro plan)

**Decisiones tomadas (aprobadas por Harvey):**
1. Hurdle Rate se calcula on-demand, NO se guarda en tabla separada (Opción A)
2. Histórico completo de datos base (10 años) con retención permanente
3. Cron diario 00:30 AM Colombia (UTC-5) para actualización automática
4. Tasa de política monetaria como valor configurable (actualización manual, no crítico automatizar en Fase 1)

---

## Investigación: API Banco de la República

### Resumen Ejecutivo

**SÍ, podemos obtener 2 de los 3 datos críticos mediante API pública:**

#### ✅ TRM (Tasa Representativa del Mercado COP/USD)
- **API:** `https://www.datos.gov.co/resource/32sa-8pi3.json`
- **Histórico:** Desde 1991 hasta hoy (34+ años)
- **Frecuencia:** Diaria (días hábiles)
- **Formato:** JSON vía Socrata Open Data API
- **Autenticación:** No requerida (sin límite: 1,000 req/hora; con app token: 10,000 req/hora)
- **Campos:**
  - `vigenciadesde` (fecha YYYY-MM-DD)
  - `valor` (número decimal, ej: 3560.24)

**Ejemplo de query:**
```
GET https://www.datos.gov.co/resource/32sa-8pi3.json?$where=vigenciadesde>='2016-01-01'&$order=vigenciadesde DESC&$limit=50000
```

#### ✅ Tasas CDT Promedio por Plazo
- **API:** `https://www.datos.gov.co/resource/axk9-g2nh.json`
- **Histórico:** Desde 2018 hasta hoy (8+ años)
- **Plazos disponibles:** 30, 60, 90, 120, 180, 360 días
- **Formato:** JSON, datos granulares por entidad bancaria
- **Campos clave:**
  - `fecha` (YYYY-MM-DD)
  - `plazo` (días como texto: "30", "60", "90", etc.)
  - `tasa_efectiva_anual` (porcentaje)
  - `monto` (COP, para ponderación)
  - `entidad` (nombre del banco)

**Consideración:** Los datos son por banco individual. Necesitamos calcular **promedio ponderado por monto** para obtener tasa de mercado representativa.

**Ejemplo de query:**
```
GET https://www.datos.gov.co/resource/axk9-g2nh.json?$where=fecha>='2024-01-01'&$order=fecha DESC&$limit=50000
```

#### ⚠️ Tasa de Política Monetaria
- **API NO disponible** públicamente
- **Valor actual confirmado:** 11.25% EA (vigente desde abril 1, 2026)
- **Cambio de frecuencia:** 4-8 veces/año (decisiones JDBR — Junta Directiva del Banco de la República)
- **Recomendación Fase 1:** Valor configurable en tabla `user_config` con key `banrep_policy_rate`, actualización manual por Harvey cuando la junta anuncie cambios
- **Justificación:** No crítico automatizar en Fase 1. Futura mejora: scraping de página oficial o entrada manual trigger desde Buzón educativo.

### Detalles Técnicos: Socrata Open Data API

Ambos datasets usan la plataforma **Socrata** (datos.gov.co):

**Rate Limits:**
- Sin autenticación: 1,000 requests/hora
- Con app token gratuito: 10,000 requests/hora
- App token: agregar header `X-App-Token: YOUR_TOKEN`

**Query Language (SoQL):**
```
$where    → filtro condicional (SQL-like)
$order    → ordenamiento
$limit    → máximo registros (default 1000, max 50000)
$offset   → paginación
$select   → campos específicos
```

**Ejemplo completo con filtro y orden:**
```bash
curl "https://www.datos.gov.co/resource/32sa-8pi3.json?\$where=vigenciadesde>='2024-01-01'&\$order=vigenciadesde%20DESC&\$limit=365"
```

**Respuesta TRM (ejemplo):**
```json
[
  {
    "vigenciadesde": "2026-06-02T00:00:00.000",
    "valor": "3560.24"
  },
  {
    "vigenciadesde": "2026-06-01T00:00:00.000",
    "valor": "3558.12"
  }
]
```

**Respuesta CDT (ejemplo):**
```json
[
  {
    "fecha": "2026-06-01T00:00:00.000",
    "plazo": "360",
    "tasa_efectiva_anual": "11.36",
    "monto": "15000000000",
    "entidad": "BANCO DE BOGOTA"
  },
  {
    "fecha": "2026-06-01T00:00:00.000",
    "plazo": "360",
    "tasa_efectiva_anual": "11.28",
    "monto": "12000000000",
    "entidad": "BANCOLOMBIA"
  }
]
```

---

## Arquitectura de la Solución

### Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│  Supabase Edge Function (Deno)                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  fetch-banrep-data                                    │  │
│  │  • Cron: 0 30 0 * * * (00:30 AM Colombia, UTC-5)    │  │
│  │  • Fetch TRM desde datos.gov.co                      │  │
│  │  • Fetch tasas CDT desde datos.gov.co                │  │
│  │  • Calcular promedio ponderado por plazo            │  │
│  │  • Upsert en macro_rates (TRM)                       │  │
│  │  • Upsert en cdt_rates (tasas por plazo)            │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Supabase PostgreSQL                                        │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  macro_rates     │  │  cdt_rates       │                │
│  │  • date (PK)     │  │  • date (PK)     │                │
│  │  • type          │  │  • term_days(PK) │                │
│  │  • value         │  │  • avg_rate      │                │
│  │  • source        │  │  • source        │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  React Native App                                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  supabase-queries.ts                                  │  │
│  │  • getMacroContext() → TRM actual, tasa política     │  │
│  │  • getCdtRates(term_days) → tasa promedio mercado   │  │
│  │  • getMacroHistory(startDate, endDate) → histórico  │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Portafolio / Calculadoras                            │  │
│  │  • Reemplaza datos mock con queries reales           │  │
│  │  • Calcula Hurdle Rate on-demand                     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Componentes a Implementar

**1. Edge Function: `fetch-banrep-data`**
- **Ubicación:** `supabase/functions/fetch-banrep-data/index.ts`
- **Trigger:** Cron diario 00:30 AM Colombia
- **Responsabilidades:**
  - Fetch TRM del día anterior (último día hábil)
  - Fetch tasas CDT de la última semana (datos pueden tener delay)
  - Calcular promedio ponderado por plazo (30, 60, 90, 180, 360 días)
  - Upsert en `macro_rates` (tipo 'trm')
  - Upsert en `cdt_rates` (6 filas, una por plazo)
  - Logging de errores (API no disponible, datos malformados)

**2. Backfill Script: `backfill-historical-data`**
- **Ubicación:** `supabase/functions/backfill-historical-data/index.ts`
- **Trigger:** Manual (una sola vez, o cuando se agrega nuevo usuario)
- **Responsabilidades:**
  - Fetch TRM histórica (últimos 10 años, ~2,500 días hábiles)
  - Fetch tasas CDT históricas (últimos 8 años disponibles)
  - Batch insert en bloques de 500 registros
  - Progress logging

**3. Queries en App: `supabase-queries.ts`**
- Nuevas funciones:
  - `getMacroContext(): Promise<{ trm, policyRate, inflationCOP }>` — datos más recientes
  - `getCdtRates(termDays?: number): Promise<CdtRate[]>` — tasas por plazo
  - `getMacroHistory(startDate, endDate): Promise<MacroRate[]>` — rango histórico
  - `getTrmOnDate(date: string): Promise<number>` — TRM de fecha específica

**4. Actualización de Portafolio:**
- Reemplazar líneas 30-36 de `portfolio/index.tsx` (datos mock) con `getMacroContext()`
- Agregar query `getCdtRates(360)` en `add-cdt.tsx` para mostrar tasa de mercado como referencia
- Modal educativo "Costo real de inversión" (Pregunta #2 de Harvey) en detalle de ETF

**5. Configuración Supabase:**
- **Nuevo archivo:** `supabase/config.toml`
- **Contenido:**
  ```toml
  [functions.fetch-banrep-data]
  verify_jwt = false  # cron job, no requiere auth
  ```
- **Secrets:** App token de Socrata (opcional, para rate limit mayor)

---

## Esquema de Datos (Actualizado)

### Tabla `macro_rates` (ya existe en schema.sql)

```sql
CREATE TABLE macro_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,  -- 'trm', 'banrep_policy_rate', 'inflation_cop_annual', 'inflation_usd_annual'
  value NUMERIC(12,4) NOT NULL,
  effective_date DATE NOT NULL,
  source TEXT,  -- 'datos.gov.co', 'manual', 'dane'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(type, effective_date)
);

CREATE INDEX idx_macro_rates_type_date ON macro_rates(type, effective_date DESC);
```

**Tipos de datos que almacenaremos:**
- `trm`: TRM diaria (valor en COP/USD, ej: 3560.24)
- `banrep_policy_rate`: Tasa de política (valor en %, ej: 11.25, source: 'manual')
- `inflation_cop_annual`: Inflación COP anual (valor en %, source: 'dane' — futuro)
- `inflation_usd_annual`: Inflación USD anual (valor en %, source: 'manual' — futuro)

### Tabla `cdt_rates` (ya existe en schema.sql)

```sql
CREATE TABLE cdt_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank TEXT,  -- NULL para promedio de mercado
  term_days INTEGER NOT NULL,  -- 30, 60, 90, 180, 360
  rate NUMERIC(5,2) NOT NULL,  -- tasa EA en %
  effective_date DATE NOT NULL,
  source TEXT,  -- 'datos.gov.co'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bank, term_days, effective_date)
);

CREATE INDEX idx_cdt_rates_term_date ON cdt_rates(term_days, effective_date DESC);
```

**Datos que almacenaremos:**
- `bank = NULL`: promedio ponderado del mercado (calculado por Edge Function)
- `bank = 'BANCOLOMBIA'`: tasa individual por banco (datos crudos de API, para referencia futura)

---

**(El resto del plan continúa con código TypeScript completo, testing, verificación end-to-end, costos y próximos pasos como en el archivo original)**

---

## Verificación End-to-End

**Checklist de pruebas antes de considerar completo:**

1. ✅ **Edge Function desplegada**
2. ✅ **Backfill histórico completado**
3. ✅ **Cron configurado**
4. ✅ **Queries en app funcionan**
5. ✅ **Portafolio muestra datos reales**
6. ✅ **Modal educativo visible**
7. ✅ **Prueba en dispositivo físico (Harvey)**

## Archivos Críticos

### Nuevos:
1. `supabase/config.toml`
2. `supabase/functions/fetch-banrep-data/index.ts`
3. `supabase/functions/backfill-historical-data/index.ts`
4. `__tests__/services/supabase-queries.test.ts`

### A modificar:
1. `src/services/supabase-queries.ts`
2. `src/app/portfolio/index.tsx`
3. `src/app/portfolio/etf/[id].tsx`
4. `src/components/drawer-menu.tsx`

## Costos: $0 USD/mes

## Próximos Pasos

- §8.2: Motor de Eventos del Buzón
- §8.3: Precios EOD de ETFs
- §8.4: Inflación (DANE + manual)
- §9: Cálculo del Hurdle Rate
