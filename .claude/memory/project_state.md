---
name: project-state
description: Estado actual de implementación de Magic Invest — qué está construido y qué sigue
metadata: 
  node_type: memory
  type: project
  originSessionId: 0091cfee-fc4f-4ddb-b6ce-d84f633d82bf
---

App de análisis financiero personal para Harvey Botero (colombiano, CDTs + ETFs indexados). Filosofía anti-reactiva: reduce ansiedad financiera con educación estadística, sin notificaciones push ni badges.

**Último commit:** `86bfaf8` — "feat: shell de navegación completo con autenticación y drawer de usuario"

## Completado

- Expo SDK 56, React 19, TypeScript strict, Expo Router, NativeTabs (3 tabs: Portafolio, Buzón, Herramientas)
- `src/constants/theme.ts`: tokens de color, espaciado, safe area
- `src/db/`: schema SQLite (7 tablas), migraciones versionadas, queries por módulo
- `src/lib/supabase.ts`: cliente con AsyncStorage + PKCE
- `supabase/schema.sql`: 7 tablas PostgreSQL con RLS aplicadas en la nube
- `src/hooks/use-auth.ts`: sesión, displayName, deep linking PKCE (`magicinvest://auth/callback`)
- `src/app/login.tsx`: signup/signin, campo "¿Cómo te llamamos?", toggle password, reset
- `src/components/page-header.tsx`: header compartido con hamburguesa en los 3 tabs
- `src/components/drawer-menu.tsx`: panel lateral animado — perfil, biométrico (placeholder), legal (placeholder), versión, logout. Fix: `isMounted` ref para bug de animación inicial.
- Saludo personalizado en Portafolio: "Hola, {nombre} · Tus posiciones reales"

## Pendiente manual (una vez, en Supabase Dashboard)
- Authentication → URL Configuration → agregar `magicinvest://auth/callback` en Redirect URLs

## Próximo paso
**Flujo de onboarding** (ítem 6 en todo_and_wip.md): primera pantalla que explica la filosofía + slider de bandas de asignación CDT/ETF (default 50-70% / 30-50%) + verificación con `isOnboardingComplete()` en SQLite.

## Después del onboarding
Perfil de usuario completo (documento, ciudad), biométrico, módulos Portfolio/Buzón/Herramientas, Edge Functions Banrep.

**Why:** La sesión de hoy (2026-05-25) cerró con commit y Harvey fue a comer. Retoma en la próxima sesión con onboarding.
**How to apply:** Al iniciar nueva sesión, leer `context/todo_and_wip.md` para el estado detallado y arrancar con el ítem 6 (Onboarding).
