import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CurrencySelector } from '@/components/calculator/currency-selector';
import { InputField } from '@/components/calculator/input-field';
import { ResultCard, type ResultRow } from '@/components/calculator/result-card';
import { GrowthChart } from '@/components/calculator/growth-chart';
import { BottomTabInset, Spacing, Tokens } from '@/constants/theme';
import { type Currency, formatCurrency, formatPercent, parseNumber } from '@/utils/format';

// ─── Lógica de cálculo ────────────────────────────────────────────────────────

interface CagrResult {
  cagr: number;            // CAGR en puntos porcentuales (ej: 10.5 → 10.5%)
  totalGain: number;       // valorFinal − valorInicial (puede ser negativo)
  totalReturnPct: number;  // (valorFinal/valorInicial − 1) × 100
}

function calcCagr(initial: number, final: number, years: number): CagrResult {
  const cagr = (Math.pow(final / initial, 1 / years) - 1) * 100;
  return {
    cagr,
    totalGain: final - initial,
    totalReturnPct: (final / initial - 1) * 100,
  };
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function CagrScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [currency, setCurrency] = useState<Currency>('COP');
  const [initialValue, setInitialValue] = useState('');
  const [finalValue, setFinalValue]     = useState('');
  const [years, setYears]               = useState('');
  const [result, setResult] = useState<CagrResult | null>(null);

  const currencyLabel = currency === 'COP' ? 'COP' : 'USD';

  function isValid(): boolean {
    return (
      parseNumber(initialValue) > 0 &&
      parseNumber(finalValue) > 0 &&
      parseNumber(years) > 0
    );
  }

  function handleCalculate() {
    if (!isValid()) return;
    setResult(calcCagr(
      parseNumber(initialValue),
      parseNumber(finalValue),
      parseNumber(years),
    ));
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function reset() { setResult(null); }

  const cagrColor = result
    ? result.cagr >= 0 ? Tokens.structural.positive : Tokens.structural.risk
    : Tokens.structural.positive;

  const showChart = result !== null && result.cagr > 0 && parseNumber(years) >= 2;

  const rows: ResultRow[] = result
    ? [
        { label: 'Valor inicial', value: formatCurrency(parseNumber(initialValue), currency) },
        { label: 'Valor final', value: formatCurrency(parseNumber(finalValue), currency) },
        {
          label: result.totalGain >= 0 ? 'Ganancia total' : 'Pérdida total',
          value: formatCurrency(Math.abs(result.totalGain), currency),
          color: result.totalGain >= 0 ? Tokens.structural.positive : Tokens.structural.risk,
        },
        {
          label: 'Retorno total acumulado',
          value: (result.totalReturnPct >= 0 ? '+' : '') + formatPercent(result.totalReturnPct),
        },
        {
          label: 'CAGR (rendimiento anual promedio)',
          value: (result.cagr >= 0 ? '+' : '') + formatPercent(result.cagr) + ' EA',
          highlight: true,
        },
      ]
    : [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          <ThemedView style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="arrow-back-outline" size={24} color={Tokens.neutral.muted} />
            </TouchableOpacity>
            <ThemedView style={styles.iconBox}>
              <Ionicons name="speedometer-outline" size={22} color={Tokens.structural.positive} />
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.titleBlock}>
            <ThemedText type="subtitle" style={styles.title}>
              Rendimiento anual promedio
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Calcula el CAGR — la tasa anual constante que explica el crecimiento de tu inversión de principio a fin, sin importar los altibajos del camino.
            </ThemedText>
          </ThemedView>

          <CurrencySelector value={currency} onChange={(c) => { setCurrency(c); reset(); }} />

          <ThemedView style={styles.form}>
            <InputField
              label="Valor inicial"
              value={initialValue}
              onChangeText={(t) => { setInitialValue(t); reset(); }}
              suffix={currencyLabel}
              placeholder="10.000.000"
              hint="Cuánto valía la inversión (o cuánto pusiste) al inicio del período."
            />
            <InputField
              label="Valor final"
              value={finalValue}
              onChangeText={(t) => { setFinalValue(t); reset(); }}
              suffix={currencyLabel}
              placeholder="18.500.000"
              hint="Cuánto vale hoy (o al final del período que quieres analizar)."
            />
            <InputField
              label="Años transcurridos"
              value={years}
              onChangeText={(t) => { setYears(t); reset(); }}
              suffix="años"
              placeholder="5"
            />
          </ThemedView>

          <TouchableOpacity
            style={[styles.button, !isValid() && styles.buttonDisabled]}
            onPress={handleCalculate}
            disabled={!isValid()}
            activeOpacity={0.8}>
            <ThemedText type="smallBold" style={styles.buttonLabel}>
              Calcular
            </ThemedText>
          </TouchableOpacity>

          {result && (
            <ThemedView style={styles.resultSection}>
              <ThemedView style={[styles.cagrBox, { backgroundColor: cagrColor + '18' }]}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.cagrLabel}>
                  CAGR
                </ThemedText>
                <ThemedText style={[styles.cagrValue, { color: cagrColor }]}>
                  {result.cagr >= 0 ? '+' : ''}{formatPercent(result.cagr)} EA
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.cagrSub}>
                  Tasa de crecimiento anual compuesta
                </ThemedText>
              </ThemedView>

              {showChart && (
                <GrowthChart
                  principal={parseNumber(initialValue)}
                  monthly={0}
                  annualRate={result.cagr}
                  years={parseNumber(years)}
                  currency={currency}
                />
              )}

              <ResultCard rows={rows} />

              <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
                El CAGR (Compound Annual Growth Rate) es la tasa constante que, año a año, produce el mismo resultado final. No refleja volatilidad — una inversión con CAGR del 10% pudo haber caído 30% un año y subido 50% en otro. Para comparaciones entre activos, el CAGR iguala el terreno de juego.
              </ThemedText>
            </ThemedView>
          )}

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingTop: Spacing.four },
  scroll: { flex: 1, paddingHorizontal: Spacing.four },
  scrollContent: { paddingBottom: BottomTabInset + Spacing.three },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#5B8E8E22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  title: { fontSize: 24, lineHeight: 32 },
  form: {
    gap: Spacing.three,
    marginTop: Spacing.three,
    marginBottom: Spacing.four,
  },
  button: {
    backgroundColor: Tokens.structural.positive,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonLabel: { color: '#FFFFFF' },
  resultSection: {
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  cagrBox: {
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.three,
    padding: Spacing.four,
  },
  cagrLabel: { letterSpacing: 1 },
  cagrValue: { fontSize: 40, fontWeight: '700', lineHeight: 48 },
  cagrSub: { textAlign: 'center' },
  disclaimer: {
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
  },
});
