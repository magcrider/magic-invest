# Consenso de Diseño: Sistema de Rebalanceo (Fase 1)

**Fecha:** 2026-06-04  
**De:** Winston (IA Interventora/Auditora) y Claude Code (IA Ejecutora)  
**Propósito:** Especificación de consenso técnico y metodológico para el desarrollo del Módulo de Rebalanceo.

---

## 1. Filosofía de Rebalanceo: El "Espacio de Decisión"

El sistema operará bajo la premisa de **mostrar consecuencias en lugar de dictar acciones**. Ante un desbalance en el portafolio, el Buzón y la UI ilustrarán los dos escenarios posibles para que el usuario tome una decisión informada:

### Escenario A: Mantener (No hacer nada)
* **Consecuencia cambiaria:** Exposición a dólares del X.XX% (riesgo/beneficio cambiario de devaluación).
* **Drawdown potencial:** Pérdida máxima estimada de $Y.YY COP si la renta variable (ETF) cae un 25%.
* **Riesgo TRM:** Pérdida no realizada por cada devaluación del 10% en el tipo de cambio.

### Escenario B: Rebalancear (Retornar al objetivo 60/40)
* **Acción sugerida:** Vender/Comprar montos específicos traducidos a USD y COP.
* **Costo friccional:** Comisiones de corretaje estimadas ($Z) y spread de divisas estimado.
* **Retorno esperado:** Incremento del CDT (renta fija garantizada en COP) o exposición a ETFs en USD.
* **Impacto fiscal:** Estimación de ganancia de capital sujeta a impuesto.

---

## 2. Lógica de Disparadores (Triggers del Buzón)

El rebalanceo contará con tres disparadores específicos dentro de las Edge Functions:

### 2.1. Trigger #6: Evaluación Trimestral
* **Frecuencia:** Primer domingo de cada trimestre (enero, abril, julio, octubre) a las 8:00 AM.
* **Criterio:** Si la asignación actual se desvía más de un **5% por fuera de las bandas de control** (ej: ETF > 55% o CDT < 45%).
* **Frecuencia del Buzón:** Máximo 1 mensaje por trimestre para evitar fatiga de alertas.

### 2.2. Trigger #7: Rebalanceo de Oportunidad (Vencimiento de CDT)
* **Frecuencia:** Evaluado semanalmente.
* **Criterio:** Se dispara si un CDT del usuario está a menos de **30 días de vencer** Y la asignación del portafolio se encuentra fuera de rango.
* **Objetivo:** Aprovechar la liquidez natural del vencimiento del CDT para realizar el rebalanceo hacia ETFs sin incurrir en cancelaciones anticipadas ni costos extra.

### 2.3. Trigger #8: Cambio Macro Significativo
* **Criterio:**
  * La tasa del Banco de la República cambia en **≥ 50 bps** (Trigger #3 existente).
  * La TRM se mueve **> 8% en un período de 30 días** (volatilidad cambiaria severa).
  * El Hurdle Rate general del portafolio cambia **> 1.5%** en su cálculo dinámico diario.
* **Objetivo:** Notificar al usuario para evaluar si su ponderación actual (dentro o fuera de bandas) sigue siendo óptima respecto al nuevo rendimiento mínimo exigido.

---

## 3. Modelo de Datos y Tablas en Supabase

Se implementarán las siguientes tablas en el esquema de base de datos para dar soporte al módulo:

```sql
-- 1. Bandas de asignación personalizadas por usuario
CREATE TABLE IF NOT EXISTS public.user_allocation_bands (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cdt_min    NUMERIC(5,2) NOT NULL DEFAULT 50.00,  -- Límite inferior CDT
  cdt_max    NUMERIC(5,2) NOT NULL DEFAULT 70.00,  -- Límite superior CDT
  etf_min    NUMERIC(5,2) NOT NULL DEFAULT 30.00,  -- Límite inferior ETF
  etf_max    NUMERIC(5,2) NOT NULL DEFAULT 50.00,  -- Límite superior ETF
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Historial de snapshots de portafolio para gráficos de evolución
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL,
  cdt_percentage  NUMERIC(5,2) NOT NULL,
  etf_percentage  NUMERIC(5,2) NOT NULL,
  total_value_cop NUMERIC(15,2) NOT NULL,
  hurdle_rate     NUMERIC(5,2),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

-- 3. Cache de último Hurdle Rate para detección de variaciones macro
CREATE TABLE IF NOT EXISTS public.hurdle_rate_cache (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hurdle_rate   NUMERIC(5,2) NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. Parámetros de Simulación de Costos

Para mantener las sugerencias alineadas con la realidad, el motor simulará los costos de transacción locales:
1. **Comisión de Corretaje ETF:** **0.5%** fijo sobre el valor operado (simulando tarifas estándar de plataformas locales como Trii).
2. **Spread de Divisas (Dólar/Peso):** **0.3%** sobre la tasa media del mercado (representando la diferencia de compra/venta típica).
3. **Comisiones CDT:** **0.0%** (las aperturas y retenciones por vencimiento no tienen comisiones transaccionales, solo retenciones de ley).
4. **Advertencia de Ganancia de Capital:** Mostrar el retorno neto acumulado del activo vendido con el texto explicativo: *"Ganancia sujeta a impuesto de renta general u ocasional (~15-35%) según tu situación tributaria personal. Consulta con tu contador."*

---

## 5. Visualización del Flujo de UI (React Native)

La interfaz en la pestaña **Detalle del Portafolio** se estructurará en tres vistas del modal:

* **Vista 1: Diagnóstico de Bandas:** Comparativa gráfica (barra de distribución actual vs barra objetivo 60/40) marcando los límites con color secundario (`neutral.muted`) o atención (`attention`) si hay desvío.
* **Vista 2: Matriz de Escenarios:** Tabla comparativa que ilustra las consecuencias de:
  1. *Mantener:* Costos $0, pero desvío del perfil y volatilidad cambiaria.
  2. *Rebalancear al Centro (60/40):* Retorno a bandas, comisiones transaccionales, estabilidad y nuevo Hurdle Rate.
* **Vista 3: Detalle del Plan Sugerido:** Lista numerada con instrucciones detalladas (ej: *"Vender Z unidades del ETF X y transferir $Y COP a un CDT a 360 días"*). Botón de cierre: *"Entendido, volver a Portafolio"* (sin autoejecución comercial por diseño de seguridad).
