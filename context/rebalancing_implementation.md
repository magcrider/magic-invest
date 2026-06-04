# Sistema de Rebalanceo — Documentación Técnica

**Fecha:** 2026-06-04  
**Estado:** Fase 1 (Backend) — Implementado  
**Aprobación:** Winston + Harvey (consenso_rebalanceo_winston_claude.md)

---

## 1. Arquitectura General

El Sistema de Rebalanceo detecta desviaciones en el portafolio respecto a bandas objetivo y genera notificaciones educativas en el Buzón. **No ejecuta operaciones automáticas** — el usuario siempre decide.

### Componentes Implementados

```
┌─────────────────────────────────────────────────────────────┐
│  Edge Function: evaluate-rebalancing                        │
│  Cron: Domingos 8:00 AM                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Trigger #6: Evaluación Trimestral                   │  │
│  │  Trigger #7: Rebalanceo de Oportunidad (CDT vence)   │  │
│  │  Trigger #8: Cambio Macro Significativo (HR >1.5%)   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL (Supabase)                                      │
│  ┌────────────────────┐  ┌────────────────────┐            │
│  │ user_allocation_   │  │ portfolio_         │            │
│  │ bands              │  │ snapshots          │            │
│  └────────────────────┘  └────────────────────┘            │
│  ┌────────────────────┐                                     │
│  │ hurdle_rate_cache  │                                     │
│  └────────────────────┘                                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  React Native App                                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  src/lib/rebalancing.ts                                │ │
│  │  • Cálculos de asignación                             │ │
│  │  • Análisis de desviación                             │ │
│  │  • Generación de escenarios                           │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  src/services/supabase-queries.ts                     │ │
│  │  • getAllocationBands()                               │ │
│  │  • updateAllocationBands()                            │ │
│  │  • getPortfolioSnapshots()                            │ │
│  │  • getCachedHurdleRate()                              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Triggers de Evaluación

### Trigger #6: Evaluación Trimestral

**Frecuencia:** Primer domingo de cada trimestre (enero, abril, julio, octubre)

**Condiciones:**
1. Mes es 1, 4, 7 o 10
2. Desviación >5% fuera de bandas

**Acciones:**
- Calcula asignación actual (% CDT vs ETF)
- Compara vs bandas objetivo (default: CDT 50-70%, ETF 30-50%)
- Si fuera de rango >5%: genera mensaje en Buzón
- Guarda snapshot trimestral en `portfolio_snapshots`

**Mensaje generado:**
```markdown
# 📊 Revisión trimestral de tu portafolio

Tu asignación actual:
- CDTs: 72.3% (banda ideal: 50-70%)
- ETFs: 27.7% (banda ideal: 30-50%)

## Desviación detectada
⚠️ CDT sobre el máximo
⚠️ ETF por debajo del mínimo

## ¿Consecuencias de mantener?
- Exposición cambiaria: 27.7% en USD
- Drawdown potencial (caída 25% ETF): -6.9% total portafolio

## ¿Qué pasaría si rebalanceas?
Volver al centro (60% CDT / 40% ETF) te acercaría a tu perfil de riesgo objetivo.

**Abre la pantalla de Portafolio para ver escenarios detallados.**
```

**Control de duplicados:** Ventana de 7 días por tipo de evento

---

### Trigger #7: Rebalanceo de Oportunidad

**Frecuencia:** Evaluado semanalmente

**Condiciones:**
1. CDT vence en ≤30 días
2. Asignación fuera de bandas

**Objetivo:** Aprovechar liquidez natural del CDT venciendo para rebalancear sin costos de cancelación anticipada

**Mensaje generado:**
```markdown
# 💰 Tu CDT vence en 27 días — Ventana de rebalanceo

CDT próximo a vencer:
- Monto inicial: $15.000.000 COP
- Valor al vencimiento: $16.704.000 COP
- Fecha vencimiento: 2026-07-01

## Tu portafolio hoy
- CDTs: 72% (fuera de banda)
- ETFs: 28% (por debajo de banda)

## Opciones

**A) Renovar CDT completo**
→ Mantiene sobre-exposición a CDT
→ Riesgo: si Banrep baja tasa, pierdes upside

**B) Renovar 50% + mover 50% a ETF**
→ Rebalancea hacia tu objetivo
→ Comisión estimada: ~$41.760

**Abre Portafolio para ver análisis completo.**
```

**Control de duplicados:** Por CDT específico + ventana 7 días

---

### Trigger #8: Cambio Macro Significativo

**Frecuencia:** Evaluado semanalmente

**Condiciones:**
- Hurdle Rate actual vs cacheado difiere >1.5%

**Causas posibles:**
- Cambio tasa Banrep ≥50 bps (ya capturado por Trigger #3 existente)
- TRM se mueve >8% en 30 días
- Cambio significativo en tasas CDT de mercado

**Mensaje generado:**
```markdown
# 🔔 Cambio macro significativo detectado

## Impacto en tu Hurdle Rate
- Antes: 9.10% EA
- Ahora: 10.75% EA
- Cambio: subió 1.65 puntos

