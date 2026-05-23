# Investment Thesis & Statistical Models - Magic Invest (Fase 1)

## 1. Filosofía de Asignación
El objetivo de este sistema no es "ganarle al mercado", sino garantizar la **preservación del poder adquisitivo** minimizando el tiempo de gestión y la carga cognitiva. Todo activo evaluado debe demostrar que su rendimiento histórico justifica el riesgo sistémico de no tener el dinero asegurado en un producto de renta fija local.

## 2. La Línea Base (Hurdle Rate)
Antes de evaluar cualquier ETF, el sistema calcula la **tasa de rechazo base**. Si un ETF no la supera estadísticamente, no merece nuestra atención ni nuestro capital.

La línea base está definida por la rentabilidad de los CDTs, pero ajustada a la realidad macroeconómica:
* **Tasa Libre de Riesgo Local ($R_f$):** Promedio de rentabilidad anual de CDTs en los bancos configurados.
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
Una "oportunidad" en Magic Invest **no es una intuición ni un titular**. Es una condición matemática determinística que el sistema evalúa contra los datos EOD almacenados. Cuando un disparador se cumple, se genera un evento en el Buzón con (a) qué condición se cumplió, (b) por qué importa y (c) sugerencia de revisión — nunca una orden de compra/venta.

### A. CDT favorable
**Disparador:** Un banco configurado eleva su tasa para algún plazo por encima del **promedio histórico móvil de 12 meses + 0.5 puntos porcentuales**.
**Por qué importa:** Indica que la tasa libre de riesgo local se ha movido estructuralmente. Si sube $R_f$, todos los ETFs en watchlist deben re-evaluarse contra la nueva Hurdle Rate — algunos pueden dejar de justificar el riesgo cambiario y de mercado.

### B. ETF cruza la línea base
**Disparador:** Un ETF que estaba siendo rechazado por no superar la Hurdle Rate **ahora la supera** al evaluar su CAGR a 5 años.
**Por qué importa:** Significa que un activo previamente descartable empieza a justificar capital. La Hurdle Rate no es estática; cambia con $R_f$, devaluación e inflación, así que la lista de ETFs aceptables se mueve con el tiempo. Este disparador captura ese cruce.

### C. Drawdown estructural
**Disparador:** Un ETF en watchlist entra en un **MaxDD superior al 25%** desde su pico histórico.
**Por qué importa:** **No es una señal de venta.** Es un punto de revisión: cuando un fondo indexado de calidad cae estructuralmente, históricamente representa una oportunidad de **aporte adicional** (comprar más unidades al mismo capital). El sistema pone el dato sobre la mesa; el usuario decide.

### D. Sortino mejorado
**Disparador:** Un ETF mejora su Ratio de Sortino respecto al periodo de evaluación anterior en más de **1 desviación estándar** del histórico de Sortinos del propio activo. (El umbral inicial es 1σ; se calibrará empíricamente con uso real.)
**Por qué importa:** El Sortino mide rendimiento por unidad de riesgo a la baja. Una mejora estructural significa que el activo está generando mejor retorno con **menor dolor cognitivo** — exactamente el perfil que esta tesis premia.

## 5. Reglas de Rebalanceo
El sistema evaluará el portafolio **una vez al trimestre**. Cualquier rebalanceo sugerido debe fundamentarse en una **desviación estructural de las métricas matemáticas** (Sección 3) o en disparadores acumulados del Buzón (Sección 4), **nunca** en noticias del mercado ni en pronósticos económicos a corto plazo.
