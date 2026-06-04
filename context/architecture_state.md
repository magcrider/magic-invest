# Architecture State & Philosophy - Magic Invest

## 1. Visión Global y Dinámica de Trabajo
Este proyecto es una colaboración a tres bandas:
* **Harvey (Usuario/Arquitecto):** Define el rumbo, cuestiona la lógica y toma las decisiones de negocio.
* **Winston (IA Consultora/Filtro):** Evalúa la viabilidad, cuestiona sesgos, prioriza el bienestar cognitivo del usuario y diseña la estructura teórica.
* **Claude Code (IA Ejecutora):** Encargado de la implementación en código del repositorio, respetando estrictamente las directrices documentadas.

El proyecto consta de dos fases. **Estamos exclusivamente en la Fase 1:**
* **Fase 1 (Corto Plazo):** MVP en React Native para uso personal de Harvey. Objetivo: entender cómo consumir datos de mercado, aplicar parámetros estadísticos, aislar el ruido financiero y construir un sistema que priorice el crecimiento a largo plazo, la paz mental y el aprendizaje activo.
* **Fase 2 (Largo Plazo - NO IMPLEMENTAR AÚN):** Asistente IA como módulo principal con acceso contextual al portafolio, integración vía servidores MCP, agentes autónomos y perfilamiento de terceros.

## 2. Restricciones de Dominio Financiero (Filtro Anti-Ruido)
Para proteger la atención de Harvey y evitar el hiperconsumismo financiero, la Fase 1 tiene fronteras estrictas sobre qué activos se procesan:
* **Aprobados en Fase 1:**
  * **CDTs (Certificados de Depósito a Término):** Actúan como la tasa libre de riesgo local.
  * **ETFs Indexados:** Motor de crecimiento a largo plazo, eliminando el riesgo de empresas individuales.
* **Estrictamente Prohibidos en Fase 1:**
  * **Acciones individuales:** exceso de ruido corporativo. (Reconsiderable en fases posteriores).
  * **Criptomonedas:** especulación pura. (No contempladas).
  * **Fondos de Gestión Activa:** cajas negras inmedibles.

## 3. Módulos de la Aplicación
La app se estructura en módulos independientes y navegables como secciones principales:

* **Portafolio (Realidad):** posiciones reales del usuario.
  * *ETFs:* alimentados desde APIs de datos de cierre diario (End-of-Day / EOD) y metadatos estructurales (como el TER). **Auto-fetch asíncrono al abrir la app, con dedupe diaria** — si ya se descargaron los datos del día, no se vuelve a llamar a la API. Cero bloqueos de UI por red. **Prohibido:** WebSockets, live tickers, actualizaciones intradía.
  * *CDTs:* registro parametrizado con reglas de bancos colombianos (Bancolombia, Banco de Bogotá, Davivienda, etc.) incluyendo capitalización, retención en la fuente (retefuente) y tasas vigentes.
  * *Vinculación con el Buzón:* la lista de activos no muestra badges. Al entrar al detalle de un activo, aparece una sección "Eventos relacionados" al final con los eventos del Buzón vinculados a ese activo. Desde el Buzón, cada evento muestra un chip navegable con el nombre del activo que lleva al detalle en Portafolio.

* **Herramientas (Simulación):** calculadoras estáticas que corren de manera local. Proyección de interés compuesto, simulación de aportes, comparadores. No tocan el portafolio real.

* **Buzón (Asíncrono):** receptor de eventos generados por el propio sistema. El usuario decide cuándo consumir el Buzón. **Cero notificaciones push**, cero badges en ícono de app. Los eventos son de cuatro tipos:

  1. **Disparadores de mercado:** condiciones matemáticas sobre ETFs y CDTs (ver `investment_thesis.md` §4).
  2. **Comportamiento durante caídas:** cuando un ETF del portafolio entra en caída significativa (>15% desde máximo reciente), el sistema genera un evento con contexto histórico — cuántas veces ha caído así, tiempo promedio de recuperación, comparación proyectada entre mantener y salir. Nunca sugiere acción. Ver principio de lenguaje en `design_system.md` §9.
  3. **Maduración de CDT / rebalanceo de oportunidad:** cuando un CDT está próximo a vencer, el sistema genera un evento que conecta el capital disponible con el estado actual de la distribución CDT/ETF y el Hurdle Rate vigente.
  4. **Acompañamiento educativo progresivo:** eventos que nudgean al usuario hacia mayor comprensión en el momento adecuado. Ejemplos: "Llevas 6 meses con VTI. ¿Sabes cuánto vale ese tiempo ya?" / "Llevas 4 meses usando la app. Puede que quieras revisar tus bandas de asignación ahora que conoces el Sortino." Este tipo de evento es el precursor conversacional del Asistente IA de Fase 2.

  Todo evento del Buzón incluye un **disclaimer permanente** como componente de diseño fijo: *"Este contenido es educativo y se basa en datos históricos. No constituye asesoría de inversión."* No está enterrado en términos y condiciones — es parte visible del componente.

