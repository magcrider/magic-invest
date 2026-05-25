---
name: reference-technical
description: "Credenciales, URLs y archivos clave del proyecto Magic Invest"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 0091cfee-fc4f-4ddb-b6ce-d84f633d82bf
---

## Supabase
- **URL del proyecto:** `https://tvmhgckkgtoivariplju.supabase.co`
- **Anon key:** en `.env` (gitignoreado) como `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Dashboard:** Authentication → Users para gestionar usuarios de prueba
- **Pendiente:** Authentication → URL Configuration → agregar `magicinvest://auth/callback` en Redirect URLs

## Deep linking
- **Scheme:** `magicinvest://` (configurado en `app.json`)
- **Callback:** `magicinvest://auth/callback?code=XXXX` — manejado en `src/hooks/use-auth.ts`

## Archivos clave
- `context/todo_and_wip.md` — estado del proyecto y orden de prioridades
- `context/architecture_state.md` — stack técnico y decisiones de integración
- `context/design_system.md` — tokens de color y principios de lenguaje
- `context/investment_thesis.md` — modelos matemáticos, triggers del Buzón
- `context/project_vision.md` — filosofía, qué somos y qué no somos
- `src/db/migrations.ts` — migraciones SQLite versionadas
- `src/db/queries/config.ts` — `isOnboardingComplete()`, `setAllocationBands()`
- `supabase/schema.sql` — schema PostgreSQL (aplicar manualmente en SQL Editor)

## Usuarios de prueba
- Harvey tiene dos cuentas de prueba creadas con el formulario actualizado (con nombre)
- Para limpiar sesión en emulador Android: Android Studio → Device Manager → Wipe data
