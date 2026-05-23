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

## 8. Iteración
Esta paleta es un **punto de partida funcional**. Los tokens son ajustables conforme Harvey vea los componentes renderizados en pantalla. Lo **no-negociable** es el principio rector (§1), no los códigos hex específicos.