* **Onboarding (flujo inicial):** pantalla o flujo dedicado que se muestra la primera vez. Presenta la filosofía básica de la app en lenguaje accesible, permite configurar las **bandas de asignación** CDT/ETF con un slider (default conservador: CDTs 50–70%, ETFs 30–50%), y conecta los primeros activos. El onboarding no presupone conocimiento técnico previo.

* **Asistente IA (Fase 2 — NO IMPLEMENTAR AÚN):** chat con acceso contextual al portafolio del usuario, capaz de resolver dudas conceptuales y razonar sobre el estado real del portafolio. El Buzón educativo de Fase 1 es su precursor directo.

## 4. Flujo de Desarrollo y Distribución

### Workflow establecido (Sesión mayo 2026)

Dos flujos paralelos que nunca se mezclan:

| Propósito | Herramienta | Cuándo usar |
|-----------|-------------|-------------|
| Desarrollo diario | Android Studio Emulator + Expo Go | Siempre — hot reload, sin compilación nativa |
| Prueba en dispositivo físico | EAS Build (cloud) → APK via ADB | Cuando se necesita validar en hardware real |

**Emulador recomendado:** Pixel 5 (1080×2340, 440 dpi, Android 14/API 34) — dimensiones similares al Galaxy S24 6.2" que usa Harvey para pruebas físicas.

**Por qué no `npx expo run:android` local:** el NDK 27 incluido con Expo SDK 56 cambió el ABI de libc++, y varios módulos nativos (reanimated, worklets, gesture-handler, screens, expo-modules-core) no declaraban `c++_shared` explícitamente en sus CMakeLists.txt. Esto produce errores de símbolo indefinido en el linker. EAS usa su propio entorno Linux con la configuración correcta y no tiene este problema.

### EAS Build — configuración
* **Proyecto:** `@ey.magic/magic-invest` — `projectId: fac84751-8709-444d-8cbe-a4553c84f200`
* **Perfil `preview`:** produce APK directamente instalable, JS bundleado (sin Metro server), distribución interna
* **Credenciales Supabase:** almacenadas como EAS Secrets (no en git) — `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` en entornos `preview` y `production`
* **Instalar en dispositivo físico:** `adb -s <serial> install -r <apk>` — bypasea Play Protect
* **Comando de build:** `npx eas-cli build --platform android --profile preview --non-interactive`
* **Tiempo estimado:** ~15 minutos en servidores de Expo

### Tamaño del APK
El preview actual pesa ~107 MB. Es normal para React Native con 4 ABIs (arm64-v8a, armeabi-v7a, x86, x86_64) y hermes en modo debug. Una build de producción con R8 + AAB con splits por ABI produce ~25–35 MB por ABI. No actuar sobre esto hasta preparar un release real.

## 5. Stack Tecnológico Base
* **Framework:** React Native con **Expo (managed workflow)**. Core limpio. Cada dependencia externa debe justificarse para evitar inflar la aplicación.
* **Lenguaje:** TypeScript estricto. Sin `any` salvo en boundaries justificados.
* **Persistencia:** **Supabase Postgres como única fuente de verdad.** Las queries de lectura y escritura van directamente a Supabase (`src/services/supabase-queries.ts`). Cache en memoria via React state durante la sesión. Sin SQLite local.
  * **Decisión arquitectónica (mayo 2026 — cambio fundamental):** Originalmente el diseño contemplaba SQLite local con sincronización bidireccional a Supabase (arquitectura local-first). Tras implementar la sincronización, encontramos que para el caso de uso de Fase 1 (uso personal, <20 activos, baja frecuencia de escritura), la complejidad de mantener dos fuentes de verdad sincronizadas introducía más problemas que beneficios: race conditions entre pull y read, lógica compleja de write-through, y mayor superficie de bugs. La latencia de ~50-100ms de Supabase es completamente aceptable para este volumen de datos. SQLite podrá reintroducirse en Fase 2 si el caso de uso lo justifica (ej: uso verdaderamente offline, miles de registros).
* **Backend (día uno, no opcional):** **Supabase managed** (Postgres + Auth). Infraestructura activa desde el inicio porque los jobs programados de Banrep y las Edge Functions viven aquí.
  * *Justificación de Postgres:* tipo `NUMERIC` con precisión arbitraria para montos financieros, window functions nativas para CAGR, Sortino, MaxDD directamente en SQL, JSONB para configuraciones flexibles, Row Level Security nativa.
