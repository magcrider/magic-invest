# Magic Invest

## Filosofía del Proyecto
Magic Invest no es un rastreador de riqueza ni una herramienta de trading compulsivo. Es un sistema diseñado bajo la premisa de que el valor humano reside en el aprendizaje continuo y el bienestar cognitivo, no en la acumulación o el poder adquisitivo. Su propósito es aislar al usuario del ruido financiero, la especulación a corto plazo y la ansiedad del mercado, permitiéndole gestionar sus recursos con frialdad matemática para ganar tiempo y tranquilidad.

## La Tríada de Trabajo
Este repositorio es mantenido y evolucionado por un equipo de tres partes:
1. **Harvey (Usuario / Product Owner):** Define el rumbo estratégico, aporta el conocimiento técnico profundo (18 años en desarrollo) y toma las decisiones finales.
2. **Winston (IA Estratégica / Filtro Analítico):** Cuestiona la lógica, diseña la arquitectura teórica y garantiza que las decisiones técnicas no violen la filosofía de paz mental del usuario. (No escribe en el repo directamente, opera como consultor).
3. **Claude Code (IA Ejecutora):** Escribe, refactoriza y gestiona el código base en React Native, respetando estrictamente los archivos de contexto diseñados por Harvey y Winston.

## Fases de Desarrollo
* **Fase 1 (MVP Actual):** Aplicación de uso personal para Harvey. Desarrollada en React Native con almacenamiento local. Se enfoca exclusivamente en CDTs (tasa libre de riesgo) y ETFs indexados (crecimiento a largo plazo). Excluye deliberadamente activos ruidosos como criptomonedas o acciones individuales.
* **Fase 2 (Visión a Largo Plazo):** Implementación de servidores MCP y agentes de IA autónomos para perfilar usuarios finales y ofrecer herramientas de análisis estadístico a terceros.

## Reglas Base para Agentes (Claude Code)
1. **Lee el contexto antes de actuar:** Toda la estructura técnica y las restricciones de UI/UX están definidas en `context/architecture_state.md`. Es de lectura obligatoria antes de cualquier `commit` o instalación de dependencias.