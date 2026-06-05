# TODO & Work in Progress - Magic Invest

Registro vivo del estado del proyecto. **Historial completo:** ver `todo_archive.md`

---

## 🎉 Estado General — Junio 5, 2026

### FASE 1 (MVP) — 100% COMPLETADO

**Magic Invest está funcional y lista para uso en producción.**

* **Última actualización:** Junio 5, 2026 (09:00)
* **Última sesión:** Refinamiento UX Portafolio (saludo compacto, FAB, distribución visual objetivo vs actual)
* **7 módulos core:** Todos al 100%
* **8 Edge Functions:** Operativas con datos reales
* **8 triggers automáticos:** Motor de eventos completo
* **Próximo:** Uso real → ajustes → planear Fase 2 según necesidades identificadas

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
- Motor de eventos backend con **8 de 8 triggers:**
  - ✅ CDT próximo a vencer (30/60/90 días)
  - ✅ Drawdown ETF (>25% desde pico)
  - ✅ Cambio tasa Banrep (≥50 bps)
  - ✅ Bandas de asignación fuera de rango
  - ✅ ETF cruza Hurdle Rate (watchlist)
  - ✅ Trigger #6: Evaluación Trimestral de rebalanceo
  - ✅ Trigger #7: Rebalanceo de Oportunidad (CDT venciendo)
  - ✅ Trigger #8: Cambio Macro Significativo (HR >1.5%)
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
- Watchlist ETFs funcional (agregar/eliminar, precios, comparación vs HR)
- Sistema de Rebalanceo completo (análisis, escenarios, gráfico bandas)
- Perfil de Usuario accesible y opcional (drawer > Mi perfil)

#### 5. Backend Supabase (100%)
- **8 Edge Functions operativas:**
  - `fetch-banrep-data` — Cron diario (TRM + CDT rates + tasa política)
  - `backfill-historical-data` — Histórico 10 años (TRM + CDT)
  - `fetch-inflation-data` — Cron mensual (COP + USD desde World Bank)
  - `backfill-inflation-historical` — Histórico 2014-2024
  - `fetch-etf-prices` — Cron diario (EOD desde EODHD)
  - `backfill-etf-historical` — Histórico ~1 año (VTI, VOO, QQQ)
  - `generate-inbox-events` — Cron semanal (triggers 1-5)
  - `evaluate-rebalancing` — Cron semanal domingos (triggers 6-8)

- **Datos actuales en BD:**
  - TRM: 2,468 registros (2016-2026)
  - CDT rates: 6,138 registros (2018-2026)
  - Inflación: 22 registros (COP + USD, 2014-2024)
  - EOD prices: 753 registros (3 ETFs × ~251 días)
  - Bandas asignación: presets Conservador/Moderado/Agresivo
  - Snapshots portafolio: histórico para triggers de rebalanceo
  - User profiles: tabla completa con trigger automático en signup

- **Hurdle Rate 100% dinámico:**
  - Ecuación de Fisher completa
  - Inputs macro todos desde BD
  - Modal educativo + integración en calculadora CDT vs ETF

---

## 🎯 Módulos Fase 1 - TODOS COMPLETADOS

### Perfil de Usuario ✅

**Estado:** 100% — Funcionalidad implementada y opcional

**✅ Implementado:**
- ✅ Tabla `user_profiles` en BD (user_id, full_name, document_type, document_number, city)
- ✅ Trigger automático para crear perfil en signup
- ✅ RLS policy "own_data"
- ✅ Queries: `getUserProfile()`, `upsertUserProfile()`, `isProfileComplete()`
- ✅ Pantalla `/portfolio/profile` accesible desde drawer > "Mi perfil"
- ✅ Dropdown para tipo documento (CC, CE, NIT, Passport)
- ✅ Validación de campos (nombre, documento, ciudad)
- ✅ Auto-creación de perfil si no existe
- ✅ NO bloquea al usuario - es completamente opcional
- ✅ Feedback inline (éxito/error) sin Alerts nativos

**Datos guardados para futuro:**
- Nombre completo, tipo documento, número, ciudad
- Útil para compliance cuando haya usuarios externos

---

### Sistema de Rebalanceo ✅

