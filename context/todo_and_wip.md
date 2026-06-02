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
  * Módulo Herramientas (9 calculadoras): ✅ COMPLETO
  * Módulo Buzón (mock data): ✅ COMPLETO
  * Módulo Portafolio Fase 1: ✅ COMPLETO
  * Sistema color dinámico (light/dark): ✅ COMPLETO
  * Persistencia Supabase: ✅ COMPLETO
  * Sistema validación/formateo inputs: ✅ COMPLETO
  * Modals educativos: ✅ COMPLETO

* **Última sesión:** junio 1, 2026
  * Auto-retry JWT transparente (PGRST303)
  * Proyección rediseñada (3 horizontes: 2A, 5A, 10A)
  * Modals educativos (Perfil + Proyección)
  * Fix parsing monedas (detecta formato español/inglés)
  * Consistencia símbolos monetarios (COP/USD explícito)

* **Próximo paso:** §8 Backend Supabase (Edge Functions Banrep + EOD)

---

## 🔲 Investigación Técnica Pendiente

### 1. API Banco de la República
* **Qué:** Endpoints para (a) tasa política, (b) tasas CDT promedio por plazo, (c) TRM histórica
* **Por qué:** Fuente Hurdle Rate, trigger Buzón, tasas CDT base
* **Decisión pendiente:** ¿Complementar con DANE (inflación)?

### 2. Fuente datos EOD para ETFs
* **Candidatos:** Alpha Vantage, EOD Historical Data, Yahoo Finance, Polygon.io
* **Criterios:** Rate limits, cobertura ETFs internacionales, histórico 5-10 años, tier gratuito, integración Edge Function

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
* Edge Function + cron: API Banrep (tasa política + CDT promedio)
* Edge Function: sincronización EOD para ETFs
* Motor generación eventos Buzón (triggers + datos mercado)

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
