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

## 4. Stack Tecnológico Base
* **Framework:** React Native con **Expo (managed workflow)**. Core limpio. Cada dependencia externa debe justificarse para evitar inflar la aplicación.
* **Lenguaje:** TypeScript estricto. Sin `any` salvo en boundaries justificados.
* **Persistencia local-first:** SQLite en el dispositivo vía `expo-sqlite`. Es la fuente de verdad para uso offline. **Toda lectura de UI golpea SQLite, nunca la red.**
* **Backend (día uno, no opcional):** **Supabase managed** (Postgres + Auth). No es una capa de sync tardía — es infraestructura activa desde el inicio porque los jobs programados de Banrep y las Edge Functions viven aquí.
  * *Justificación de Postgres:* tipo `NUMERIC` con precisión arbitraria para montos financieros, window functions nativas para CAGR, Sortino, MaxDD directamente en SQL, JSONB para configuraciones flexibles, Row Level Security para Fase 2.
* **Jobs de datos macroeconómicos:** Supabase Edge Functions con cron consultan periódicamente la API pública del Banco de la República. Los resultados se almacenan en Postgres; la app lee desde SQLite local sincronizado. La app nunca llama directamente a Banrep (CORS, disponibilidad, caché).
* **Autenticación:** Supabase Auth con **email/password**. PKCE flow habilitado. Deep linking `magicinvest://auth/callback` para confirmación de cuenta desde email. Capa biométrica (`expo-local-authentication`) planificada como gate local sobre la sesión almacenada — no reemplaza el login, lo complementa.
* **Perfil de usuario:** nombre capturado en signup como `user_metadata.full_name` (Supabase Auth). Campos adicionales (documento, ciudad) en formulario de perfil post-signup — pendiente implementar.
* **Iconografía:** `@expo/vector-icons` (Ionicons) instalado. Íconos monocromáticos conforme al sistema de diseño.
* **Estado en cliente:** React Context + hooks. No introducir Redux/Zustand hasta que el scope lo justifique.

## 5. Componentes de Shell Implementados

Estos componentes forman la capa de navegación y presentación base sobre la que se construirán los módulos:

* **`PageHeader`** (`src/components/page-header.tsx`): cabecera compartida usada en los tres tabs. Props: `title`, `subtitle?` y `rightAction?: React.ReactNode`. Contiene el botón hamburguesa (≡) en la esquina superior derecha; `rightAction` se coloca debajo de ≡ en la misma columna. El tab Portafolio usa `rightAction` para el FAB "Agregar" que navega a `/portfolio/add`. Estado local de apertura del drawer.

* **`DrawerMenu`** (`src/components/drawer-menu.tsx`): panel lateral animado (slide desde la derecha, 82% del ancho de pantalla, backdrop semitransparente). Autocontenido — obtiene los datos del usuario via `useAuth()` y `useSQLiteContext()` internamente. Secciones:
  * Perfil: avatar con inicial, nombre visible (`user_metadata.full_name`) y email.
  * Configuración: switch de autenticación biométrica (visible, deshabilitado hasta implementar) + botón "Reevaluar perfil de riesgo" (Alert de confirmación → `resetRiskProfile` + `profileEvents.emitReset()`).
  * Legal: Términos y condiciones + Política de privacidad (placeholders).
  * Footer: versión de la app (`Constants.expoConfig.version`) + botón de cerrar sesión.
  * Cierre: botón X, toque en backdrop, botón atrás de Android (`onRequestClose`).
  * **Bug conocido y resuelto:** la animación de cierre se lanzaba en el montaje inicial, cancelando una apertura rápida del drawer. Fix: ref `isMounted` para saltarse el efecto en el primer render.

* **`DrawerMenu` + `PageHeader` en los tres tabs:** el `Modal` de React Native garantiza que el drawer flota sobre cualquier tab sin importar desde dónde se abra.

* **`RiskProfileFlow`** (`src/components/risk-profile-flow.tsx`): wizard de 5 pasos para perfilar al usuario. Barra de progreso (flex ratio), auto-avance 180ms tras selección. Pantalla de resultado: badge de perfil con color semántico, descripción, bandas CDT/ETF, botón "Comenzar". Props: `onComplete: (profile: RiskProfile) => Promise<void>`. No tiene SafeAreaView propio — el padre (`src/app/index.tsx`) gestiona el layout.

