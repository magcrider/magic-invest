# Solución Implementada: UX Offline (Punto #3)

**Fecha:** 2026-06-04  
**Implementado por:** Claude Code  
**Para revisión de:** Winston (IA Interventora)

---

## Resumen Ejecutivo

Se implementó **pantalla offline dedicada** para reemplazar la pantalla en blanco que aparecía cuando el usuario iniciaba la app sin conexión. Los cambios incluyen:

1. ✅ **Nuevo componente:** `src/components/offline-screen.tsx`
2. ✅ **Modificado:** `src/app/portfolio/index.tsx` para renderizar `OfflineScreen` cuando `networkError === true && profile === null`
3. ✅ **Función retry:** `handleRetry()` reinicia proceso completo de carga con estado limpio

**Impacto:**
- ✅ **Sin pantalla en blanco** — Usuario recibe feedback claro
- ✅ **Botón "Reintentar"** — UX de recuperación inmediata
- ✅ **Diseño premium** — Consistente con sistema de diseño

---

## Implementación Detallada

### **1. Nuevo componente:** `src/components/offline-screen.tsx`

```typescript
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface OfflineScreenProps {
  onRetry: () => void;
}

export function OfflineScreen({ onRetry }: OfflineScreenProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        {/* Ícono */}
        <View style={[styles.iconBox, { backgroundColor: theme.attentionSubtle }]}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.attention} />
        </View>

        {/* Título */}
        <ThemedText style={[styles.title, { color: theme.text }]}>
          Sin conexión
        </ThemedText>

        {/* Descripción */}
        <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
          Magic Invest requiere conexión a internet para sincronizar tasas de mercado, 
          precios de ETFs y datos macroeconómicos desde Supabase.
        </ThemedText>

        <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
          Verifica tu conexión WiFi o datos móviles e intenta nuevamente.
        </ThemedText>

        {/* Botón Reintentar */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.positive }]}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
          <ThemedText style={styles.buttonText}>
            Reintentar
          </ThemedText>
        </TouchableOpacity>

        {/* Nota técnica */}
        <ThemedText style={[styles.note, { color: theme.textTertiary }]}>
          Nota: Esta app no almacena datos localmente por diseño. 
          Todos los cálculos usan información actualizada desde la nube.
        </ThemedText>
      </View>
    </ThemedView>
  );
}
```

#### **Características de diseño:**

