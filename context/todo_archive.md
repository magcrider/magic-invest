# Archivo TODO - Magic Invest

Este archivo contiene el historial de tareas completadas. Se separa del documento principal `todo_and_wip.md` para mantener el contexto de conversación ligero.

---

## ✅ Completado

### Infraestructura base
* Estructura del proyecto: Expo SDK 56, React 19, TypeScript strict, Expo Router, NativeTabs
* Tokens de diseño en `src/constants/theme.ts` (cromático, espaciado, safe area)
* Cliente Supabase en `src/lib/supabase.ts` con AsyncStorage y PKCE
* Schema PostgreSQL en Supabase con RLS (tablas de mercado + tablas de usuario)
* Queries directas a Supabase en `src/services/supabase-queries.ts` — CDTs, ETFs, config de usuario
* `@expo/vector-icons` instalado (Ionicons)
* `src/utils/format.ts`: formateo de moneda (COP/USD), porcentajes, abreviación de valores (K/M/B), parseNumber
* **Decisión arquitectónica:** SQLite eliminado — Supabase Postgres como única fuente de verdad (ver `architecture_state.md` §5)

### Autenticación
* Login email/password: `useAuth` hook, flujo signin/signup con validación
* Campo "¿Cómo te llamamos?" en registro → almacenado en `user_metadata.full_name` (Supabase Auth)
* Toggle de visibilidad de contraseña con ícono `eye-outline` / `eye-off-outline`
* Deep linking `magicinvest://auth/callback`: `useAuth` intercepta la URL en cold start (`Linking.getInitialURL`) y warm start (`Linking.addEventListener`), extrae el PKCE code y llama `exchangeCodeForSession` — `onAuthStateChange` propaga la sesión automáticamente
* **Fix UX:** `KeyboardAvoidingView` + `ScrollView` en login para que el teclado no cubra los campos de texto en pantallas pequeñas
* **Pendiente (manual, una vez):** En Supabase → Authentication → URL Configuration: agregar `magicinvest://auth/callback` en Redirect URLs

### Navegación y shell
* Tres tabs: Portafolio, Buzón, Herramientas (NativeTabs)
* `PageHeader`: componente compartido con título, subtítulo opcional y botón hamburguesa; disponible en los tres tabs
* `DrawerMenu`: panel lateral animado (slide desde la derecha, backdrop oscuro) con secciones de perfil del usuario, configuración (switch biométrico placeholder), legal (placeholders), versión de app y botón de cierre de sesión. Usa `Modal` para flotar sobre cualquier tab. Fix: ref `isMounted` para evitar que la animación de cierre inicial cancele una apertura rápida.
* Saludo personalizado en Portafolio: `"Hola, {nombre} · Tus posiciones reales"` (con fallback si no hay nombre)

### Módulo Herramientas — Shell y calculadoras #1–9
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
* **Fix UX en calculadoras:** `KeyboardAvoidingView` + `ScrollView` en las 9 calculadoras para que el teclado no cubra los campos de texto en pantallas pequeñas.

### Módulo Buzón (mock data)
* Routing: solo `inbox/` folder — NO existe `inbox.tsx` en raíz (causa duplicate screen en NativeTabs).
* 5 eventos mock en `src/constants/inbox-mock.ts`: tipos `drawdown_context`, `cdt_maturity`, `market_trigger`, `rebalance`, `educational`. Cada evento tiene `body[]`, `consequences[]` y `disclaimer`.
* Lista (`inbox/index.tsx`): swipe izquierdo → eliminar (rojo), swipe derecho → marcar como no leído (teal, solo en mensajes leídos). Contraste visual: título charcoal bold (no leído) vs stone-gray regular (leído).
* Detalle (`inbox/[id].tsx`): marca como leído via `useEffect` al montar. Secciones: tipo + fecha + asset relacionado, título, cuerpo, escenarios posibles, disclaimer con borde de color.
* Estado reactivo (`src/utils/inbox-state.ts`): store mínimo con `readIds`, `unreadIds`, `deletedIds` y patrón subscribe/notify. La lista se suscribe y re-renderiza automáticamente cuando el detalle marca como leído. Se usará con datos mock hasta implementar el backend de generación de eventos.
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
* **`src/services/supabase-queries.ts`**: queries directas a Supabase — `getRiskProfile`, `setRiskProfile` (también persiste bandas derivadas), `resetRiskProfile`, `getAllCdts`, `getAllEtfs`, `createCdt`, `createEtf`, `deleteCdt`, `deleteEtf`.
* **`src/components/risk-profile-flow.tsx`** (nuevo): wizard de 5 pasos con barra de progreso, auto-avance a 180ms tras selección, pantalla de resultado con badge de perfil + bandas + botón "Comenzar".
* **`src/app/index.tsx`** (reescrito): estados `loading → risk_profile → empty`. Usa `useFocusEffect` para re-chequear al volver al tab. Se suscribe a `profileEvents` para responder inmediatamente si el reset ocurre estando en el tab.
* **Estado vacío:** chip de perfil con label y rangos de bandas, card vacía con ícono + mensaje, botones CTA "Agregar CDT" / "Agregar ETF" (placeholder — formularios pendientes).
* **`src/utils/profile-events.ts`** (nuevo): pub/sub mínimo `emitReset` / `subscribe` — mismo patrón que `inbox-state.ts`. Permite que el DrawerMenu notifique al PortfolioScreen en tiempo real.
* **DrawerMenu** actualizado: botón "Reevaluar perfil de riesgo" en sección Configuración con `Alert` de confirmación. Al confirmar: llama `resetRiskProfile()` en Supabase + emite `profileEvents.emitReset()` + cierra drawer.
* **Fix UX en formularios:** `KeyboardAvoidingView` + `ScrollView` en add-cdt y add-etf para que el teclado no cubra los campos de texto en pantallas pequeñas.

