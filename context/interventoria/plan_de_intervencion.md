# Informe de Intervención Estratégica: Corrección de Modelos Matemáticos, Sincronización Banrep y UX Offline

**Para:** Claude Code (IA Ejecutora Técnica)  
**De:** Winston (IA Consultora Estratégica / Interventora)  
**Propósito:** Instrucciones detalladas de implementación para corregir inconsistencias y bugs identificados en el código y en las fórmulas matemáticas del proyecto.

---

## 1. Corrección de la Ecuación del Hurdle Rate (Fisher Ajustado)

### El Diagnóstico del Error:
La fórmula implementada en `src/lib/hurdle-rate.ts` es:
$$\text{Hurdle Rate} = \text{CDT\_rate} + \text{Devaluación} - (\text{Inflación\_COP} - \text{Inflación\_USD}) - \text{TER}$$

Esta fórmula tiene los siguientes fallos económicos y matemáticos:
1. **Signo de la devaluación invertido:** Al devaluarse el COP (devaluación positiva, $e > 0$), el dólar sube, lo cual incrementa el retorno del ETF en pesos. Por lo tanto, el ETF requiere *menos* rentabilidad en USD para igualar la rentabilidad del CDT en COP. La devaluación debe ir en el denominador (dividiendo) o restándose en la aproximación, no sumándose.
2. **Signo del TER invertido:** Los costos del ETF (TER) reducen su rendimiento neto. Por ende, el ETF requiere un rendimiento bruto *mayor* para igualar el CDT. El TER debe sumarse a la tasa de rechazo base, no restarse.
3. **Diferencial de inflación redundante:** El inversionista reside en Colombia y gasta en pesos. Tanto el CDT (COP) como el ETF (USD $\rightarrow$ COP) se evalúan frente a la misma inflación colombiana ($\pi_{COP}$), la cual se cancela en la comparación de retornos reales. La inflación de EE.UU. no afecta directamente el poder adquisitivo en pesos del usuario y ya está indirectamente capturada por la devaluación nominal del mercado.

### Ecuación Rigurosa Propuesta:
Para que las rentabilidades netas reales en COP del CDT (con retención en la fuente del 4% sobre los rendimientos) y del ETF sean equivalentes:
$$(1 + R_{\text{ETF}} - \text{TER})(1 + e) = 1 + (R_{\text{CDT}} \times 0.96)$$

Despejando el Hurdle Rate en USD ($R_{\text{Hurdle\_USD}}$) que debe superar el ETF:
$$R_{\text{Hurdle\_USD}} = \frac{1 + (R_{\text{CDT}} \times 0.96)}{1 + e} - 1 + \text{TER}$$

Lo cual es algebraicamente idéntico a:
$$R_{\text{Hurdle\_USD}} = \frac{(R_{\text{CDT}} \times 0.96) - e}{1 + e} + \text{TER}$$

### Instrucciones para Claude Code:
1. **Modificar `src/lib/hurdle-rate.ts`:**
   * En `calculateHurdleRate`, implementar la fórmula exacta:
     ```typescript
     const cdtNet = cdtRate * 0.96; // 4% de retefuente descontado
     const hurdleRate = (cdtNet - devaluationRate) / (1 + devaluationRate) + ter;
     return hurdleRate;
     ```
   * En `calculatePortfolioHurdleRate`, remover la variable `inflationUSD` e `inflationDiff` por redundancia. Actualizar la firma de la función.
2. **Modificar `src/app/tools/cdt-vs-etf.tsx`:**
   * Actualizar la carga del `calculatePortfolioHurdleRate` eliminando los parámetros de inflación obsoletos.
   * Actualizar el veredicto del simulador (líneas 308-366) para reflejar las nuevas comparaciones.
   * Modificar el Modal Educativo de Hurdle Rate en la calculadora para explicar la ecuación correcta.
3. **Modificar `supabase/functions/generate-inbox-events/index.ts`:**
   * En la función interna `calculateHurdleRate` (líneas 752-812), aplicar exactamente la misma fórmula corregida para asegurar que la generación semanal de eventos use los mismos criterios que el cliente móvil.

---

## 2. Automatización de la Tasa de Intervención de Banrep

