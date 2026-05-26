# TODO & Work in Progress - Magic Invest

Este documento es el registro vivo del estado del proyecto. Se actualiza en cada sesión de trabajo. Winston puede y debe revisarlo para agregar, cuestionar o re-priorizar ítems desde su perspectiva estratégica.

---

## Estado General
* **Fase conceptual:** ✅ Completa. Todos los documentos de contexto están al día.
* **Fase de implementación:** 🟡 En progreso. Infraestructura base, autenticación y shell completos. Módulo Herramientas: calculadoras #1–4 funcionales y validadas en emulador.
* **Última sesión:** Calculadoras #2 "Tiempo para alcanzar tu meta", #3 "Calculadora para salir de deudas" y #4 "Conversor de tasas" completadas. Patrón de scroll, auto-scroll a resultados y convención de color consolidados. Orden de resultados establecido por tipo: calculadoras de acumulación (gráfica primero → tabla), calculadoras de meta (tabla primero → gráfica). Conversor de tasas con tabs internos (EA → NM/EM → NA), conversiones bidireccionales entre NM/EM, NA y EA.

---

## ✅ Completado

### Infraestructura base
* Estructura del proyecto: Expo SDK 56, React 19, TypeScript strict, Expo Router, NativeTabs
* Tokens de diseño en `src/constants/theme.ts` (cromático, espaciado, safe area)
* Schema SQLite local: 7 tablas + índices + sistema de migraciones versionadas (`src/db/`)
* Cliente Supabase en `src/lib/supabase.ts` con AsyncStorage y PKCE
* Schema PostgreSQL en Supabase con RLS (tablas de mercado + tablas de usuario)
* `@expo/vector-icons` instalado (Ionicons)
* `src/utils/format.ts`: formateo de moneda (COP/USD), porcentajes, abreviación de valores (K/M/B), parseNumber

### Autenticación
* Login email/password: `useAuth` hook, flujo signin/signup con validación
* Campo "¿Cómo te llamamos?" en registro → almacenado en `user_metadata.full_name` (Supabase Auth)
* Toggle de visibilidad de contraseña con ícono `eye-outline` / `eye-off-outline`
* Deep linking `magicinvest://auth/callback`: `useAuth` intercepta la URL en cold start (`Linking.getInitialURL`) y warm start (`Linking.addEventListener`), extrae el PKCE code y llama `exchangeCodeForSession` — `onAuthStateChange` propaga la sesión automáticamente
* **Pendiente (manual, una vez):** En Supabase → Authentication → URL Configuration: agregar `magicinvest://auth/callback` en Redirect URLs

### Navegación y shell
* Tres tabs: Portafolio, Buzón, Herramientas (NativeTabs)
* `PageHeader`: componente compartido con título, subtítulo opcional y botón hamburguesa; disponible en los tres tabs
* `DrawerMenu`: panel lateral animado (slide desde la derecha, backdrop oscuro) con secciones de perfil del usuario, configuración (switch biométrico placeholder), legal (placeholders), versión de app y botón de cierre de sesión. Usa `Modal` para flotar sobre cualquier tab. Fix: ref `isMounted` para evitar que la animación de cierre inicial cancele una apertura rápida.
* Saludo personalizado en Portafolio: `"Hola, {nombre} · Tus posiciones reales"` (con fallback si no hay nombre)

### Módulo Herramientas — Shell y calculadoras #1–4
* Lista de 9 herramientas en tarjetas (nombre + descripción + ícono único). Ordenadas por frecuencia de uso estimada.
* Navegación stack dentro del tab Herramientas: `tools/_layout.tsx` (Stack sin header) + `tools/index.tsx` (lista) + `tools/[id].tsx` (placeholder genérico) + archivos individuales por calculadora.
* **Componentes compartidos** en `src/components/calculator/`:
  * `CurrencySelector`: toggle COP / USD estilo segmented control
  * `InputField`: campo numérico con etiqueta, sufijo y hint opcional
  * `ResultCard`: tarjeta de resultados con filas, fila destacada en teal y dots de color para convención visual
  * `GrowthChart`: gráfica de barras apiladas (capital aportado vs ganancias) con etiquetas de valor abreviadas y leyenda. Sin año 0. Scroll horizontal automático.