* **Jobs de datos macroeconómicos:** Supabase Edge Functions con cron consultan periódicamente la API pública del Banco de la República. Los resultados se almacenan en Postgres; la app lee directamente desde Postgres. La app nunca llama directamente a Banrep (CORS, disponibilidad, caché).
* **Autenticación:** Supabase Auth con **email/password**. PKCE flow habilitado. Deep linking `magicinvest://auth/callback` para confirmación de cuenta desde email. Capa biométrica (`expo-local-authentication`) planificada como gate local sobre la sesión almacenada — no reemplaza el login, lo complementa.
* **Perfil de usuario:** nombre capturado en signup como `user_metadata.full_name` (Supabase Auth). Campos adicionales (documento, ciudad) en formulario de perfil post-signup — pendiente implementar.
* **Iconografía:** `@expo/vector-icons` (Ionicons) instalado. Íconos monocromáticos conforme al sistema de diseño.
* **Estado en cliente:** React Context + hooks. No introducir Redux/Zustand hasta que el scope lo justifique.
* **Sistema de temas (light/dark):** `src/hooks/use-theme.ts` retorna `Colors.light` o `Colors.dark` según `useColorScheme()`. Todos los colores de UI se consumen vía `useTheme()` — `StyleSheet.create()` solo para geometría (dimensiones, padding, borderRadius). No existen colores hardcodeados en StyleSheet. Ver `design_system.md` §14 para las reglas de implementación y §13 para los tokens de identidad de activo (`assetCdt`, `assetEtf`).
* **Sistema de validación y formateo de inputs:** Implementado en `src/utils/format.ts` con 5 tipos: `currency-cop`, `currency-usd`, `integer`, `decimal`, `percent`. Validación estricta: bloquea letras, previene ceros a la izquierda, limita decimales apropiadamente. Formato automático mientras el usuario escribe. Componente `InputField` soporta prop `inputType` para aplicar el tipo correcto. Implementado en login, add-cdt, add-etf y las 9 calculadoras (~50 campos totales).
* **Parsing robusto de monedas:** `parseFormattedInput()` detecta automáticamente formato español (COP: "6.500.000" → 6500000) vs inglés (USD: "6,500.50" → 6500.50). Heurística: cuenta puntos y comas para determinar cuál es separador de miles y cuál es separador decimal. Previene errores de conversión en resúmenes y cálculos.
* **Consistencia de símbolos monetarios:** Formato universal aplicado en toda la app. COP: `$ 6.500.000 COP`. USD: `USD 1,666.67`. TRM: `$ 3.900 COP/USD`. Precio promedio: `USD 71.53 / acción`. Prefijos visuales "$" agregados en campos Monto (CDT), Total invertido (ETF) y TRM (ETF).
* **Terminología precisa:** "TER — Costo anual del ETF" (antes decía "fondo"). "Acciones" en lugar de "Fracciones" (ETFs).
* **Placeholders mejorados:** Token `textPlaceholder` (más tenue que `textSecondary`) aplicado a nivel general. Detección automática de valores numéricos para agregar prefijo "ej:" (regex en `InputField`, manual en formularios de portafolio y login).
* **Manejo de teclado en formularios:** Sistema de scroll automático preciso usando `measureLayout` + `scrollTo` con offset de -100px. El campo activo se posiciona en la parte superior visible. Implementado en TODOS los campos de texto: login (3 campos con refs), add-cdt (4 campos), add-etf (8 campos), 9 calculadoras (32 campos con `scrollToEnd`). Incluye `KeyboardAvoidingView` con `behavior="padding"` y `keyboardVerticalOffset={Platform.select({ ios: 0, android: 20 })}`.
* **Tipografía robusta:** Todos los títulos con fontSize >= 18 y fontWeight >= 600 tienen lineHeight adecuado (30-35% mayor que fontSize) para prevenir corte de descendentes y signos de puntuación. Regla aplicada en componente `ThemedText` (title: 48→58, subtitle: 32→40) y en estilos locales de 11 archivos.
* **Auto-retry transparente para errores JWT:** Sistema de reintento automático en `src/services/supabase-queries.ts` para error PGRST303 ("JWT issued at future"). Wrapper `withJwtRetry()` envuelve todas las queries. Max 2 intentos: primer intento → error → refresh sesión → segundo intento. Usuario nunca ve el error. Resuelve desincronización de reloj entre cliente y servidor.
* **Modals educativos (revelación progresiva):** Sistema de modals para conceptos complejos. Componente reutilizable `InfoModal` con scroll, backdrop dismiss y botón X. Implementados: Modal Perfil (explica scoring y bandas) y Modal Proyección (tablas de escenarios pesimista/optimista, supuestos de tasas CDT/ETF, disclaimer con color semántico). Touchables en chip de perfil y banner de proyección.
* **Proyección rediseñada (Portafolio):** Tres horizontes temporales (2A, 5A, 10A) con años futuros calculados dinámicamente. Layout 33%/67%. Formato compacto: "2A @ 2028 $ 17.1M – $ 20.7M". Rango pesimista-optimista usando tasa mezclada (CDTs ponderados + ETFs 5-11% USD). Toda la sección es touchable → modal educativo.