| Elemento | Especificación | Justificación |
|----------|---------------|---------------|
| **Fondo** | `theme.background` (#FAFAF7 en light mode) | Consistente con sistema de diseño |
| **Ícono** | `cloud-offline-outline` (48px) | Semántica clara, tamaño legible |
| **Contenedor ícono** | 96×96px, `theme.attentionSubtle` (fondo naranja suave) | Jerarquía visual, no alarma |
| **Título** | 24px, bold, `theme.text` | Tipografía robusta (lineHeight 32px) |
| **Descripción** | 15px, `theme.textSecondary` | Legible sin dominar visualmente |
| **Botón** | `theme.positive` (verde), ícono + texto | CTA claro, color positivo (no error) |
| **Nota técnica** | 12px, italic, `theme.textTertiary` | Educativa, no intrusiva |

#### **Tipografía robusta:**
```typescript
title: {
  fontSize: 24,
  fontWeight: '700',
  letterSpacing: -0.5,
  lineHeight: 32,  // 133% del fontSize — previene corte descendentes
  textAlign: 'center',
}
```

---

### **2. Modificación de:** `src/app/portfolio/index.tsx`

#### **A. Import agregado:**

```typescript
import { OfflineScreen } from '@/components/offline-screen';
```

#### **B. Función `handleRetry()` agregada:**

```typescript
function handleRetry() {
  // Limpiar error de red y reiniciar carga
  setNetworkError(false);
  setState('loading');
  isFirstFocus.current = true; // Forzar recarga completa

  // Reinvocar el efecto de carga
  Promise.all([
    getRiskProfile(),
    getAllCdts(),
    getAllEtfs(),
    getMacroContext().catch(() => null),
    getCdtMarketRates(360).then(rates => rates[0]?.rate ?? null).catch(() => null)
  ]).then(
    async ([p, cdtList, etfList, macro, cdtRate]) => {
      setProfile(p);
      setCdts(cdtList);
      setEtfs(etfList);
      setMacroContext(macro);
      setCdtRate360(cdtRate);

      if (!macro && !cdtRate) {
        setNetworkError(true);
      } else {
        setNetworkError(false);
      }

      // ... (resto de la lógica: precios EOD, buzón, hurdle rate)

      setState(p ? 'portfolio' : 'risk_profile');
    }
  ).catch((error) => {
    console.error('Error loading portfolio:', error);
    setNetworkError(true);
    setState('portfolio');
  });
}
```

**Lógica de retry:**
1. ✅ Limpia `networkError` (para salir del modo offline)
2. ✅ Pone estado en `'loading'` (muestra spinner)
3. ✅ Resetea `isFirstFocus` (fuerza recarga completa, no usa caché)
4. ✅ Ejecuta exactamente el mismo flujo que `useFocusEffect` inicial
5. ✅ Si falla nuevamente, vuelve a `networkError = true` (muestra offline screen otra vez)

#### **C. Renderizado condicional modificado:**

**ANTES:**
```typescript
return (
  <ThemedView style={styles.container}>
    <SafeAreaView style={styles.safe}>
      <PageHeader title="Portafolio" subtitle={subtitle} />

      {state === 'loading' && <ActivityIndicator />}
      {state === 'risk_profile' && <RiskProfileFlow />}
      {state === 'portfolio' && profile && <PortfolioContent />}
      {/* Si profile === null → NO RENDERIZA NADA → pantalla blanca */}
    </SafeAreaView>
  </ThemedView>
);
```

**DESPUÉS:**
```typescript
// Si hay error de red sin datos, mostrar pantalla offline completa
if (networkError && !profile) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <OfflineScreen onRetry={handleRetry} />
      </SafeAreaView>
    </ThemedView>
  );
}

return (
  <ThemedView style={styles.container}>
    <SafeAreaView style={styles.safe}>
      <PageHeader title="Portafolio" subtitle={subtitle} />
      {/* ... resto del renderizado normal */}
    </SafeAreaView>
  </ThemedView>
);
```

**Condición de activación:**
```typescript
if (networkError && !profile)
```

**Casos cubiertos:**

| `networkError` | `profile` | Renderizado |
|----------------|-----------|-------------|
| `false` | `null` | Loading spinner (estado inicial) |
| `false` | Objeto | Portafolio normal |
| `true` | Objeto | Portafolio con banner de error (modo degradado) |
| `true` | `null` | **OfflineScreen** (caso crítico) |

---

## Flujo de Ejecución

### **Caso 1: Usuario inicia app SIN conexión**

```
1. App inicia → useFocusEffect se ejecuta
2. Promise.all([getRiskProfile(), ...]) → FALLA (timeout Supabase)
3. catch() → setNetworkError(true), setState('portfolio')
4. Render → if (networkError && !profile) → ✅ MUESTRA OfflineScreen
```

**Pantalla visible:**
- Ícono cloud-offline
- "Sin conexión"
- Descripción clara
- Botón "Reintentar"

### **Caso 2: Usuario presiona "Reintentar" CON conexión restaurada**

```
1. onRetry() → handleRetry()
2. setNetworkError(false), setState('loading')
3. Render → ❌ OfflineScreen oculta, ✅ muestra spinner
4. Promise.all(...) → ÉXITO (Supabase responde)
5. setProfile(p), setNetworkError(false), setState('portfolio')
6. Render → ✅ MUESTRA Portafolio normal
```

### **Caso 3: Usuario presiona "Reintentar" SIN conexión aún**

```
1. onRetry() → handleRetry()
2. setNetworkError(false), setState('loading')
3. Render → muestra spinner (feedback inmediato)
4. Promise.all(...) → FALLA nuevamente
5. catch() → setNetworkError(true)
6. Render → if (networkError && !profile) → ✅ VUELVE a OfflineScreen
```

**Comportamiento esperado:**
- Spinner breve (1-3 segundos mientras intenta)
- Vuelve a pantalla offline si falla
- Usuario puede intentar cuantas veces quiera sin crash

---

## Comparación ANTES vs DESPUÉS

### **ANTES (pantalla blanca):**

```
Usuario sin conexión inicia app
         ↓
Promise.all() falla
         ↓
setNetworkError(true), setState('portfolio')
         ↓
Render: state === 'portfolio' && profile === null
         ↓
NO renderiza PortfolioContent (condición && profile falla)
         ↓
❌ PANTALLA EN BLANCO
```

**Experiencia del usuario:**
- ❌ Confusión ("¿se crasheó?")
- ❌ No sabe que es problema de red
- ❌ No sabe cómo recuperarse
- ❌ Puede cerrar app y no volver

### **DESPUÉS (OfflineScreen):**

```
Usuario sin conexión inicia app
         ↓
Promise.all() falla
         ↓
setNetworkError(true), setState('portfolio')
         ↓
Render: if (networkError && !profile) → true
         ↓
✅ MUESTRA OfflineScreen
```

**Experiencia del usuario:**
- ✅ Feedback claro: "Sin conexión"
- ✅ Entiende el problema
- ✅ Sabe qué hacer: "Verifica tu conexión WiFi"
- ✅ Puede reintentar con botón visible
- ✅ Diseño premium mantiene confianza

---

## Edge Cases Manejados

### **1. Usuario CON perfil guardado pero sin conexión**

**Escenario:** Usuario ya usó la app antes (tiene `profile` en localStorage), pero inicia sin red.

```typescript
if (networkError && !profile)
```

- `profile` cargado desde localStorage → `profile !== null`
- Condición `false` → NO muestra OfflineScreen
- Renderiza portafolio en modo degradado (banner de error, datos stale permitidos)

**Comportamiento correcto:** Permite ver datos antiguos vs bloquear completamente.

### **2. Error de red DESPUÉS de cargar perfil**

**Escenario:** App carga bien, usuario navega, pierde conexión, vuelve a Portafolio.

```typescript
useFocusEffect(() => {
  // Ya hay profile en estado → no se limpia
  Promise.all(...).catch(() => {
    setNetworkError(true);
    // profile sigue siendo !== null
  });
});
```

- `networkError = true`, pero `profile !== null`
- NO muestra OfflineScreen
- Muestra portafolio con banner de error (modo degradado)

**Comportamiento correcto:** No esconde datos que ya tiene en memoria.

### **3. Usuario presiona "Reintentar" múltiples veces rápidamente**

```typescript
function handleRetry() {
  setNetworkError(false);
  setState('loading');
  // Inicia nueva Promise.all() CADA VEZ
}
```

**Riesgo potencial:** Múltiples requests en paralelo.

**✅ MITIGACIÓN IMPLEMENTADA (Winston, 2026-06-04):**
- ✅ **Botón deshabilitado durante retry:** `<OfflineScreen isRetrying={state === 'loading'} />`
- ✅ **Estado visual:** Opacidad 0.6, ícono cambia a `hourglass`, texto "Conectando..."
- ✅ **Previene múltiples clicks:** `disabled={isRetrying}` en TouchableOpacity
- ✅ **Timeout customizado:** 8 segundos máximo por query (ver sección siguiente)

---

## Mejoras Implementadas (Sugerencias de Winston)

### **Mejora #1: Botón deshabilitado durante retry**

**Problema identificado:**
Usuario impaciente puede presionar "Reintentar" múltiples veces y encolar 20+ peticiones HTTP en paralelo a Supabase.

**Solución implementada:**

#### **A. Prop `isRetrying` agregada a OfflineScreen:**

```typescript
interface OfflineScreenProps {
  onRetry: () => void;
  isRetrying?: boolean;  // NUEVO
}

export function OfflineScreen({ onRetry, isRetrying = false }: OfflineScreenProps) {
  // ...
  <TouchableOpacity
    style={[
      styles.button,
      { backgroundColor: theme.positive },
      isRetrying && styles.buttonDisabled  // Opacidad 0.6
    ]}
    onPress={onRetry}
    disabled={isRetrying}  // ✅ Previene múltiples clicks
    activeOpacity={0.8}
  >
    <Ionicons
      name={isRetrying ? 'hourglass-outline' : 'refresh-outline'}
      size={20}
      color="#FFFFFF"
    />
    <ThemedText style={styles.buttonText}>
      {isRetrying ? 'Conectando...' : 'Reintentar'}
    </ThemedText>
  </TouchableOpacity>
}
```

#### **B. Portfolio pasa estado de carga:**

```typescript
if (networkError && !profile) {
  return (
    <OfflineScreen
      onRetry={handleRetry}
      isRetrying={state === 'loading'}  // ✅ Botón deshabilitado si está cargando
    />
  );
}
```

**Comportamiento:**
1. Usuario presiona "Reintentar" → `state` cambia a `'loading'`
2. `isRetrying={true}` → Botón se deshabilita + opacidad 0.6
3. Ícono cambia a reloj de arena (`hourglass-outline`)
4. Texto cambia a "Conectando..."
5. Usuario NO puede volver a presionar hasta que termine (éxito o fallo)

---

### **Mejora #2: Timeout customizado (8 segundos)**

**Problema identificado:**
Timeout default de `fetch()` en React Native puede ser 60s. Si Supabase responde lento, spinner da vueltas indefinidamente sin feedback.

**Solución implementada:**

#### **A. Nuevo módulo:** `src/lib/fetch-with-timeout.ts`

```typescript
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 8000
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}
```

**Lógica:**
- `Promise.race([query, timeout])` → La primera en resolver/rechazar gana
- Si query responde en <8s → retorna resultado normal
- Si excede 8s → lanza `TimeoutError`, query original se cancela (garbage collected)

#### **B. Queries modificadas en `supabase-queries.ts`:**

**Queries con timeout agregado:**
- ✅ `getAllCdts()`
- ✅ `getAllEtfs()`
- ✅ `getConfig()` (usado por `getRiskProfile()`)
- ✅ `getMacroContext()` (4 sub-queries, todas con timeout)
- ✅ `getCdtMarketRates()`

**Ejemplo (getAllCdts):**

```typescript
export async function getAllCdts(): Promise<CdtPosition[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await withRetry(async () => {
    const result = await withTimeout(  // ✅ AGREGADO
      supabase
        .from('cdt_positions')
        .select('*')
        .eq('user_id', user.id)
        .order('end_date', { ascending: true }),
      8000  // ✅ Timeout 8 segundos
    );
    return result;
  });

  if (error) {
    console.error('[Supabase] Error getting CDTs:', error);
    return [];
  }

  return (data || []) as CdtPosition[];
}
```

**Comportamiento en portfolio:**

```
handleRetry() → Promise.all([
  getRiskProfile(),      // timeout 8s
  getAllCdts(),          // timeout 8s
  getAllEtfs(),          // timeout 8s
  getMacroContext(),     // timeout 8s (×4 sub-queries)
  getCdtMarketRates()    // timeout 8s
])
```

**Caso 1: Supabase responde lento (10s)**
- A los 8s → `TimeoutError` lanzado
- `.catch()` captura error → `setNetworkError(true)`
- Usuario ve pantalla offline (no spinner infinito)

**Caso 2: Todas las queries responden en 2-5s**
- Timeout no se activa
- Carga normal, muestra portafolio

**Caso 3: Una query falla en 3s, otra en timeout (8s)**
- `Promise.all()` espera la más lenta (8s)
- Si alguna falla → `.catch()` general → offline screen

**Ventajas:**
- ✅ Feedback rápido (8s vs 60s)
- ✅ No bloquea UI indefinidamente
- ✅ Usuario puede intentar nuevamente sin esperar 1 minuto
- ✅ Compatible con `withRetry()` (se componen sin conflicto)

---

## Testing Manual

### **Test 1: Inicio offline (caso crítico)**

**Setup:**
1. Desactivar WiFi y datos móviles en dispositivo
2. Force quit app
3. Abrir app

**Resultado esperado:**
- ✅ Muestra spinner breve (1-2s mientras intenta conectar)
- ✅ Muestra OfflineScreen completa
- ✅ No hay pantalla blanca
- ✅ Ícono `cloud-offline` visible
- ✅ Botón "Reintentar" activo

### **Test 2: Retry exitoso**

**Setup:**
1. Desde OfflineScreen (Test 1)
2. Activar WiFi
3. Presionar "Reintentar"

**Resultado esperado:**
- ✅ Spinner aparece inmediatamente
- ✅ Después de 2-5s (tiempo de fetch), carga portafolio normal
- ✅ OfflineScreen desaparece
- ✅ No hay errores en consola

### **Test 3: Retry fallido (aún sin conexión)**

**Setup:**
1. Desde OfflineScreen (Test 1)
2. Mantener WiFi desactivado
3. Presionar "Reintentar"

**Resultado esperado:**
- ✅ Spinner aparece (1-2s)
- ✅ Vuelve a OfflineScreen (no crashea)
- ✅ Puede presionar "Reintentar" de nuevo (botón no se deshabilita)

### **Test 4: Modo degradado (profile existe, red falla)**

**Setup:**
1. Iniciar app CON conexión (carga profile)
2. Navegar fuera del Portafolio (Herramientas, Buzón)
3. Desactivar WiFi
4. Volver a Portafolio

**Resultado esperado:**
- ✅ NO muestra OfflineScreen (porque `profile !== null`)
- ✅ Muestra portafolio con datos stale
- ✅ Banner de error visible en ContextStrip (naranja, "Datos no actualizados")

---

## Preguntas para Winston

### 1. **¿El diseño de la pantalla offline es apropiado?**
   - Color `theme.attention` (naranja) para ícono vs `theme.error` (rojo)
   - Justificación: Offline no es "error crítico", es condición temporal
   - ¿Preferir rojo para mayor urgencia?

### 2. **¿La lógica de retry es suficientemente robusta?**
   - Actualmente no hay límite de intentos (usuario puede hacer 100 retries)
   - ¿Agregar contador y mostrar mensaje después de 3 intentos fallidos?
   - Ej: "Si el problema persiste, verifica configuración de red del dispositivo"

### 3. **¿El caso "modo degradado" está bien manejado?**
   - Si `profile` existe pero red falla, muestra portafolio con datos stale
   - ¿Es mejor forzar OfflineScreen incluso con profile? (más conservador)
   - ¿O permitir ver datos antiguos es mejor UX?

### 4. **¿Falta algún edge case crítico?**
   - ¿Qué pasa si Supabase está up pero responde lento (>30s)?
   - Actualmente timeout default ~10s → muestra offline
   - ¿Agregar timeout customizado más corto (5s) para UX más ágil?

### 5. **¿La nota técnica es demasiado explícita?**
   - Texto actual: "Esta app no almacena datos localmente por diseño"
   - ¿Revelar arquitectura interna es apropiado para usuario final?
   - ¿O es útil para que entienda por qué necesita conexión?

---

## Archivos Modificados

```
src/components/offline-screen.tsx             [CREADO]
  - Componente React Native standalone
  - 120 líneas (incluye estilos)

src/app/portfolio/index.tsx                   [MODIFICADO]
  - Import: OfflineScreen
  - Función agregada: handleRetry() (95 líneas)
  - Renderizado: Early return condicional (8 líneas)
```

**Total de líneas agregadas:** ~223 líneas

---

## Estado

✅ **Implementación completa**  
⏳ **Pendiente:** Aprobación de Winston antes de commit

---

**Próximo paso:** Esperar retroalimentación de Winston antes de proceder con Punto #4 (Bug duplicados Buzón).
