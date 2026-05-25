# Design System - Magic Invest

## 1. Principio Rector
La paleta cromática es una **herramienta cognitiva, no decorativa**. Se rige por una regla doble:

* **Datos del presente** → **neutralidad total**. Los saldos, las rentabilidades del día, los porcentajes del último cierre se muestran sin color emocional. El usuario no debe sentir nada al verlos.
* **Datos estructurales y proyecciones** → **color expresivo, deliberadamente no-de-mercado**. Se evita el rojo/verde semántico para no activar la respuesta automática de aversión a la pérdida y euforia de ganancia. El color guía la atención hacia patrones de largo plazo, no hacia movimientos del día.

Esta dualidad es **innegociable**. Es el punto donde la psicología cognitiva entra al servicio del usuario, en lugar de ser explotada en su contra.

## 2. Tokens Cromáticos

| Token | Hex | Uso | Justificación cognitiva |
|---|---|---|---|
| `neutral.background` | `#FAFAF7` | Fondo de pantalla, contenedores | Crema cálido. Reduce fatiga visual frente al blanco puro. |
| `neutral.text` | `#1F2024` | Texto primario | Carbón oscuro, no negro absoluto. Más amable al ojo. |
| `neutral.muted` | `#9CA3AF` | Datos del presente: saldos EOD, %, tablas | Gris piedra. Información necesaria pero sin carga emocional. |
| `structural.positive` | `#5B8E8E` | Calidad estructural alta (Sortino fuerte, CAGR sostenido) | Teal apagado. Sugiere estabilidad sin evocar "verde de ganancia". |
| `structural.attention` | `#C08552` | Métrica fronteriza, rebalanceo sugerido, oportunidad de revisión | Ámbar quemado. Atención sin alarma. |
| `structural.risk` | `#6B4E71` | MaxDD elevado, salida de Hurdle Rate, riesgo estructural | Púrpura oscuro. Riesgo sin "rojo de pérdida". |
| `projection.optimistic` | gradiente desde `#5B8E8E` | Banda P90+ en proyecciones probabilísticas | Continúa el lenguaje de `structural.positive`. |
| `projection.median` | `#4B4F58` | Línea de proyección mediana (P50) | Carbón neutro. Punto de referencia sin sesgo. |
| `projection.pessimistic` | gradiente desde `#6B4E71` | Banda P10- en proyecciones probabilísticas | Continúa el lenguaje de `structural.risk`. |

## 3. Tipografía
* **Familia:** sistema nativo del dispositivo (SF Pro en iOS, Roboto en Android). **Cero descarga de fuentes web** — peso de bundle y privacidad.
* **Jerarquía:** máximo **3 niveles** por pantalla. Sin estilos decorativos.
* **Números financieros:** monoespaciados (tabular nums) para que los importes alineen verticalmente en columnas.

## 4. Espaciado y Densidad
* **Generoso por defecto.** La densidad visual alta evoca dashboards de trading; lo evitamos deliberadamente.
* La proyección probabilística es la "estrella" de cada pantalla y debe tener aire suficiente alrededor.
* Tablas de posiciones: compactas pero legibles. Información, no espectáculo.

## 5. Animaciones
* **Solo transiciones funcionales** (cambio de pantalla, apertura de tooltip, expansión de detalle).
* **Cero animaciones celebratorias** (confeti, pulsos, "logros desbloqueados").
* **Cero efectos atencionales** (parpadeo, llamado de atención forzado, badges animados).

## 6. Iconografía
* Sets **monocromáticos**. Sin íconos saturados de color.
* **Sin íconos de tendencia mercantil** (flechas verdes apuntando hacia arriba, gráficos de barras "subiendo", flamas para "hot").

## 7. Componentes Pedagógicos
* **Tooltip básico:** ícono `(?)` discreto junto a todo término técnico. Al tocarlo, abre overlay con definición de 1-2 frases.
* **Hipervínculo de detalle:** desde el tooltip, opción "Leer más" lleva a pantalla dedicada con definición extendida, fórmula, ejemplo numérico y enlace al contexto donde aparece en la app.
* **Glosario navegable:** sección accesible desde cualquier lugar con la lista completa de conceptos.

## 8. Revelación Progresiva de Complejidad
La información densa existe pero no se impone. Este principio aplica a toda la app:

* **Vista de lista (Portafolio):** solo lo esencial — nombre del activo, valor actual, indicador de salud estructural. Sin métricas avanzadas visibles de entrada.
* **Detalle del activo:** capas de profundidad accesibles por voluntad. Las secciones avanzadas (como "¿Qué vale el tiempo que llevas?") están **colapsadas por defecto** con un título descriptivo que invita, no obliga.
* **Sección "¿Qué vale el tiempo que llevas?"** (en detalle de activo): colapsada por defecto. Al expandir, muestra dos proyecciones: (a) con el historial real de tiempo invertido, (b) hipotética si se empezara hoy con el mismo capital. La brecha entre curvas es el valor del tiempo acumulado. Refuerza la convicción de no vender.
* **Buzón educativo como puerta de entrada:** el sistema genera eventos educativos progresivos en el Buzón cuando detecta que el usuario está en condiciones de absorber una nueva capa de comprensión (tiempo de uso, interacción previa con un concepto, eventos de mercado relevantes).

El sistema **cultiva curiosidad** en lugar de abrumar. Una persona que lleva semanas usando la app habrá recorrido naturalmente hacia capas de comprensión que al inicio no buscaba — porque el sistema la llevó allí en el momento correcto.

## 9. Principio de Lenguaje: Consecuencias, No Prescripciones
El sistema nunca dice qué hacer. Siempre muestra qué ha pasado históricamente cuando se ha tomado cada camino, y qué implica para el portafolio actual elegir uno u otro. Este principio protege al usuario, protege legalmente a la app, y es además el diferencial educativo frente a otras herramientas.

**La asimetría educativa es intencional.** La tesis del proyecto es inversión pasiva de largo plazo. El lenguaje refleja esa convicción a través de datos históricos, no de opiniones. Mostrar que mantener una posición durante caídas históricamente ha resultado en X no es una recomendación — es educación con convicción.

**Reglas de construcción de lenguaje para eventos del Buzón:**
* Usar pasado histórico para datos: *"ha ocurrido"*, *"resultó en"*, *"tomó en promedio"*. Nunca *"ocurrirá"* ni *"es probable que"* como certeza.
* Consecuencias expresadas como proyecciones probabilísticas con rangos, no como cifras exactas.
* Describir siempre al menos dos caminos con sus consecuencias proyectadas (mantener / salir / reinvertir), sin señalar cuál es "correcto".
* Evitar adjetivos que carguen la decisión: no *"oportunidad única"*, no *"riesgo elevado"*, sino los datos que permitan que el usuario forme ese juicio por sí mismo.

**Ejemplos de lenguaje correcto vs incorrecto:**

| Incorrecto | Correcto |
|---|---|
| "Este es un buen momento para comprar más." | "En los 5 casos históricos similares, mantener la posición resultó en recuperación en un promedio de 14 meses." |
| "El ETF está en riesgo." | "VTI está 28% por debajo de su máximo. Su MaxDD histórico más alto fue 55% (2008). En todos los casos posteriores se recuperó." |
| "Considera rebalancear tu portafolio." | "Tu distribución actual (CDTs 35% / ETFs 65%) está fuera de tu banda objetivo (50–70% / 30–50%). Cuando madure tu CDT en junio, tendrás capital disponible para ajustar." |

## 10. Disclaimer de Buzón (Componente Fijo)
Todo evento del Buzón incluye, como parte permanente y visible del componente — no enterrada en términos y condiciones — la siguiente leyenda:

> *"Este contenido es educativo y se basa en datos históricos. No constituye asesoría de inversión."*

Este disclaimer es un elemento de diseño, no un footer legal. Su presencia constante en todos los eventos establece el contrato cognitivo con el usuario desde el primer uso.

## 11. Vinculación Portafolio ↔ Buzón
La conexión entre activos y eventos es bidireccional pero no intrusiva:

* **Desde la lista del Portafolio:** sin badges, sin indicadores. La lista permanece limpia.
* **Desde el detalle de un activo:** sección "Eventos relacionados" al final de la pantalla, que lista los eventos del Buzón vinculados a ese activo. Visible sin necesidad de navegar al Buzón.
* **Desde un evento del Buzón:** chip o tag con el nombre del activo, navegable directamente al detalle en Portafolio.

## 12. Iteración
Esta paleta es un **punto de partida funcional**. Los tokens son ajustables conforme Harvey vea los componentes renderizados en pantalla. Lo **no-negociable** son los principios rectores (§1, §8, §9, §10), no los códigos hex específicos.
