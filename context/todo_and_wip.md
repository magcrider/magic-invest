# TODO & Work in Progress - Magic Invest

Este documento es el registro vivo del estado del proyecto. Se actualiza en cada sesión de trabajo. Winston puede y debe revisarlo para agregar, cuestionar o re-priorizar ítems desde su perspectiva estratégica.

---

## Estado General
* **Fase conceptual:** ✅ Completa. Todos los documentos de contexto están al día.
* **Fase de implementación:** 🟡 En progreso. Infraestructura base y flujo de autenticación completos. Próximo: onboarding.
* **Última sesión:** Captura de nombre en signup, saludo personalizado en Portfolio, toggle de contraseña, componente `DrawerMenu` (panel lateral animado con perfil, configuración, legal, versión, logout), componente `PageHeader` compartido en los tres tabs, fix de bug en animación del drawer.

---

## ✅ Completado

### Infraestructura base
* Estructura del proyecto: Expo SDK 56, React 19, TypeScript strict, Expo Router, NativeTabs
* Tokens de diseño en `src/constants/theme.ts` (cromático, espaciado, safe area)
* Schema SQLite local: 7 tablas + índices + sistema de migraciones versionadas (`src/db/`)
* Cliente Supabase en `src/lib/supabase.ts` con AsyncStorage y PKCE
* Schema PostgreSQL en Supabase con RLS (tablas de mercado + tablas de usuario)
* `@expo/vector-icons` instalado (Ionicons)

### Autenticación
* Login email/password: `useAuth` hook, flujo signin/signup con validación
* Campo "¿Cómo te llamamos?" en registro → almacenado en `user_metadata.full_name` (Supabase Auth)
* Toggle de visibilidad de contraseña con ícono `eye-outline` / `eye-off-outline`
* Deep linking `magicinvest://auth/callback`: `useAuth` intercepta la URL en cold start (`Linking.getInitialURL`) y warm start (`Linking.addEventListener`), extrae el PKCE code y llama `exchangeCodeForSession` — `onAuthStateChange` propaga la sesión automáticamente
* **Pendiente (manual, una vez):** En Supabase → Authentication → URL Configuration: agregar `magicinvest://auth/callback` en Redirect URLs

### Navegación y shell
* Tres tabs: Portafolio, Buzón, Herramientas (NativeTabs)
* `PageHeader`: componente compartido con título, subtítulo opcional y botón hamburguesa; disponible en los tres tabs
* `DrawerMenu`: panel lateral animado (slide desde la derecha, backdrop oscuro) con secciones de perfil del usuario, configuración (switch biométrico placeholder), legal (placeholders), versión de app y botón de cierre de sesión. Usa `Modal` para flotar sobre cualquier tab. Fix aplicado: ref `isMounted` para evitar que la animación de cierre inicial cancele una apertura rápida al cargar la app.
* Saludo personalizado en Portafolio: `"Hola, {nombre} · Tus posiciones reales"` (con fallback si no hay nombre)

---

## 🔲 Investigación Técnica Pendiente

### 1. API pública del Banco de la República
* **Qué investigar:** Endpoints para (a) tasa de política monetaria y (b) tasas de captación CDT promedio por plazo. Verificar formato, frecuencia de actualización, estabilidad y cobertura de TRM histórica.
* **Por qué importa:** Fuente de datos para el Hurdle Rate, trigger macroeconómico del Buzón y tasas CDT base.
* **Decisión pendiente:** ¿Es suficiente Banrep o necesitamos complementar con DANE (inflación) o fuentes de TRM adicionales?
* **Para Winston:** ¿Ves riesgo en depender de una sola fuente oficial para un parámetro tan central como la tasa libre de riesgo local?

### 2. Fuente de datos EOD para ETFs
* **Candidatos:** Alpha Vantage, EOD Historical Data, Yahoo Finance, Polygon.io.
* **Criterios:** Rate limits, cobertura de ETFs internacionales, datos históricos 5-10 años, costo tier gratuito/básico, facilidad de integración en Edge Function.
* **Para Winston:** ¿Perspectiva sobre confiabilidad de estas fuentes para datos históricos de largo plazo (10 años)?

### 3. Watchlist inicial de ETFs
* **Estado:** Vacía. Harvey no tiene lista predefinida.
* **Acción:** Claude sugerirá tickers representativos (VOO, VTI, VXUS u otros) como semilla funcional al iniciar el módulo Portafolio.
* **Para Winston:** ¿Criterios de selección inicial más allá de ser indexados y de bajo TER?

---

## 🔲 Implementación — Por Orden de Prioridad

### 4. Perfil de usuario completo (post-signup)
* **Qué hacer:** Formulario de perfil accesible desde el `DrawerMenu` con campos opcionales: tipo de documento (CC, CE, Pasaporte, NIT — constante TypeScript, no tabla DB), número de documento, ciudad.
* **Por qué:** El documento puede ser útil para cálculos fiscales futuros. No es bloqueante para Phase 1.
* **Decisión de diseño:** Tipos de documento como constante TypeScript (dato estático, raramente cambia en Colombia). No requiere tabla de referencia en DB.

### 5. Autenticación biométrica
* **Qué hacer:** `expo-local-authentication` como capa local que desbloquea la sesión guardada en AsyncStorage. El usuario hace login una vez; las siguientes aperturas usan huella/Face ID.
* **Switch ya visible** en el `DrawerMenu` (deshabilitado). Se activa cuando se implemente.
* **Deuda deliberada:** Implementar después de que los módulos principales estén funcionales.

### 6. Flujo de Onboarding
* Pantalla que presenta la filosofía básica en lenguaje accesible (sin tecnicismos)
* Configuración de bandas de asignación CDT/ETF con slider (default: CDTs 50–70% / ETFs 30–50%)
* Solo se muestra la primera vez (verificar con `isOnboardingComplete()` en SQLite)

### 7. Módulo Portafolio
* Vista de lista: activos con nombre, valor actual, indicador de salud estructural
* Detalle de activo: métricas (CAGR, MaxDD, Sortino), proyección probabilística, sección "Eventos relacionados" (vinculación al Buzón), sección colapsada "¿Qué vale el tiempo que llevas?"
* Sin badges en la lista; profundidad accesible desde el detalle

### 8. Módulo Buzón
* Cuatro tipos de evento: (1) disparadores de mercado, (2) comportamiento durante caídas, (3) maduración de CDT / rebalanceo de oportunidad, (4) acompañamiento educativo progresivo
* Disclaimer permanente en cada evento
* Vinculación bidireccional con Portafolio
* Cero push notifications, cero badges en ícono de app

### 9. Módulo Herramientas
* Calculadoras estáticas locales: proyección de interés compuesto, simulación de aportes, comparador CDT vs ETF
* Corren completamente offline, no tocan el portafolio real

### 10. Backend Supabase — Edge Functions
* Edge Function con cron para consulta periódica a API Banrep (tasa política + CDT promedio)
* Edge Function para sincronización de datos EOD de ETFs
* Capa de sincronización Supabase → SQLite local

### 11. Sistema de Rebalanceo
* Evaluación trimestral automática contra bandas configuradas
* Rebalanceo de oportunidad al detectar CDT próximo a madurar
* Recálculo del Hurdle Rate cuando cambia la tasa Banrep

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