### Aislamiento de datos por usuario
* **Resuelto arquitecturalmente:** con queries directas a Supabase + Row Level Security, cada usuario solo ve sus propios datos. No hay riesgo de contaminación entre usuarios.
* **UX:** `src/utils/sign-out-state.ts` — flag global que `_layout.tsx` observa para mostrar pantalla "Cerrando sesión..." durante el logout.
* **Flujo:** drawer cierra → `signOutState.begin()` → `supabase.auth.signOut()` → session null → login screen.

### Infraestructura de distribución (EAS Build)
* **Expo Go + Android Studio:** flujo de desarrollo diario. Sin compilación nativa, hot reload, sin NDK.
* **EAS Build → perfil `preview`:** produce APK con JS bundleado (~107 MB, 4 ABIs, debug). Se instala con `adb -s RFGL22B24FF install -r <apk>`. Play Protect bloquea la instalación manual — siempre usar ADB.
* **Credenciales:** `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` almacenadas como EAS Secrets (no en git), disponibles en entornos `preview` y `production`.
* **Por qué no build local:** NDK 27 cambió el ABI de libc++ y los módulos nativos (reanimated, worklets, gesture-handler, screens, expo-modules-core) no declaran `c++_shared` en sus CMakeLists.txt. EAS usa su propio entorno Linux sin este problema.
* **Tamaño futuro:** una build de producción con R8 + AAB splits por ABI producirá ~25–35 MB por ABI. Pendiente para cuando haya un release real.

### Sistema de color dinámico (light/dark) + convenciones de identidad de activo

#### Migración Tokens.* → useTheme()
Toda la app migrada de colores estáticos (`Tokens.*`) a un sistema dinámico de temas que soporta light y dark mode. El hook `useTheme()` retorna `Colors.light` o `Colors.dark` según `useColorScheme()`.

**Regla de implementación:** `StyleSheet.create()` solo para geometría. Colores siempre en el segundo array de `style`: `style={[styles.x, { color: theme.y }]}`. Los sub-componentes llaman a `useTheme()` de forma independiente — el tema nunca se pasa como prop.

**Archivos migrados:** `src/app/_layout.tsx`, todos los tools (9 calculadoras + index + [id]), `src/app/portfolio/index.tsx`, `src/app/portfolio/cdt/[id].tsx`, `src/app/portfolio/etf/[id].tsx`, `src/app/inbox/index.tsx`, `src/app/inbox/[id].tsx`, todos los componentes compartidos de `src/components/`.

#### Convención de doble familia cromática
Dos familias de tokens con funciones distintas, nunca intercambiables:

**Tokens de identidad de activo** (`assetCdt: #3A6B9A`, `assetEtf: #3A7850`):
- Encabezados de sección agrupada en Portafolio Detalle
- Título/nombre del activo en pantallas de detalle
- Valor acento en tarjetas de lista (tasa EA para CDT, valor total para ETF)
- Ícono en tarjetas del Buzón cuando hay `relatedAsset`
- Segmentos de la barra de distribución apilada
- Barras comparativas en calculadora CDT vs ETF

**Tokens semánticos** (`positive`/`attention`/`risk`):
- Salud de bandas de asignación (dentro/cerca/fuera)
- Pill label y punto de no leído en tarjetas del Buzón
- Borde de disclaimer en detalle del Buzón
- Veredictos en calculadoras (CAGR, retorno real)