## 6. Componentes de Shell Implementados

Estos componentes forman la capa de navegación y presentación base sobre la que se construirán los módulos:

* **`PageHeader`** (`src/components/page-header.tsx`): cabecera compartida usada en los tres tabs. Props: `title`, `subtitle?` y `rightAction?: React.ReactNode`. Contiene el botón hamburguesa (≡) en la esquina superior derecha; `rightAction` se coloca debajo de ≡ en la misma columna. El tab Portafolio usa `rightAction` para el FAB "Agregar" que navega a `/portfolio/add`. Estado local de apertura del drawer.

* **`DrawerMenu`** (`src/components/drawer-menu.tsx`): panel lateral animado (slide desde la derecha, 82% del ancho de pantalla, backdrop semitransparente). Autocontenido — obtiene los datos del usuario via `useAuth()` internamente. Secciones:
  * Perfil: avatar con inicial, nombre visible (`user_metadata.full_name`) y email.
  * Configuración: switch de autenticación biométrica (visible, deshabilitado hasta implementar) + botón "Reevaluar perfil de riesgo" (Alert de confirmación → `resetRiskProfile` + `profileEvents.emitReset()`).
  * Legal: Términos y condiciones + Política de privacidad (placeholders).
  * Footer: versión de la app (`Constants.expoConfig.version`) + botón de cerrar sesión.
  * Cierre: botón X, toque en backdrop, botón atrás de Android (`onRequestClose`).
  * **Bug conocido y resuelto:** la animación de cierre se lanzaba en el montaje inicial, cancelando una apertura rápida del drawer. Fix: ref `isMounted` para saltarse el efecto en el primer render.

* **`DrawerMenu` + `PageHeader` en los tres tabs:** el `Modal` de React Native garantiza que el drawer flota sobre cualquier tab sin importar desde dónde se abra.

* **`RiskProfileFlow`** (`src/components/risk-profile-flow.tsx`): wizard de 5 pasos para perfilar al usuario. Barra de progreso (flex ratio), auto-avance 180ms tras selección. Pantalla de resultado: badge de perfil con color semántico, descripción, bandas CDT/ETF, botón "Comenzar". Props: `onComplete: (profile: RiskProfile) => Promise<void>`. No tiene SafeAreaView propio — el padre (`src/app/index.tsx`) gestiona el layout.

* **`profileEvents`** (`src/utils/profile-events.ts`): pub/sub mínimo (mismo patrón que `inbox-state.ts`) para notificar en tiempo real el reset del perfil. `emitReset()` lo llama el DrawerMenu; `subscribe(fn)` lo usa `PortfolioScreen`. Evita que el usuario tenga que salir y volver al tab después de reevaluar.

## 7. Decisiones de Integración

### A. Fuente de datos EOD para ETFs
* **Estado:** ✅ **IMPLEMENTADO** (Junio 2026)
* **Proveedor seleccionado:** EODHD (eodhd.com)
* **Razones:**
  - Tier gratuito: 20 requests/día + bonus 500 calls al registrarse (suficiente para uso personal)
  - Tier pagado accesible: $19.99/mes para histórico completo (30+ años) + 100,000 requests/día
  - SDK TypeScript oficial con zero dependencies, compatible con Deno/Supabase Edge Functions
  - 20,000+ ETFs soportados (NYSE, NASDAQ confirmados: VOO, VTI, VXUS, QQQ)
  - Datos ajustados por splits y dividendos incluidos (`adjusted_close`)
  - API simple (REST + JSON), sin necesidad de SDK complejo

* **Alternativas descartadas:**
  - **Alpha Vantage:** Tier gratuito muy limitado (25 req/día), tier premium caro ($49.99/mes mínimo)
  - **Polygon.io (Massive):** Pricing opaco, SDK incompatible con Deno
  - **Yahoo Finance:** API no oficial (zona gris legal), rate limiting agresivo, sin SLA
  - **Investing.com:** Cloudflare bloquea Edge Functions, requiere Puppeteer (incompatible)

