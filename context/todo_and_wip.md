# TODO & Work in Progress - Magic Invest

Este documento es el registro vivo del estado del proyecto. Se actualiza en cada sesión de trabajo. Winston puede y debe revisarlo para agregar, cuestionar o re-priorizar ítems desde su perspectiva estratégica.

---

## Estado General
* **Fase conceptual:** ✅ Completa. Todos los documentos de contexto están al día.
* **Fase de implementación:** 🟡 En progreso. Infraestructura base, autenticación y shell completos. **Módulo Herramientas: ✅ COMPLETO.** **Módulo Buzón: ✅ COMPLETO (mock data).** **Módulo Portafolio: ✅ COMPLETO (Fase 1 local) — perfil, estado vacío, formularios CDT/ETF, detalle CDT/ETF, pantalla principal con tabs Resumen/Detalle.**
* **Última sesión (mayo 2026):** §7.7 — vinculación Portafolio ↔ Buzón. En detalle CDT/ETF: sección "Eventos relacionados" al final (filtra INBOX_EVENTS por banco/ticker, excluye eliminados, navegable a detalle del evento). En detalle de evento del Buzón: chip `relatedAsset` se vuelve tappable cuando el activo existe en SQLite (resuelve ETF por ticker vía `getEtfByTicker`, CDT por banco vía `getAllCdts`), muestra flecha → navega a detalle del activo. Próximo paso: §8 Backend Supabase (Edge Functions Banrep + EOD).

---

## ✅ Completado

### Infraestructura base
* Estructura del proyecto: Expo SDK 56, React 19, TypeScript strict, Expo Router, NativeTabs
* Tokens de diseño en `src/constants/theme.ts` (cromático, espaciado, safe area)
* Schema SQLite local: 7 tablas + índices + sistema de migraciones versionadas (`src/db/`)
* Cliente Supabase en `src/lib/supabase.ts` con AsyncStorage y PKCE
* Schema PostgreSQL en Supabase con RLS (tablas de mercado + tablas de usuario)
* `@expo/vector-icons` instalado (Ionicons)
* `src/utils/format.ts`: formateo de moneda (COP/USD), porcentajes, abreviación de valores (K/M/B), parseNumber

### Autenticación
* Login email/password: `useAuth` hook, flujo signin/signup con validación
* Campo "¿Cómo te llamamos?" en registro → almacenado en `user_metadata.full_name` (Supabase Auth)
* Toggle de visibilidad de contraseña con ícono `eye-outline` / `eye-off-outline`
* Deep linking `magicinvest://auth/callback`: `useAuth` intercepta la URL en cold start (`Linking.getInitialURL`) y warm start (`Linking.addEventListener`), extrae el PKCE code y llama `exchangeCodeForSession` — `onAuthStateChange` propaga la sesión automáticamente
* **Pendiente (manual, una vez):** En Supabase → Authentication → URL Configuration: agregar `magicinvest://auth/callback` en Redirect URLs

### Navegación y shell
* Tres tabs: Portafolio, Buzón, Herramientas (NativeTabs)
* `PageHeader`: componente compartido con título, subtítulo opcional y botón hamburguesa; disponible en los tres tabs
* `DrawerMenu`: panel lateral animado (slide desde la derecha, backdrop oscuro) con secciones de perfil del usuario, configuración (switch biométrico placeholder), legal (placeholders), versión de app y botón de cierre de sesión. Usa `Modal` para flotar sobre cualquier tab. Fix: ref `isMounted` para evitar que la animación de cierre inicial cancele una apertura rápida.
* Saludo personalizado en Portafolio: `"Hola, {nombre} · Tus posiciones reales"` (con fallback si no hay nombre)

