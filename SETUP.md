# Magic Invest — Setup Guide

Guía para configurar el proyecto en un nuevo equipo o máquina.

---

## 1. Prerrequisitos

- **Node.js:** v18+ (recomendado LTS)
- **npm** o **yarn**
- **Expo CLI:** `npm install -g expo-cli`
- **Supabase CLI:** `npm install -g supabase` (opcional, solo para Edge Functions)
- **Git:** Para clonar el repositorio

---

## 2. Clonar el repositorio

```bash
git clone <url-del-repo>
cd magic-invest
```

---

## 3. Instalar dependencias

```bash
npm install
# o
yarn install
```

---

## 4. Configurar variables de entorno

### 4.1. Crear archivo `.env`

Copia el template de ejemplo:

```bash
cp .env.example .env
```

### 4.2. Obtener credenciales de Supabase

Ve al [Dashboard de Supabase](https://supabase.com/dashboard) → tu proyecto → **Settings** → **API**

Copia los valores:

| Variable | Dónde encontrarla | Descripción |
|----------|-------------------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Settings → API → Project URL | URL base del proyecto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → Project API keys → `anon` `public` | Key pública para cliente (safe to expose) |

### 4.3. Editar `.env`

Reemplaza los placeholders en `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://tvmhgckkgtoivariplju.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bWhnja2tndG9pdmFyaXBsanUiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc0MTM0NDY1OCwiZXhwIjoyMDU2OTIwNjU4fQ.kcBfP6u0H3YHhzKVatOKq_S-aFjngyoE_yBXlrCn6kw
```

⚠️ **Nota:** Nunca commitear el archivo `.env` real (ya está en `.gitignore`). Estas credenciales son específicas del proyecto de Harvey.

---

## 5. Verificar configuración de Supabase

### 5.1. Extensiones habilitadas

Ve a Dashboard → **Database** → **Extensions** y verifica que estén habilitadas:

- ✅ `pg_cron` (para cron jobs)
- ✅ `pg_net` (para HTTP requests desde Edge Functions)

### 5.2. Edge Functions deployadas

Ve a Dashboard → **Edge Functions** y verifica que existan:

- ✅ `fetch-banrep-data` (sincronización diaria TRM, CDT, Inflación)
- ✅ `backfill-historical-data` (poblado inicial histórico)

### 5.3. Cron job configurado

Ve a Dashboard → **Integrations** → **Cron** y verifica que exista:

- ✅ `fetch-banrep-data-daily` — Schedule: `30 5 * * *` (00:30 AM Colombia / 05:30 UTC)

### 5.4. Tablas existentes

Ve a Dashboard → **Table Editor** y verifica:

| Tabla | Descripción | Rows esperados |
|-------|-------------|----------------|
| `macro_rates` | TRM, inflación, policy rate | ~2,500 (TRM) + ~15 (inflación) |
| `cdt_rates` | Tasas CDT por plazo | ~6,000+ |
| `cdt_positions` | Posiciones CDT del usuario | Variable (depende del usuario) |
| `etf_positions` | Posiciones ETF del usuario | Variable |
| `user_config` | Perfil de riesgo, bandas | Variable |
| `inbox_events` | Eventos del Buzón (mock) | Variable |

---

## 6. Ejecutar la app

### 6.1. Desarrollo con Expo Go

```bash
npx expo start
```

Luego:
- **Android:** Escanea el QR con la app Expo Go
- **iOS:** Abre Cámara → escanea QR → abre en Expo Go

### 6.2. Build preview (APK standalone)

```bash
# Android
eas build --platform android --profile preview

# Descargar e instalar el APK generado
```

---

## 7. Edge Functions (solo si necesitas modificarlas)

### 7.1. Login en Supabase CLI

```bash
supabase login
```

Esto abrirá el browser para autenticación.

### 7.2. Deploy de funciones

```bash
# Deploy función específica
supabase functions deploy fetch-banrep-data --no-verify-jwt

# Deploy todas
supabase functions deploy
```

### 7.3. Ver logs

```bash
supabase functions logs fetch-banrep-data
```

---

## 8. Estructura del proyecto

```
magic-invest/
├── src/
│   ├── app/                    # Pantallas (Expo Router)
│   │   ├── (tabs)/            # Bottom tabs (portafolio, herramientas, buzon)
│   │   ├── auth/              # Login, signup
│   │   └── index.tsx          # Root (risk profile flow)
│   ├── components/            # Componentes reutilizables
│   ├── constants/             # Colores, spacing, risk profiles
│   ├── hooks/                 # Custom hooks (useTheme, useAuth)
│   ├── services/              # Supabase queries
│   ├── types/                 # TypeScript types
│   └── utils/                 # Helpers (format, inbox-state, profile-events)
├── supabase/
│   ├── functions/             # Edge Functions
│   │   ├── fetch-banrep-data/
│   │   └── backfill-historical-data/
│   ├── config.toml            # Configuración Edge Functions
│   └── schema.sql             # Schema de base de datos
├── context/                   # Documentación del proyecto
│   ├── architecture_state.md  # Estado técnico y decisiones
│   ├── design_system.md       # Sistema de diseño
│   ├── investment_thesis.md   # Tesis de inversión
│   ├── project_vision.md      # Visión y filosofía
│   └── todo_and_wip.md        # TODO y progreso
├── .env                       # Variables de entorno (NO commitear)
├── .env.example               # Template de variables
├── CLAUDE.md                  # Instrucciones para Claude Code
└── SETUP.md                   # Esta guía
```

---

## 9. Comandos útiles

```bash
# Limpiar cache y reinstalar
rm -rf node_modules package-lock.json
npm install

# Limpiar cache de Expo
npx expo start --clear

# Ver logs de Metro bundler
npx expo start

# TypeScript check
npx tsc --noEmit

# Listar Edge Functions deployadas
supabase functions list
```

---

## 10. Troubleshooting

### Error: "Missing environment variables"

- Verifica que `.env` existe y tiene las dos variables
- Reinicia el servidor de Expo (`Ctrl+C` y `npx expo start` de nuevo)

### Error: "JWT expired" o "PGRST303"

- La app tiene auto-retry transparente para este error
- Si persiste, limpia AsyncStorage: Settings → Clear app data (en el emulador)

### Edge Function no se ejecuta

- Verifica que el cron job esté activo: `SELECT * FROM cron.job;`
- Revisa logs: Dashboard → Edge Functions → fetch-banrep-data → Logs

### Datos no aparecen en la app

- Verifica conexión a internet
- Revisa que las tablas tengan datos: Dashboard → Table Editor
- Chequea logs de Metro bundler por errores de query

---

## 11. Contacto

Para dudas o problemas, contactar a **Harvey Botero**.
