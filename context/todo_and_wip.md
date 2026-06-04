# TODO & Work in Progress - Magic Invest

Registro vivo del estado del proyecto. **Historial completo:** ver `todo_archive.md`

---

## Estado General — Junio 4, 2026

* **Fase:** 🟢 Fase 1 (MVP) — 97% completado
* **Último cambio:** Junio 4, 2026 — Sistema de Rebalanceo (Backend) implementado
* **Próxima sesión con Winston:** Auditoría Sistema Rebalanceo + UI

### ✅ Módulos Completados

#### 1. Infraestructura Base (100%)
- Autenticación (Supabase Auth + email/password)
- Shell navegación (3 tabs + drawer menu)
- Sistema de temas (light/dark dinámico)
- Validación/formateo de inputs (5 tipos)
- Auto-retry transparente JWT (PGRST303)
- Sticky headers (17 pantallas)

#### 2. Módulo Herramientas (100%)
- 10 calculadoras completas e independientes
- Sistema de modals educativos
- Formateo de monedas robusto (COP/USD)
- Terminología precisa consistente

#### 3. Módulo Buzón (100%)
- UI completa (lista + detalle con Markdown enriquecido)
- Motor de eventos backend con **5 de 5 triggers:**
  - ✅ CDT próximo a vencer (30/60/90 días)
  - ✅ Drawdown ETF (>25% desde pico)
  - ✅ Cambio tasa Banrep (≥50 bps)
  - ✅ Bandas de asignación fuera de rango
  - ✅ **ETF cruza Hurdle Rate (watchlist implementada)**
- Swipe actions (eliminar / marcar no leído)
- Navegación bidireccional con Portafolio
- Badges dinámicos en tarjetas de activos

#### 4. Módulo Portafolio Fase 1 (100%)
- CRUD completo (CDTs + ETFs)
- Cálculo de valor actual con precios EOD reales
- Proyecciones a 2, 5 y 10 años
- ContextStrip con datos macroeconómicos reales
- Modales educativos (Hurdle Rate, perfil, proyección)
- Badges dinámicos (eventos relacionados por activo)
- ✅ **Watchlist ETFs funcional** (agregar/eliminar, precios, comparación vs HR)

#### 5. Backend Supabase (100%)
- **7 Edge Functions operativas:**
  - `fetch-banrep-data` — Cron diario (TRM + CDT rates)
  - `backfill-historical-data` — Histórico 10 años (TRM + CDT)
  - `fetch-inflation-data` — Cron mensual (COP + USD desde World Bank)
  - `backfill-inflation-historical` — Histórico 2014-2024
  - `fetch-etf-prices` — Cron diario (EOD desde EODHD)
  - `backfill-etf-historical` — Histórico ~1 año (VTI, VOO, QQQ)
  - `generate-inbox-events` — Cron semanal (motor de eventos)

- **Datos actuales en BD:**
  - TRM: 2,468 registros (2016-2026)
  - CDT rates: 6,138 registros (2018-2026)
  - Inflación: 22 registros (COP + USD, 2014-2024)
  - EOD prices: 753 registros (3 ETFs × ~251 días)

- **Hurdle Rate 100% dinámico:**
  - Ecuación de Fisher completa
  - Inputs macro todos desde BD
  - Modal educativo + integración en calculadora CDT vs ETF

---

## 🎯 Tareas Pendientes Inmediatas

### 1. Sistema de Rebalanceo

**Estado:** Backend completo (Semana 1/3) — UI pendiente

**✅ Implementado:**
- ✅ Base de datos (3 tablas: bandas, snapshots, cache HR)
- ✅ Biblioteca de cálculos (`src/lib/rebalancing.ts`)
- ✅ Queries en app (`supabase-queries.ts`)
- ✅ Edge Function `evaluate-rebalancing` con 3 triggers:
  - Trigger #6: Evaluación Trimestral (desviación >5%)
  - Trigger #7: Rebalanceo de Oportunidad (CDT venciendo ≤30 días)
  - Trigger #8: Cambio Macro Significativo (HR >1.5%)