### Módulo Herramientas — Shell y calculadoras #1–4
* Lista de 9 herramientas en tarjetas (nombre + descripción + ícono único). Ordenadas por frecuencia de uso estimada.
* Navegación stack dentro del tab Herramientas: `tools/_layout.tsx` (Stack sin header) + `tools/index.tsx` (lista) + `tools/[id].tsx` (placeholder genérico) + archivos individuales por calculadora.
* **Componentes compartidos** en `src/components/calculator/`:
  * `CurrencySelector`: toggle COP / USD estilo segmented control
  * `InputField`: campo numérico con etiqueta, sufijo y hint opcional
  * `ResultCard`: tarjeta de resultados con filas, fila destacada en teal y dots de color para convención visual
  * `GrowthChart`: gráfica de barras apiladas (capital aportado vs ganancias) con etiquetas de valor abreviadas y leyenda. Sin año 0. Scroll horizontal automático.
* **Calculadora #1: Interés compuesto / Valor futuro** (`tools/compound-interest.tsx`):
  * Selector COP/USD, cuatro campos (capital inicial, aporte mensual, tasa anual, horizonte)
  * Resultados: gráfica primero → tabla → disclaimer
  * Fórmula: `FV = PV(1+r)^n + PMT × [(1+r)^n − 1) / r]`
* **Calculadora #2: Tiempo para alcanzar tu meta** (`tools/time-to-goal.tsx`):
  * Búsqueda binaria sobre meses (lo=0, hi=600) para encontrar cuándo FV ≥ target
  * 3 estados: normal, alreadyReached (checkmark), unreachable (alert)
  * Resultados: tabla primero → gráfica (si ≥ 1 año) → disclaimer
* **Calculadora #3: Salir de deudas** (`tools/debt-freedom.tsx`):
  * Fórmula: `n = -ln(1 - balance·r/payment) / ln(1+r)`. Alerta si pago < interés mensual.
  * Pago extra opcional. Resultados: barras comparativas → escenario mínimo → escenario acelerado → ahorro.
  * `ComparisonBars`: dos barras proporcionales usando flex ratios.
* **Calculadora #4: Conversor de tasas** (`tools/rate-converter.tsx`):
  * Tabs internos en orden EA → NM/EM → NA. Conversiones bidireccionales.
  * FROM EA: `nm = (1+r)^(1/12) − 1`. FROM NM: `ea = (1+r)^12 − 1`. FROM NA: `nm = r/12`.
  * Resultado siempre muestra las otras dos tasas + la EM cuando el tab activo es EA o NA.
* **Calculadora #5: Simulador CDT vs ETF** (`tools/cdt-vs-etf.tsx`):
  * CDT con retefuente 4% sobre rendimientos (persona natural Colombia). ETF sin retefuente local.
  * Barras comparativas: CDT neto (ámbar) vs ETF proyectado (teal). Sección diferencia.
* **Calculadora #6: DCA vs Lump Sum** (`tools/dca-vs-lump.tsx`):
  * Lump Sum: invierte todo en mes 0. DCA: capital/N cuotas mensuales, cada una crece desde su mes.
  * Sección "Costo de esperar": diferencia de valor final. Alerta si meses DCA > horizonte total.
* **Calculadora #7: Retorno real** (`tools/real-return.tsx`):
  * Ecuación de Fisher: `real = (1+nominal)/(1+inflación) − 1`.
  * Veredicto visual en tres estados: CRECE (teal) / AGUANTA (ámbar) / PIERDE (púrpura).
  * Muestra equivalente en pesos de hoy (poder adquisitivo real al final del horizonte).
* **Calculadora #8: Rendimiento anual promedio / CAGR** (`tools/cagr.tsx`):
  * Fórmula: `CAGR = (valorFinal/valorInicial)^(1/años) − 1`.
  * Caja destacada con el CAGR en teal (positivo) o púrpura (negativo).
  * GrowthChart proyectado con la tasa calculada (solo si CAGR > 0 y años ≥ 2, usando `monthly=0`).
  * ResultCard: valor inicial, valor final, ganancia/pérdida total, retorno acumulado %, CAGR % (highlighted).
* **Calculadora #9: Costo de comisiones / Fee Drag** (`tools/fee-drag.tsx`):
  * Modelo: `FV_neto = capital × (1 + r − TER)^años` vs `FV_bruto = capital × (1 + r)^años`.
  * Caja con costo total en púrpura. Barras comparativas: sin TER (teal) vs con TER (ámbar).
  * ResultCard: FV sin comisión, FV con TER (highlighted), capital perdido, % de ganancia perdida.

