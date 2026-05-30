import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CurrencySelector } from '@/components/calculator/currency-selector';
import { InputField } from '@/components/calculator/input-field';
import { ResultCard, type ResultRow } from '@/components/calculator/result-card';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type Currency, formatCurrency, formatPercent, abbreviateValue, parseFormattedInput } from '@/utils/format';

// ─── Lógica de cálculo ────────────────────────────────────────────────────────

// La comisión (TER) se resta del rendimiento bruto cada año compuesto.
// FV_neto = capital × (1 + r − ter/100)^años
// FV_bruto = capital × (1 + r)^años
// Costo real = FV_bruto − FV_neto

interface FeeDragResult {
  fvBruto: number;
  fvNeto: number;
  feeCost: number;
  feePct: number;  // feeCost / fvBruto × 100
}

function calcFeeDrag(capital: number, rateEA: number, terEA: number, years: number): FeeDragResult {
  const fvBruto = capital * Math.pow(1 + rateEA / 100, years);
  const netRate = rateEA / 100 - terEA / 100;
  const fvNeto  = capital * Math.pow(1 + netRate, years);
  const feeCost = fvBruto - fvNeto;
  return { fvBruto, fvNeto, feeCost, feePct: (feeCost / fvBruto) * 100 };
}

// ─── Barras comparativas ──────────────────────────────────────────────────────

interface ValueBarsProps {
  grossValue: number;
  netValue: number;
  currency: Currency;
}