#### Barra de distribución rediseñada
La sección "Distribución" en Portafolio Resumen usa una sola barra apilada: CDT a la izquierda en `assetCdt` (azul), ETF a la derecha en `assetEtf` (verde), juntos suman 100%. Las dos barras separadas con colores de salud idénticos fueron eliminadas. El badge de salud general permanece en el header de la sección.

#### Doble color en tarjetas del Buzón
Las tarjetas del Buzón combinan ambas familias: ícono → identidad del activo (derivado de `relatedAsset`); pill de tipo + punto de no leído → semántico (derivado del `type` del evento). Ver `design_system.md` §13 para la regla completa.

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

### Módulo Portafolio — Pantalla principal Fase 1 (completada)

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

### Módulo Portafolio — Vinculación Buzón–Portafolio

**Buzón → Portafolio:** chip `relatedAsset` en `inbox/[id].tsx` resuelve el activo desde Supabase al montar:
- Si `relatedAsset` empieza con `'CDT '`: busca en `getAllCdts` por banco, navega a `/portfolio/cdt/{id}`
- Si no: `getEtfByTicker`, navega a `/portfolio/etf/{id}`
- Chip muestra `→` cuando el activo existe; permanece estático si no está registrado

**Portafolio → Buzón:** sección "Eventos relacionados" en `portfolio/cdt/[id].tsx` y `portfolio/etf/[id].tsx`:
- CDT: filtra `INBOX_EVENTS` donde `relatedAsset` contiene el nombre del banco (case-insensitive)
- ETF: filtra donde `relatedAsset === ticker`
- Excluye eventos borrados via `inboxState.isDeleted()`
- Cada fila: icono de tipo + label + título (2 líneas) + fecha + chevron → navega a `/inbox/{id}`
- Sección oculta si no hay eventos coincidentes

### Sistema de validación y formateo de inputs (completo)

Sistema robusto de 5 tipos de input con validación estricta, formato automático y scroll preciso.

**5 tipos implementados:**
1. **Monto** (`amount`): COP con puntos de miles, USD con comas. Tooltip "ej: 5.000.000 (COP) o 1,250.50 (USD)". Límite: 15 dígitos enteros + 2 decimales.
2. **Porcentaje** (`percentage`): Con sufijo %. Tooltip "ej: 8.5". Límite: 3 dígitos enteros + 2 decimales.
3. **Años** (`years`): Entero positivo. Tooltip "ej: 10". Límite: 2 dígitos.
4. **Meses** (`months`): Entero positivo. Tooltip "ej: 24". Límite: 3 dígitos.
5. **Acciones** (`shares`): Entero positivo. Tooltip "ej: 15". Límite: 8 dígitos.

**Características:**
- **Validación en tiempo real:** `onChangeText` rechaza caracteres inválidos según el tipo
- **Formato automático al desenfocarse:** `onBlur` aplica formato completo (puntos/comas según moneda)
- **Parsing robusto:** `parseFormattedInput()` detecta automáticamente formato español vs inglés
- **Tooltips con prefijo "ej:":** color tenue (`theme.secondary`), valores ejemplares claros
- **Scroll automático:** `onFocus` hace scroll del `ScrollView` para mantener el campo activo siempre visible sobre el teclado

**Archivos migrados:**
- `src/components/calculator/input-field.tsx`: todos los props de configuración
- Todas las calculadoras (9 archivos en `src/app/tools/`)
- `src/app/portfolio/add-cdt.tsx` y `src/app/portfolio/add-etf.tsx`

**Reglas de tipografía robusta (evita corte de descendentes):**
- Títulos con `lineHeight` 30-35% mayor que `fontSize`
- `InputField` labels con `lineHeight: 22` (fontSize 16)
- Placeholders con color tenue y prefijo "ej:" en campos numéricos

### Modals educativos (revelación progresiva)

Sistema de modals para explicar conceptos complejos sin saturar la UI principal.

**Implementado:**
- **Modal Perfil** (`InfoModal` en `portfolio/index.tsx`): Explica perfil de riesgo, bandas y método de cálculo. Touchable en chip de perfil.
- **Modal Proyección** (`InfoModal` en `portfolio/index.tsx`): Tres secciones — tabla de escenarios (pesimista/optimista para 2A, 5A, 10A), supuestos (tasas CDT/ETF, aportes mensuales), disclaimer con color semántico (`theme.attention`). Touchable en `ProjectionBanner`.

**Componente reutilizable:**
- `src/components/info-modal.tsx`: Recibe `visible`, `onClose`, `title`, `children`. Scroll interno, backdrop con dismiss, botón X. Padding compacto para evitar scroll innecesario.