### Módulo Buzón (mock data)
* Routing: solo `inbox/` folder — NO existe `inbox.tsx` en raíz (causa duplicate screen en NativeTabs).
* 5 eventos mock en `src/constants/inbox-mock.ts`: tipos `drawdown_context`, `cdt_maturity`, `market_trigger`, `rebalance`, `educational`. Cada evento tiene `body[]`, `consequences[]` y `disclaimer`.
* Lista (`inbox/index.tsx`): swipe izquierdo → eliminar (rojo), swipe derecho → marcar como no leído (teal, solo en mensajes leídos). Contraste visual: título charcoal bold (no leído) vs stone-gray regular (leído).
* Detalle (`inbox/[id].tsx`): marca como leído via `useEffect` al montar. Secciones: tipo + fecha + asset relacionado, título, cuerpo, escenarios posibles, disclaimer con borde de color.
* Estado reactivo (`src/utils/inbox-state.ts`): store mínimo con `readIds`, `unreadIds`, `deletedIds` y patrón subscribe/notify. La lista se suscribe y re-renderiza automáticamente cuando el detalle marca como leído. Reemplazado por SQLite en producción.
* `GestureHandlerRootView` agregado al root layout (`src/app/_layout.tsx`) — requerido por `Swipeable`.
* `ThemedText` extendido con tipo `'defaultBold'` (fontWeight 700, fontSize 16) — mismo patrón que `small`/`smallBold`.
* **Pendiente futuro:** vincular con Portafolio (campo `relatedAsset`), alimentar con datos reales del backend.

### Módulo Portafolio — Perfil de riesgo y estado vacío
* **`src/constants/risk-profile.ts`** (nuevo): tipos `RiskProfileLabel`, `RiskProfile`, `RiskQuestion`. Las 5 preguntas (`RISK_QUESTIONS`), función `scoreProfile(horizonId, reactionId, goalId) → label`, `PROFILE_BANDS` y `PROFILE_CONFIG` (título, descripción, color por perfil).
* **Preguntas implementadas:**
  1. ¿En cuánto tiempo planeas usar este dinero? — `< 2 años` / `2–5 años` / `+5 años` *(scored: 1/2/3)*
  2. Si tu portafolio cae 20%, ¿qué harías? — `Retiro todo` / `Mantengo` / `Invierto más` *(scored: 1/2/3)*
  3. ¿Cuál es tu objetivo principal? — `Proteger mi capital` / `Crecimiento moderado` / `Maximizar crecimiento a largo plazo` *(scored: 1/2/3)*
  4. ¿Tienes experiencia previa? — 3 opciones *(solo almacenada, no scored)*
  5. Emoción ante caída del 30% — 3 opciones *(solo almacenada, no scored)*
* **Scoring:** Q1+Q2+Q3 (rango 3–9). ≤4 → `conservador`, ≤7 → `moderado`, ≥8 → `arriesgado`.
* **Bandas por perfil:** conservador CDTs 65–80%/ETFs 20–35%, moderado 50–65%/35–50%, arriesgado 30–50%/50–70%.
* **`src/db/queries/config.ts`**: añadidos `getRiskProfile`, `setRiskProfile` (también persiste bandas derivadas), `resetRiskProfile` (borra `risk_profile` y `allocation_bands` de SQLite).
* **`src/components/risk-profile-flow.tsx`** (nuevo): wizard de 5 pasos con barra de progreso, auto-avance a 180ms tras selección, pantalla de resultado con badge de perfil + bandas + botón "Comenzar".
* **`src/app/index.tsx`** (reescrito): estados `loading → risk_profile → empty`. Usa `useFocusEffect` para re-chequear al volver al tab. Se suscribe a `profileEvents` para responder inmediatamente si el reset ocurre estando en el tab.
* **Estado vacío:** chip de perfil con label y rangos de bandas, card vacía con ícono + mensaje, botones CTA "Agregar CDT" / "Agregar ETF" (placeholder — formularios pendientes).
* **`src/utils/profile-events.ts`** (nuevo): pub/sub mínimo `emitReset` / `subscribe` — mismo patrón que `inbox-state.ts`. Permite que el DrawerMenu notifique al PortfolioScreen en tiempo real.
* **DrawerMenu** actualizado: botón "Reevaluar perfil de riesgo" en sección Configuración con `Alert` de confirmación. Al confirmar: borra SQLite + emite `profileEvents.emitReset()` + cierra drawer.