function ValueBars({ grossValue, netValue, currency }: ValueBarsProps) {
  const theme    = useTheme();
  const max      = grossValue;
  const grossFlex = 100;
  const netFlex   = Math.round((netValue / max) * 100);

  return (
    <ThemedView style={barStyles.container}>
      <ThemedText type="small" themeColor="textSecondary" style={barStyles.title}>
        IMPACTO DE LAS COMISIONES
      </ThemedText>

      <View style={barStyles.row}>
        <ThemedText type="small" themeColor="textSecondary" style={barStyles.label}>
          Sin TER
        </ThemedText>
        <View style={[barStyles.track, { backgroundColor: theme.backgroundElement }]}>
          <View style={[barStyles.fill, { flex: grossFlex, backgroundColor: theme.positive }]} />
          <View style={{ flex: 100 - grossFlex }} />
        </View>
        <ThemedText type="small" style={[barStyles.amount, { color: theme.positive }]}>
          {abbreviateValue(grossValue, currency)}
        </ThemedText>
      </View>

      <View style={barStyles.row}>
        <ThemedText type="small" themeColor="textSecondary" style={barStyles.label}>
          Con TER
        </ThemedText>
        <View style={[barStyles.track, { backgroundColor: theme.backgroundElement }]}>
          <View style={[barStyles.fill, { flex: netFlex, backgroundColor: theme.attention }]} />
          <View style={{ flex: 100 - netFlex }} />
        </View>
        <ThemedText type="small" style={[barStyles.amount, { color: theme.attention }]}>
          {abbreviateValue(netValue, currency)}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const barStyles = StyleSheet.create({
  container: { gap: Spacing.two },
  title: { letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: { width: 56, flexShrink: 0 },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  fill: { borderRadius: 5 },
  amount: { width: 52, textAlign: 'right', fontSize: 12, flexShrink: 0 },
});

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function FeeDragScreen() {
  const router = useRouter();
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [currency, setCurrency] = useState<Currency>('COP');
  const [capital, setCapital]   = useState('');
  const [rate, setRate]         = useState('');
  const [ter, setTer]           = useState('');
  const [years, setYears]       = useState('');
  const [result, setResult] = useState<FeeDragResult | null>(null);

  const currencyLabel = currency === 'COP' ? 'COP' : 'USD';

  function isValid(): boolean {
    return (
      parseFormattedInput(capital) > 0 &&
      parseFormattedInput(rate) > 0 &&
      parseFormattedInput(ter) >= 0 &&
      parseFormattedInput(years) > 0
    );
  }

  function handleCalculate() {
    if (!isValid()) return;
    setResult(calcFeeDrag(
      parseFormattedInput(capital),
      parseFormattedInput(rate),
      parseFormattedInput(ter),
      parseFormattedInput(years),
    ));
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function reset() { setResult(null); }

  const rows: ResultRow[] = result
    ? [
        {
          label: 'Valor final sin comisión',
          value: formatCurrency(result.fvBruto, currency),
          color: theme.positive,
        },
        {
          label: 'Valor final con TER',
          value: formatCurrency(result.fvNeto, currency),
          highlight: true,
        },
        {
          label: 'Capital que se llevan las comisiones',
          value: formatCurrency(result.feeCost, currency),
          color: theme.risk,
        },
        {
          label: '% de tu ganancia potencial perdida',
          value: formatPercent(result.feePct),
          color: theme.risk,
        },
      ]
    : [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
          keyboardVerticalOffset={Platform.select({ ios: 0, android: 20 })}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">

          <ThemedView style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="arrow-back-outline" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
            <ThemedView style={[styles.iconBox, { backgroundColor: theme.positiveSubtle }]}>
              <Ionicons name="hourglass-outline" size={22} color={theme.positive} />
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.titleBlock}>
            <ThemedText type="subtitle" style={styles.title}>
              ¿Cuánto te cuestan las comisiones?
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Visualiza cuánto capital pierdes cuando el TER se acumula año tras año sobre el interés compuesto.
            </ThemedText>
          </ThemedView>

          <CurrencySelector value={currency} onChange={(c) => { setCurrency(c); reset(); }} />

          <ThemedView style={styles.form}>
            <InputField
              label="Capital inicial"
              value={capital}
              onChangeText={(t) => { setCapital(t); reset(); }}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
              suffix={currencyLabel}
              placeholder="10.000.000"
              inputType={currency === 'COP' ? 'currency-cop' : 'currency-usd'}
            />
            <InputField
              label="Rendimiento bruto esperado (EA)"
              value={rate}
              onChangeText={(t) => { setRate(t); reset(); }}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
              suffix="%"
              placeholder="10"
              hint="Rendimiento del índice antes de descontar comisiones. El S&P 500 ha promediado ~10% en USD."
              inputType="percent"
            />
            <InputField
              label="TER anual del fondo"
              value={ter}
              onChangeText={(t) => { setTer(t); reset(); }}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
              suffix="%"
              placeholder="0.20"
              hint="Total Expense Ratio. ETFs indexados baratos cobran 0.03%–0.20%. Los fondos activos suelen cobrar 1%–2%."
              inputType="decimal"
            />
            <InputField
              label="Horizonte de inversión"
              value={years}
              onChangeText={(t) => { setYears(t); reset(); }}
              suffix="años"
              placeholder="20"
              inputType="integer"
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
            />
          </ThemedView>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.positive }, !isValid() && styles.buttonDisabled]}
            onPress={handleCalculate}
            disabled={!isValid()}
            activeOpacity={0.8}>
            <ThemedText type="smallBold" style={styles.buttonLabel}>
              Calcular
            </ThemedText>
          </TouchableOpacity>

          {result && (
            <ThemedView style={styles.resultSection}>
              <ThemedView style={[styles.costBox, { backgroundColor: theme.riskSubtle }]}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.costLabel}>
                  COSTO TOTAL DE COMISIONES
                </ThemedText>
                <ThemedText style={[styles.costValue, { color: theme.risk }]}>
                  {formatCurrency(result.feeCost, currency)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.costSub}>
                  {formatPercent(result.feePct)} de tu ganancia potencial
                </ThemedText>
              </ThemedView>

              <ValueBars
                grossValue={result.fvBruto}
                netValue={result.fvNeto}
                currency={currency}
              />

              <ResultCard rows={rows} />

              <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
                El TER (Total Expense Ratio) se deduce del rendimiento cada año. Con el interés compuesto, una diferencia de 1% anual se convierte en un porcentaje significativo del valor final en 20+ años. Elige fondos indexados de bajo costo para maximizar el capital que trabaja para ti.
              </ThemedText>
            </ThemedView>
          )}

        </ScrollView>
        </KeyboardAvoidingView>
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
  costBox: {
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.three,
    padding: Spacing.four,
  },
  costLabel: { letterSpacing: 1 },
  costValue: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  costSub: { textAlign: 'center' },
  disclaimer: {
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
  },
});