* **Arquitectura implementada:**
  - **Supabase Edge Functions:**
    - `fetch-etf-prices`: Sincronización diaria (cron 00:30 AM Colombia). Trae precios EOD de los últimos 7 días para todos los tickers en `etf_positions`. Upsert en `eod_prices` por `(ticker, date)`.
    - `backfill-etf-historical`: Poblado inicial de histórico (10 años o desde inception del ETF). Verifica datos existentes antes de fetch para evitar reprocessing.
  - **Tabla PostgreSQL:**
    - `eod_prices`: Almacena precios OHLCV. Columnas: `ticker`, `date`, `open`, `high`, `low`, `close`, `adjusted_close`, `volume`, `currency`, `source`. Unique constraint en `(ticker, date)`.
  - **Queries en app:** `src/services/supabase-queries.ts` expone `getLatestEodPrice(ticker)`, `getEodPriceRange(ticker, from, to)`, `getEodPriceOnDate(ticker, date)`, `getLatestEodPrices(tickers[])`.
  - **Cron job:** Configurado en Supabase Integrations → Cron. Ejecuta `fetch-etf-prices` diariamente a las 00:30 AM Colombia.
  - **Secret configurado:** `EODHD_API_KEY` en Supabase Secrets.

* **Estado de datos actuales (Junio 2026):**
  - 753 registros históricos insertados (backfill inicial)
  - 3 ETFs activos: VTI (251 días), VOO (251 días), QQQ (251 días)
  - Aproximadamente 1 año de histórico con tier free

### B. Hurdle Rate — Integración completa
* **Estado:** ✅ **IMPLEMENTADO** (Junio 3, 2026)
* **Concepto:** Tasa mínima que un ETF debe superar para justificar el riesgo vs un CDT (sin riesgo, garantizado). Separa decisiones matemáticas de decisiones emocionales.
* **Fórmula (Ecuación de Fisher ajustada):**
  ```
  Hurdle Rate = CDT_rate + Devaluación_COP/USD - (Inflación_COP - Inflación_USD) - TER
  ```
* **Componentes:**
  - **Cálculo matemático:** `src/lib/hurdle-rate.ts`
    - `calculateDevaluation()`: Devaluación anualizada de COP vs USD usando histórico de TRM (últimos 5 años)
    - `calculatePortfolioHurdleRate()`: Aplica Ecuación de Fisher con inputs macro
  - **Datos de entrada:**
    - ✅ TRM histórica (5 años): `getTrmHistory()` → actualizada diariamente a las 00:30 AM
    - ✅ CDT tasa mercado (360 días): `getCdtMarketRates()` → actualizada diariamente
    - ✅ **Inflación COP:** World Bank API → actualizada mensualmente (día 1 de cada mes)
    - ✅ **Inflación USD:** World Bank API → actualizada mensualmente (día 1 de cada mes)
  - **UI implementada:**
    - **Portfolio (`src/app/portfolio/index.tsx`):**
      - Cálculo on-demand al cargar (líneas 166-187)
      - Mostrado en `ContextStrip` con valor destacado y modal educativo completo
      - Explicación: qué es, cómo se calcula (Fisher), para qué sirve, cuándo cambia
    - **Calculadora CDT vs ETF (`src/app/tools/cdt-vs-etf.tsx`):**
      - Carga automática del Hurdle Rate al abrir
      - **Veredicto matemático claro:** "Te conviene más [CDT/ETF] porque..."
      - 4 escenarios posibles con 4 variantes cada uno (16 mensajes totales)
      - Lenguaje coloquial: "plata", "ganancias", "capital", "rentabilidad"
      - Variaciones aleatorias por cálculo para naturalidad
      - Footer con link al modal educativo del Hurdle Rate
* **Frecuencia de actualización:**
  - Cambios significativos: cada ~45 días (cuando Banrep cambia tasa de política)
  - Cambios diarios: TRM y CDT rates
  - Cambios mensuales: Inflación COP y USD (datos World Bank)
* **Edge Functions:**
  - `fetch-inflation-data`: Actualización mensual (día 1) desde World Bank API
  - `backfill-inflation-historical`: Histórico 2014-2026 (22 registros iniciales)

* **Portafolio integrado:** Las tarjetas de ETF en `portfolio/index.tsx` muestran:
  - Valor invertido original
  - Valor actual (calculado con `adjusted_close` × shares × TRM)
  - Ganancia en porcentaje (color verde si positivo, naranja si negativo)
  - Proyecciones a 2, 5 y 10 años (CAGR 8% promedio)
  - Layout transpuesto: 3 columnas × 2 filas para mejor uso del espacio

* **Formulario ETF mejorado:** `add-etf.tsx` carga TRM automáticamente según fecha de compra seleccionada. Date picker integrado (react-native-calendars), fechas futuras bloqueadas, TRM informativa no editable.