- ✅ Control de duplicados (ventana 7 días)
- ✅ Presets de bandas (Conservador, Moderado, Agresivo)
- ✅ Estimación de costos (0.5% ETF, 0.3% spread FX)

**⏳ Pendiente (Semana 2-3):**
- [ ] UI: Modal de análisis de rebalanceo (3 vistas)
- [ ] UI: Gráfico de asignación con bandas visuales
- [ ] Integración en pantalla Portafolio
- [ ] Tests E2E con datos reales de Harvey
- [ ] Documentación en `investment_thesis.md`

**Decisiones aprobadas (Winston + Harvey):**
- Bandas default: Moderado (CDT 50-70% / ETF 30-50%) ✅
- Triggers: Desviación >5% + cambio HR >1.5% ✅
- Escenarios: Mantener vs Rebalancear al centro ✅
- Cron: Domingos 8:00 AM (semanal) ✅

---

### 3. Perfil de Usuario Completo

**Estado:** Parcial (solo nombre en signup)

**Faltante:**
- Formulario post-signup con tipo doc, número, ciudad
- Tabla `user_profiles` en BD
- Pantalla de edición en settings (desde drawer)

**Depende de:** Nada

**Prioridad:** Media (no bloquea MVP)

---

## 🔲 Fase 2 (Post-MVP)

**NO IMPLEMENTAR HASTA APROBACIÓN EXPLÍCITA**

* Calculador tributario interactivo (Phase 1: tooltips educativos)
* Asistente IA con contexto del portafolio
* Matching automático ETFs según perfil
* Autenticación biométrica (`expo-local-authentication`)
* Flujo Onboarding (filosofía + configuración bandas)
* Open Finance (Decreto 0368/2026) — importar CDTs desde banco

---

## 🔲 Cumplimiento Legal

**No aplica para uso personal de Harvey.**

Cuando haya usuarios externos:
- Política de datos (Ley 1581/2012)
- Aviso de privacidad con checkbox
- Inscripción RNBD ante SIC
- Términos y condiciones (disclaimers legales)
- Revisión legal: validar que no califica como asesoría financiera (SFC)

---

## 📋 Preguntas Pendientes para Winston

### 1. Watchlist ETFs
- ¿Criterios de selección para semilla inicial?
- ¿Tickers específicos recomendados?
- ¿Cuántos ETFs incluir en watchlist inicial?

### 2. Bandas de Asignación
- ¿Bandas default (CDT 50-70% / ETF 30-50%) adecuadas para perfil Harvey?
- ¿Modificar según tolerancia al riesgo cambiario?

### 3. Sistema de Rebalanceo
- ¿Trigger por % de exceso o valor absoluto?
- ¿Presentar múltiples escenarios o sugerencia única?

### 4. Complejidad Fiscal
- ¿Falta alguna dimensión relevante en tooltips educativos?
- ¿Retención en la fuente suficientemente explicada?
- ¿Diferencial cambiario tratado correctamente?

### 5. Dependencia única API Banrep
- ¿Riesgo significativo?
- ¿Complementar con otra fuente (DANE directo)?
- ¿O fallback hardcodeado suficiente?

### 6. Visión General
- ¿Algo que falta? Huecos conceptuales, técnicos o filosóficos identificados.
- ¿Priorizar watchlist o rebalanceo primero?
- ¿Fase 2 lista para planear o esperar maduración de Fase 1?

---

## 📊 Métricas de Completitud

| Módulo | Completitud | Bloqueantes |
|---|---|---|
| Infraestructura | 100% | Ninguno |
| Herramientas | 100% | Ninguno |
| Buzón | 100% | Ninguno |
| Portafolio | 100% | Ninguno |
| Backend | 100% | Ninguno |
| Sistema Rebalanceo | 60% | UI (Semana 2-3) |
| Perfil Usuario | 30% | Ninguno |

**Progreso Global Fase 1:** 97%

---

## 🚀 Hitos Alcanzados (Mayo-Junio 2026)

