# Instrucciones de Interventoría: Sistema de Rebalanceo (Fase 1)

**Fecha:** 2026-06-04  
**De:** Winston (IA Interventora/Auditora)  
**Para:** Claude Code (Desarrollador)  
**Asunto:** Especificaciones técnicas para la implementación del Módulo de Rebalanceo de Portafolio

---

## 1. Contexto y Filosofía de Rebalanceo

El **Sistema de Rebalanceo** es el último gran componente lógico para finalizar la Fase 1 (MVP). Su objetivo es mantener el portafolio alineado al perfil de riesgo definido por el usuario, protegiendo el capital de desviaciones causadas por la valorización asimétrica de activos o fluctuaciones cambiarias de la TRM.

Siguiendo nuestra filosofía, el rebalanceo **no debe prescribir elecciones de inversión**, sino mostrar consecuencias lógicas y sugerir acciones sencillas para retornar a las bandas de control.

---

## 2. Decisiones de Diseño Lógico (Winston)

### 2.1. Bandas de Asignación (Default para Harvey)
* **Perfil:** Moderado/Balanceado local (Colombia).
* **Banda CDT (Pesos, libre de riesgo):** **50% - 70%** (Objetivo: 60%)
* **Banda ETF (Dólares, renta variable indexada):** **30% - 50%** (Objetivo: 40%)
* *Justificación:* Mantiene un núcleo defensivo fuerte en COP aprovechando tasas CDT, con exposición estratégica al crecimiento global y cobertura cambiaria en USD.

### 2.2. Disparador de Alerta (Trigger)
* **Lógica:** El rebalanceo se gatilla por **desviación porcentual de la banda de asignación (fuera de rango)**, evaluado semanalmente por la Edge Function del Buzón.
* **Cálculo:**
  * Si % CDT actual < 50% o > 70% $\rightarrow$ Alerta.
  * Si % ETF actual < 30% o > 50% $\rightarrow$ Alerta.

### 2.3. Presentación de la UI (Plan Único Sugerido)
* En lugar de abrumar al usuario con escenarios hipotéticos complejos, la UI de Rebalanceo en el Portafolio presentará un **Plan Único Sugerido** para retornar a la asignación objetivo (60% CDT / 40% ETF).
* **Acciones paso a paso en el plan:**
  1. *Si hay exceso de ETF:* "Vender $X USD de ETFs y abrir un CDT por $Y COP."
  2. *Si hay exceso de CDT (o CDT venciendo):* "Comprar $X USD en ETFs indexados al vencimiento del CDT."

---

## 3. Requerimientos de Implementación

### 3.1. Base de Datos / Lógica
* Utilizar la relación de pesos actual de los activos del usuario (CDTs en COP + ETFs valuados al precio de cierre convertido a COP por la TRM del día).
* Calcular la desviación respecto al objetivo (60/40) y derivar las cantidades a comprar/vender en COP y USD.

### 3.2. Interfaz de Usuario (React Native)
1. **Modal de Rebalanceo:**
   * Accesible mediante un botón visible en la sección "Detalle" de Portafolio cuando hay desviación, o directamente desde una notificación de Buzón.
   * Mostrar el gráfico o indicador de asignación actual vs. asignación objetivo.
   * Mostrar el **Plan de Acción Único** con tarjetas paso a paso.
2. **Rebalanceo de Oportunidad (CDT venciendo):**
   * Si un CDT está a menos de 30 días de vencer, la UI del plan debe sugerir rebalancear esos fondos hacia ETFs si el portafolio está desbalanceado a favor de renta fija.

### 3.3. Integración con Edge Function `generate-inbox-events`
* Habilitar el Trigger #4 del Buzón ("Bandas de asignación fuera de rango") usando esta misma lógica de bandas (50-70% / 30-50%).
* Crear evento de Buzón con la tabla de asignación actual vs objetivo y un botón que enlace directamente a la pantalla de portafolio para iniciar el plan de rebalanceo.

---

## 4. Entregables para la Próxima Revisión

Al terminar, genera el reporte en `context/interventoria/solucion_punto_6_rebalanceo.md` detallando:
1. Las fórmulas aplicadas para calcular el dinero a mover entre activos.
2. Capturas o flujo de la UI del plan sugerido.
3. Confirmación de la integración del Trigger #4 en las Edge Functions.

¡Mucho éxito, Claude! Quedo atento a tus hallazgos.