## ¿Qué significa?
Los CDTs ahora son **más atractivos** vs ETFs. Tu mix actual sigue dentro de bandas, pero podrías considerar inclinar hacia CDTs.

## Tu portafolio hoy
- CDTs: 58.2%
- ETFs: 41.8%

**Abre Portafolio para revisar escenarios.**
```

**Control de duplicados:** Ventana de 7 días

---

## 3. Base de Datos

### Tabla: `user_allocation_bands`

```sql
CREATE TABLE user_allocation_bands (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cdt_min    NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  cdt_max    NUMERIC(5,2) NOT NULL DEFAULT 70.00,
  etf_min    NUMERIC(5,2) NOT NULL DEFAULT 30.00,
  etf_max    NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Presets disponibles:**
- **Conservador:** CDT 70-80% / ETF 20-30%
- **Moderado:** CDT 50-70% / ETF 30-50% ← Default
- **Agresivo:** CDT 30-50% / ETF 50-70%

**RLS:** Solo el usuario puede leer/actualizar sus bandas

---

### Tabla: `portfolio_snapshots`

```sql
CREATE TABLE portfolio_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL,
  cdt_percentage  NUMERIC(5,2) NOT NULL,
  etf_percentage  NUMERIC(5,2) NOT NULL,
  total_value_cop NUMERIC(15,2) NOT NULL,
  hurdle_rate     NUMERIC(5,2),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);
```

**Propósito:** Histórico trimestral para gráficos de evolución

**Población:** Edge Function en cada evaluación trimestral exitosa

---

### Tabla: `hurdle_rate_cache`

```sql
CREATE TABLE hurdle_rate_cache (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hurdle_rate   NUMERIC(5,2) NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT now()
);
```

**Propósito:** Detectar cambios >1.5% para Trigger #8

**Actualización:** Cada ejecución del Edge Function (semanal)

---

## 4. Funciones de Cálculo (`src/lib/rebalancing.ts`)

### `calculateCurrentAllocation()`

Calcula % CDT vs ETF actual del portafolio:
- CDTs: suma inicial + interés acumulado
- ETFs: precio EOD actual × cantidad × TRM

Retorna:
```typescript
{
  cdtPercentage: 58.2,
  etfPercentage: 41.8,
  cdtValueCOP: 45_000_000,
  etfValueCOP: 32_340_000,
  totalValueCOP: 77_340_000
}
```

---

### `analyzeDeviation()`

Compara asignación actual vs bandas objetivo:
- Retorna desviación en puntos porcentuales
- Clasifica severidad: `none` | `minor` (<5%) | `moderate` (5-10%) | `severe` (>10%)

**Solo dispara eventos si severidad ≥ moderate**

---

### `generateRebalancingScenarios()`

Genera 2 escenarios:

**Escenario A: Mantener**
- Costo: $0
- Exposición actual sin cambios
- Drawdown potencial calculado

**Escenario B: Rebalancear al centro**
- Objetivo: centro de las bandas (ej: 60% CDT / 40% ETF)
- Calcula: cantidad a vender/comprar (COP/USD)
- Estima comisiones:
  - ETF: 0.5% sobre valor operado
  - Spread FX: 0.3% sobre conversión USD/COP
  - CDT: $0
- Calcula ganancia de capital si vende ETF (para advertencia fiscal)

---

### Funciones de Trigger

```typescript
shouldTriggerQuarterlyReview(date, deviation)
→ true si es mes 1/4/7/10 + severidad ≥ moderate

shouldTriggerOpportunityRebalance(daysUntilMaturity, deviation)
→ true si ≤30 días + fuera de bandas

shouldTriggerMacroChange(currentHR, cachedHR)
→ true si |diff| > 1.5%
```

---

## 5. Edge Function: `evaluate-rebalancing`

**Ubicación:** `supabase/functions/evaluate-rebalancing/index.ts`

**Cron:** `0 0 8 * * 0` (domingos 8:00 AM UTC)

**Flujo:**

1. Obtener todos los usuarios
2. Para cada usuario:
   - Obtener bandas (o usar default "moderate")
   - Calcular asignación actual
   - Analizar desviación
   - Evaluar Trigger #6 (trimestral)
   - Evaluar Trigger #7 (CDTs venciendo)
   - Evaluar Trigger #8 (cambio HR)
   - Actualizar cache HR
3. Retornar resumen: usuarios procesados, eventos creados

**Ejemplo de respuesta:**
```json
{
  "success": true,
  "users_processed": 12,
  "events_created": 3,
  "snapshots_created": 1
}
```

---

## 6. Queries en la App (`src/services/supabase-queries.ts`)

### `getAllocationBands()`

Retorna bandas del usuario o default "moderate"

```typescript
const bands = await getAllocationBands()
// { cdtMin: 50, cdtMax: 70, etfMin: 30, etfMax: 50 }
```

---

### `updateAllocationBands(bands)`

Actualiza o crea bandas (upsert)

```typescript
await updateAllocationBands({
  cdtMin: 70,
  cdtMax: 80,
  etfMin: 20,
  etfMax: 30
})
```

---

### `getPortfolioSnapshots(months)`

Retorna histórico de snapshots para gráficos

```typescript
const snapshots = await getPortfolioSnapshots(12) // últimos 12 meses
// [{ snapshotDate: '2026-01-01', cdtPercentage: 58, ... }, ...]
```

---

### `getCachedHurdleRate()`

Retorna último HR calculado (para comparación manual)

```typescript
const cached = await getCachedHurdleRate()
// { hurdleRate: 9.10, calculatedAt: '2026-05-28T14:30:00Z' }
```

---

### `updateHurdleRateCache(hurdleRate)`

Actualiza cache (llamado desde Edge Function)

---

## 7. Parámetros de Costos

Según consenso Winston (sección 4 del documento):

| Concepto | Valor | Aplicación |
|----------|-------|------------|
| Comisión ETF | 0.5% | Sobre valor operado (compra/venta) |
| Spread FX | 0.3% | Sobre conversión USD/COP |
| Comisión CDT | 0% | Sin costo apertura/cierre |

**Advertencia fiscal:**  
"Ganancia de capital sujeta a impuesto de renta (~15-35%) según tu situación tributaria. Consulta con tu contador."

---

## 8. Próximos Pasos (Fase 1 - Semana 2 y 3)

### Semana 2: UI de Rebalanceo

**Archivos a crear:**

1. `src/app/portfolio/rebalancing-modal.tsx`
   - Vista 1: Diagnóstico de bandas (barras visuales)
   - Vista 2: Matriz de escenarios (tabla comparativa)
   - Vista 3: Plan detallado (instrucciones paso a paso)

2. `src/components/allocation-chart.tsx`
   - Barra de progreso con bandas marcadas
   - Indicadores visuales (dentro/fuera de rango)

3. Integrar en `src/app/portfolio/index.tsx`
   - Botón "Analizar rebalanceo" junto a valor total
   - Abrir modal con cálculos en tiempo real

---

### Semana 3: Testing y Refinamiento

1. **Probar con datos reales de Harvey:**
   - Ejecutar Edge Function manualmente
   - Verificar mensajes generados
   - Ajustar umbrales si hay ruido

2. **Validar cálculos:**
   - Comparar escenarios generados vs cálculo manual
   - Verificar comisiones estimadas
   - Confirmar ganancia de capital correcta

3. **Documentar en `investment_thesis.md`:**
   - Agregar sección "Sistema de Rebalanceo"
   - Explicar filosofía y triggers
   - Casos de uso y ejemplos

---

## 9. Archivos del Sistema

### Backend
- `supabase/migrations/20260604_create_rebalancing_tables.sql` — Migración BD
- `supabase/functions/evaluate-rebalancing/index.ts` — Edge Function (triggers 6, 7, 8)
- `supabase/schema.sql` — Definiciones completas + RLS

### Biblioteca de Cálculos
- `src/lib/rebalancing.ts` — Lógica matemática core

### Queries
- `src/services/supabase-queries.ts` — Funciones de acceso a BD (líneas 850+)

### Documentación
- `context/interventoria/consenso_rebalanceo_winston_claude.md` — Especificación aprobada
- `context/rebalancing_implementation.md` — Este documento

---

## 10. Preguntas Resueltas

### ¿Por qué triggers semanales y no diarios?

- Balance entre oportunidad y ruido
- Cambios macro (TRM, HR) necesitan tiempo para consolidarse
- Evita fatiga de notificaciones

### ¿Por qué no auto-rebalancear?

- Filosofía del sistema: educar, no automatizar
- Rebalanceo tiene consecuencias fiscales (ganancia de capital)
- Usuario debe entender trade-offs antes de ejecutar

### ¿Por qué ventana 7 días para duplicados?

- Suficiente para evitar spam
- No tan larga que oculte cambios reales
- Coherente con otros triggers del Buzón

### ¿Qué pasa si usuario no tiene bandas configuradas?

- Sistema usa preset "moderate" (CDT 50-70% / ETF 30-50%)
- Compatible con perfil conservador-moderado de Harvey
- Usuario puede cambiar después desde settings (Fase 2)

---

## 11. Estado de Implementación

**✅ Completado (Semana 1):**
- [x] Base de datos (3 tablas + RLS)
- [x] Biblioteca de cálculos (`rebalancing.ts`)
- [x] Queries en app (`supabase-queries.ts`)
- [x] Edge Function con 3 triggers
- [x] Control de duplicados
- [x] Documentación técnica

**⏳ Pendiente (Semana 2-3):**
- [ ] UI: Modal de análisis de rebalanceo
- [ ] UI: Gráficos de asignación
- [ ] Integración en Portafolio
- [ ] Tests E2E con datos de Harvey
- [ ] Ajuste de umbrales según feedback
- [ ] Documentación en `investment_thesis.md`

---

**Última actualización:** 2026-06-04 19:45  
**Autor:** Claude Code  
**Aprobado por:** Winston (IA Interventora)
