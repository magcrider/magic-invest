# TODO & Work in Progress - Magic Invest

Registro vivo del estado del proyecto. Actualizado en cada sesión. Winston puede revisar, agregar o re-priorizar ítems.

**Historial completo de tareas completadas:** ver `todo_archive.md`

---

## Estado General

* **Fase conceptual:** ✅ Completa
* **Fase de implementación:** 🟡 En progreso
  * Infraestructura base: ✅ COMPLETO
  * Autenticación: ✅ COMPLETO
  * Shell y navegación: ✅ COMPLETO
  * Módulo Herramientas (10 calculadoras): ✅ COMPLETO
  * Módulo Buzón (mock data): ✅ COMPLETO
  * Módulo Portafolio Fase 1: ✅ COMPLETO
  * Sistema color dinámico (light/dark): ✅ COMPLETO
  * Persistencia Supabase: ✅ COMPLETO
  * Sistema validación/formateo inputs: ✅ COMPLETO
  * Modals educativos: ✅ COMPLETO

* **Última sesión:** junio 3, 2026
  * ✅ **Calculadora #10: Cuota de crédito** — Sistema francés de amortización
    - Inputs: Monto, tasa EA, plazo en meses
    - Outputs: Cuota fija, total a pagar, total intereses, primera/última cuota (capital e intereses)
    - Modals educativos para tasa y plazo con info contextual
    - Validación y formateo consistente con resto de calculadoras
  * ✅ **Rediseño UX Herramientas:**
    - Cuadrícula 3 columnas (antes: lista vertical)
    - Nombres cortos optimizados (ej: "Interés compuesto", "CDT vs ETF", "CAGR")
    - Tarjetas cuadradas con ícono + título centrado
    - Calculadora de crédito en 4ta posición
  * ✅ Mejoras UX calculadoras:
    - Espaciados optimizados (labels más cerca de inputs)
    - Scroll automático a resultados sin tapar contenido
    - Altura consistente en todos los campos de input

* **Próximo paso:** Motor de eventos Buzón

---

## 🔲 Investigación Técnica Pendiente

### 1. ~~API Banco de la República~~ ✅ COMPLETADO
* **Implementado:** TRM + CDT vía datos.gov.co, Inflación vía World Bank API
* **Ver:** `architecture_state.md` §7.B para detalles completos

### 2. ~~Fuente datos EOD para ETFs~~ ✅ COMPLETADO
* **Implementado:** EODHD.com (tier free: 20 req/día, tier pagado: $19.99/mes)
* **Ver:** `architecture_state.md` §7.A para detalles completos

### 3. Watchlist inicial ETFs
* **Estado:** Vacía
* **Acción:** Claude sugerirá tickers representativos (VOO, VTI, VXUS) como semilla

---

## 🔲 Implementación — Por Orden de Prioridad

### 4. Perfil de usuario completo (post-signup)
* Formulario desde `DrawerMenu` con campos opcionales: tipo documento (CC, CE, Pasaporte, NIT — constante TypeScript), número, ciudad
* No requiere tabla DB (constante)

### 5. Autenticación biométrica
* `expo-local-authentication` — capa local que desbloquea sesión AsyncStorage
* Switch visible en `DrawerMenu` (actualmente deshabilitado)
* Implementar después de módulos principales

### 6. Backend Supabase — Edge Functions
* ~~Edge Function + cron: API Banrep (TRM + CDT + Inflación)~~ ✅ COMPLETADO (Junio 2/2026)
* ~~Edge Function: sincronización EOD para ETFs~~ ✅ COMPLETADO (Junio 2/2026)
* Motor generación eventos Buzón (triggers + datos mercado) (pendiente)

### 7. Sistema de Rebalanceo
* Evaluación trimestral automática vs bandas configuradas
* Rebalanceo de oportunidad (CDT próximo a vencer)
* Recálculo Hurdle Rate (cambio tasa Banrep)

### 8. Flujo Onboarding (pre-publicación)
* Pantalla filosofía básica (lenguaje accesible, sin tecnicismos)
* Configuración bandas CDT/ETF con slider (default: desde perfil)
* Solo 1ª vez (flag `onboarding_completed` en Supabase)
* Implementar cuando todas las features estén terminadas

### 9. Cumplimiento legal (prerrequisito para terceros)
* **No aplica para uso personal de Harvey**
* **Política datos** (Ley 1581/2012): documento completo con finalidad, plazo, derechos
* **Aviso privacidad**: versión corta en registro con checkbox autorización
* **Inscripción RNBD**: registro base de datos ante SIC (cuando haya usuarios ≠ Harvey)
* **Revisión legal**: validar que análisis/info no califica como asesoría financiera bajo SFC
* **Términos y condiciones**: documento real con (a) app no es broker/asesor, (b) usuario registra posiciones externas, (c) análisis educativo/histórico

---

## 🔲 Deuda Técnica Deliberada (Phase 2)

* **Tasas CDT por banco individual:** Banrep da promedios. Por banco requerirá scraping o entrada manual.
* **Calculador tributario interactivo:** Phase 1 tiene tooltips educativos. Calculador real → Phase 2.
* **Asistente IA:** Chat con contexto del portafolio. Buzón educativo es su precursor.
* **Multi-dispositivo:** Ya funciona nativamente (Supabase + RLS).
* **Matching automático ETFs:** Selección automática según perfil. Phase 1 usa watchlist manual.

---

## 📋 Para Winston — Revisión Solicitada

1. **API Banrep única fuente Hurdle Rate:** ¿Riesgo de dependencia? ¿Complementar con DANE?
2. **Bandas default (CDTs 50–70% / ETFs 30–50%):** ¿Correcto para perfil Harvey en Phase 1?
3. **Watchlist inicial ETFs:** ¿Criterios de selección o tickers específicos?
4. **Complejidad fiscal:** ¿Falta alguna dimensión fiscal relevante para residente colombiano invirtiendo en ETFs USD?
5. **¿Algo que falta?** Huecos conceptuales, técnicos o filosóficos identificados en contextos.
