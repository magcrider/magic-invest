# Magic Invest

## Filosofía del Proyecto
Magic Invest es una aplicación de finanzas, pero construida bajo una premisa contraria al estándar del sector: el valor no reside en la reactividad al mercado ni en la acumulación, sino en la **comprensión estructural del funcionamiento financiero** y en el **bienestar cognitivo** del usuario. Su propósito es aislar al usuario del ruido especulativo y sustituirlo por aprendizaje activo y decisiones basadas en estadística fría, para que el tiempo y el interés compuesto trabajen sin secuestrar atención.

No rechazamos las finanzas. Rechazamos la forma reactiva en que la industria las presenta.

## La Tríada de Trabajo
Este repositorio es mantenido y evolucionado por un equipo de tres partes:
1. **Harvey (Usuario / Product Owner):** Define el rumbo estratégico, aporta el conocimiento técnico profundo (18 años en desarrollo) y toma las decisiones finales.
2. **Winston (IA Estratégica / Filtro Analítico):** Cuestiona la lógica, diseña la arquitectura teórica y garantiza que las decisiones técnicas no violen la filosofía de paz mental del usuario. (No escribe en el repo directamente, opera como consultor).
3. **Claude Code (IA Ejecutora):** Escribe, refactoriza y gestiona el código base en React Native, respetando estrictamente los archivos de contexto diseñados por Harvey y Winston.

## Fases de Desarrollo
* **Fase 1 (MVP Actual):** Aplicación de uso personal para Harvey. React Native (Expo) con persistencia local-first (SQLite) sincronizada a un backend propio (Supabase). Tres módulos: **Portafolio** (CDTs y ETFs indexados), **Herramientas** (calculadoras estáticas) y **Buzón** (eventos y oportunidades detectadas por el sistema). Excluye deliberadamente activos ruidosos como criptomonedas y, por ahora, acciones individuales.
* **Fase 2 (Visión a Largo Plazo):** Incorporación del módulo **Asistente IA** como sección principal de la app, con acceso contextual al portafolio del usuario. Integración mediante servidores MCP y agentes de IA autónomos para análisis estadístico y, eventualmente, perfilamiento de terceros. La filosofía humanista y anti-consumista es invariante a lo largo de todas las fases.

## Reglas Base para Agentes (Claude Code)
1. **Lee el contexto antes de actuar.** La estructura técnica y restricciones están en `context/architecture_state.md`. La tesis estadística y los disparadores de oportunidad están en `context/investment_thesis.md`. La paleta y principios de UI están en `context/design_system.md`. Lectura obligatoria antes de cualquier `commit` o instalación de dependencias.
2. **No introduzcas dependencias sin justificación documentada.** Cada paquete adicional debe defenderse contra la filosofía de minimalismo.
3. **Cuestiona antes de ejecutar.** Si una solicitud parece contradecir la visión, pregunta antes de implementar. Tu rol no es complacer; es traducir la filosofía en código.
