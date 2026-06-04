# Solución Implementada: Bug Duplicados Motor Buzón (Punto #4)

**Fecha:** 2026-06-04  
**Implementado por:** Claude Code  
**Para revisión de:** Winston (IA Interventora)

---

## Resumen Ejecutivo

Se corrigió el **bug de duplicados en bucle** del motor de eventos del Buzón que ocurría cuando ya existían múltiples eventos similares en la base de datos.

**Cambio implementado:**
- ❌ **ANTES:** `query.maybeSingle()` → Falla con error `PGRST116` si hay 2+ registros
- ✅ **DESPUÉS:** `query.limit(1)` → Retorna array con máximo 1 elemento (o vacío)

**Impacto:**
- ✅ **No más bucle de agravamiento** — Si hay duplicados previos, motor no falla ni inserta más
- ✅ **Más robusto** — Tolera estados inconsistentes de BD sin crashear
- ✅ **Mismo comportamiento esperado** — Solo inserta si NO hay eventos similares en últimos 7 días

---

## El Bug Original

### **Diagnóstico de Winston:**

> "En `supabase/functions/generate-inbox-events/index.ts`, para validar si un evento de Buzón ya existe en los últimos 7 días, se utiliza `query.maybeSingle()`. Si por un fallo previo o una concurrencia se crearon 2 o más eventos similares en la base de datos, `maybeSingle()` arrojará el error de Postgres `PGRST116` (múltiples registros devueltos). Al ocurrir esto, el catch implícito o la asignación devuelve `existing = null`, lo que hace que el motor inserte otro evento duplicado más, agravando el problema en bucle."

### **Flujo del bug:**

```
1. Corrida #1 del cron (lunes):
   - Query: "¿Hay evento similar en últimos 7 días?"
   - Resultado: 0 eventos → existing = null
   - Acción: ✅ Inserta evento A

2. Corrida #2 del cron (lunes, 2 minutos después, por concurrencia o retry):
   - Query: "¿Hay evento similar en últimos 7 días?"
   - Resultado: 1 evento → existing = { id: 123 }
   - Acción: ✅ Skippea (correcto)

3. Bug introducido por operación manual o fallo:
   - Inserción manual duplicada de evento A (id: 124)
   - BD ahora tiene 2 eventos similares (id: 123, id: 124)

4. Corrida #3 del cron (martes):
   - Query: "¿Hay evento similar en últimos 7 días?"
   - query.maybeSingle() ejecuta
   - Postgres retorna 2 filas (id: 123 y id: 124)
   - ❌ ERROR PGRST116: "Multiple rows returned for maybeSingle()"
   - const { data: existing } = await query.maybeSingle()
   - existing = null (asignación por defecto en error)
   - Condición: if (!existing) → true
   - Acción: ❌ Inserta evento A duplicado (id: 125)

5. Corrida #4 del cron (miércoles):
   - Query: "¿Hay evento similar en últimos 7 días?"
   - Postgres retorna 3 filas (id: 123, 124, 125)
   - ❌ ERROR PGRST116 nuevamente
   - existing = null
   - Acción: ❌ Inserta evento A duplicado (id: 126)

6. Bucle infinito:
   - Cada corrida detecta múltiples duplicados → falla → inserta otro más
   - BD se contamina con 10, 20, 50+ eventos idénticos
```

---

## La Corrección Implementada

### **Cambio en línea 109-111:**

**ANTES:**
```typescript
const { data: existing } = await query.maybeSingle()

if (!existing) {
  // Insertar evento
}
```

**DESPUÉS:**
```typescript
// Corrección bug duplicados (Winston, 2026-06-04):
// Usar .limit(1) en lugar de .maybeSingle() para evitar error PGRST116
// si ya existen múltiples duplicados en BD
const { data: existing } = await query.limit(1)

// Verificar si el array está vacío (no hay duplicados)
if (!existing || existing.length === 0) {
  // Insertar evento
}
```

### **Por qué funciona:**

| Método | Retorna | Comportamiento con 0 registros | Comportamiento con 1 registro | Comportamiento con 2+ registros |
|--------|---------|-------------------------------|-------------------------------|--------------------------------|
| `.maybeSingle()` | `{ data: Object \| null }` | `data = null` | `data = { id: 123 }` | ❌ **ERROR PGRST116** |
| `.limit(1)` | `{ data: Array }` | `data = []` | `data = [{ id: 123 }]` | ✅ `data = [{ id: 123 }]` (solo retorna el primero) |

**Ventaja de `.limit(1)`:**
- ✅ **Nunca falla** — Siempre retorna un array (vacío o con 1 elemento máximo)
- ✅ **Tolera duplicados** — Si hay 10 duplicados, retorna `[{ id: 123 }]` (el primero) sin error
- ✅ **Validación simple** — `existing.length === 0` significa "no hay duplicados, insertar está OK"

---

## Validación Lógica Corregida

### **Condición ANTES:**
```typescript
if (!existing) {
  // Insertar
}
```

**Casos evaluados:**

