# Solución Implementada: Corrección Hurdle Rate (Punto #1)

**Fecha:** 2026-06-04  
**Implementado por:** Claude Code  
**Para revisión de:** Winston (IA Interventora)

---

## Resumen Ejecutivo

Se corrigió completamente la ecuación del Hurdle Rate en **3 ubicaciones críticas** del código:
1. ✅ Librería core: `src/lib/hurdle-rate.ts`
2. ✅ Calculadora UI: `src/app/tools/cdt-vs-etf.tsx`
3. ✅ Motor backend: `supabase/functions/generate-inbox-events/index.ts`

**Ecuación correcta implementada:**
```
R_Hurdle_USD = [(R_CDT × 0.96) - e] / (1 + e) + TER
```

---

## Cambios Implementados

### 1. `src/lib/hurdle-rate.ts`

#### **Función `calculateHurdleRate`**

**ANTES (fórmula incorrecta):**
```typescript
export function calculateHurdleRate({
  cdtRate,
  devaluationRate,
  inflationCOP,
  inflationUSD,
  ter = 0,
}: {
  cdtRate: number;
  devaluationRate: number;
  inflationCOP: number;
  inflationUSD: number;
  ter?: number;
}): number {
  const inflationDiff = inflationCOP - inflationUSD;
  const hurdleRate = cdtRate + devaluationRate - inflationDiff - ter;
  return hurdleRate;
}
```

**DESPUÉS (fórmula corregida):**
```typescript
export function calculateHurdleRate({
  cdtRate,
  devaluationRate,
  ter = 0,
}: {
  cdtRate: number;
  devaluationRate: number;
  ter?: number;
}): number {
  // 1. CDT neto después de retefuente 4% sobre rendimientos
  const cdtNet = cdtRate * 0.96;

  // 2. Ecuación rigurosa: ajuste por devaluación (divisor) + TER (sumando)
  const hurdleRate = (cdtNet - devaluationRate) / (1 + devaluationRate) + ter;

  return hurdleRate;
}
```

**Cambios clave:**
- ✅ **Eliminados parámetros:** `inflationCOP`, `inflationUSD` (redundantes)
- ✅ **Retefuente aplicada:** `cdtRate × 0.96` (descuenta 4% sobre rendimientos)
- ✅ **Devaluación correcta:** Va en numerador (restando) y denominador (dividiendo), no sumando
- ✅ **TER correcto:** Se suma (penaliza al ETF), no se resta

#### **Función `calculatePortfolioHurdleRate`**

**ANTES:**
```typescript
export function calculatePortfolioHurdleRate({
  cdtRate,
  devaluationRate,
  inflationCOP,
  inflationUSD = 0.03,
}: {
  cdtRate: number;
  devaluationRate: number;
  inflationCOP: number;
  inflationUSD?: number;
}): {
  hurdleRate: number;
  components: {
    cdtRate: number;
    devaluationRate: number;
    inflationCOP: number;
    inflationUSD: number;
    inflationDiff: number;
  };
}
```

**DESPUÉS:**
```typescript
export function calculatePortfolioHurdleRate({
  cdtRate,
  devaluationRate,
}: {
  cdtRate: number;
  devaluationRate: number;
}): {
  hurdleRate: number;
  components: {
    cdtRate: number;
    cdtNet: number;
    devaluationRate: number;
    avgTER: number;
  };
}
```

**Cambios clave:**
- ✅ Parámetros de inflación eliminados
- ✅ `components` ahora incluye `cdtNet` (tasa después de retefuente) y `avgTER` (0.05%)
- ✅ Eliminado `inflationDiff` del retorno

---

### 2. `src/app/tools/cdt-vs-etf.tsx`

#### **Carga del Hurdle Rate (líneas 126-150)**

**ANTES:**
```typescript
const { hurdleRate: calculatedHurdleRate } = calculatePortfolioHurdleRate({
  cdtRate: cdtRate / 100,
  devaluationRate,
  inflationCOP: macro.inflationCOP / 100,
  inflationUSD: (macro.inflationUSD ?? 3.0) / 100,
});
```

**DESPUÉS:**
```typescript
const { hurdleRate: calculatedHurdleRate } = calculatePortfolioHurdleRate({
  cdtRate: cdtRate / 100,
  devaluationRate,
});
```

**Cambios clave:**
- ✅ Eliminadas referencias a `macro.inflationCOP` y `macro.inflationUSD`
- ✅ Condición `if (macro && cdtRate && macro.inflationCOP)` simplificada a `if (macro && cdtRate)`

#### **Modal Educativo (líneas 431-448)**

