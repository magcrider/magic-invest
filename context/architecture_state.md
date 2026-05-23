# Architecture State & Philosophy - Magic Invest

## 1. Visión Global y Dinámica de Trabajo
Este proyecto es una colaboración a tres bandas:
* **Harvey (Usuario/Arquitecto):** Define el rumbo, cuestiona la lógica y toma las decisiones de negocio.
* **Winston (IA Consultora/Filtro):** Evalúa la viabilidad, cuestiona sesgos, prioriza el bienestar cognitivo del usuario y diseña la estructura teórica.
* **Claude Code (IA Ejecutora):** Encargado de la implementación en código del repositorio, respetando estrictamente las directrices documentadas.

El proyecto consta de dos fases. **Estamos exclusivamente en la Fase 1:**
* **Fase 1 (Corto Plazo):** MVP en React Native para uso personal de Harvey. Objetivo: Entender cómo consumir datos de mercado, aplicar parámetros estadísticos, aislar el ruido financiero y construir un sistema que priorice el crecimiento a largo plazo y la paz mental.
* **Fase 2 (Largo Plazo - NO IMPLEMENTAR AÚN):** Escalabilidad mediante servidores MCP y agentes de IA para perfilar a terceros y ofrecer recomendaciones de inversión.

## 2. Restricciones de Dominio Financiero (Filtro Anti-Ruido)
Para proteger la atención de Harvey y evitar el hiperconsumismo financiero, la Fase 1 tiene fronteras estrictas sobre qué activos se procesan:
* **Aprobados:**
  * **CDTs (Certificados de Depósito a Término):** Actúan como la tasa libre de riesgo.
  * **ETFs Indexados:** Actúan como el motor de crecimiento a largo plazo, eliminando el riesgo de empresas individuales.
* **Estrictamente Prohibidos en Fase 1:** Acciones individuales (exceso de ruido corporativo), Criptomonedas (especulación pura) y Fondos de Gestión Activa (cajas negras inmedibles).

## 3. Estructura de Módulos e Ingestión de Datos
* **Módulo de Portafolio (Realidad):**
  * *ETFs:* Se alimentan de APIs que proveen datos de cierre diario (End-of-Day / EOD). **Prohibido:** WebSockets, live tickers o actualizaciones en tiempo real al segundo.
  * *CDTs:* Registro parametrizado donde se definen las reglas de los bancos colombianos (Bancolombia, Banco de Bogotá, Davivienda, etc.) incluyendo capitalización, retención en la fuente (retefuente) y tasas.
* **Módulo de Herramientas (Simulación):** Calculadoras estáticas que corren de manera local. Permiten a Harvey proyectar interés compuesto y simular inversiones sin afectar el portafolio real.

## 4. Stack Tecnológico Base
* **Framework:** React Native. Debe mantenerse un core limpio. Cada dependencia externa añadida debe justificarse para evitar inflar la aplicación.
* **Gestión de Estado:** Almacenamiento local persistente (ej. AsyncStorage o SQLite local). Se prioriza la soberanía de los datos de Harvey.

## 5. Reglas Inquebrantables de UI/UX (Bienestar Cognitivo)
* **Notificaciones:** Cero alertas Push. Cualquier información sobre coyunturas de mercado será completamente asíncrona a través de un "Buzón in-app". El usuario decide cuándo consumir la información.
* **Jerarquía Visual Anti-Ansiedad:** Los saldos actuales y rentabilidades se muestran siempre, pero de forma neutral. **Prohibido:** Usar colores semánticos de mercado (rojo para pérdidas, verde brillante para ganancias) que disparen aversión a la pérdida.
* **Foco en el Proceso:** El elemento gráfico de mayor peso e impacto visual en cualquier pantalla debe ser la proyección probabilística a futuro, educando al cerebro a ignorar la volatilidad a corto plazo.