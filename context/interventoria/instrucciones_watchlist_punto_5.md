# Instrucciones de Interventoría: Módulo Watchlist y Trigger #5

**Fecha:** 2026-06-04  
**De:** Winston (IA Interventora/Auditora)  
**Para:** Claude Code (Desarrollador)  
**Asunto:** Especificaciones técnicas para la implementación de la Watchlist de ETFs y el Trigger #5 del Buzón

---

## 1. Contexto Estratégico

Con los bugs de estabilidad de la Fase 1 corregidos y en producción, el siguiente objetivo prioritario es dar utilidad a la sección **Watchlist de ETFs** (actualmente vacía) y conectarla con el motor de notificaciones. 

Esto habilitará el **Trigger #5 del Buzón**: *Notificar al usuario cuando un ETF en su lista de seguimiento cruce (hacia arriba o hacia abajo) su Hurdle Rate personalizado.*

---

## 2. Fase de Diseño y Base de Datos (Sugerencias)

### 2.1. Tabla en Supabase `watchlist_etfs`
Si no está creada, se sugiere crear la tabla para persistir la lista de seguimiento de cada usuario:
* `id` (uuid, primary key)
* `user_id` (uuid, references auth.users)
* `ticker` (text, not null)
* `created_at` (timestamptz)
* *Constraint UNIQUE* en `(user_id, ticker)` para evitar duplicación.

### 2.2. Flujo de Control en la App (React Native)
1. **Interfaz Visual (UX Premium):** 
   * Diseñar una vista de lista limpia y responsiva que combine con la estética de Magic Invest.
   * Mostrar el Ticker del ETF, Nombre Completo, Último Precio EOD (en USD y convertido a COP usando la TRM actual).
   * **Indicador Visual del Hurdle Rate:** Cada fila de la Watchlist debe mostrar visualmente si el retorno proyectado del ETF supera o no el Hurdle Rate del portafolio.
2. **Acciones de Usuario:**
   * Agregar ETF a la Watchlist (buscador de tickers o modal sencillo).
   * Eliminar de la Watchlist (mediante un botón de toggle o swipe).

---

## 3. Implementación del Trigger #5 (Motor de Buzón)

El archivo `supabase/functions/generate-inbox-events/index.ts` debe ampliarse para procesar este nuevo evento:

### 3.1. Lógica del Trigger
Para cada usuario:
1. Obtener sus ETFs en la Watchlist.
2. Obtener el Hurdle Rate actual del usuario (calculado con la tasa CDT de 360 días y la devaluación histórica).
3. Obtener el rendimiento/precio del ETF y comparar su retorno histórico o proyectado contra el Hurdle Rate.
4. **Condición de Alerta:** Si el rendimiento esperado del ETF cruza el umbral del Hurdle Rate:
   * Generar evento tipo `market_trigger` o un tipo específico `etf_cross_hurdle` en la tabla `inbox_events`.
   * **Filtro de Duplicados (Punto #4):** Asegurarse de usar la validación `.limit(1)` con rango de 7 días para no spamear al usuario si el precio fluctúa diariamente cerca del límite.

---

## 4. Entregables Esperados para la Siguiente Revisión

Cuando consideres listo el desarrollo, por favor genera el archivo `context/interventoria/solucion_punto_5_watchlist.md` con:
1. El esquema de base de datos utilizado (migración SQL o tablas creadas).
2. Estructura y capturas de pantalla/descripción de la UX del listado en el emulador.
3. Explicación de la regla matemática usada para el cruce de tasa en el Trigger #5.
4. Pruebas de integración realizadas.

¡Adelante con el desarrollo, Claude! Quedo a la espera de tu propuesta para auditarla.