**ANTES:**
```typescript
<ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
  Ajustamos la tasa CDT con la <ThemedText style={{ fontWeight: '600' }}>Ecuación de Fisher</ThemedText>:
</ThemedText>
<View style={styles.modalList}>
  <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
    + Devaluación COP/USD (últimos 5 años)
  </ThemedText>
  <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
    − Diferencial de inflación (COP vs USD)
  </ThemedText>
  <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
    − Costos del ETF (TER)
  </ThemedText>
</View>
```

**DESPUÉS:**
```typescript
<ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
  Usamos ecuación rigurosa de <ThemedText style={{ fontWeight: '600' }}>equivalencia de retornos netos</ThemedText>:
</ThemedText>
<ThemedText style={[styles.modalFormula, {
  color: theme.textSecondary,
  backgroundColor: theme.backgroundElement,
  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
}]}>
  R = [(CDT × 0.96) - e] / (1 + e) + TER
</ThemedText>
<ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
  Donde:
</ThemedText>
<View style={styles.modalList}>
  <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
    • <ThemedText style={{ fontWeight: '600' }}>CDT × 0.96</ThemedText> — Rentabilidad neta después de retefuente 4%
  </ThemedText>
  <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
    • <ThemedText style={{ fontWeight: '600' }}>e</ThemedText> — Devaluación COP/USD histórica (5 años)
  </ThemedText>
  <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
    • <ThemedText style={{ fontWeight: '600' }}>TER</ThemedText> — Costos del ETF (reduce retorno)
  </ThemedText>
</View>
```

**Cambios clave:**
- ✅ Fórmula matemática visible (fuente monospace, fondo destacado)
- ✅ Eliminada referencia al "diferencial de inflación"
- ✅ Explicación corregida: devaluación **reduce** el hurdle (no suma), TER **penaliza** (suma)
- ✅ Nuevo estilo `modalFormula` agregado al stylesheet

---

### 3. `supabase/functions/generate-inbox-events/index.ts`

#### **Función `calculateHurdleRate` (líneas 752-812)**

**ANTES:**
```typescript
// 3. Inflación COP y USD
const { data: inflationCOP } = await supabase
  .from('macro_rates')
  .select('value')
  .eq('type', 'inflation_cop_annual')
  .order('effective_date', { ascending: false })
  .limit(1)
  .maybeSingle()

const { data: inflationUSD } = await supabase
  .from('macro_rates')
  .select('value')
  .eq('type', 'inflation_usd_annual')
  .order('effective_date', { ascending: false })
  .limit(1)
  .maybeSingle()

const infCOP = (inflationCOP?.value || 6.61) / 100
const infUSD = (inflationUSD?.value || 2.95) / 100

// 4. TER promedio (asumido 0.04% para ETFs indexados)
const ter = 0.0004

// Ecuación de Fisher adaptada
const hurdleRate = (cdtRate.rate / 100) + devaluationRate - (infCOP - infUSD) - ter

return hurdleRate * 100
```

**DESPUÉS:**
```typescript
// 3. TER promedio ETFs indexados (VOO, VTI: ~0.03-0.05%)
const ter = 0.0005 // 0.05%

// 4. Ecuación rigurosa corregida (Winston, 2026-06-04)
// (1 + R_ETF - TER)(1 + e) = 1 + (R_CDT × 0.96)
// Despejando: R_Hurdle_USD = [(R_CDT × 0.96) - e] / (1 + e) + TER
const cdtNet = (cdtRate.rate / 100) * 0.96  // Retefuente 4% descontada
const hurdleRate = (cdtNet - devaluationRate) / (1 + devaluationRate) + ter

return hurdleRate * 100
```

**Cambios clave:**
- ✅ **Eliminadas 2 queries a BD:** `inflationCOP` e `inflationUSD` (ya no necesarias)
- ✅ **TER actualizado:** 0.04% → 0.05% (más representativo de VOO/VTI)
- ✅ **Fórmula sincronizada:** Idéntica a la de `hurdle-rate.ts`
- ✅ **Comentario de atribución:** "Winston, 2026-06-04"

---

## Validación de Consistencia

### ✅ Signaturas de función alineadas

**Librería (`hurdle-rate.ts`):**
```typescript
calculateHurdleRate({ cdtRate, devaluationRate, ter? })
```

**Calculadora (`cdt-vs-etf.tsx`):**
```typescript
calculatePortfolioHurdleRate({ cdtRate, devaluationRate })
// Internamente llama a calculateHurdleRate con ter = 0.0005
```

**Motor Backend (`generate-inbox-events/index.ts`):**
```typescript
// Implementación inline idéntica:
const cdtNet = (cdtRate.rate / 100) * 0.96
const hurdleRate = (cdtNet - devaluationRate) / (1 + devaluationRate) + ter
```

### ✅ Valores de TER consistentes

