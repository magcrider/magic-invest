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

## 13. Tokens de Identidad de Activo

Además de los tokens semánticos de §2, existe una segunda familia cromática: los **tokens de identidad de activo**. Su función es identificar visualmente a qué tipo de activo pertenece un elemento, sin connotar salud, urgencia ni dirección.

| Token | Valor (light) | Valor (dark) | Uso |
|---|---|---|---|
| `assetCdt` | `#3A6B9A` | `#6A9FCA` | Identifica CDTs como objeto en cualquier pantalla |
| `assetEtf` | `#3A7850` | `#5FAD7A` | Identifica ETFs como objeto en cualquier pantalla |

### Regla de uso: cuándo usar identidad vs semántico

**Tokens de identidad** — cuando el color responde a la pregunta **"¿de qué tipo de activo es esto?"**:
- Ícono (cuadro izquierdo) en tarjetas del Buzón cuando el evento tiene `relatedAsset`
- Título / nombre del activo en pantallas de detalle (nombre del banco para CDT, ticker para ETF)
- Encabezados de sección en listas agrupadas por tipo ("Certificados de Depósito", "ETFs Indexados")
- Valor acento en tarjetas de la lista del portafolio (tasa EA en CDT, valor total en ETF)
- Segmentos en la barra de distribución apilada (CDT a la izquierda, ETF a la derecha)
- Dot de leyenda bajo la barra de distribución
- Barras comparativas en calculadoras que contrastan tipos de activo específicos (calculadora CDT vs ETF)

**Tokens semánticos** (`positive`, `attention`, `risk`) — cuando el color responde a la pregunta **"¿qué tipo de información es esta?"** o **"¿qué tan urgente es?"**:
- Indicadores de salud de banda de asignación (dentro / cerca / fuera)
- Pill label de tipo en tarjetas del Buzón ("CDT próximo", "Rebalanceo", "Caída estructural")
- Punto de no leído en tarjetas del Buzón
- Borde lateral del disclaimer en pantalla de detalle del Buzón
- Veredicto en calculadoras (CAGR positivo/negativo, retorno real crece/aguanta/pierde)
- Proyección a 10 años y cualquier dato proyectado al futuro

### Patrón doble en tarjetas del Buzón

Las tarjetas del Buzón combinan ambas familias en elementos distintos de la misma tarjeta:

1. **Ícono (cuadro izquierdo)** → color de **identidad**: el usuario sabe inmediatamente *sobre qué activo* trata el mensaje. Se deriva de `relatedAsset`: `CDT *` → `assetCdt`, ticker de ETF → `assetEtf`, sin activo → neutro.
2. **Pill de tipo + punto de no leído** → color **semántico**: el usuario sabe *qué tipo de información* contiene y *qué tan relevante* es actuar. Se deriva del `type` del evento: `rebalance` → `positive`, `cdt_maturity` / `drawdown_context` / `market_trigger` → `attention`, `educational` → neutro.

Esta separación crea una jerarquía de dos capas: el ícono responde *"¿sobre qué activo?"*; la pill responde *"¿para qué necesito prestarle atención?"*.

### Extensión a futuros tipos de activo

Cada nuevo tipo de activo que se incorpore debe cumplir este protocolo antes de implementar cualquier pantalla:
1. Definir su token `assetX` en `src/constants/colors.ts` con valores para `light` y `dark`
2. Exportarlo en los objetos `Colors.light` y `Colors.dark`
3. Aplicarlo en: encabezado de sección en Portafolio Detalle, valor acento en tarjeta de lista, título en pantalla de detalle, ícono del Buzón cuando hay `relatedAsset`

Los tokens semánticos son transversales — no varían por tipo de activo.

## 14. Sistema de Temas Dinámico (Light / Dark)

La app implementa soporte completo de modo oscuro vía el hook `useTheme()` en `src/hooks/use-theme.ts`. Toda la app usa este hook — no existen colores hardcodeados en `StyleSheet.create()`.

### Reglas de implementación

- **`StyleSheet.create()` es solo para geometría** (dimensiones, padding, margin, borderRadius, flexbox). Nunca para colores.
- **Los colores van siempre en `style={[styles.x, { color: theme.y }]}`**, como segunda entrada del array.
- **Los sub-componentes llaman a `useTheme()` independientemente.** No se pasa el tema como prop.
- **Constantes de color a nivel de módulo están prohibidas.** Las constantes derivadas del tema deben vivir dentro del componente o sub-componente.
- **Alpha hex append** para variaciones sutiles: `theme.assetCdt + '18'` (~11% alfa para fondos sutiles), `+ '35'` (~21% para bordes), `+ '12'` (~7% muy sutil), `+ '10'` (~6% mínimo).

### Tokens disponibles en el tema

`background`, `backgroundElement`, `text`, `textSecondary`, `divider`, `positive`, `positiveSubtle`, `positiveBorder`, `positiveChart`, `attention`, `attentionSubtle`, `attentionBorder`, `risk`, `riskSubtle`, `riskBorder`, `assetCdt`, `assetEtf`.
