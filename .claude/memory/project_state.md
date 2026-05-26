---
name: project-state
description: Estado actual de implementación de Magic Invest — qué está construido y qué sigue
metadata: 
  node_type: memory
  type: project
  originSessionId: 0091cfee-fc4f-4ddb-b6ce-d84f633d82bf
---

App de análisis financiero personal para Harvey Botero (colombiano, CDTs + ETFs indexados). Filosofía anti-reactiva: reduce ansiedad financiera con educación estadística, sin notificaciones push ni badges.

## Completado

- Expo SDK 56, React 19, TypeScript strict, Expo Router, NativeTabs (3 tabs: Portafolio, Buzón, Herramientas)
- `src/constants/theme.ts`: tokens de color, espaciado, safe area
- `src/db/`: schema SQLite (7 tablas), migraciones versionadas, queries por módulo
- `src/lib/supabase.ts`: cliente con AsyncStorage + PKCE
- `supabase/schema.sql`: 7 tablas PostgreSQL con RLS
- `src/hooks/use-auth.ts`: sesión, displayName, deep linking PKCE (`magicinvest://auth/callback`)
- `src/app/login.tsx`: signup/signin, campo "¿Cómo te llamamos?", toggle password
- `src/components/page-header.tsx`: header compartido con hamburguesa en los 3 tabs
- `src/components/drawer-menu.tsx`: panel lateral animado — perfil, biométrico (placeholder), legal (placeholder), versión, logout
- `src/utils/format.ts`: formatCurrency (COP/USD), formatPercent, abbreviateValue (K/M/B), parseNumber
- `src/constants/tools-data.ts`: definición de las 9 herramientas (id, nombre, descripción, ícono)

### Módulo Herramientas
- `src/app/tools/_layout.tsx`: Stack navigator sin header
- `src/app/tools/index.tsx`: lista de tarjetas (nombre + descripción + ícono teal a la derecha). FlatList con flex:1 + paddingBottom en contentContainerStyle.
- `src/app/tools/[id].tsx`: placeholder genérico para herramientas no implementadas
- **Componentes compartidos** en `src/components/calculator/`:
  - `CurrencySelector`: toggle COP/USD
  - `InputField`: campo numérico con label, sufijo, hint
  - `ResultCard`: filas con highlight, dots de color para convención visual (campo `color` en ResultRow)
  - `GrowthChart`: barras apiladas (capital teal claro + ganancias teal sólido), sin año 0, etiquetas abreviadas, leyenda, scroll horizontal
- **Calculadora #1 completa**: `src/app/tools/compound-interest.tsx` — gráfica primero → tabla → disclaimer
- **Calculadora #2 completa**: `src/app/tools/time-to-goal.tsx` — tabla primero → gráfica → disclaimer. Búsqueda binaria, 3 estados (normal / alreadyReached / unreachable).
- **Calculadora #3 completa**: `src/app/tools/debt-freedom.tsx` — barras comparativas + escenario mínimo + acelerado + ahorro. Alerta si pago < interés mensual.
- **Calculadora #4 completa**: `src/app/tools/rate-converter.tsx` — tabs internos (EA → NM/EM → NA), conversiones bidireccionales, 4 decimales.
- **Calculadora #5 completa**: `src/app/tools/cdt-vs-etf.tsx` — CDT neto (retefuente 4%) vs ETF proyectado, barras comparativas ámbar/teal, sección diferencia.
- **Calculadora #6 completa**: `src/app/tools/dca-vs-lump.tsx` — Lump Sum vs DCA, costo de oportunidad de promediar, alerta si meses DCA > horizonte.
- **Calculadora #7 completa**: `src/app/tools/real-return.tsx` — Fisher, veredicto CRECE/AGUANTA/PIERDE, equivalente en pesos de hoy.
- **Calculadora #8 completa**: `src/app/tools/cagr.tsx` — CAGR = (FV/PV)^(1/años)−1, caja destacada teal/púrpura, GrowthChart proyectado (si CAGR>0 y años≥2).
- **Calculadora #9 completa**: `src/app/tools/fee-drag.tsx` — TER drag, barras sin/con comisión (teal/ámbar), costo total en pesos y % ganancia perdida.

### **Módulo Herramientas: COMPLETO (9/9 calculadoras)**

## Pendiente manual (una vez, en Supabase Dashboard)
- Authentication → URL Configuration → agregar `magicinvest://auth/callback` en Redirect URLs

## Próximo paso
**Módulo Portafolio** — ver `context/todo_and_wip.md` §7 para el detalle.
- Vista de lista: activos con nombre, valor actual, indicador de salud estructural
- Detalle de activo: métricas (CAGR, MaxDD, Sortino), proyección probabilística, sección "Eventos relacionados"
- Sin badges; profundidad accesible desde el detalle

**Why:** Onboarding fue movido al final (pre-publicación) por decisión de Harvey el 2026-05-25.
**How to apply:** Al iniciar nueva sesión, leer `context/todo_and_wip.md` §7 para el estado del Módulo Portafolio.