- Calculadora UI: `0.0005` (0.05%)
- Motor Backend: `0.0005` (0.05%)
- Documentación: VOO = 0.03%, VTI = 0.03%, promedio asumido 0.05%

### ✅ Tratamiento de retefuente consistente

- En todos los lugares: `cdtRate × 0.96` (descuenta 4% sobre rendimientos del CDT)

---

## Impacto en Features Existentes

### 1. **Calculadora CDT vs ETF**
- ✅ Ya no depende de `macro.inflationCOP` ni `macro.inflationUSD`
- ✅ Modal educativo actualizado con fórmula correcta
- ✅ Cálculo del Hurdle Rate simplificado (solo 2 parámetros)

### 2. **Motor de Eventos del Buzón**
- ✅ Trigger #5 ("ETF cruza Hurdle Rate") ahora usa ecuación correcta
- ✅ Eliminadas 2 queries innecesarias a `macro_rates` (mejora performance)
- ✅ Fórmula sincronizada con frontend (consistencia total)

### 3. **Módulo Portafolio**
- ✅ Función `calculatePortfolioHurdleRate` simplificada
- ✅ Ya no requiere cargar datos de inflación desde BD
- ✅ Componente `components` retorna solo datos relevantes

---

## Testing Requerido

### Tests Unitarios
```typescript
// Caso de prueba propuesto
describe('calculateHurdleRate', () => {
  it('debe calcular correctamente con devaluación positiva', () => {
    const result = calculateHurdleRate({
      cdtRate: 0.11,      // 11% EA
      devaluationRate: 0.05, // 5% anual
      ter: 0.0005,        // 0.05%
    });
    
    // CDT neto = 11% × 0.96 = 10.56%
    // Hurdle = (0.1056 - 0.05) / 1.05 + 0.0005
    //        = 0.0556 / 1.05 + 0.0005
    //        = 0.0529 + 0.0005
    //        = 0.0534 (5.34%)
    expect(result).toBeCloseTo(0.0534, 4);
  });
  
  it('debe manejar devaluación negativa (revaluación)', () => {
    const result = calculateHurdleRate({
      cdtRate: 0.11,
      devaluationRate: -0.02, // Revaluación 2%
      ter: 0.0005,
    });
    
    // Hurdle = (0.1056 - (-0.02)) / 0.98 + 0.0005
    //        = 0.1256 / 0.98 + 0.0005
    //        = 0.1282 + 0.0005
    //        = 0.1287 (12.87%)
    expect(result).toBeCloseTo(0.1287, 4);
  });
});
```

### Testing Manual
1. ✅ Calculadora CDT vs ETF carga sin errores
2. ✅ Modal "Hurdle Rate" muestra fórmula correcta
3. ✅ No hay errores de TypeScript en compilación
4. ⏳ **Pendiente:** Verificar que motor Buzón genera eventos correctamente

---

## Preguntas para Winston

### 1. **¿La ecuación implementada es algebraicamente correcta?**
   - Fórmula: `R = [(CDT × 0.96) - e] / (1 + e) + TER`
   - ¿Equivale a la ecuación de equivalencia de retornos que propusiste?

### 2. **¿El tratamiento de la retefuente es correcto?**
   - Aplicamos `cdtRate × 0.96` (descuento 4% sobre **rendimientos**, no sobre capital)
   - ¿Es la interpretación correcta según ley tributaria colombiana?

### 3. **¿El valor de TER (0.05%) es razonable?**
   - VOO real: 0.03%
   - VTI real: 0.03%
   - QQQ real: 0.20%
   - Promedio asumido: 0.05%
   - ¿Debería ser 0.03% para ser más conservador?

### 4. **¿Falta algún ajuste matemático?**
   - ¿Spread de compra/venta?
   - ¿Comisión de plataforma (Trii, Hapi)?
   - ¿Impuesto diferencial cambiario (Formulario 160)?

### 5. **¿La eliminación de inflación diferencial es correcta?**
   - Argumento: Ambos activos se evalúan en retorno real COP
   - La inflación USD ya está implícita en la devaluación nominal
   - ¿Algún escenario donde sí importa el diferencial?

---

## Archivos Modificados

```
src/lib/hurdle-rate.ts                                    [MODIFICADO]
src/app/tools/cdt-vs-etf.tsx                              [MODIFICADO]
supabase/functions/generate-inbox-events/index.ts         [MODIFICADO]
```

**Total de líneas cambiadas:** ~85 líneas

---

## Estado

✅ **Implementación completa**  
⏳ **Pendiente:** Aprobación de Winston antes de commit

---

**Próximo paso:** Esperar retroalimentación de Winston antes de proceder con Punto #2 (Tasa Banrep).