### B. Fuente de tasas CDT, TRM y datos macroeconómicos
* **Estado:** ✅ **IMPLEMENTADO** (Junio 2026)
* **Fuentes de datos:**
  - **TRM (Tasa Representativa del Mercado COP/USD):** API pública datos.gov.co (Banco de la República). Datos diarios desde 1991. Endpoint: `32sa-8pi3.json`
  - **Tasas CDT promedio por plazo:** API pública datos.gov.co (Banco de la República). Datos granulares por banco y plazo (30, 60, 90, 120, 180, 360 días) desde 2018. Endpoint: `axk9-g2nh.json`. La Edge Function calcula promedio ponderado por monto para obtener tasa de mercado.
  - **Inflación COP anual:** ✅ World Bank API (IMF como fuente). Datos anuales consolidados desde 2014. Endpoint: `/v2/country/COL/indicator/FP.CPI.TOTL.ZG`. Gratis, sin autenticación. Dato actual: 6.61% (2024).
  - **Inflación USD anual:** ✅ World Bank API. Datos anuales consolidados desde 2014. Endpoint: `/v2/country/USA/indicator/FP.CPI.TOTL.ZG`. Gratis, sin autenticación. Dato actual: 2.95% (2024).
  - **Tasa de política monetaria Banrep:** Fallback manual (11.25% vigente). No hay API pública disponible. Actualización manual 4-8 veces/año cuando JDBR anuncie cambios.

* **Arquitectura implementada:**
  - **Supabase Edge Functions:**
    - `fetch-banrep-data`: Sincronización diaria (cron 00:30 AM Colombia = 05:30 UTC). Trae TRM (últimos 7 días) y CDT (últimas 2 semanas).
    - `backfill-historical-data`: Poblado inicial de histórico (TRM 10 años, CDT 8 años). Optimizado para detectar datos existentes y solo insertar faltantes.
    - `fetch-inflation-data`: ✅ Sincronización mensual (día 1 de cada mes, 5 AM UTC). Trae inflación COP y USD desde World Bank API. Inserta valores anuales más recientes en `macro_rates`.
    - `backfill-inflation-historical`: ✅ Poblado inicial de inflación (2014-2026, 22 registros: 11 COP + 11 USD). Ejecutado una vez al deploy.
  - **Tablas PostgreSQL:**
    - `macro_rates`: Almacena TRM, inflación y tasa política. Columnas: `type`, `value`, `effective_date`, `source`. Unique constraint en `(type, effective_date)`.
    - `cdt_rates`: Almacena tasas CDT por plazo. Columnas: `bank` (NULL para promedio de mercado), `term_days`, `rate`, `effective_date`, `source`. Unique constraint en `(bank, term_days, effective_date)`.
  - **Queries en app:** `src/services/supabase-queries.ts` expone `getMacroContext()` (TRM, policy rate, inflación más recientes) y `getCdtMarketRates(termDays?)` (tasas CDT por plazo).
  - **Cron jobs:** Configurados en Supabase Integrations → Cron. Tipo: "Supabase Edge Function" (invocación interna eficiente):
    - `fetch-banrep-data`: diario 00:30 AM Colombia (05:30 UTC)
    - `fetch-etf-prices`: diario 00:30 AM Colombia (05:30 UTC)
    - `fetch-inflation-data`: ✅ mensual día 1, 05:00 AM UTC (12 AM Colombia)

* **Estado de datos actuales (Junio 4, 2026):**
  - TRM: 2,468 registros (2016-01-05 → 2026-06-02)
  - CDT: 6,138 promedios de mercado (2018-01-31 → 2026-05-29)
  - Inflación COP: 11 registros anuales (2014-2024), último valor: 6.61% (2024)
  - Inflación USD: 11 registros anuales (2014-2024), último valor: 2.95% (2024)

* **Portafolio integrado:** El ContextStrip en `portfolio/index.tsx` muestra TRM, tasa Banrep, inflación y tasa CDT mercado (360 días) con datos reales traídos desde Supabase. Fallbacks a valores conocidos si falla query. Modales educativos implementados para cada indicador explicando qué es, para qué sirve y de dónde vienen los datos.

### D. Watchlist inicial de ETFs
* **Estado:** Vacía. Harvey no tiene lista predefinida.
* **Fase 1:** Claude sugerirá tickers representativos (ej: VOO, VTI, VXUS) como semilla funcional.
* **Futuro:** Algoritmo de matching entre perfil de Harvey y universo de ETFs disponibles.

## 8. Loop de Inteligencia del Buzón

El Buzón no es un sistema de notificaciones push — es un motor de análisis contextual. El flujo completo:

```
Usuario registra posición (CDT o ETF)
        ↓
SQLite local (inmediato) → Supabase (async write-through)
        ↓
Edge Functions periódicas: Banrep (tasas, inflación) + SFC (TRM) + EOD (precios ETFs)
→ almacenan en Supabase Postgres
        ↓
Motor de análisis: cruza posiciones del usuario + datos de mercado
(condiciones: CDT próximo a vencer, ETF en drawdown >25%, Banrep mueve tasas,
 distribución fuera de bandas, Hurdle Rate cambia, CAGR supera/cae umbral)
        ↓
Condición cumplida → genera InboxEvent → Buzón
```

Ningún paso de este loop requiere licencia financiera. La app provee **análisis e información contextual**, no intermediación. El usuario toma todas las decisiones.

