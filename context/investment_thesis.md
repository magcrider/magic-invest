# Investment Thesis & Statistical Models - Magic Invest (Fase 1)

## 1. Filosofía de Asignación
El objetivo de este sistema no es "ganarle al mercado", sino garantizar la preservación del poder adquisitivo minimizando el tiempo de gestión y la carga cognitiva. Todo activo evaluado debe demostrar que su rendimiento histórico justifica el riesgo sistémico de no tener el dinero asegurado en un producto de renta fija local.

## 2. La Línea Base (Hurdle Rate)
Antes de evaluar cualquier ETF, el sistema debe calcular la tasa de rechazo base. Si un ETF no supera esta barrera estadísticamente, no merece nuestra atención ni nuestro capital.

La línea base está definida por la rentabilidad de los CDTs, pero ajustada a la realidad macroeconómica:
* **Tasa Libre de Riesgo Local ($R_f$):** Promedio de rentabilidad anual de CDTs en los bancos configurados.
* **Tasa de Rechazo:** Un ETF (denominado en USD) debe ofrecer una expectativa de retorno que supere la Tasa Libre de Riesgo Local ($R_f$) descontando la devaluación promedio de la moneda local frente al dólar y la inflación.

## 3. Métricas Estadísticas de Aceptación (ETFs)
Queda prohibido evaluar los ETFs basándose únicamente en su rendimiento nominal. El sistema aplicará obligatoriamente los siguientes filtros matemáticos usando datos de cierre diario (EOD):

### A. Tasa de Crecimiento Anual Compuesta (CAGR)
Mide la tasa de retorno suavizada a lo largo del tiempo, eliminando la ilusión de las ganancias a corto plazo. Evaluaremos periodos mínimos de 5 a 10 años.
$$CAGR = \left( \frac{EV}{BV} \right)^{\frac{1}{n}} - 1$$
*(Donde EV = Valor Final, BV = Valor Inicial, n = Número de años)*

### B. Máximo Drawdown (MaxDD)
Esta es nuestra métrica de **Estrés Psicológico**. Mide la mayor caída porcentual desde un pico histórico hasta el punto más bajo antes de recuperarse. Nos indica cuánto dolor cognitivo debemos estar dispuestos a tolerar si el mercado colapsa.
$$MaxDD = \frac{Trough Value - Peak Value}{Peak Value}$$
*(Un MaxDD superior al 40% en fondos indexados tradicionales levanta una bandera roja de hipervolatilidad)*

### C. Ratio de Sortino
A diferencia del Ratio de Sharpe (que penaliza cualquier volatilidad, incluso la positiva), el Ratio de Sortino solo penaliza la volatilidad hacia abajo (el riesgo real de pérdida). Nos dice cuánto rendimiento extra obtenemos por cada unidad de riesgo a la baja que asumimos.
$$Sortino = \frac{R_p - R_f}{\sigma_d}$$
*(Donde $R_p$ = Retorno del portafolio, $R_f$ = Tasa libre de riesgo, $\sigma_d$ = Desviación estándar de los retornos negativos)*

## 4. Reglas de Rebalanceo
El sistema evaluará el portafolio una vez al trimestre. Cualquier rebalanceo sugerido por la IA debe fundamentarse en una desviación estructural de estas métricas matemáticas, nunca en noticias del mercado ni en pronósticos económicos a corto plazo.