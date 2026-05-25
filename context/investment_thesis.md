# Investment Thesis & Statistical Models - Magic Invest (Fase 1)

## 1. Filosofía de Asignación
El objetivo de este sistema no es "ganarle al mercado", sino garantizar la **preservación del poder adquisitivo** minimizando el tiempo de gestión y la carga cognitiva. Todo activo evaluado debe demostrar que su rendimiento histórico justifica el riesgo sistémico de no tener el dinero asegurado en un producto de renta fija local.

**Nota sobre riesgo cambiario:** Los ETFs están denominados en USD; el portafolio de Harvey está radicado en COP. La devaluación/apreciación del peso puede mover el valor del portafolio en COP de forma significativa e independiente del comportamiento del ETF en USD. Esto no es "pérdida" en sentido estructural, pero tiene un impacto emocional real. La app debe ayudar al usuario a interpretar este fenómeno — no solo calcularlo con la Ecuación de Fisher, sino contextualizarlo cuando ocurra. Un evento del Buzón que explique que la caída en COP se debe al tipo de cambio y no al ETF es educación financiera de alto valor.

## 2. La Línea Base (Hurdle Rate)
Antes de evaluar cualquier ETF, el sistema calcula la **tasa de rechazo base**. Si un ETF no la supera estadísticamente, no merece nuestra atención ni nuestro capital.

La línea base está definida por la rentabilidad de los CDTs, pero ajustada a la realidad macroeconómica:
* **Tasa Libre de Riesgo Local ($R_f$):** Promedio de rentabilidad anual de CDTs. Fuente: API del Banco de la República (tasas de captación CDT promedio por plazo), actualizada automáticamente vía Supabase Edge Function.
* **Tasa de Rechazo (Hurdle Rate):** Un ETF (denominado en USD) debe ofrecer una expectativa de retorno neto que supere $R_f$. Para comparar "peras con peras", la rentabilidad del ETF se ajusta matemáticamente usando la **Ecuación de Fisher** para reflejar la devaluación esperada/histórica del COP frente al USD y el diferencial de inflación.
* **Costos (TER):** Todo cálculo de rendimiento de un ETF debe descontar obligatoriamente su *Total Expense Ratio* (TER) anualizado.

## 3. Métricas Estadísticas de Aceptación (ETFs)
Queda prohibido evaluar los ETFs basándose únicamente en su rendimiento nominal. El sistema aplicará obligatoriamente los siguientes filtros matemáticos usando datos de cierre diario (EOD):

### A. Tasa de Crecimiento Anual Compuesta (CAGR)
Mide la tasa de retorno suavizada a lo largo del tiempo, eliminando la ilusión de las ganancias a corto plazo. Evaluaremos periodos mínimos de 5 a 10 años.
$$CAGR = \left( \frac{EV}{BV} \right)^{\frac{1}{n}} - 1$$
*(Donde EV = Valor Final, BV = Valor Inicial, n = Número de años)*

### B. Máximo Drawdown (MaxDD)
Métrica de **estrés psicológico**. Mide la mayor caída porcentual desde un pico histórico hasta el punto más bajo antes de recuperarse. Indica cuánto dolor cognitivo debemos estar dispuestos a tolerar si el mercado colapsa.
$$MaxDD = \frac{Trough Value - Peak Value}{Peak Value}$$
*(Un MaxDD superior al 40% en fondos indexados tradicionales levanta una bandera roja de hipervolatilidad.)*

### C. Ratio de Sortino
A diferencia del Ratio de Sharpe (que penaliza cualquier volatilidad, incluso la positiva), el Sortino solo penaliza la **volatilidad hacia abajo** (el riesgo real de pérdida). Nos dice cuánto rendimiento extra obtenemos por cada unidad de riesgo a la baja que asumimos.
$$Sortino = \frac{R_p - R_f}{\sigma_d}$$
*(Donde $R_p$ = Retorno del portafolio, $R_f$ = Tasa libre de riesgo, $\sigma_d$ = Desviación estándar de los retornos negativos)*

## 4. Disparadores de Oportunidad (Buzón)
Una "oportunidad" en Magic Invest **no es una intuición ni un titular**. Es una condición matemática determinística que el sistema evalúa contra los datos EOD almacenados. Cuando un disparador se cumple, se genera un evento en el Buzón con (a) qué condición se cumplió, (b) por qué importa en términos históricos y (c) las consecuencias proyectadas de distintos caminos posibles — **nunca una orden ni sugerencia de compra/venta**. Ver principio de lenguaje en `design_system.md` §9.

### A. CDT favorable
**Disparador:** Un banco configurado eleva su tasa para algún plazo por encima del **promedio histórico móvil de 12 meses + 0.5 puntos porcentuales**.
**Por qué importa:** Indica que la tasa libre de riesgo local se ha movido estructuralmente. Si sube $R_f$, todos los ETFs en watchlist deben re-evaluarse contra la nueva Hurdle Rate — algunos pueden dejar de justificar el riesgo cambiario y de mercado.