**Estado:** 100% — Backend, UI y testing completados en producción

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
- ✅ UI completa: Pantalla `/portfolio/rebalancing` con 2 tabs (Mantener/Rebalancear)
- ✅ Gráfico visual: `AllocationChart` con bandas CDT/ETF y colores semánticos
- ✅ Integración: Botón "Analizar rebalanceo" en Portafolio
- ✅ Testing y correcciones UI aprobadas por Harvey (5 iteraciones)

**Decisiones implementadas:**
- Bandas default: Moderado (CDT 50-70% / ETF 30-50%)
- Triggers: Desviación >5% + cambio HR >1.5%
- Escenarios: Mantener vs Rebalancear al centro
- Cron: Domingos 8:00 AM (semanal)

**Nota:** Documentación conceptual en `investment_thesis.md` pendiente (no crítico para funcionalidad)


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

## 📋 Preguntas para Futuras Sesiones con Winston

### Optimizaciones Fase 1
- ¿Bandas default (CDT 50-70% / ETF 30-50%) adecuadas tras uso real?
- ¿Complejidad fiscal suficientemente explicada en tooltips?
- ¿Dependencia única API Banrep requiere redundancia?

### Planificación Fase 2
- ¿Prioridades claras para próximos módulos?
- ¿Calculador tributario interactivo vs Asistente IA?
- ¿Fase 1 requiere maduración antes de expandir?

---

## 📊 Métricas de Completitud

| Módulo | Completitud | Bloqueantes |
|---|---|---|
| Infraestructura | 100% | Ninguno |
| Herramientas | 100% | Ninguno |
| Buzón | 100% | Ninguno |
| Portafolio | 100% | Ninguno |
| Backend | 100% | Ninguno |
| Sistema Rebalanceo | 100% | Ninguno |
| Perfil Usuario | 100% | Ninguno |

**Progreso Global Fase 1:** 100%

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
- ✅ Junio 4: Sistema Rebalanceo completo (Backend + UI + Triggers 6, 7, 8)
- ✅ Junio 4: UX watchlist mejorada (modales design system)
- ✅ Junio 4: Perfil de Usuario completo (opcional, no bloqueante)
- 🎉 **Junio 4: FASE 1 (MVP) COMPLETADA AL 100%**

---

## 📝 Notas de Sesiones Junio 4, 2026

**Contexto:** Jornada completa desde auditoría de Winston hasta completar MVP al 100%.

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
- ✅ **Commits realizados:** 4 fixes críticos + UX modales mejorada

### 5. Mejora UX: Modales Nativos → Design System
- **Problema:** `Alert.alert()` nativo inconsistente con el design system de la app
- **Contexto:** Watchlist ETFs usaba Alert nativo para confirmaciones (agregar/eliminar)
- **Corrección:**
  - Modal agregar ETF: error inline + loader reemplaza botones + cierre automático
  - Modal eliminar ETF: confirmación custom con diseño limpio
  - Sin componentes redundantes (feedback inline en lugar de segundo modal)
- **Archivos:** `src/components/add-etf-to-watchlist-modal.tsx`, `src/app/portfolio/watchlist.tsx`
- **Estado:** ✅ Probado y aprobado por Harvey

### 6. Implementación: Perfil de Usuario
- **Objetivo:** Permitir al usuario guardar datos personales opcionales para futuro compliance
- **Implementación:**
  - Tabla `user_profiles` con trigger automático en signup
  - Queries: `getUserProfile()`, `upsertUserProfile()`, `isProfileComplete()`
  - Pantalla `/portfolio/profile` accesible desde drawer > "Mi perfil"
  - Dropdown tipo documento (CC, CE, NIT, Passport)
  - Validación campos: nombre, documento, ciudad
  - Auto-creación de perfil si no existe al cargar
  - NO bloquea usuario - completamente opcional
- **Desafíos técnicos resueltos:**
  - Navegación: archivo en `/portfolio/profile.tsx` siguiendo patrón existente
  - Header: copió patrón de pantalla "¿Qué quieres agregar?" (sticky header + título en scroll)
  - Aprendizaje clave: observar patrones existentes antes de inventar soluciones nuevas
- **Archivos:** 
  - `supabase/schema.sql` — tabla + trigger
  - `src/types/database.ts` — tipos TypeScript
  - `src/services/supabase-queries-profiles.ts` — queries
  - `src/app/portfolio/profile.tsx` — pantalla completa
  - `src/components/drawer-menu.tsx` — botón acceso
- **Estado:** ✅ Funcional, testeado y aprobado por Harvey