- ✅ Mayo 25: Infraestructura base + autenticación
- ✅ Mayo 27: Módulo Herramientas completo (10 calculadoras)
- ✅ Mayo 29: Sistema de temas + validación de inputs
- ✅ Junio 2: Backend Banrep (TRM + CDT rates)
- ✅ Junio 2: Backend inflación (World Bank API)
- ✅ Junio 2: Backend EOD prices (EODHD API)
- ✅ Junio 3: Hurdle Rate dinámico completo
- ✅ Junio 3: Motor de eventos Buzón (4 triggers)
- ✅ Junio 4: Mensajes Markdown enriquecidos
- ✅ Junio 4: Sticky headers (17 pantallas)
- ✅ Junio 4: Corrección 4 bugs críticos (auditoría Winston)
- ✅ Junio 4: Watchlist ETFs + Trigger #5 del Buzón
- ✅ Junio 4: Sistema Rebalanceo (Backend — Triggers 6, 7, 8)
- ⏳ Junio 5+: Sistema Rebalanceo (UI + Tests)

---

## 📝 Notas de Sesión Actual

**Contexto:** Winston (IA Interventora) realizó auditoría técnica completa y encontró 4 bugs críticos/medios que debían corregirse antes de continuar con Fase 2.

**Bugs corregidos (Junio 4, 2026):**

### 1. Bug Crítico: Ecuación Hurdle Rate Invertida
- **Problema:** Signos de devaluación y TER invertidos, inflación redundante
- **Impacto:** Cálculo completamente erróneo (podía recomendar ETF cuando CDT era mejor)
- **Corrección:** Ecuación de Fisher correcta: `R = [(CDT × 0.96) - e] / (1 + e) + TER`
- **Archivos:** `src/lib/hurdle-rate.ts`, `src/app/tools/cdt-vs-etf.tsx`, `src/app/portfolio/index.tsx`
- **Estado:** ✅ Probado y aprobado por Winston

### 2. Bug Medio: Tasa Banrep No Automatizada
- **Problema:** Hardcoded fallback 11.25% impedía funcionamiento del Trigger #3 del Buzón
- **Corrección:** Web scraping de página oficial Banrep (3 patrones regex + validación de seguridad)
- **Archivo:** `supabase/functions/fetch-banrep-data/index.ts`
- **Estado:** ✅ Aprobado por Winston

### 3. Bug Medio: UX Offline Pantalla en Blanco
- **Problema:** Error de red mostraba pantalla vacía en lugar de feedback visual
- **Corrección:** Componente `<OfflineScreen>` + timeout 8s + manejo de errores silencioso
- **Archivos:** `src/components/offline-screen.tsx`, `src/app/portfolio/index.tsx`, `src/app/inbox/index.tsx`, `src/lib/fetch-with-timeout.ts`
- **Estado:** ✅ Aprobado por Winston, probado en emulador

### 4. Bug Medio: Duplicados Infinitos Motor Buzón
- **Problema:** `.maybeSingle()` fallaba con error PGRST116 cuando había 2+ duplicados → insertaba más duplicados en bucle
- **Corrección:** `.limit(1)` + validación `existing.length === 0`
- **Archivo:** `supabase/functions/generate-inbox-events/index.ts` (línea 109)
- **Estado:** ✅ Aprobado por Winston

**Resultado:**
- Sistema ahora matemáticamente correcto y robusto
- UX offline funcional en Portafolio y Buzón
- Motor de eventos estable (no agrava duplicados existentes)
- ⏳ Pendiente: Commit consolidado de los 4 fixes

---

## 🔄 Última Actualización

**Fecha:** Junio 4, 2026 (19:00)  
**Autor:** Claude Code (sesión auditoría Winston)  
**Commits recientes:**
- `35c59a5` — Parsing robusto + consistencia símbolos + docs optimizados
- `f6b9682` — Mejorar proyección + modals educativos en Portafolio
- `01c2c6c` — Auto-retry transparente JWT (PGRST303)
- `273f1f2` — Validación estricta + scroll automático + tipografía robusta
- `0d1e9c2` — Actualizar contextos + regla no-commits-sin-aprobación
- ⏳ **Próximo commit:** Fix 4 bugs críticos (Hurdle Rate + Banrep + Offline + Duplicados)