### B. ETF cruza la línea base
**Disparador:** Un ETF que estaba siendo rechazado por no superar la Hurdle Rate **ahora la supera** al evaluar su CAGR a 5 años.
**Por qué importa:** Significa que un activo previamente descartable empieza a justificar capital. La Hurdle Rate no es estática; cambia con $R_f$, devaluación e inflación, así que la lista de ETFs aceptables se mueve con el tiempo.

### C. Drawdown estructural
**Disparador:** Un ETF en portafolio o watchlist entra en un **MaxDD superior al 25%** desde su pico histórico.
**Comportamiento del evento:** El sistema NO sugiere acción. El evento muestra:
- Cuántas veces este ETF ha caído más de este porcentaje en su historia.
- Cuánto tiempo tomó recuperarse en cada ocasión.
- La proyección a largo plazo si se mantiene la posición vs si se liquida hoy (usando el mismo capital reinvertido en el instrumento alternativo disponible).
- Activa automáticamente la sección "¿Qué vale el tiempo que llevas?" dentro del detalle del activo, mostrando el impacto del historial acumulado.

El lenguaje del evento describe consecuencias históricas. El usuario decide. El sistema nunca dice "compra" ni "vende".

### D. Sortino mejorado
**Disparador:** Un ETF mejora su Ratio de Sortino respecto al periodo de evaluación anterior en más de **1 desviación estándar** del histórico de Sortinos del propio activo.
**Por qué importa:** El Sortino mide rendimiento por unidad de riesgo a la baja. Una mejora estructural significa que el activo está generando mejor retorno con **menor dolor cognitivo** — exactamente el perfil que esta tesis premia.

### E. Cambio macroeconómico (Banco de la República)
**Disparador:** La tasa de política monetaria del Banco de la República cambia en **50 puntos básicos o más** en una sola decisión de junta.
**Por qué importa:** Esta tasa mueve el promedio CDT y por ende mueve el Hurdle Rate. Cuando cambia significativamente, la evaluación de todos los ETFs del portafolio y watchlist debe recalcularse. El evento muestra el nuevo Hurdle Rate implícito y cómo cambia la situación de cada activo frente a él.
**Fuente de datos:** API pública del Banco de la República, consultada automáticamente vía Supabase Edge Function. Sin dependencia de entrada manual.

## 5. Complejidad Fiscal (Contexto Educativo Obligatorio)
La app debe incluir contexto educativo sobre las implicaciones fiscales de invertir en ETFs desde Colombia. Esto no es asesoría tributaria — es educación que el usuario necesita para tomar decisiones completas. Los tooltips y pantallas de detalle deben cubrir:

* **Declaración de renta sobre activos en el exterior:** Los residentes colombianos deben declarar activos financieros en el exterior cuando superan ciertos umbrales. El valor en COP al 31 de diciembre es el monto declarable.
* **Retención en la fuente en origen:** Algunos ETFs estadounidenses aplican retención sobre dividendos (típicamente 15-30% bajo el tratado EE.UU.-Colombia) antes de que el dinero llegue al inversor. Esto afecta el rendimiento neto real.
* **Diferencial cambiario:** Las ganancias o pérdidas en COP derivadas de la variación del tipo de cambio pueden tener tratamiento tributario diferenciado. No toda variación en COP es ganancia de capital — parte puede ser efecto de tasa de cambio.

El sistema puede mostrar el rendimiento bruto del ETF en USD, pero debe facilitar al usuario la comprensión de que su rendimiento neto en COP es diferente y tiene dimensiones fiscales.

## 6. Reglas de Rebalanceo
El portafolio se evalúa estructuralmente **una vez al trimestre**. Cualquier rebalanceo sugerido debe fundamentarse en una **desviación de las métricas matemáticas** (§3) o en disparadores acumulados del Buzón (§4), **nunca** en noticias del mercado ni en pronósticos económicos a corto plazo.

### Bandas de Asignación (Target de Rebalanceo)
El sistema no usa un porcentaje fijo sino **bandas configurables**:
* **Default en onboarding:** CDTs 50–70% / ETFs 30–50% (conservador, adecuado para usuario nuevo).
* **Configurables:** Harvey puede ajustar las bandas desde configuración una vez que comprenda el Hurdle Rate y el Sortino de sus activos. El Buzón genera un evento educativo en el momento oportuno invitando a esta personalización.
* **Cuando la distribución real sale de las bandas:** se genera un evento de Buzón. El sistema no ejecuta rebalanceo automático.

### Dos Tipos de Rebalanceo
* **Rebalanceo estructural:** revisión trimestral automática. Si los CDTs están en plazo activo (bloqueados), el evento del Buzón informa la situación y proyecta cuándo habrá oportunidad de ajustar. No fuerza acción sobre capital ilíquido.
* **Rebalanceo de oportunidad:** cuando un CDT está próximo a madurar, el sistema genera un evento especial en el Buzón que conecta ese capital disponible con el estado actual de la distribución y el Hurdle Rate vigente, presentando las opciones disponibles con sus consecuencias proyectadas.