### Corrección crítica: aislamiento de datos por usuario
* **Bug:** al hacer logout, la base de datos SQLite local persistía con los datos del usuario anterior. El nuevo usuario veía las posiciones ajenas.
* **Fix:** `clearUserData(db)` en `src/db/queries/config.ts` — borra `cdt_positions`, `etf_positions`, `user_config`, `inbox_events` en una transacción atómica antes de `supabase.auth.signOut()`.
* **UX:** `src/utils/sign-out-state.ts` — flag global que `_layout.tsx` observa para mostrar pantalla "Cerrando sesión..." durante la limpieza. Evita el flash del cuestionario de perfil mientras se procesan los datos.
* **Flujo:** drawer cierra → `signOutState.begin()` → `clearUserData()` → `supabase.auth.signOut()` → session null → login screen.

### Infraestructura de distribución (EAS Build)
* **Expo Go + Android Studio:** flujo de desarrollo diario. Sin compilación nativa, hot reload, sin NDK.
* **EAS Build → perfil `preview`:** produce APK con JS bundleado (~107 MB, 4 ABIs, debug). Se instala con `adb -s RFGL22B24FF install -r <apk>`. Play Protect bloquea la instalación manual — siempre usar ADB.
* **Credenciales:** `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` almacenadas como EAS Secrets (no en git), disponibles en entornos `preview` y `production`.
* **Por qué no build local:** NDK 27 cambió el ABI de libc++ y los módulos nativos (reanimated, worklets, gesture-handler, screens, expo-modules-core) no declaran `c++_shared` en sus CMakeLists.txt. EAS usa su propio entorno Linux sin este problema.
* **Tamaño futuro:** una build de producción con R8 + AAB splits por ABI producirá ~25–35 MB por ABI. Pendiente para cuando haya un release real.

### Módulo Portafolio — Formularios, detalle y navegación FAB
* **Migración 2** (`src/db/migrations.ts`): 3 columnas nuevas en `etf_positions` — `total_invested_cop REAL`, `trm_at_purchase REAL`, `total_invested_usd REAL`. Permite registrar el monto original en COP + TRM sin perder precisión.
* **`src/db/schema.ts`**: `EtfPosition` extendida con los 3 campos nuevos (`number | null`).
* **`src/db/queries/etf.ts`**: `getEtfById`, `deleteEtf` añadidos; `createEtf` actualizado para los 9 campos incluyendo los 3 nuevos.
* **`src/app/portfolio/add-etf.tsx`** (rediseño completo): selector COP/USD primero → monto → TRM (si COP) → acciones (siempre opcional, botón ⓘ despliega card explicativa) → TER. Guarda con `router.navigate('/portfolio')`.
* **`src/app/portfolio/add-cdt.tsx`**: ajustado a `router.navigate('/portfolio')` post-guardado.
* **`src/app/portfolio/add.tsx`** (nuevo): pantalla de selección de activo. Lista con 5 tipos: ETF indexado ✅, CDT colombiano ✅, Acción individual ❌, Fondo de inversión ❌, Criptomoneda ❌. Usa `router.push` hacia formularios para preservar `add.tsx` en el stack (back desde formulario regresa a selección).
* **`src/app/portfolio/etf/[id].tsx`** (nuevo): detalle de ETF — ticker grande, nombre del fondo, badge COP/USD, card de principal, sección Posición (acciones + precio promedio), sección TER (solo si > 0), fecha de registro, nota "próximamente precios en tiempo real", botón Eliminar con `Alert.alert` → `deleteEtf` → `router.navigate('/portfolio')`.
* **`src/app/portfolio/cdt/[id].tsx`**: añadido botón Eliminar con `Alert.alert` → `deleteCdt` → `router.navigate('/portfolio')`.
* **`src/app/portfolio/index.tsx`**: ETFs primero, CDTs segundo. FAB "Agregar" como prop `rightAction` de `PageHeader` — aparece debajo del ícono ≡ en la esquina superior derecha.
* **`src/components/page-header.tsx`**: prop `rightAction?: React.ReactNode`. `rightGroup` con `flexDirection: 'column'` — ≡ arriba, `rightAction` debajo.
* **Patrón de navegación del stack de portafolio:** `/portfolio` (root) → `/portfolio/add` → `/portfolio/add-etf` o `/portfolio/add-cdt`. Usar `router.navigate('/portfolio')` desde formularios post-guardado para hacer pop-to-existing. Usar `router.push` (no `replace`) desde `add.tsx` para preservar pantalla de selección en el stack.