* **`profileEvents`** (`src/utils/profile-events.ts`): pub/sub mínimo (mismo patrón que `inbox-state.ts`) para notificar en tiempo real el reset del perfil. `emitReset()` lo llama el DrawerMenu; `subscribe(fn)` lo usa `PortfolioScreen`. Evita que el usuario tenga que salir y volver al tab después de reevaluar.

## 6. Decisiones de Integración

### A. Fuente de datos EOD para ETFs
* **Estado:** No definida. Candidatos: Alpha Vantage, EOD Historical Data, Yahoo Finance, Polygon.io.
* **Criterios:** Rate limits, cobertura de ETFs internacionales, datos históricos 5-10 años, costo tier gratuito/básico, facilidad de integración.
* **Proceso:** Harvey y Claude explorarán durante implementación del módulo Portafolio.

### B. Fuente de tasas CDT y tasa de política monetaria
* **Estado:** Parcialmente resuelta. El **Banco de la República** publica vía API pública tanto la tasa de política monetaria como las tasas de captación CDT promedio por plazo. Esto podría resolver con una sola fuente los parámetros del Hurdle Rate (tasa libre de riesgo local) y el trigger macroeconómico del Buzón.
* **Arquitectura decidida:** Supabase Edge Function con cron → consulta API Banrep → almacena histórico en Postgres → app sincroniza.
* **Pendiente:** Investigar y validar los endpoints específicos de la API de Banrep antes de implementar. Tarea técnica pendiente registrada.
* **Bancos individuales:** Si la API de Banrep cubre tasas promedio por plazo, los bancos individuales (Bancolombia, Bogotá, Davivienda) podrían ser un refinamiento posterior o entrada manual.

### C. Parámetros macroeconómicos (Hurdle Rate)
* **Devaluación COP/USD:** Fuente por definir. Candidatos: TRM histórica del Banco de la República, IMF.
* **Inflación local:** Fuente por definir. Candidatos: DANE mensual, proyecciones anuales.
* **Proceso:** Winston puede asistir en análisis de fuentes. Si la API de Banrep cubre TRM, puede ser la misma fuente.

### D. Watchlist inicial de ETFs
* **Estado:** Vacía. Harvey no tiene lista predefinida.
* **Fase 1:** Claude sugerirá tickers representativos (ej: VOO, VTI, VXUS) como semilla funcional.
* **Futuro:** Algoritmo de matching entre perfil de Harvey y universo de ETFs disponibles.

## 6. Loop de Inteligencia del Buzón

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

## 7. Marco Legal — Datos del Usuario (Colombia)

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

## 8. Reglas Inquebrantables de UI/UX (Bienestar Cognitivo)
* **Notificaciones:** Cero alertas push. Toda información asíncrona vive en el Buzón. El usuario decide cuándo consumir.
* **Badges:** Cero badges en el ícono de la app. Indicadores silenciosos dentro de la app (como "eventos relacionados" en el detalle de un activo) son aceptables porque son contextuales, no interruptivos.
* **Jerarquía cromática anti-ansiedad:**
  * **Datos del presente** (saldos, rentabilidades EOD, tablas de posiciones): neutralidad total. Sin rojo/verde semántico de mercado.
  * **Datos estructurales y proyecciones** (bandas probabilísticas, calidad estadística, eventos del Buzón): color **expresivo** según tokens de `design_system.md`. El color es educativo y guía hacia patrones de largo plazo.
* **Revelación progresiva de complejidad:** la información densa está disponible pero plegada por defecto. El usuario nuevo ve lo esencial; la profundidad se abre cuando la pide. El sistema cultiva curiosidad mediante eventos educativos del Buzón en el momento oportuno, no abrumando desde el inicio.
* **Foco en el proceso:** el elemento gráfico de mayor peso visual debe ser la **proyección probabilística a futuro**.
* **Educación contextual:** todo término técnico (CAGR, Sortino, MaxDD, Hurdle Rate, retefuente, devaluación, TER, etc.) debe poder consultarse vía **tooltip** + **hipervínculo a pantalla de detalle** con ejemplos.
* **Ritmo de uso semanal:** la pantalla principal centra: (1) estado del Buzón, (2) proyección probabilística agregada, (3) salud estructural resumida. Los saldos son consultables pero no protagonistas.
