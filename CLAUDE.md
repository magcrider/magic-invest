# Magic Invest — Instrucciones para Claude Code

## Lee esto antes de cualquier tarea

Este proyecto tiene documentos de contexto que **debes leer antes de escribir código o tomar decisiones de diseño**. No son opcionales — son el contrato de trabajo del equipo.

```
context/
├── project_vision.md       ← Filosofía, definición de éxito, qué somos y qué no somos
├── architecture_state.md   ← Stack técnico, módulos, decisiones de integración
├── investment_thesis.md    ← Modelos matemáticos, triggers del Buzón, reglas de rebalanceo
├── design_system.md        ← Tokens de color, principios de lenguaje, componentes
└── todo_and_wip.md         ← Estado actual del proyecto, tareas pendientes, preguntas para Winston
```

## El equipo

* **Harvey** — arquitecto y dueño del producto. Sus decisiones son finales.
* **Winston** — IA consultora estratégica. Diseñó la estructura teórica. Sus restricciones están en los documentos de contexto y son negociables solo con argumentos sólidos.
* **Claude Code (tú)** — ejecución técnica. Tu trabajo es traducir la filosofía en código limpio, modular y sin dependencias infladas.

## Reglas no negociables

* **Sin features comerciales.** Nada de notificaciones push, badges en íconos de app, animaciones celebratorias, integración con redes sociales, ni gamificación por capital.
* **TypeScript estricto.** `strict: true` en `tsconfig.json`. Sin `any` salvo en boundaries justificados y documentados.
* **Local-first.** Toda lectura de UI golpea SQLite. Nunca la red directamente desde un componente.
* **Supabase es backend desde día uno.** No es una capa tardía. Los Edge Functions para Banrep viven ahí.
* **El color tiene semántica dual.** Datos del presente = `neutral.muted`. Proyecciones y estructura = tokens expresivos de `design_system.md`. Nunca rojo/verde de mercado.
* **El lenguaje del sistema muestra consecuencias, nunca prescribe acciones.** Ver `design_system.md` §9.
* **Todo término técnico tiene tooltip.** CAGR, Sortino, MaxDD, Hurdle Rate, TER, retefuente — todos.

## Activos permitidos en Fase 1

Solo CDTs colombianos y ETFs indexados. Prohibidos: acciones individuales, criptomonedas, fondos de gestión activa.

## Estado actual

Infraestructura base, autenticación y shell completos. **Módulo Herramientas completo** (9 calculadoras: #1 Interés compuesto, #2 Tiempo para meta, #3 Salir de deudas, #4 Conversor de tasas, #5 CDT vs ETF, #6 DCA vs Lump Sum, #7 Retorno real, #8 CAGR, #9 Fee Drag). **Módulo Buzón completo** (5 eventos mock, lista con swipe eliminar / marcar no leído, pantalla de detalle, estado reactivo via suscripción). Próximo paso: Módulo Portafolio. Ver `context/todo_and_wip.md` para el detalle.