| `existing` | `!existing` | Resultado |
|------------|-------------|-----------|
| `null` (error PGRST116) | `true` | ❌ INSERTA (incorrecto, debería detectar duplicados) |
| `null` (0 registros) | `true` | ✅ INSERTA (correcto) |
| `{ id: 123 }` (1 registro) | `false` | ✅ SKIPPEA (correcto) |

### **Condición DESPUÉS:**
```typescript
if (!existing || existing.length === 0) {
  // Insertar
}
```

**Casos evaluados:**

| `existing` | `!existing` | `existing.length === 0` | Condición final | Resultado |
|------------|-------------|------------------------|-----------------|-----------|
| `[]` (0 registros) | `false` | `true` | `true` | ✅ INSERTA (correcto) |
| `[{ id: 123 }]` (1 registro) | `false` | `false` | `false` | ✅ SKIPPEA (correcto) |
| `[{ id: 123 }]` (2+ en BD, solo retorna 1) | `false` | `false` | `false` | ✅ SKIPPEA (correcto) |
| `null` (caso edge, no debería ocurrir) | `true` | N/A | `true` | ⚠️ INSERTA (fallback seguro) |

**Análisis del caso `null`:**
- Con `.limit(1)`, `data` nunca debería ser `null` (Supabase retorna `[]` si no hay resultados)
- Incluimos `!existing` como **fallback defensivo** por si ocurre un error de red u otro fallo
- En ese caso, preferimos **intentar insertar** (puede fallar por constraint UNIQUE en BD) que **fallar silenciosamente** sin notificar al usuario

---

## Comparación Comportamiento

### **Escenario 1: Sin duplicados (comportamiento normal)**

**Query:** Eventos similares en últimos 7 días  
**Resultado BD:** 0 registros

| Método | `data` | Condición | Acción |
|--------|--------|-----------|--------|
| `.maybeSingle()` | `null` | `!null` → `true` | ✅ INSERTA |
| `.limit(1)` | `[]` | `[].length === 0` → `true` | ✅ INSERTA |

✅ **Ambos métodos funcionan igual** (comportamiento esperado)

---

### **Escenario 2: Ya existe 1 duplicado (comportamiento normal)**

**Query:** Eventos similares en últimos 7 días  
**Resultado BD:** 1 registro (id: 123)

| Método | `data` | Condición | Acción |
|--------|--------|-----------|--------|
| `.maybeSingle()` | `{ id: 123 }` | `!{ id: 123 }` → `false` | ✅ SKIPPEA |
| `.limit(1)` | `[{ id: 123 }]` | `[...].length === 0` → `false` | ✅ SKIPPEA |

✅ **Ambos métodos funcionan igual** (comportamiento esperado)

---

### **Escenario 3: Ya existen 2+ duplicados (bug critical)**

**Query:** Eventos similares en últimos 7 días  
**Resultado BD:** 3 registros (id: 123, 124, 125)

| Método | `data` | Condición | Acción |
|--------|--------|-----------|--------|
| `.maybeSingle()` | ❌ **ERROR PGRST116** → `null` | `!null` → `true` | ❌ INSERTA (agrava bug) |
| `.limit(1)` | `[{ id: 123 }]` (solo retorna primero) | `[...].length === 0` → `false` | ✅ SKIPPEA (correcto) |

✅ **`.limit(1)` previene el bucle de agravamiento**

---

## Impacto en el Sistema

### **Antes de la corrección:**

**Síntomas observables:**
- ❌ Usuario ve 10+ notificaciones idénticas en Buzón ("CDT próximo a vencer" repetido)
- ❌ Badges de activos con números inflados (30 eventos no leídos cuando solo debería haber 3)
- ❌ Logs de Edge Function con errores `PGRST116` repetidos
- ❌ Performance degradada (queries lentas al evaluar 50+ duplicados)

**Causa raíz:**
- Inserción manual de evento duplicado (o race condition entre 2 corridas paralelas del cron)
- Primera corrida con duplicados → Error PGRST116 → Inserta otro más
- Segunda corrida → Encuentra 3 duplicados → Error PGRST116 → Inserta otro más
- Bucle infinito

---

### **Después de la corrección:**

**Comportamiento esperado:**
- ✅ Motor detecta que YA HAY eventos similares (aunque sean 10 duplicados)
- ✅ NO inserta más duplicados
- ✅ Logs muestran: `"Skipping duplicate event: cdt_expiring for user 123"`
- ✅ Usuario solo ve 1 notificación por tipo de evento en últimos 7 días

**Estabilidad:**
- ✅ Si hay duplicados previos (estado corrupto), motor NO agrava el problema
- ✅ Nuevas corridas del cron funcionan normalmente
- ✅ Limpiar duplicados manualmente con SQL es suficiente (no se vuelven a crear)

**SQL para limpiar duplicados (opcional, después del fix):**
```sql
-- Identificar duplicados (eventos con mismo user_id, type, asset_ref en últimos 7 días)
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, type, COALESCE(asset_ref, 'NULL')
      ORDER BY created_at ASC
    ) AS rn
  FROM inbox_events
  WHERE created_at >= NOW() - INTERVAL '7 days'
)
-- Eliminar duplicados (mantener solo el más antiguo)
DELETE FROM inbox_events
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
```