### Modelo de registro de activos (Fase 1)
El usuario **registra posiciones que ya tiene en otro lugar** (banco, broker extranjero, Trii, Hapi). La app no ejecuta compras ni custodia activos. Es el mismo modelo de Empower / Monarch Money en EE.UU.

- **CDT:** banco, monto COP, tasa EA, fecha inicio, plazo en días, capitalización. La app calcula vencimiento y rendimiento neto (con retefuente automática).
- **ETF:** ticker (texto libre), nombre del fondo, moneda de entrada (COP o USD), monto invertido (COP con TRM al registrar, o USD total/precio por acción), acciones (opcional — siempre editable), TER. Columnas en SQLite: `total_invested_cop`, `trm_at_purchase`, `total_invested_usd` (migración 2). La app mostrará precio EOD del backend cuando el backend esté disponible.

En Fase 2, **Open Finance (Decreto 0368/2026)** permitirá importar CDTs directamente del banco del usuario con consentimiento OAuth, eliminando la entrada manual.

## 9. Marco Legal — Datos del Usuario (Colombia)

La ley aplicable es la **Ley 1581 de 2012** (protección de datos personales), supervisada por la **SIC**. Los datos financieros califican como **datos sensibles** — estándar más alto de protección.

### Requerimientos antes de lanzar a terceros (no aplica para uso personal de Harvey)

| Elemento | Descripción | Estado |
|----------|-------------|--------|
| Política de tratamiento de datos | Qué se recopila, para qué, por cuánto tiempo, con quién se comparte | Placeholder en DrawerMenu — pendiente redactar |
| Aviso de privacidad | Versión corta en pantalla de registro | Pendiente |
| Autorización expresa | Checkbox explícito en signup — no puede ser implícito | Pendiente |
| Disclaimer de no asesoría | "Este análisis es educativo, no constituye asesoría financiera" | Ya implementado en cada evento del Buzón |
| Inscripción RNBD | Registro de base de datos ante SIC | Aplica cuando haya usuarios distintos a Harvey |
| Seguridad técnica | Cifrado en tránsito y en reposo | Cubierto por Supabase (SOC 2) |

### Declaración de finalidad del tratamiento
Los datos del usuario (posiciones, perfil de riesgo, historial de interacción) se usan exclusivamente para:
1. Calcular análisis estadístico del portafolio del propio usuario
2. Generar eventos educativos personalizados en el Buzón
3. Proyectar trayectorias a futuro basadas en parámetros declarados por el usuario

No se comparten con terceros para fines comerciales ni publicitarios.

## 10. Motor de Eventos del Buzón (Backend)

**Estado:** ✅ Implementado junio 4, 2026

El motor de eventos es el **sistema nervioso** de Magic Invest — conecta datos matemáticos con educación contextual en el momento oportuno.

### Edge Function: `generate-inbox-events`
- **Frecuencia:** Semanal (lunes 6 AM Colombia)
- **Lógica:** Evaluación determinística de condiciones matemáticas contra datos reales
- **Output:** Inserta eventos en tabla `inbox_events` cuando se cumplen triggers

### Triggers Implementados

#### 1. CDT próximo a vencer (30/60/90 días)
**Condición:** `end_date - today IN [30, 60, 90] días`
**Metadata incluida:**
- Valor al vencimiento (capital + rendimientos - retefuente)
- Hurdle Rate vigente
- Tasa de mercado actual vs tasa original
- Distribución actual CDT/ETF vs bandas configuradas

#### 2. Drawdown estructural ETF (>25%)
**Condición:** `(current_price - peak_price) / peak_price < -0.25`
**Cálculo:**
- Identifica pico histórico en últimos 3 años
- Cuenta episodios similares en historial del ETF
- Promedio de días de recuperación histórica
**Metadata incluida:**
- Precio actual vs precio en pico
- Fecha del pico
- Número de episodios comparables
- Tiempo promedio de recuperación

#### 3. Cambio significativo tasa Banrep (≥50 bps)
**Condición:** `|current_rate - previous_rate| >= 0.5`
**Metadata incluida:**
- Tasa anterior y nueva
- Cambio en puntos básicos
- Nuevo Hurdle Rate calculado
- Impacto en ETFs en cartera (si existen)

#### 4. Bandas de asignación fuera de rango
**Condición:** `cdt_pct < band.cdt_min OR cdt_pct > band.cdt_max OR etf_pct > band.etf_max`
**Metadata incluida:**
- Distribución actual (% CDT / % ETF)
- Bandas configuradas
- Exceso en puntos porcentuales
- Exceso en valor absoluto COP

#### 5. ETF cruza Hurdle Rate
**Condición:** `CAGR_5y > hurdle_rate` (anteriormente no lo superaba)
**Estado:** Pendiente — requiere tabla `etf_watchlist`

