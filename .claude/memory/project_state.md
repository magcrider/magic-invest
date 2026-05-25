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
- **Calculadora #1 completa**: `src/app/tools/compound-interest.tsx`
  - Selector COP/USD, 4 campos, botón Calcular, auto-scroll a resultados
  - Orden de resultados: gráfica primero → tabla → disclaimer
  - Convención de color coherente entre GrowthChart y ResultCard

## Pendiente manual (una vez, en Supabase Dashboard)
- Authentication → URL Configuration → agregar `magicinvest://auth/callback` en Redirect URLs

## Próximo paso
**Calculadoras #2–9** del Módulo Herramientas, en orden de prioridad:
2. Tiempo para alcanzar tu meta
3. Calculadora para salir de deudas
4. Conversor de tasas
5. Simulador CDT vs ETF
6. ¿Invierto mes a mes o todo de una vez?
7. ¿Tu plata crece o solo aguanta?
8. Rendimiento anual promedio
9. ¿Cuánto te cuestan las comisiones en 20 años?

Patrón establecido: archivo individual por calculadora en `src/app/tools/`, reutiliza componentes de `src/components/calculator/`. ScrollView con flex:1 + contentContainerStyle.paddingBottom.

**Why:** Onboarding fue movido al final (pre-publicación) por decisión de Harvey el 2026-05-25 — se implementa cuando todas las funcionalidades estén completas.
**How to apply:** Al iniciar nueva sesión, leer `context/todo_and_wip.md` §6 para el estado de las calculadoras y continuar con la siguiente pendiente.