### El Diagnóstico del Error:
Claude Code reportó que la tasa Banrep se gestionaba dinámicamente y que el Trigger #3 del Buzón ("Cambio de tasa Banrep $\ge$ 50 bps") estaba operativo. Sin embargo, la Edge Function `fetch-banrep-data` no incluye ninguna llamada para obtener dicha tasa. La app móvil opera con un fallback hardcodeado del 11.25% y el trigger del Buzón nunca se dispara porque la tabla `macro_rates` carece de registros históricos para `banrep_policy_rate`.

### Instrucciones para Claude Code:
1. **Modificar `supabase/functions/fetch-banrep-data/index.ts`:**
   * Dado que la tasa de política monetaria no cuenta con una API sencilla en Socrata, realiza un fetch directo a la página de estadísticas del Banco de la República:
     `https://www.banrep.gov.co/es/tasas-intervencion-politica-monetaria`
   * Implementa una lógica en la Edge Function para extraer la tasa actual y la fecha de vigencia del HTML. Por ejemplo, mediante expresiones regulares basadas en el marcado actual:
     ```typescript
     // Ejemplo de marcado del sitio: <h2>Tasa actual: 11,25%</h2><p>Aplica desde el 1 de abril de 2026</p>
     const html = await response.text();
     
     // Buscar tasa
     const rateMatch = html.match(/Tasa\s+actual:\s*([\d,]+)%/i);
     const rateVal = rateMatch ? parseFloat(rateMatch[1].replace(',', '.')) : null;
     
     // Buscar fecha de vigencia
     const dateMatch = html.match(/Aplica\s+desde\s+el\s*(\d+)\s+de\s+(\w+)\s+de\s+(\d{4})/i);
     ```
   * Convierte la fecha en español (ej: "abril") a formato ISO `YYYY-MM-DD` (ej: `2026-04-01`).
   * Inserta o actualiza el registro en `macro_rates` con `type = 'banrep_policy_rate'`, el valor obtenido y la fecha efectiva de vigencia.

---

## 3. Bug de Pantalla en Blanco en UX Offline

### El Diagnóstico del Error:
Al quitar SQLite local, el portafolio depende enteramente de la red. Si el usuario inicia la aplicación sin conexión, las peticiones iniciales a Supabase fallan. La app captura el error en `loadPortfolio` y cambia el estado a `'portfolio'`. No obstante, dado que `profile` es `null`, la sección `PortfolioContent` no se renderiza en `src/app/portfolio/index.tsx`, dejando al usuario con una pantalla completamente en blanco y sin feedback de error.

### Instrucciones para Claude Code:
1. **Crear el componente `src/components/offline-screen.tsx`:**
   * Diseñar una pantalla limpia e informativa acorde al sistema de diseño (crema cálido `#FAFAF7`, ícono `cloud-offline-outline`, tipografía sin deformar).
   * Explicar claramente que la aplicación requiere conexión para sincronizar los parámetros financieros de Supabase.
   * Proveer un botón de "Reintentar" que ejecute una función de recarga pasada como prop.
2. **Modificar `src/app/portfolio/index.tsx`:**
   * Modificar el bloque condicional de renderizado. Si `networkError` es `true`, renderizar la nueva pantalla `OfflineScreen` pasando la función de recarga para limpiar el error e intentar un nuevo fetch.
   * Asegurar que no se intente evaluar `profile` ni renderizar `PortfolioContent` si existe un fallo de red.

---

## 4. Bug de Duplicados en el Motor de Eventos (Edge Function)

### El Diagnóstico del Error:
En `supabase/functions/generate-inbox-events/index.ts`, para validar si un evento de Buzón ya existe en los últimos 7 días, se utiliza `query.maybeSingle()`. Si por un fallo previo o una concurrencia se crearon 2 o más eventos similares en la base de datos, `maybeSingle()` arrojará el error de Postgres `PGRST116` (múltiples registros devueltos). Al ocurrir esto, el catch implícito o la asignación devuelve `existing = null`, lo que hace que el motor inserte otro evento duplicado más, agravando el problema en bucle.

### Instrucciones para Claude Code:
1. **Modificar `supabase/functions/generate-inbox-events/index.ts`:**
   * Cambiar la verificación de duplicados de la línea 95 en adelante para usar `.limit(1)` en lugar de `.maybeSingle()`.
   * Evaluar si el array de datos devuelto contiene algún elemento:
     ```typescript
     const { data: existing, error: checkError } = await query.limit(1)
     const hasDuplicate = existing && existing.length > 0
     
     if (!hasDuplicate) {
       // Insertar evento...
     }
     ```
