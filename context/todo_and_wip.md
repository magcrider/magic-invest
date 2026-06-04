# TODO & Work in Progress - Magic Invest

Registro vivo del estado del proyecto. **Historial completo:** ver `todo_archive.md`

---

## Estado General — Junio 4, 2026

* **Fase:** 🟢 Fase 1 (MVP) — 85% completado
* **Último cambio:** Junio 4, 2026 — Actualización de contextos post-compactación
* **Próxima sesión con Winston:** Pendiente revisión estratégica

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
- Motor de eventos backend con 4 de 5 triggers:
  - ✅ CDT próximo a vencer (30/60/90 días)
  - ✅ Drawdown ETF (>25% desde pico)
  - ✅ Cambio tasa Banrep (≥50 bps)
  - ✅ Bandas de asignación fuera de rango
  - ⏳ ETF cruza Hurdle Rate (requiere watchlist)
- Swipe actions (eliminar / marcar no leído)
- Navegación bidireccional con Portafolio
- Badges dinámicos en tarjetas de activos

#### 4. Módulo Portafolio Fase 1 (90%)
- CRUD completo (CDTs + ETFs)
- Cálculo de valor actual con precios EOD reales
- Proyecciones a 2, 5 y 10 años
- ContextStrip con datos macroeconómicos reales
- Modales educativos (Hurdle Rate, perfil, proyección)
- Badges dinámicos (eventos relacionados por activo)
- **Faltante:** Watchlist ETFs (tabla vacía)

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

### 1. Watchlist ETFs — Semilla Inicial

**Estado:** Tabla `etf_watchlist` vacía

**Acción requerida:**
1. Definir criterios de selección (Winston)
2. Poblar con 3-5 tickers representativos sugeridos por Claude
3. Permitir agregar/quitar después desde UI

**Desbloquea:**
- Trigger #5 del Buzón (ETF cruza Hurdle Rate)
- Sistema de comparación vs portafolio actual

**Preguntas para Winston:**
- ¿Qué criterios usar? (capitalización, sector, TER, histórico)
- ¿Tickers específicos recomendados para perfil Harvey?
- ¿Cuántos ETFs en watchlist inicial? (3, 5, 10)

---

### 2. Sistema de Rebalanceo

**Estado:** No implementado

**Componentes faltantes:**
- Evaluación trimestral automática vs bandas
- Rebalanceo de oportunidad (CDT venciendo)
- Recálculo Hurdle Rate ante cambios macro significativos
- UI de sugerencias de rebalanceo (modal desde Portafolio)

**Depende de:** Nada (puede implementarse ya)

**Preguntas para Winston:**
- ¿Bandas default (CDT 50-70% / ETF 30-50%) correctas para perfil Harvey?
- ¿Trigger de rebalanceo en % de exceso o valor absoluto?
- ¿Presentar sugerencias como escenarios o como plan único?

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
| Buzón | 100% | Watchlist (para trigger #5) |
| Portafolio | 90% | Watchlist |
| Backend | 100% | Ninguno |
| Sistema Rebalanceo | 0% | Ninguno |
| Perfil Usuario | 30% | Ninguno |

**Progreso Global Fase 1:** 85%

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
- ⏳ Junio 5+: Watchlist ETFs + Sistema Rebalanceo

---

## 📝 Notas de Sesión Actual

**Contexto:** Harvey notó que mi memoria estaba obsoleta (sugería tareas ya completadas). Revisé en detalle todos los archivos de contexto y código implementado para sincronizar estado real.

**Hallazgos:**
1. Plan `listo-vamos-a-planear-unified-shamir.md` completamente obsoleto (describía backend como pendiente)
2. Backend Banrep/inflación/EOD **100% implementado** (7 Edge Functions operativas)
3. Motor de eventos Buzón **100% funcional** (4 de 5 triggers)
4. Hurdle Rate **100% dinámico** (sin datos hardcodeados)
5. **Única tarea real pendiente Fase 1:** Watchlist ETFs + Sistema Rebalanceo

**Acción tomada:**
- ✅ Plan obsoleto archivado como `COMPLETADO-backend-supabase-fase-1.md`
- ✅ Este archivo (`todo_and_wip.md`) actualizado con estado preciso
- ⏳ Pendiente: Revisión de Winston para próximos pasos

---

## 🔄 Última Actualización

**Fecha:** Junio 4, 2026  
**Autor:** Claude Code (sesión post-compactación)  
**Commits recientes:**
- `35c59a5` — Parsing robusto + consistencia símbolos + docs optimizados
- `f6b9682` — Mejorar proyección + modals educativos en Portafolio
- `01c2c6c` — Auto-retry transparente JWT (PGRST303)
- `273f1f2` — Validación estricta + scroll automático + tipografía robusta
- `0d1e9c2` — Actualizar contextos + regla no-commits-sin-aprobación