### Datos Consumidos
- `cdt_positions` — posiciones CDT activas
- `etf_positions` — posiciones ETF activas
- `eod_prices` — precios históricos para cálculo drawdown
- `macro_rates` — TRM, inflación, tasa Banrep para Hurdle Rate
- `cdt_rates` — tasas de mercado para comparación
- `user_config` — bandas configuradas (default: CDT 50-70%, ETF 30-50%)

### Prevención de Duplicados
- Query verifica eventos similares en últimos 7 días
- No inserta si existe evento idéntico (mismo tipo + mismo asset_ref)
- Permite re-trigger después de 7 días si condición persiste

### Queries App (`supabase-queries.ts`)
```typescript
getInboxEvents()          // Todos los eventos no eliminados, ordenados
markEventAsRead(id)       // Marca read_at
markEventAsUnread(id)     // Limpia read_at
dismissEvent(id)          // Soft delete (dismissed_at)
```

### Formato de Mensajes: Markdown Enriquecido
**Decisión:** Mensajes se almacenan en formato Markdown en campo `body` (tipo TEXT en BD).

**Ventajas:**
- **Portabilidad:** Mismo contenido funciona en app, email, web sin reescribir
- **Legibilidad:** Texto plano es legible incluso sin renderizado
- **Extensibilidad:** Agregar tablas, listas, énfasis sin cambiar estructura de BD
- **Email-ready:** Conversión a HTML + CSS del design system para emails futuros

**Elementos Markdown usados:**
- **Tablas** — comparaciones lado a lado (| Indicador | Valor |)
- **Blockquotes** — información destacada con borde de color (> texto)
- **Headers** — jerarquía visual (## Sección, ### Subsección)
- **Bold/Emphasis** — **texto importante** para números y conceptos clave
- **Listas** — bullets con opciones y pasos
- **Separadores** — `---` para dividir secciones conceptuales
- **Emojis inline** — 💰 📊 🔼 🔽 ⚠️ ✅ (semántica visual rápida)

**Librería:** `react-native-markdown-display` v7.0.2
- Soporte CommonMark + extensiones (tablas, typographer)
- Estilos personalizados siguiendo design system (colores theme-aware)
- Renderizado nativo (no WebView)

### UI Actualizada
- `/inbox/index.tsx` — lista de eventos desde BD (reemplaza mock data)
- `/inbox/[id].tsx` — detalle con renderizado Markdown enriquecido
  - Estilos de tabla (bordes, celdas, headers con fondo)
  - Blockquotes con borde de color según tipo de mensaje
  - Tipografía consistente con design system
- Swipe actions funcionales (eliminar / marcar no leído)
- Estado vacío educativo cuando no hay eventos
- Badges dinámicos en Portafolio (cdtUnreadMap, etfUnreadMap)

### Próxima Iteración
- Implementar trigger #5 cuando exista tabla `etf_watchlist`
- Sistema de prioridades (alto/medio/bajo) según urgencia del evento
- Conversión Markdown → HTML + CSS para emails (cuando se implemente notificaciones)

---

## 11. Reglas Inquebrantables de UI/UX (Bienestar Cognitivo)
* **Notificaciones:** Cero alertas push. Toda información asíncrona vive en el Buzón. El usuario decide cuándo consumir.
* **Badges:** Cero badges en el ícono de la app. Indicadores silenciosos dentro de la app (como "eventos relacionados" en el detalle de un activo) son aceptables porque son contextuales, no interruptivos.
* **Jerarquía cromática anti-ansiedad:**
  * **Datos del presente** (saldos, rentabilidades EOD, tablas de posiciones): neutralidad total. Sin rojo/verde semántico de mercado.
  * **Datos estructurales y proyecciones** (bandas probabilísticas, calidad estadística, eventos del Buzón): color **expresivo** según tokens de `design_system.md`. El color es educativo y guía hacia patrones de largo plazo.
* **Revelación progresiva de complejidad:** la información densa está disponible pero plegada por defecto. El usuario nuevo ve lo esencial; la profundidad se abre cuando la pide. El sistema cultiva curiosidad mediante eventos educativos del Buzón en el momento oportuno, no abrumando desde el inicio.
* **Foco en el proceso:** el elemento gráfico de mayor peso visual debe ser la **proyección probabilística a futuro**.
* **Educación contextual:** todo término técnico (CAGR, Sortino, MaxDD, Hurdle Rate, retefuente, devaluación, TER, etc.) debe poder consultarse vía **tooltip** + **hipervínculo a pantalla de detalle** con ejemplos.
* **Ritmo de uso semanal:** la pantalla principal centra: (1) estado del Buzón, (2) proyección probabilística agregada, (3) salud estructural resumida. Los saldos son consultables pero no protagonistas.
