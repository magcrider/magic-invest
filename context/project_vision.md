# Project Vision & Conceptual Alignment - Magic Invest

## 1. El Problema a Resolver
Las herramientas financieras actuales están diseñadas bajo sesgos hipercapitalistas y consumistas: buscan secuestrar la atención del usuario mediante notificaciones, colores de alerta y flujos de datos en tiempo real (FOMO). Su objetivo es generar interacción compulsiva y, con ello, ingresos por trading frecuente, suscripciones o publicidad.

**Nuestra postura:** El valor de esta aplicación no se mide por la acumulación de capital, sino por la **calidad de las decisiones financieras** del usuario y por la **profundidad de su comprensión** del funcionamiento estructural de los mercados. Magic Invest no es anti-finanzas — es anti-reactividad. El mercado genera ruido; nosotros somos el filtro insonorizador y, además, el aula.

## 2. Definición de Éxito
El éxito no es lograr el mayor rendimiento porcentual (ROI) adivinando el mercado. El éxito se alcanza cuando:
1. El usuario toma decisiones basadas en **estadística fría** (fórmulas matemáticas comprobadas, no intuición ni titulares de prensa).
2. El usuario **gasta el mínimo tiempo posible** mirando la pantalla, pero ese tiempo es de alta densidad informativa.
3. El sistema **reduce la carga cognitiva**, permitiendo que el usuario dedique su intelecto al aprendizaje activo y a su vida personal, dejando que el tiempo y el interés compuesto hagan el trabajo.
4. El usuario adquiere progresivamente el **vocabulario y la intuición estadística** necesarios para razonar sobre sus propias inversiones, sin depender de "expertos" ni de noticias.
5. El sistema **cultiva curiosidad**, no solo la satisface. La profundidad informativa está siempre disponible, pero se revela en el momento en que el usuario está listo para recibirla — no antes.

El éxito se mide en comprensión adquirida y horas no gastadas en ansiedad, no en puntos porcentuales.

## 3. Dinámica de Comunicación (Para Claude Code)
Cuando interactúes con Harvey (el arquitecto) para generar código, asume este contexto:
* **No sugieras "features" comerciales.** No queremos integración con redes sociales, ni gamificación por capital, ni alertas de "oportunidades calientes". Todo desarrollo debe priorizar el minimalismo y el enfoque.
* **Winston es el marco teórico.** Las decisiones de arquitectura y restricciones (`architecture_state.md` y `investment_thesis.md`) fueron debatidas filosóficamente con Winston (IA Consultora). Son negociables: puedes proponerle a Harvey tu punto de vista si tienes argumentos sólidos.
* **Tu rol (Claude Code):** Ejecución técnica impecable en React Native. Eres el encargado de traducir esta filosofía en código eficiente, modular y sin dependencias infladas. Cuando Harvey pida una implementación, evalúala primero contra este archivo de visión.
* **El color tiene significado dual.** La neutralidad cromática aplica a datos del *presente* (saldos, rentabilidades EOD, tablas de posiciones). Las *proyecciones a futuro* y los *eventos estructurales* sí usan color expresivo, pero con tokens definidos en `design_system.md` que evitan deliberadamente el rojo/verde reactivo del mercado tradicional.
* **La educación es parte del producto.** Todo término técnico debe ser explicable vía tooltip y enlazable a una pantalla de detalle. La revelación de complejidad es progresiva: el sistema no abruma al usuario nuevo, sino que le abre puertas cuando está listo. En Fase 2, el Asistente IA toma este rol con mayor profundidad.
* **El lenguaje del sistema es educativo con inclinación, nunca prescriptivo.** El sistema muestra consecuencias históricas de distintos caminos, nunca ordena ni recomienda. Ver `design_system.md` §9.

## 4. Evolución del Proyecto
* **Fase 1 (Actual):** Aislar el ruido y sentar la base educativa. Herramienta personal para Harvey. Módulos: **Portafolio**, **Herramientas**, **Buzón**. Persistencia local-first con sync a backend propio. Análisis matemático sobre CDTs (renta fija local) y ETFs indexados (crecimiento estructural).

  El Buzón de Fase 1 actúa como **proto-partner**: observa el portafolio, detecta momentos estadísticamente relevantes y entrega contexto educativo en el momento preciso. Este comportamiento es unidireccional y estructurado en Fase 1, pero sienta las bases del Asistente IA de Fase 2. Cuando llegue el AI, el usuario ya tendrá vocabulario formado, historial de interacción y preguntas reales — no llegará a un chat en frío.

* **Fase 2 (Futuro):** Incorporación del módulo **Asistente IA** como sección principal, con acceso contextual al portafolio del usuario. Expansión vía servidores MCP y agentes autónomos para análisis estadístico avanzado y perfilamiento de terceros. La filosofía humanista, anti-consumista y educativa se mantiene como invariante absoluto.