* **Calculadora #1: Interés compuesto / Valor futuro** (`tools/compound-interest.tsx`):
  * Selector COP/USD, cuatro campos (capital inicial, aporte mensual, tasa anual, horizonte)
  * Resultados: gráfica primero → tabla → disclaimer
  * Fórmula: `FV = PV(1+r)^n + PMT × [(1+r)^n − 1) / r]`
* **Calculadora #2: Tiempo para alcanzar tu meta** (`tools/time-to-goal.tsx`):
  * Búsqueda binaria sobre meses (lo=0, hi=600) para encontrar cuándo FV ≥ target
  * 3 estados: normal, alreadyReached (checkmark), unreachable (alert)
  * Resultados: tabla primero → gráfica (si ≥ 1 año) → disclaimer
* **Calculadora #3: Salir de deudas** (`tools/debt-freedom.tsx`):
  * Fórmula: `n = -ln(1 - balance·r/payment) / ln(1+r)`. Alerta si pago < interés mensual.
  * Pago extra opcional. Resultados: barras comparativas → escenario mínimo → escenario acelerado → ahorro.
  * `ComparisonBars`: dos barras proporcionales usando flex ratios.
* **Calculadora #4: Conversor de tasas** (`tools/rate-converter.tsx`):
  * Tabs internos en orden EA → NM/EM → NA. Conversiones bidireccionales.
  * FROM EA: `nm = (1+r)^(1/12) − 1`. FROM NM: `ea = (1+r)^12 − 1`. FROM NA: `nm = r/12`.
  * Resultado siempre muestra las otras dos tasas + la EM cuando el tab activo es EA o NA.

---

## 🔲 Investigación Técnica Pendiente

### 1. API pública del Banco de la República
* **Qué investigar:** Endpoints para (a) tasa de política monetaria y (b) tasas de captación CDT promedio por plazo. Verificar formato, frecuencia de actualización, estabilidad y cobertura de TRM histórica.
* **Por qué importa:** Fuente de datos para el Hurdle Rate, trigger macroeconómico del Buzón y tasas CDT base.
* **Decisión pendiente:** ¿Es suficiente Banrep o necesitamos complementar con DANE (inflación) o fuentes de TRM adicionales?

### 2. Fuente de datos EOD para ETFs
* **Candidatos:** Alpha Vantage, EOD Historical Data, Yahoo Finance, Polygon.io.
* **Criterios:** Rate limits, cobertura de ETFs internacionales, datos históricos 5-10 años, costo tier gratuito/básico, facilidad de integración en Edge Function.

### 3. Watchlist inicial de ETFs
* **Estado:** Vacía. Harvey no tiene lista predefinida.
* **Acción:** Claude sugerirá tickers representativos (VOO, VTI, VXUS u otros) como semilla funcional al iniciar el módulo Portafolio.

---

## 🔲 Implementación — Por Orden de Prioridad

### 4. Perfil de usuario completo (post-signup)
* **Qué hacer:** Formulario de perfil accesible desde el `DrawerMenu` con campos opcionales: tipo de documento (CC, CE, Pasaporte, NIT — constante TypeScript, no tabla DB), número de documento, ciudad.
* **Decisión de diseño:** Tipos de documento como constante TypeScript. No requiere tabla de referencia en DB.

### 5. Autenticación biométrica
* `expo-local-authentication` como capa local que desbloquea la sesión guardada en AsyncStorage.
* Switch ya visible en el `DrawerMenu` (deshabilitado). Se activa cuando se implemente.
* **Deuda deliberada:** Implementar después de que los módulos principales estén funcionales.

### 6. Módulo Herramientas — Calculadoras 2–9 (En progreso)

Lista priorizada por frecuencia de uso estimada. Calculadora #1 completa — continuar en orden:

| # | Nombre | Estado |
|---|--------|--------|
| 1 | Interés compuesto / Valor futuro | ✅ Completa |
| 2 | Tiempo para alcanzar tu meta | ✅ Completa |
| 3 | Calculadora para salir de deudas | ✅ Completa |
| 4 | Conversor de tasas | ✅ Completa |
| 5 | Simulador CDT vs ETF | 🔲 Pendiente |
| 6 | ¿Invierto mes a mes o todo de una vez? | 🔲 Pendiente |
| 7 | ¿Tu plata crece o solo aguanta? | 🔲 Pendiente |
| 8 | Rendimiento anual promedio | 🔲 Pendiente |
| 9 | ¿Cuánto te cuestan las comisiones en 20 años? | 🔲 Pendiente |

Patrón establecido para todas: selector COP/USD → campos con InputField → botón Calcular → GrowthChart (si aplica) → ResultCard → disclaimer. Auto-scroll a resultados al calcular.

### 7. Módulo Portafolio
* Vista de lista: activos con nombre, valor actual, indicador de salud estructural
* Detalle de activo: métricas (CAGR, MaxDD, Sortino), proyección probabilística, sección "Eventos relacionados" (vinculación al Buzón)
* Sin badges en la lista; profundidad accesible desde el detalle

### 8. Módulo Buzón
* Cuatro tipos de evento: (1) disparadores de mercado, (2) comportamiento durante caídas, (3) maduración de CDT / rebalanceo de oportunidad, (4) acompañamiento educativo progresivo
* Disclaimer permanente en cada evento
* Vinculación bidireccional con Portafolio
* Cero push notifications, cero badges en ícono de app

### 9. Backend Supabase — Edge Functions
* Edge Function con cron para consulta periódica a API Banrep (tasa política + CDT promedio)
* Edge Function para sincronización de datos EOD de ETFs
* Capa de sincronización Supabase → SQLite local

### 10. Sistema de Rebalanceo
* Evaluación trimestral automática contra bandas configuradas
* Rebalanceo de oportunidad al detectar CDT próximo a madurar
* Recálculo del Hurdle Rate cuando cambia la tasa Banrep

### 11. Flujo de Onboarding (al final, pre-publicación)
* Pantalla que presenta la filosofía básica en lenguaje accesible (sin tecnicismos)
* Configuración de bandas de asignación CDT/ETF con slider (default: CDTs 50–70% / ETFs 30–50%)
* Solo se muestra la primera vez (verificar con `isOnboardingComplete()` en SQLite)
* **Nota:** Se implementa cuando todas las funcionalidades estén terminadas y probadas, para poder describir y mostrar con precisión qué hace la app.

---

## 🔲 Deuda Técnica Deliberada (Phase 2)

* **Automatización de tasas CDT por banco individual:** si Banrep solo da promedios, las tasas por banco (Bancolombia, Bogotá, Davivienda) requerirán scraping o entrada manual en Phase 1.
* **Implicaciones fiscales interactivas:** la educación fiscal está en tooltips y pantallas de detalle, pero un calculador de impacto tributario real queda para Phase 2.
* **Asistente IA:** chat con acceso contextual al portafolio. El Buzón educativo de Phase 1 es su precursor.
* **Multi-dispositivo:** la arquitectura SQLite + Supabase lo habilita, pero no se implementa en Phase 1.
* **Algoritmo de matching ETFs:** selección automática según perfil de Harvey. Phase 1 usa watchlist manual.

---

## 📋 Para Winston — Revisión Solicitada

1. **API Banrep como fuente única del Hurdle Rate:** ¿ves riesgo de dependencia en una sola fuente oficial para la tasa libre de riesgo local?
2. **Bandas de asignación por defecto (CDTs 50–70% / ETFs 30–50%):** ¿este default conservador es el correcto para el perfil de Harvey en Phase 1?
3. **Watchlist inicial de ETFs:** ¿propones criterios de selección o tickers específicos alineados con la tesis de inversión?
4. **Complejidad fiscal:** ¿falta alguna dimensión fiscal relevante para un residente colombiano invirtiendo en ETFs USD no cubierta en `investment_thesis.md` §5?
5. **¿Algo que falta?** Si al revisar los documentos de contexto identificas huecos conceptuales, técnicos o filosóficos, este es el lugar para registrarlos.