---

## 🔲 Investigación Técnica Pendiente

### 1. API pública del Banco de la República
* **Qué investigar:** Endpoints para (a) tasa de política monetaria y (b) tasas de captación CDT promedio por plazo. Verificar formato, frecuencia de actualización, estabilidad y cobertura de TRM histórica.
* **Por qué importa:** Fuente de datos para el Hurdle Rate, trigger macroeconómico del Buzón y tasas CDT base.
* **Decisión pendiente:** ¿Es suficiente Banrep o necesitamos complementar con DANE (inflación) o fuentes de TRM adicionales?

### 2. Fuente de datos EOD para ETFs
* **Candidatos:** Alpha Vantage, EOD Historical Data, Yahoo Finance, Polygon.io.
* **Criterios:** Rate limits, cobertura de ETFs internacionales, datos históricos 5-10 años, costo tier gratuito/básico, facilidad de integración en Edge Function.

### 3. Watchlist inicial de ETFs
* **Estado:** Vacía. Harvey no tiene lista predefinida.
* **Acción:** Claude sugerirá tickers representativos (VOO, VTI, VXUS u otros) como semilla funcional al iniciar el módulo Portafolio.

---

## 🔲 Implementación — Por Orden de Prioridad

### 4. Perfil de usuario completo (post-signup)
* **Qué hacer:** Formulario de perfil accesible desde el `DrawerMenu` con campos opcionales: tipo de documento (CC, CE, Pasaporte, NIT — constante TypeScript, no tabla DB), número de documento, ciudad.
* **Decisión de diseño:** Tipos de documento como constante TypeScript. No requiere tabla de referencia en DB.

### 5. Autenticación biométrica
* `expo-local-authentication` como capa local que desbloquea la sesión guardada en AsyncStorage.
* Switch ya visible en el `DrawerMenu` (deshabilitado). Se activa cuando se implemente.
* **Deuda deliberada:** Implementar después de que los módulos principales estén funcionales.

### 6. Módulo Herramientas — Calculadoras 2–9 (En progreso)

Lista priorizada por frecuencia de uso estimada. Calculadora #1 completa — continuar en orden:

| # | Nombre | Estado |
|---|--------|--------|
| 1 | Interés compuesto / Valor futuro | ✅ Completa |
| 2 | Tiempo para alcanzar tu meta | ✅ Completa |
| 3 | Calculadora para salir de deudas | ✅ Completa |
| 4 | Conversor de tasas | ✅ Completa |
| 5 | Simulador CDT vs ETF | ✅ Completa |
| 6 | ¿Invierto mes a mes o todo de una vez? | ✅ Completa |
| 7 | ¿Tu plata crece o solo aguanta? | ✅ Completa |
| 8 | Rendimiento anual promedio | ✅ Completa |
| 9 | ¿Cuánto te cuestan las comisiones en 20 años? | ✅ Completa |

