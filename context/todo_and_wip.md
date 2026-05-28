# TODO & Work in Progress - Magic Invest

Este documento es el registro vivo del estado del proyecto. Se actualiza en cada sesión de trabajo. Winston puede y debe revisarlo para agregar, cuestionar o re-priorizar ítems desde su perspectiva estratégica.

---

## Estado General
* **Fase conceptual:** ✅ Completa. Todos los documentos de contexto están al día.
* **Fase de implementación:** 🟡 En progreso. Infraestructura base, autenticación y shell completos. **Módulo Herramientas: ✅ COMPLETO.** **Módulo Buzón: ✅ COMPLETO (mock data).**
* **Última sesión:** Módulo Buzón implementado y pulido: lista con swipe-to-delete y swipe-to-markUnread, pantalla de detalle completa, estado reactivo via suscripción, contraste visual leído/no leído (charcoal bold vs stone-gray regular). `GestureHandlerRootView` agregado al root layout. `ThemedText` extendido con tipo `'defaultBold'`.

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
* **Calculadora #5: Simulador CDT vs ETF** (`tools/cdt-vs-etf.tsx`):
  * CDT con retefuente 4% sobre rendimientos (persona natural Colombia). ETF sin retefuente local.
  * Barras comparativas: CDT neto (ámbar) vs ETF proyectado (teal). Sección diferencia.
* **Calculadora #6: DCA vs Lump Sum** (`tools/dca-vs-lump.tsx`):
  * Lump Sum: invierte todo en mes 0. DCA: capital/N cuotas mensuales, cada una crece desde su mes.
  * Sección "Costo de esperar": diferencia de valor final. Alerta si meses DCA > horizonte total.
* **Calculadora #7: Retorno real** (`tools/real-return.tsx`):
  * Ecuación de Fisher: `real = (1+nominal)/(1+inflación) − 1`.
  * Veredicto visual en tres estados: CRECE (teal) / AGUANTA (ámbar) / PIERDE (púrpura).
  * Muestra equivalente en pesos de hoy (poder adquisitivo real al final del horizonte).
* **Calculadora #8: Rendimiento anual promedio / CAGR** (`tools/cagr.tsx`):
  * Fórmula: `CAGR = (valorFinal/valorInicial)^(1/años) − 1`.
  * Caja destacada con el CAGR en teal (positivo) o púrpura (negativo).
  * GrowthChart proyectado con la tasa calculada (solo si CAGR > 0 y años ≥ 2, usando `monthly=0`).
  * ResultCard: valor inicial, valor final, ganancia/pérdida total, retorno acumulado %, CAGR % (highlighted).
* **Calculadora #9: Costo de comisiones / Fee Drag** (`tools/fee-drag.tsx`):
  * Modelo: `FV_neto = capital × (1 + r − TER)^años` vs `FV_bruto = capital × (1 + r)^años`.
  * Caja con costo total en púrpura. Barras comparativas: sin TER (teal) vs con TER (ámbar).
  * ResultCard: FV sin comisión, FV con TER (highlighted), capital perdido, % de ganancia perdida.

### Módulo Buzón (mock data)
* Routing: solo `inbox/` folder — NO existe `inbox.tsx` en raíz (causa duplicate screen en NativeTabs).
* 5 eventos mock en `src/constants/inbox-mock.ts`: tipos `drawdown`, `cdt_maturity`, `market_trigger`, `rebalance`, `educational`. Cada evento tiene `body[]`, `consequences[]` y `disclaimer`.
* Lista (`inbox/index.tsx`): swipe izquierdo → eliminar (rojo), swipe derecho → marcar como no leído (teal, solo en mensajes leídos). Contraste visual: título charcoal bold (no leído) vs stone-gray regular (leído).
* Detalle (`inbox/[id].tsx`): marca como leído via `useEffect` al montar. Secciones: tipo + fecha + asset relacionado, título, cuerpo, escenarios posibles, disclaimer con borde de color.
* Estado reactivo (`src/utils/inbox-state.ts`): store mínimo con `readIds`, `unreadIds`, `deletedIds` y patrón subscribe/notify. La lista se suscribe y re-renderiza automáticamente cuando el detalle marca como leído. Reemplazado por SQLite en producción.
* `GestureHandlerRootView` agregado al root layout (`src/app/_layout.tsx`) — requerido por `Swipeable`.
* `ThemedText` extendido con tipo `'defaultBold'` (fontWeight 700, fontSize 16) — mismo patrón que `small`/`smallBold`.
* **Pendiente futuro:** vincular con Portafolio (campo `relatedAsset`), alimentar con datos reales del backend.

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
| 5 | Simulador CDT vs ETF | ✅ Completa |
| 6 | ¿Invierto mes a mes o todo de una vez? | ✅ Completa |
| 7 | ¿Tu plata crece o solo aguanta? | ✅ Completa |
| 8 | Rendimiento anual promedio | ✅ Completa |
| 9 | ¿Cuánto te cuestan las comisiones en 20 años? | ✅ Completa |

Patrón establecido para todas: selector COP/USD → campos con InputField → botón Calcular → GrowthChart (si aplica) → ResultCard → disclaimer. Auto-scroll a resultados al calcular.

### 7. Módulo Portafolio

#### 7.1 Flujo de perfil de riesgo (primera vez en el tab — prerequisito)
Se ejecuta una sola vez, la primera vez que el usuario entra al tab Portafolio. 5 preguntas, máximo 2 minutos. El resultado alimenta las bandas iniciales CDT/ETF, el tono del Buzón y la proyección del estado vacío.

