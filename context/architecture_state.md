# Architecture State - Magic Invest (Fase 1)

## 1. Stack Tecnológico General
* **Framework:** React Native (Core limpio, minimizando el uso de librerías externas para mantener el control intelectual del código base).
* **Gestión de Estado:** Almacenamiento local persistente. Prioridad absoluta a la privacidad y a la independencia de servidores centralizados en esta fase.

## 2. Estructura de Módulos e Ingestión de Datos
* **Módulo de Portafolio (Realidad):** 
  * *ETFs:* Integración con APIs que provean exclusivamente datos de cierre diario (End-of-Day / EOD). Sin flujos de datos en tiempo real (live tickers).
  * *CDTs:* Registro parametrizado donde se definen las reglas específicas del banco emisor (tasa, retenciones, capitalización) para reflejar el estado real de la inversión.
* **Módulo de Herramientas (Simulación):** Calculadoras estáticas e independientes que corren localmente para proyectar interés compuesto, comparar escenarios de riesgo y evaluar posibles inversiones antes de ejecutarlas.

## 3. Reglas de Interfaz y Bienestar Cognitivo
* **Notificaciones:** Quedan estrictamente prohibidas las alertas Push. Toda comunicación de coyunturas de mercado será asíncrona mediante un "Buzón in-app".
* **Jerarquía Visual de Largo Plazo:** Los saldos actuales y rentabilidades se mostrarán en tipografía estándar y colores neutros (queda estrictamente prohibido el uso de rojo para pérdidas o verde para ganancias). El elemento central y de mayor impacto visual será la proyección probabilística a futuro de la inversión.