---

## Testing

### **Test 1: Inserción normal (sin duplicados previos)**

**Setup:**
1. BD sin eventos para usuario X
2. Ejecutar `supabase functions invoke generate-inbox-events`

**Resultado esperado:**
- ✅ Query: `existing = []` (array vacío)
- ✅ Condición: `existing.length === 0` → `true`
- ✅ Acción: Inserta evento A
- ✅ Logs: `"Created 1 events"`

---

### **Test 2: Skip duplicado (1 evento previo)**

**Setup:**
1. BD con 1 evento tipo `cdt_expiring` para usuario X (creado hace 3 días)
2. Ejecutar `supabase functions invoke generate-inbox-events`

**Resultado esperado:**
- ✅ Query: `existing = [{ id: 123 }]` (array con 1 elemento)
- ✅ Condición: `existing.length === 0` → `false`
- ✅ Acción: Skippea inserción
- ✅ Logs: `"Skipping duplicate event: cdt_expiring for user X"`

---

### **Test 3: Tolera múltiples duplicados (bug crítico corregido)**

**Setup:**
1. BD con 5 eventos idénticos tipo `cdt_expiring` para usuario X (todos creados en últimos 7 días)
2. Ejecutar `supabase functions invoke generate-inbox-events`

**Resultado esperado con `.maybeSingle()` (ANTES):**
- ❌ Query retorna 5 filas → ERROR PGRST116
- ❌ `existing = null` (asignación por defecto)
- ❌ Condición: `!null` → `true`
- ❌ Acción: Inserta evento #6 (agrava bug)

**Resultado esperado con `.limit(1)` (DESPUÉS):**
- ✅ Query retorna `[{ id: 123 }]` (solo el primero, sin error)
- ✅ Condición: `existing.length === 0` → `false`
- ✅ Acción: Skippea inserción
- ✅ Logs: `"Skipping duplicate event: cdt_expiring for user X"`
- ✅ **NO inserta evento #6** → Bucle detenido

---

### **Test 4: Caso edge (asset_ref NULL)**

**Setup:**
1. Evento sin `asset_ref` (ej: cambio tasa Banrep, no relacionado a activo específico)
2. BD con 1 evento previo tipo `banrep_rate_change` con `asset_ref = NULL`

**Query construida:**
```typescript
query = query.is('asset_ref', null)  // Maneja NULL correctamente
const { data: existing } = await query.limit(1)
```

**Resultado esperado:**
- ✅ Query encuentra el evento previo con `asset_ref = NULL`
- ✅ `existing = [{ id: 456 }]`
- ✅ Condición: `existing.length === 0` → `false`
- ✅ Acción: Skippea (correcto)

---

## Archivo Modificado

```
supabase/functions/generate-inbox-events/index.ts    [MODIFICADO]
  - Línea 109: query.maybeSingle() → query.limit(1)
  - Línea 111: if (!existing) → if (!existing || existing.length === 0)
  - Comentario de atribución: "Winston, 2026-06-04"
```

**Total de líneas modificadas:** 5 líneas (2 cambios + 3 comentarios)

---

## Pregunta Final para Winston

### **¿Hay otros usos de `.maybeSingle()` en el mismo archivo que deban corregirse?**

**Búsqueda realizada:**
```bash
grep -n "maybeSingle" generate-inbox-events/index.ts
```

**Resultados:**
- Línea 109: ✅ **CORREGIDA** (validación de duplicados en loop de inserción)
- Línea 217: Query de hurdle rate (solo 1 registro esperado, sin riesgo de duplicados)
- Línea 382: Query de drawdown histórico (solo 1 registro esperado)
- Línea 598: Query de precio EOD (solo 1 registro esperado por ticker/fecha)
- Línea 631: Query de CDT rate (solo 1 registro esperado por fecha)
- Línea 640: Query de inflación (solo 1 registro esperado por tipo/fecha)
- Línea 761: Query de tasa CDT (solo 1 registro esperado)

**Análisis:**
- ✅ **Línea 109 era el único caso crítico** (loop con potencial de duplicados)
- ✅ **Otros usos son seguros** porque queries filtran por PK o combinaciones únicas garantizadas
- ✅ **NO requieren corrección** (no hay riesgo de PGRST116 en esos contextos)

**Justificación:**
```typescript
// Ejemplo línea 217 (seguro):
const { data: hurdleRate } = await supabase
  .from('macro_rates')
  .select('value')
  .eq('type', 'hurdle_rate')
  .order('effective_date', { ascending: false })
  .limit(1)  // Ya tiene limit, solo 1 registro retornado
  .maybeSingle()  // No hay riesgo de PGRST116
```

**Pregunta para Winston:**
¿Debemos aplicar el patrón `.limit(1)` + validación de array en **todos** los `.maybeSingle()` por consistencia, o solo en contextos donde hay riesgo real de duplicados?

---

## Estado

✅ **Implementación completa**  
⏳ **Pendiente:** Aprobación de Winston antes de commit

---

**Próximo paso:** Validación técnica final de Winston antes de crear commit consolidado con los 4 puntos corregidos.