Preguntas:
1. ¿En cuánto tiempo planeas usar este dinero? *(< 3 años / 3–10 años / +10 años)*
2. Si tu portafolio cae 20% en un mes, ¿qué harías? *(Salgo todo / Mantengo / Invierto más)*
3. ¿Cuál es tu objetivo principal? *(Preservar capital / Crecer moderadamente / Maximizar crecimiento)*
4. ¿Cuánto podrías aportar mensualmente? *(rangos en COP)*
5. ¿Cómo describirías tu conocimiento financiero? *(Básico / Intermedio / Avanzado)*

Output del perfil:
- Label: `conservador` / `moderado` / `agresivo`
- Bandas CDT/ETF calculadas según perfil (en lugar del default genérico 50–70%)
- Parámetro de tono para los eventos del Buzón (lenguaje más explicativo para básico, más técnico para avanzado)
- Horizonte de inversión declarado (alimenta proyecciones)

Persistencia: `user_config` en SQLite con clave `risk_profile`. Si ya existe, no se muestra el flujo.

#### 7.2 Estado vacío (sin posiciones registradas)
No una pantalla en blanco. Muestra:
- Distribución configurada (bandas del perfil, visualización visual CDT/ETF)
- Proyección probabilística hipotética: "Con $10.000.000 y tu perfil, en 10 años proyectarías entre $X y $Y"
- Contexto macro: Banrep actual, CDT mercado, TRM, inflación
- CTA: [+ Registrar mi primer CDT] / [+ Registrar mi primer ETF]

#### 7.3 Estado con activos (diseño de la pantalla principal)
```
Portafolio · $XX.XXX.000 COP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Proyección a 10 años: $XXM – $XXM  ← elemento visual protagonista

DISTRIBUCIÓN          [estado: dentro/cerca/fuera de bandas]
CDTs  68% ████████░░  [50–70%] ✓
ETFs  32% ████░░░░░░  [30–50%] ✓

— lista de CDTs —
CDT Bancolombia · $15.000.000 · 12.8% EA
Vence en 45 días · proyectado $15.213k neto

— lista de ETFs —
VOO · 12 acciones
Costo: USD 480 · Hoy: USD 521
$14.992.800 COP (TRM $3.960) · CAGR desde compra: +8.5%

CONTEXTO ACTUAL
Banrep 9.25% · CDT mercado 11.2% · Inflación 5.3% · TRM $3.960
```

Color de "salud estructural": teal (dentro de bandas), ámbar (cerca del límite), púrpura (fuera). Nunca rojo/verde de mercado.

#### 7.4 Formulario de registro de CDT
Campos: banco (selector), monto COP, tasa EA (%), fecha inicio, plazo en días, tipo de capitalización (vencimiento / mensual / trimestral).
La app calcula automáticamente: fecha vencimiento, rendimiento bruto, retefuente (4% sobre rendimientos), rendimiento neto.

#### 7.5 Formulario de registro de ETF
Campos: ticker (con búsqueda/autocompletado de la watchlist), número de acciones, precio promedio de compra (USD), TER (%).
La app obtiene precio EOD del backend. Muestra valor actual en USD y COP al TRM vigente.

#### 7.6 Detalle de activo
- CDT: proyección de valor al vencimiento, contexto vs. tasas de mercado vigentes, eventos del Buzón relacionados
- ETF: CAGR desde compra, MaxDD histórico, Sortino estimado, proyección probabilística a horizonte declarado, comparación vs. Hurdle Rate, eventos del Buzón relacionados

#### 7.7 Vinculación con el Buzón
- En el detalle de un activo: sección "Eventos relacionados" al final
- En el detalle de un evento del Buzón: chip navegable con el nombre del activo que lleva al detalle en Portafolio (ya implementado con `relatedAsset` en el mock)

### 8. Backend Supabase — Edge Functions
* Edge Function con cron para consulta periódica a API Banrep (tasa política + CDT promedio)
* Edge Function para sincronización de datos EOD de ETFs
* Capa de sincronización Supabase → SQLite local

### 9. Sistema de Rebalanceo
* Evaluación trimestral automática contra bandas configuradas
* Rebalanceo de oportunidad al detectar CDT próximo a madurar
* Recálculo del Hurdle Rate cuando cambia la tasa Banrep

### 10. Flujo de Onboarding (al final, pre-publicación)
* Pantalla que presenta la filosofía básica en lenguaje accesible (sin tecnicismos)
* Configuración de bandas de asignación CDT/ETF con slider (default: calculadas desde el perfil de riesgo)
* Solo se muestra la primera vez (verificar con `isOnboardingComplete()` en SQLite)
* **Nota:** Se implementa cuando todas las funcionalidades estén terminadas y probadas, para poder describir y mostrar con precisión qué hace la app.

### 11. Cumplimiento legal (prerrequisito para lanzar a terceros — no aplica para uso personal de Harvey)
* **Política de tratamiento de datos** (Ley 1581/2012): redactar documento completo con finalidad, plazo de conservación, derechos del titular. Reemplaza el placeholder del DrawerMenu.
* **Aviso de privacidad**: versión corta mostrada en pantalla de registro con checkbox de autorización expresa.
* **Inscripción RNBD**: registro de la base de datos ante la SIC cuando haya usuarios distintos a Harvey.
* **Revisión legal**: validar con abogado colombiano especializado en fintech que el modelo de análisis/información no califica como asesoría financiera ni intermediación bajo la regulación SFC.
* **Términos y condiciones**: reemplazar placeholder del DrawerMenu con documento real que incluya: (a) la app no es un broker ni asesor financiero; (b) el usuario registra posiciones que tiene en otras entidades; (c) el análisis es educativo e histórico, no predictivo.

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