### 7. Refinamiento UX: Portafolio Resumen (Junio 5, 2026)
- **Objetivo:** Mejorar jerarquía visual, minimalismo y flujo de acciones contextuales
- **Cambios implementados:**
  1. **Saludo compacto**: Título "Hola, Harvey" reducido 50% (48px → 24px) para nombres largos
  2. **FAB (Floating Action Button)**: Botón "Agregar" convertido a FAB circular (+) en esquina inferior derecha
  3. **Distribución visual mejorada**:
     - Fusión de chip de perfil con sección de distribución
     - Layout 2x2: barras (60% ancho) + chips clicables (40%)
     - Estructura vertical por barra: Label → Barra → Detalle porcentajes
     - "Objetivo" muestra centro de bandas (~73% CDT / ~28% ETF)
     - "Actual" muestra distribución real (46% CDT / 54% ETF)
     - Chips uniformes: mismo alto fijo (36px), sin word wrap, centrados
  4. **Reordenamiento**: Distribución como primer elemento (antes de métricas)
  5. **Modal "Estado de bandas"** con acciones contextuales:
     - Título dinámico según estado (Dentro/Cerca/Fuera de bandas)
     - Explicación sin redundancia
     - Botones de acción:
       - "Analizar rebalanceo" (solo si Cerca/Fuera)
       - "Reevaluar mi perfil" (siempre, con Alert de confirmación)
  6. **Eliminación**: Botón "Analizar rebalanceo" removido del resumen (ahora solo en modal contextual)
- **Filosofía aplicada:**
  - Solo mostrar acciones cuando son matemáticamente relevantes
  - Contextualizar decisiones con información completa
  - Minimalismo: reducir ruido, aumentar signal
- **Archivos modificados:**
  - `src/app/portfolio/index.tsx` — reestructura completa de DistributionSection
  - `src/components/page-header.tsx` — prop `compact` para saludo
- **Estado:** ✅ Implementado y testeado por Harvey

### 8. Scroll automático en formularios (Junio 5, 2026)
- **Problema:** Tras un cambio previo, todos los `onFocus` de las calculadoras hacían `scrollToEnd`, saltando al final del scroll en lugar de centrar el campo activo. En `add-cdt`/`add-etf`/`login` el offset `y - 100` ponía el campo cerca del top, no centrado sobre el teclado.
- **Solución:** Helper `scrollToInputCenter` que mide el contenedor del input y calcula el offset para centrarlo en el área visible (usa `Keyboard.metrics()` cuando está abierto, fallback ~45% del alto). `InputField` acepta nueva prop `scrollRef` y maneja todo internamente.
- **Aplicado en:** 10 calculadoras de Tools + 3 formularios con TextInput propios (add-cdt, add-etf, login).
- **Archivos:** `src/utils/scroll-to-input.ts` (nuevo), `src/components/calculator/input-field.tsx`, los 10 archivos de tools, add-cdt, add-etf, login.
- **Estado:** ✅ Implementado y aprobado, commit `cc16f46`.

### 9. Alineamiento al Design System: Login, Navegación, Buzón, Herramientas (Junio 5, 2026)
- **Objetivo:** Erradicar colores genéricos heredados de etapas tempranas y unificar headers cortos.
- **Cambios implementados:**
  1. **Login/Signup — botón submit:** Antes `theme.text`/`theme.background` (negro genérico). Ahora `theme.positive` con texto `#FFFFFF` — mismo CTA que el FAB de Portafolio y los botones del modal de bandas.
  2. **Login/Signup — selector de modo (segmented):** El estado activo añade borde inferior 2px en `theme.positive` para acento de marca sin romper el patrón segmented.
  3. **Navegación inferior (NativeTabs):** Antes los íconos heredaban el tinte azul nativo de iOS. Ahora `iconColor={{ default: textSecondary, selected: positive }}` y label en `textSecondary`/`positive`. Coherente con la paleta teal/ámbar/púrpura.
  4. **Buzón — swipe Eliminar:** Reemplazado hex literal `#C0392B` (rojo de mercado, prohibido por §1) por `theme.risk` (púrpura del DS). Refactor a inline color porque `StyleSheet.create` no tiene acceso al hook.
  5. **Buzón — header compacto:** Antes `title="Buzón"` (48px) + subtitle. Ahora título compacto único: `9/11 sin leer` o `11 mensajes · todos leídos` o `Sin mensajes`. Eliminada mención "sin notificaciones push".
  6. **Buzón — preview cards:** El summary mostraba caracteres markdown literales (`**bold**`). Agregado `stripMarkdown()` que limpia bold/italic/code/links/headings/strike antes de truncar. El `...` de truncado solo aparece cuando realmente se trunca, no por longitud del body completo.
  7. **Herramientas — header compacto:** Mismo patrón. `title="Herramientas"` con prop `compact`, sin subtitle.