Patrón establecido para todas: selector COP/USD → campos con InputField → botón Calcular → GrowthChart (si aplica) → ResultCard → disclaimer. Auto-scroll a resultados al calcular.

### 7. Módulo Portafolio

#### 7.1 Flujo de perfil de riesgo ✅ COMPLETO
Ver "Módulo Portafolio — Perfil de riesgo y estado vacío" en la sección Completado arriba.
Reevaluación disponible desde DrawerMenu → "Reevaluar perfil de riesgo".

#### 7.2 Estado vacío (sin posiciones registradas) ✅ COMPLETO (versión inicial)
Chip de perfil + card vacía + CTAs placeholder. **Pendiente mejorar** cuando haya datos reales:
- Proyección probabilística hipotética ("Con $10.000.000 y tu perfil...")
- Contexto macro: Banrep actual, CDT mercado, TRM, inflación (requiere backend §8)

#### 7.3 Formulario de registro CDT ✅ COMPLETO
Ver "Módulo Portafolio — Formularios, detalle y navegación FAB" arriba.

#### 7.4 Formulario de registro ETF ✅ COMPLETO (entrada local sin precios EOD)
Rediseñado: COP/USD primero, TRM, acciones opcionales. Ver sección Completado arriba.
**Pendiente mejorar:** autocompletado de ticker contra watchlist, precio EOD en tiempo real.

#### 7.5 Detalle de activo ✅ COMPLETO (datos locales)
CDT: proyección al vencimiento, retefuente, fechas. ETF: fracciones, precio promedio, TER.
**Pendiente:** CAGR desde compra, MaxDD, Sortino, comparación vs Hurdle Rate (requiere backend §8).

#### 7.6 Pantalla principal con activos ✅ COMPLETO

**Fila superior (siempre visible):** chip pill de perfil con formato `Perfil: CDT x–x% / ETF x–x%` (una sola línea) + botón Agregar inline a la derecha.

**Dos tabs:**
- **Resumen** (default):
  - Con activos: SummaryCard (total COP, breakdown CDT/ETF con dots de color), ProjectionBanner (proyección a 10 años, rango pesimista–optimista con tasa mezclada), DistributionSection (barras de progreso CDT/ETF vs bandas, badge de salud estructural: teal/ámbar/púrpura), ContextStrip (Banrep, CDT mercado, inflación, TRM — hardcodeados hasta §8).
  - Sin activos: card con mensaje + CTAs directos "Agregar CDT" y "Agregar ETF".
- **Detalle:** lista de CDTs + lista de ETFs con tarjetas navegables. Desactivado (opacidad 38%) cuando no hay posiciones.

**Matemática de proyección (local, sin backend):**
- `cdtTotal` = suma de `cdt.amount`; `etfTotalCOP` = total invertido en COP usando TRM hardcodeado ($4.200)
- `avgCdtRateNet` = tasa neta promedio ponderada de CDTs (después de retefuente)
- `blendedLow/High` = `cdtPct × avgCdtRateNet + etfPct × ETF_CAGR (5%/11% USD)`
- `projLow/High` = `portfolioTotal × (1 + blendedRate)^10`

**Constantes hardcodeadas hasta backend §8:** `TRM_COP = 4.200`, `BANREP_RATE = 9.25%`, `CDT_MKT_RATE = 11.2%`, `INFLATION_COL = 5.3%`, `ETF_CAGR_LOW = 5%`, `ETF_CAGR_HIGH = 11%`.

#### 7.7 Vinculación con el Buzón ✅ COMPLETO

**Buzón → Portafolio:** chip `relatedAsset` en `inbox/[id].tsx` resuelve el activo en SQLite al montar:
- Si `relatedAsset` empieza con `'CDT '`: busca en `getAllCdts` por banco, navega a `/portfolio/cdt/{id}`
- Si no: `getEtfByTicker`, navega a `/portfolio/etf/{id}`
- Chip muestra `→` cuando el activo existe; permanece estático si no está registrado

