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
  * *ETFs:* alimentados desde APIs de datos de cierre diario (End-of-Day / EOD). **Auto-fetch al abrir la app, con dedupe diaria** — si ya se descargaron los datos del día, no se vuelve a llamar a la API. **Prohibido:** WebSockets, live tickers, actualizaciones intradía.
  * *CDTs:* registro parametrizado con reglas de bancos colombianos (Bancolombia, Banco de Bogotá, Davivienda, etc.) incluyendo capitalización, retención en la fuente (retefuente) y tasas vigentes.
* **Herramientas (Simulación):** calculadoras estáticas que corren de manera local. Proyección de interés compuesto, simulación de aportes, comparadores. No tocan el portafolio real.
* **Buzón (Asíncrono):** receptor de eventos generados por el propio sistema:
  * Cambios materiales en tasas de bancos configurados.
  * Oportunidades detectadas algorítmicamente (ver `investment_thesis.md` §4).
  * Actualizaciones de datos EOD relevantes.
  * El usuario decide cuándo consumir el Buzón. **Cero notificaciones push**, cero badges parpadeantes.
* **Asistente IA (Fase 2 — NO IMPLEMENTAR AÚN):** chat con acceso contextual al portafolio del usuario, capaz de resolver dudas conceptuales (los tooltips de Fase 1 son su precursor) y razonar sobre el estado real del portafolio.

## 4. Stack Tecnológico Base
* **Framework:** React Native con **Expo (managed workflow)**. Core limpio. Cada dependencia externa debe justificarse para evitar inflar la aplicación.
* **Lenguaje:** TypeScript estricto. Sin `any` salvo en boundaries justificados.
* **Persistencia local-first:** SQLite en el dispositivo vía `expo-sqlite`. Es la fuente de verdad para uso offline. **Toda lectura de UI golpea SQLite, nunca la red.**
* **Sincronización remota:** **Supabase managed** (Postgres + Auth) como respaldo y habilitador de multi-dispositivo a futuro.
  * *Justificación de Postgres sobre MySQL:* tipo `NUMERIC` con precisión arbitraria para montos financieros, window functions nativas para cálculos estadísticos (CAGR, Sortino, MaxDD) directamente en SQL, JSONB para configuraciones flexibles, Row Level Security para Fase 2. Supabase es Postgres-nativo y su tier gratuito cubre Fase 1.
* **Autenticación:** Supabase Auth con magic link por email (suficiente para Fase 1 personal).
* **Estado en cliente:** React Context + hooks. No introducir Redux/Zustand hasta que el scope lo justifique.

## 5. Decisiones de Integración Pendientes (Resolución Iterativa)
Estas decisiones técnicas se resolverán colaborativamente durante la implementación, utilizando agentes de IA, investigación y pruebas iterativas:

### A. Fuente de datos EOD para ETFs
* **Estado actual:** No definida. Opciones candidatas incluyen Alpha Vantage, EOD Historical Data, Yahoo Finance, Polygon.io.
* **Criterios de evaluación:** Rate limits, cobertura de ETFs internacionales, calidad de datos históricos (5-10 años), costo del tier gratuito/básico, facilidad de integración.
* **Proceso:** Harvey y Claude explorarán opciones durante implementación del módulo Portafolio. Winston puede aportar análisis de tradeoffs.

### B. Fuente de tasas CDT y parámetros de bancos
* **Estado actual:** No definida. Entrada manual vs API/scraping se determinará durante implementación.
* **Bancos objetivo:** Bancolombia, Banco de Bogotá, Davivienda (mínimo inicial). Expansión según disponibilidad de datos.
* **Plazos:** Por definir (candidatos: 30d, 90d, 180d, 360d).
* **Proceso:** Usar capacidades de IA (agentes, scraping, análisis de fuentes) para encontrar la solución más mantenible.

### C. Parámetros macroeconómicos (Hurdle Rate)
* **Devaluación COP/USD:** Fuente por definir. Candidatos: Banco de la República, TRM histórica, IMF.
* **Inflación local:** Fuente por definir. Candidatos: DANE mensual, proyecciones anuales.
* **Proceso:** Winston puede asistir en análisis de fuentes. Claude puede crear agentes para investigar opciones y recomendar.

### D. Watchlist inicial de ETFs
* **Estado actual:** Vacía. Harvey no tiene lista predefinida.
* **Fase 1:** Claude sugerirá tickers representativos (ej: VOO, VTI, VXUS) como semilla funcional.
* **Futuro:** Desarrollo de algoritmo de matching entre perfil de inversionista de Harvey y universo de ETFs disponibles.

## 6. Reglas Inquebrantables de UI/UX (Bienestar Cognitivo)
* **Notificaciones:** Cero alertas push. Toda información asíncrona vive en el Buzón. El usuario decide cuándo consumir.
* **Jerarquía cromática anti-ansiedad:**
  * **Datos del presente** (saldos, rentabilidades EOD, tablas de posiciones): neutralidad total. Sin rojo/verde semántico de mercado. El usuario no debe sentir nada al ver una cifra del día.
  * **Datos estructurales y proyecciones** (bandas probabilísticas, calidad estadística de un activo, oportunidades del Buzón): usan color **expresivo** según los tokens de `design_system.md`. El color aquí es educativo y guía la atención hacia patrones de largo plazo, nunca reactivo al cierre del día. Deliberadamente se evita rojo/verde de mercado para no activar aversión a la pérdida ni euforia.
* **Foco en el proceso:** El elemento gráfico de mayor peso visual en cualquier pantalla debe ser la **proyección probabilística a futuro**, educando al cerebro a ignorar la volatilidad a corto plazo.
* **Educación contextual:** Todo término técnico (CAGR, Sortino, MaxDD, Hurdle Rate, retefuente, devaluación, etc.) debe poder consultarse vía **tooltip** con definición breve + **hipervínculo a pantalla de detalle** con ejemplos. En Fase 2, el Asistente IA profundiza este rol.
* **Ritmo de uso semanal:** Harvey usa la app **semanalmente**, no a diario. La pantalla principal **no** centra saldos prominentes; centra:
  1. Estado del Buzón (eventos pendientes de revisar).
  2. Proyección probabilística agregada del portafolio.
  3. Salud estructural resumida del portafolio (calidad de las métricas, no porcentajes del día).
  Los saldos son consultables pero no protagonistas.