**UX:**
- Sin scroll innecesario: contenido optimizado con padding `{vertical: 24, horizontal: 20}`
- Secciones con títulos bold y espaciado consistente
- Tablas con bordes sutiles y headers destacados
- Disclaimer con fondo `theme.attention + opacity 12%` y borde lateral

### Mejoras de proyección (Portafolio)

**Rediseño de ProjectionBanner:**
- Layout 33%/67%: label izquierda, rango derecha
- Tres horizontes: 2A, 5A, 10A con años futuros calculados dinámicamente
- Formato: "2A @ 2028 $ 17.1M – $ 20.7M"
- Rango pesimista–optimista con tasa mezclada (CDTs + ETFs)
- Toda la sección es touchable → modal educativo

**Cálculo de rangos:**
- `avgCdtRateNet` = tasa neta promedio ponderada de CDTs (después de retefuente 4%)
- `blendedLow/High` = `cdtPct × avgCdtRateNet + etfPct × ETF_CAGR (5%/11% USD)`
- `projLow/High` = `portfolioTotal × (1 + blendedRate)^years`
- Formato abreviado: `formatCurrency(value, 'COP', true)` → "$ 17.1M"

### Auto-retry JWT transparente

Sistema de reintento automático para error PGRST303 ("JWT issued at future") causado por desincronización de reloj entre cliente y servidor Supabase.

**Implementación:**
- `src/services/supabase-queries.ts`: función `withJwtRetry()` wrapper genérico
- Todas las queries envueltas en `withJwtRetry()`
- Max 2 intentos: 1er intento → error → refresh sesión → 2do intento
- Usuario nunca ve el error (silencioso)
- Si ambos intentos fallan → propaga error original

**Razón:** `iat` (issued at) del JWT puede ser algunos segundos en el futuro si el reloj del dispositivo está adelantado. Refresh de sesión fuerza un nuevo JWT con timestamp del servidor.

### Consistencia de símbolos monetarios y terminología

**Formato universal:**
- COP: `$ 6.500.000 COP` (símbolo $ + moneda explícita)
- USD: `USD 1,666.67` (código ISO sin símbolo)
- TRM: `$ 3.900 COP/USD` (par de divisas explícito)
- Precio promedio: `USD 71.53 / acción` (unidad explícita)

**Prefijos $ agregados:**
- `add-cdt.tsx`: campo Monto con prefijo "$"
- `add-etf.tsx`: campos Total invertido y TRM con prefijo "$"

**Terminología precisa:**
- "TER — Costo anual del ETF" (antes decía "fondo")
- "Acciones" en lugar de "Fracciones" (ETFs)
- "Precio promedio" en detalle de ETF

**Fix crítico `parseFormattedInput`:**
- Detecta automáticamente formato español (COP: "6.500.000" → 6500000) vs inglés (USD: "6,500.50" → 6500.50)
- Resuelve bug de parsing que mostraba valores incorrectos en resúmenes
- Basado en conteo de puntos/comas: si hay 2+ puntos → formato español

---

## Última sesión completada (junio 1, 2026)

* **Auto-retry JWT transparente:** Sistema de reintento automático para error PGRST303. Refresh silencioso de sesión + reintento (max 2 intentos). Usuario nunca ve el error.
* **Proyección rediseñada (Portafolio):** Tres horizontes (2A, 5A, 10A) con años futuros y rangos pesimista-optimista. Layout 33%/67%. Formato: "2A @ 2028 $ 17.1M – $ 20.7M". Sección touchable → modal.
* **Modals educativos (revelación progresiva):**
  - Modal Perfil: explicación del perfil de riesgo, bandas y cálculo
  - Modal Proyección: tablas de escenarios (pesimista/optimista), supuestos (CDTs, ETFs, aportes), disclaimer con color semántico (`theme.attention`)
  - Componente `InfoModal` reutilizable con scroll, backdrop y botón X
  - Sin scroll innecesario (contenido optimizado con padding compacto)
* **Fix crítico parseFormattedInput:** Detecta automáticamente formato español (COP: "6.500.000" → 6500000) vs inglés (USD: "6,500.50" → 6500.50). Resuelve bug de parsing que mostraba valores incorrectos en resúmenes.
* **Consistencia total de símbolos monetarios:** Todos los campos y resúmenes muestran moneda explícita. Formato COP: `$ 6.500.000 COP`. Formato USD: `USD 1,666.67`. TRM: `$ 3.900 COP/USD`. Precio promedio: `USD 71.53 / acción`.
* **Terminología precisa:** "TER — Costo anual del ETF" (antes decía "fondo"). "Acciones" en lugar de "Fracciones".
* **Prefijos $ agregados:** Campos de Monto (CDT), Total invertido (ETF), TRM (ETF) ahora tienen prefijo visual consistente.