**Portafolio → Buzón:** sección "Eventos relacionados" en `portfolio/cdt/[id].tsx` y `portfolio/etf/[id].tsx`:
- CDT: filtra `INBOX_EVENTS` donde `relatedAsset` contiene el nombre del banco (case-insensitive)
- ETF: filtra donde `relatedAsset === ticker`
- Excluye eventos borrados via `inboxState.isDeleted()`
- Cada fila: icono de tipo + label + título (2 líneas) + fecha + chevron → navega a `/inbox/{id}`
- Sección oculta si no hay eventos coincidentes

### 8. Backend Supabase — Edge Functions
* Edge Function con cron para consulta periódica a API Banrep (tasa política + CDT promedio)
* Edge Function para sincronización de datos EOD de ETFs
* Capa de sincronización Supabase → SQLite local

### 9. Sistema de Rebalanceo
* Evaluación trimestral automática contra bandas configuradas
* Rebalanceo de oportunidad al detectar CDT próximo a madurar
* Recálculo del Hurdle Rate cuando cambia la tasa Banrep

### 10. Flujo de Onboarding (al final, pre-publicación)
* Pantalla que presenta la filosofía básica en lenguaje accesible (sin tecnicismos)
* Configuración de bandas de asignación CDT/ETF con slider (default: calculadas desde el perfil de riesgo)
* Solo se muestra la primera vez (verificar con `isOnboardingComplete()` en SQLite)
* **Nota:** Se implementa cuando todas las funcionalidades estén terminadas y probadas, para poder describir y mostrar con precisión qué hace la app.

### 11. Cumplimiento legal (prerrequisito para lanzar a terceros — no aplica para uso personal de Harvey)
* **Política de tratamiento de datos** (Ley 1581/2012): redactar documento completo con finalidad, plazo de conservación, derechos del titular. Reemplaza el placeholder del DrawerMenu.
* **Aviso de privacidad**: versión corta mostrada en pantalla de registro con checkbox de autorización expresa.
* **Inscripción RNBD**: registro de la base de datos ante la SIC cuando haya usuarios distintos a Harvey.
* **Revisión legal**: validar con abogado colombiano especializado en fintech que el modelo de análisis/información no califica como asesoría financiera ni intermediación bajo la regulación SFC.
* **Términos y condiciones**: reemplazar placeholder del DrawerMenu con documento real que incluya: (a) la app no es un broker ni asesor financiero; (b) el usuario registra posiciones que tiene en otras entidades; (c) el análisis es educativo e histórico, no predictivo.

---

## 🔲 Deuda Técnica Deliberada (Phase 2)

* **Automatización de tasas CDT por banco individual:** si Banrep solo da promedios, las tasas por banco (Bancolombia, Bogotá, Davivienda) requerirán scraping o entrada manual en Phase 1.
* **Implicaciones fiscales interactivas:** la educación fiscal está en tooltips y pantallas de detalle, pero un calculador de impacto tributario real queda para Phase 2.
* **Asistente IA:** chat con acceso contextual al portafolio. El Buzón educativo de Phase 1 es su precursor.
* **Multi-dispositivo:** la arquitectura SQLite + Supabase lo habilita, pero no se implementa en Phase 1.
* **Algoritmo de matching ETFs:** selección automática según perfil de Harvey. Phase 1 usa watchlist manual.

---

## 📋 Para Winston — Revisión Solicitada

1. **API Banrep como fuente única del Hurdle Rate:** ¿ves riesgo de dependencia en una sola fuente oficial para la tasa libre de riesgo local?
2. **Bandas de asignación por defecto (CDTs 50–70% / ETFs 30–50%):** ¿este default conservador es el correcto para el perfil de Harvey en Phase 1?
3. **Watchlist inicial de ETFs:** ¿propones criterios de selección o tickers específicos alineados con la tesis de inversión?
4. **Complejidad fiscal:** ¿falta alguna dimensión fiscal relevante para un residente colombiano invirtiendo en ETFs USD no cubierta en `investment_thesis.md` §5?
5. **¿Algo que falta?** Si al revisar los documentos de contexto identificas huecos conceptuales, técnicos o filosóficos, este es el lugar para registrarlos.
