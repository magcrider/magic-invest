# TODO & Work in Progress - Magic Invest

Registro vivo del estado del proyecto. **Historial completo:** ver `todo_archive.md`

---

## Estado General

* **Fase:** 🟡 Implementación en progreso
* **Última sesión:** junio 4, 2026
* **Completados:**
  - Infraestructura + Autenticación + Shell
  - Módulo Herramientas (10 calculadoras)
  - Módulo Buzón — **UI + Backend completo con datos reales + Markdown enriquecido**
  - Módulo Portafolio Fase 1 (CRUD completo + badges dinámicos)
  - Backend Supabase (TRM, CDT rates, EOD prices, **Inflación dinámica desde World Bank**)
  - **Motor de eventos Buzón** — 4 de 5 triggers implementados con mensajes Markdown ricos
    - CDT maturity (tablas, blockquotes, emojis, 3 escenarios)
    - Drawdown ETF (análisis histórico con tabla comparativa)
    - Cambio tasa Banrep (impacto en Hurdle Rate con diferencial visual)
    - Bandas de asignación (tabla distribución, opciones de rebalanceo numeradas)
  - Sistema color dinámico (light/dark)
  - Sistema validación/formateo inputs
  - Modals educativos
  - **Hurdle Rate 100% dinámico y preciso** (sin datos hardcodeados)
  - **Sistema retry automático JWT** (PGRST303 transparente para usuario)

---

## 🎯 Próximos Pasos Inmediatos

### 1. Watchlist ETFs inicial
**Estado:** Vacía

**Acción:** Claude sugerirá 3-5 tickers representativos (VOO, VTI, VXUS, etc.) como semilla. Usuario podrá agregar/quitar después.

**Desbloquea:** Trigger #5 del Buzón (ETF cruza Hurdle Rate)

---

### 2. Sistema de Rebalanceo
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
