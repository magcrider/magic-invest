# TODO & Work in Progress - Magic Invest

Registro vivo del estado del proyecto. **Historial completo:** ver `todo_archive.md`

---

## Estado General

* **Fase:** 🟡 Implementación en progreso
* **Última sesión:** junio 3, 2026
* **Completados:**
  - Infraestructura + Autenticación + Shell
  - Módulo Herramientas (10 calculadoras)
  - Módulo Buzón (mock data)
  - Módulo Portafolio Fase 1 (CRUD completo)
  - Backend Supabase (TRM, CDT rates, EOD prices)
  - Sistema color dinámico (light/dark)
  - Sistema validación/formateo inputs
  - Modals educativos
  - **Hurdle Rate completamente integrado** (Portfolio + Calculadora CDT vs ETF)

---

## 🎯 Próximos Pasos Inmediatos

### 1. ⚠️ PRIORIDAD ALTA: Inflación dinámica (eliminar hardcoded)
**Estado:** Crítico — actualmente hardcodeada, afecta precisión del Hurdle Rate

**Problema actual:**
```typescript
inflationCOP: hardcodeada o manual (desactualizada)
inflationUSD: 3.0% fijo (no refleja realidad)
```

**Tareas:**
- [ ] Investigar fuentes de datos para inflación COP (DANE vía datos.gov.co o Banrep)
- [ ] Investigar fuentes de datos para inflación USD (FRED API o World Bank)
- [ ] Crear Edge Function para fetch inflación mensual/anual
- [ ] Actualizar tabla macro_rates con datos históricos de inflación
- [ ] Reemplazar valores hardcodeados en cálculo de Hurdle Rate
- [ ] Validar que Hurdle Rate se actualiza correctamente con datos reales

**Impacto:** Sin esto, el Hurdle Rate tiene desviaciones de 0.3-0.8% vs valor real.

---

### 2. Hurdle Rate — Completar backend (depende de #1)
**Estado:** UI completa, backend parcial

**Completado:**
- ✅ Cálculo matemático (Ecuación de Fisher)
- ✅ Query TRM histórica (últimos 5 años)
- ✅ Mostrado en ContextStrip del Portafolio con modal educativo
- ✅ Integrado en calculadora CDT vs ETF con veredicto claro
- ✅ Veredictos con lenguaje coloquial y variaciones aleatorias

**Bloqueado por:** Inflación dinámica (#1) — actualmente usa valores hardcodeados

---

### 3. Watchlist ETFs inicial
**Estado:** Vacía

**Acción:** Claude sugerirá 3-5 tickers representativos (VOO, VTI, VXUS, etc.) como semilla. Usuario podrá agregar/quitar después.

---

### 4. Motor de eventos Buzón (backend)
**Estado:** Mockdata funcional, UI completa, **falta backend real**

**Triggers a implementar:**
- CDT próximo a vencer (30/60/90 días antes)
- ETF con drawdown significativo (>15% desde compra)
- Cambio en tasa Banrep → recalcular Hurdle Rate
- Bandas de asignación fuera de rango

**Decisión arquitectónica:** Edge Function con cron semanal que lee portafolio + datos de mercado → genera eventos → inserta en tabla `inbox_events`.

---

### 5. Sistema de Rebalanceo
**Estado:** Pendiente

**Componentes:**
- Evaluación trimestral automática vs bandas
- Rebalanceo de oportunidad (CDT venciendo)
- Recálculo Hurdle Rate ante cambios macro

---

## 🔲 Phase 2 (Post-MVP)

* Calculador tributario interactivo (Phase 1: tooltips educativos)
* Asistente IA con contexto del portafolio
* Matching automático ETFs según perfil
* Perfil de usuario completo (tipo doc, número, ciudad)
* Autenticación biométrica (`expo-local-authentication`)
* Flujo Onboarding (filosofía + configuración bandas)

---

## 🔲 Cumplimiento Legal (prerrequisito para terceros)

**No aplica para uso personal de Harvey.** Cuando haya usuarios externos:
- Política de datos (Ley 1581/2012)
- Aviso de privacidad con checkbox
- Inscripción RNBD ante SIC
- Términos y condiciones (disclaimers legales)
- Revisión legal: validar que no califica como asesoría financiera (SFC)

---

## 📋 Para Winston — Preguntas Pendientes

1. **Watchlist inicial ETFs:** ¿Criterios de selección o tickers específicos recomendados?
2. **Bandas default (CDT 50-70% / ETF 30-50%):** ¿Correcto para perfil Harvey en Phase 1?
3. **Complejidad fiscal:** ¿Falta alguna dimensión relevante para residente colombiano invirtiendo en ETFs USD?
4. **Dependencia única API Banrep:** ¿Riesgo? ¿Complementar con DANE?
5. **¿Algo que falta?** Huecos conceptuales, técnicos o filosóficos identificados.
