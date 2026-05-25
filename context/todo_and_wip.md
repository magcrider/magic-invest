# TODO & Work in Progress - Magic Invest

Este documento es el registro vivo del estado del proyecto. Se actualiza en cada sesión de trabajo. Winston puede y debe revisarlo para agregar, cuestionar o re-priorizar ítems desde su perspectiva estratégica.

---

## Estado General
* **Fase conceptual:** ✅ Completa. Todos los documentos de contexto están al día.
* **Fase de implementación:** 🔲 No iniciada. Lista para comenzar.
* **Última sesión:** Revisión filosófica completa con Claude Code. Se incorporaron decisiones de diseño, nuevos principios de lenguaje y nuevos disparadores al sistema.

---

## 🔲 Investigación Técnica Pendiente

### 1. API pública del Banco de la República
* **Qué investigar:** Endpoints disponibles para (a) tasa de política monetaria y (b) tasas de captación CDT promedio por plazo. Verificar formato de respuesta, frecuencia de actualización, estabilidad del servicio, y si cubre TRM histórica.
* **Por qué importa:** Es la fuente de datos para el Hurdle Rate, el trigger macroeconómico del Buzón, y potencialmente las tasas CDT base. Si cubre todo, evitamos múltiples fuentes.
* **Decisión pendiente:** Confirmar si con Banrep es suficiente o si necesitamos complementar con DANE (inflación) o fuentes de TRM adicionales.
* **Para Winston:** ¿Ves algún riesgo en depender de una sola fuente oficial para el Hurdle Rate completo?

### 2. Fuente de datos EOD para ETFs
* **Candidatos:** Alpha Vantage, EOD Historical Data, Yahoo Finance, Polygon.io.
* **Criterios de evaluación:** rate limits, cobertura de ETFs internacionales, datos históricos 5-10 años, costo tier gratuito/básico, facilidad de integración en una Edge Function.
* **Para Winston:** ¿Tienes perspectiva sobre la confiabilidad de estas fuentes para datos históricos de largo plazo (10 años)?

### 3. Watchlist inicial de ETFs
* **Estado:** Vacía. Harvey no tiene lista predefinida.
* **Acción:** Claude sugerirá tickers representativos como semilla funcional (VOO, VTI, VXUS u otros) al iniciar el módulo Portafolio.
* **Para Winston:** ¿Propones algún criterio de selección inicial más allá de ser indexados y de bajo TER?

---

## 🔲 Implementación — Por Orden de Prioridad

### 4. Estructura base del proyecto
* Crear proyecto con `npx create-expo-app` en TypeScript
* Configurar TypeScript estricto (`strict: true`, sin `any`)
* Estructura de carpetas por módulo: `modules/portfolio`, `modules/inbox`, `modules/tools`
* Tokens de diseño del sistema cromático como constantes TypeScript
* Navegación tab con los tres módulos

### 5. Backend Supabase (día uno)
* Crear proyecto en Supabase
* Schema PostgreSQL inicial: tablas para tasas Banrep, tasas CDT históricas, configuración de usuario (bandas de asignación)
* Edge Function con cron para consulta periódica a Banrep
* Configurar autenticación magic link

### 6. Schema SQLite local
* Tablas locales: activos (CDTs, ETFs), eventos del Buzón, configuración de usuario, datos EOD cacheados, tasas históricas sincronizadas desde Supabase
* Migraciones versionadas desde el inicio
* Capa de sincronización Supabase → SQLite

### 7. Flujo de Onboarding
* Pantalla que presenta la filosofía básica en lenguaje accesible (sin tecnicismos)
* Configuración de bandas de asignación CDT/ETF con slider (default: CDTs 50–70% / ETFs 30–50%)
* Conexión de primeros activos
* Solo se muestra la primera vez

### 8. Módulo Portafolio
* Vista de lista: activos con nombre, valor actual, indicador de salud estructural
* Detalle de activo: métricas (CAGR, MaxDD, Sortino), proyección probabilística, sección "Eventos relacionados" (vinculación al Buzón), sección colapsada "¿Qué vale el tiempo que llevas?"
* Sin badges en la lista; profundidad accesible desde el detalle

### 9. Módulo Buzón
* Cuatro tipos de evento: (1) disparadores de mercado, (2) comportamiento durante caídas, (3) maduración de CDT / rebalanceo de oportunidad, (4) acompañamiento educativo progresivo
* Disclaimer permanente en cada evento: *"Este contenido es educativo y se basa en datos históricos. No constituye asesoría de inversión."*
* Vinculación bidireccional con Portafolio (chip navegable en evento → detalle de activo)
* Cero push notifications, cero badges en ícono de app

### 10. Módulo Herramientas
* Calculadoras estáticas locales: proyección de interés compuesto, simulación de aportes, comparador CDT vs ETF
* No tocan el portafolio real
* Corren completamente offline

### 11. Sistema de Rebalanceo
* Evaluación trimestral automática contra bandas configuradas
* Rebalanceo de oportunidad al detectar CDT próximo a madurar
* Recálculo del Hurdle Rate cuando cambia la tasa Banrep (trigger E del Buzón)

---

## 🔲 Deuda Técnica Deliberada (Phase 2)

Estos ítems fueron conscientemente pospuestos. No son olvidos — son decisiones.

* **Automatización de tasas CDT por banco individual:** si la API de Banrep solo da promedios, las tasas por banco (Bancolombia, Bogotá, Davivienda) podrían requerir scraping o entrada manual en Phase 1. Se revisará al implementar §5.
* **Implicaciones fiscales interactivas:** la educación fiscal está documentada en tooltips y pantallas de detalle, pero un calculador de impacto tributario real queda para Phase 2.
* **Asistente IA:** módulo de chat con acceso contextual al portafolio. El Buzón educativo de Phase 1 es su precursor.
* **Multi-dispositivo:** la arquitectura SQLite + Supabase lo habilita, pero no se implementa en Phase 1.
* **Algoritmo de matching ETFs:** selección automática de ETFs según perfil de Harvey. Phase 1 usa watchlist manual.

---

## 📋 Para Winston — Revisión Solicitada

Winston, estos son los puntos donde tu perspectiva estratégica agregaría valor antes o durante la implementación:

1. **API Banrep como fuente única del Hurdle Rate:** ¿ves riesgo de dependencia en una sola fuente oficial para un parámetro tan central como la tasa libre de riesgo local?
2. **Bandas de asignación por defecto (CDTs 50–70% / ETFs 30–50%):** ¿este default conservador es el correcto para el perfil de Harvey en Phase 1?
3. **Watchlist inicial de ETFs:** ¿propones criterios de selección o tickers específicos que se alineen con la tesis de inversión?
4. **Complejidad fiscal:** ¿falta alguna dimensión fiscal relevante para un residente colombiano invirtiendo en ETFs USD que no esté cubierta en `investment_thesis.md` §5?
5. **¿Algo que falta?** Si al revisar los documentos de contexto identificas huecos conceptuales, técnicos o filosóficos, este es el lugar para registrarlos.