- **Filosofía aplicada:**
  - §1 dualidad innegociable: cero hex literales emocionales (rojo/verde de mercado).
  - Identidad visual unificada: `theme.positive` (teal) como CTA primario en toda la app.
  - Headers compactos consistentes: 24px con contexto útil en lugar de títulos decorativos.
- **Archivos modificados:**
  - `src/app/login.tsx` — botón submit + segmented accent
  - `src/components/app-tabs.tsx` — iconColor y labelStyle de NativeTabs
  - `src/app/inbox/index.tsx` — DeleteAction inline color, header compacto, stripMarkdown
  - `src/app/tools/index.tsx` — header compacto
- **Estado:** ✅ Implementado y testeado por Harvey

### 10. UX Análisis de Rebalanceo (Junio 5, 2026)
- **Objetivo:** Priorizar el escenario accionable y eliminar redundancias visuales.
- **Cambios implementados:**
  1. **Orden de pestañas invertido**: Antes "Mantener · Rebalancear". Ahora "Rebalancear · Mantener" — el plan de acción aparece primero. El estado inicial cambia a `viewMode='rebalance'`.
  2. **Vista Mantener depurada**: Se retiraron tres elementos redundantes con la pestaña: título "No realizar ninguna acción", intro "Mantener tu asignación actual sin cambios" y badge "Costo: $0". La vista arranca directo en "Consecuencias" + "¿Cuándo tiene sentido?".
  3. **Spacing unificado**: Reemplazo de `marginTop`/`marginBottom` mixtos por un único `gap: Spacing.three` en el contenedor de cada vista (`viewStack`). El `paddingTop` del content se redujo de `Spacing.four` a `Spacing.two`. Resultado: la vista Mantener queda pegada al inicio (sin huecos extra) y la vista Rebalancear conserva su separación natural sin código duplicado.
- **Filosofía aplicada:**
  - Jerarquía: lo accionable se muestra primero, lo informativo segundo.
  - El marco de la app (pestaña + título de pantalla) no se repite dentro del contenido.
  - El espaciado entre elementos consecutivos lo da una sola fuente (`gap`), no márgenes individuales.
- **Archivos modificados:**
  - `src/app/portfolio/rebalancing.tsx` — orden de tabs, estado inicial, contenido de MaintainView, sistema de spacing
- **Estado:** ✅ Implementado y testeado por Harvey

---

## 🐛 Bugs Conocidos

### Bug: Activos desaparecen temporalmente al reevaluar perfil
- **Descripción:** Al ejecutar reevaluación de perfil de riesgo, los CDTs y ETFs desaparecen de la UI temporalmente. Los datos persisten en BD y se recargan al cambiar de sección.
- **Causa probable:** `profileEvents.emitReset()` dispara listener que limpia estado de `cdts`/`etfs` antes de recargar
- **Impacto:** Medio (confunde al usuario pero no pierde datos)
- **Estado:** Pendiente de investigación

---

## 🔄 Última Actualización

**Fecha:** Junio 5, 2026 (tarde)  
**Autor:** Claude Code  
**Estado:** 🎉 FASE 1 (MVP) COMPLETADA AL 100% — pulido UX en curso

**Commits recientes:**
- `11e1ea4` — UX refinada Portafolio: saludo compacto, FAB, distribución objetivo vs actual
- `cc16f46` — Scroll automático en formularios: input activo centrado sobre el teclado
- ⏳ **Próximo commit:** Alineamiento al design system (login, tabs, buzón, herramientas) + fix preview markdown + UX rebalanceo (orden de tabs, vista Mantener depurada, spacing unificado)

**Próximos pasos:**
- Continuar revisión de UX con Harvey
- Identificar ajustes basados en uso real
- Investigar bug de desaparición temporal de activos
- Planear Fase 2 según prioridades identificadas
