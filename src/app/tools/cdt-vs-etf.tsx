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
import { type Currency, formatCurrency, abbreviateValue, parseFormattedInput } from '@/utils/format';

interface CdtResult {
  finalValueGross: number;
  gains: number;
  retefuente: number;
  finalValueNet: number;
}

function calcCDT(capital: number, annualRateEA: number, months: number): CdtResult {
  const years = months / 12;
  const finalValueGross = capital * Math.pow(1 + annualRateEA / 100, years);
  const gains = finalValueGross - capital;
  const retefuente = gains * 0.04;
  const finalValueNet = finalValueGross - retefuente;
  return { finalValueGross, gains, retefuente, finalValueNet };
}

interface EtfResult {
  finalValue: number;
  gains: number;
}

function calcETF(capital: number, annualRateEA: number, months: number): EtfResult {
  const years = months / 12;
  const finalValue = capital * Math.pow(1 + annualRateEA / 100, years);
  return { finalValue, gains: finalValue - capital };
}

// ─── Barras comparativas ──────────────────────────────────────────────────────

interface ValueBarsProps {
  cdtValue: number;
  etfValue: number;
  currency: Currency;
}

function ValueBars({ cdtValue, etfValue, currency }: ValueBarsProps) {
  const theme   = useTheme();
  const max     = Math.max(cdtValue, etfValue);
  const cdtFlex = Math.round((cdtValue / max) * 100);
  const etfFlex = Math.round((etfValue / max) * 100);

  return (
    <ThemedView style={barStyles.container}>
      <ThemedText type="small" themeColor="textSecondary" style={barStyles.title}>
        COMPARACIÓN DE VALOR FINAL
      </ThemedText>

      <View style={barStyles.row}>
        <ThemedText type="small" themeColor="textSecondary" style={barStyles.label}>CDT</ThemedText>
        <View style={[barStyles.track, { backgroundColor: theme.backgroundElement }]}>
          <View style={[barStyles.fill, { flex: cdtFlex, backgroundColor: theme.assetCdt }]} />
          <View style={{ flex: 100 - cdtFlex }} />
        </View>
        <ThemedText type="small" style={[barStyles.amount, { color: theme.assetCdt }]}>
          {abbreviateValue(cdtValue, currency)}
        </ThemedText>
      </View>

      <View style={barStyles.row}>
        <ThemedText type="small" themeColor="textSecondary" style={barStyles.label}>ETF</ThemedText>
        <View style={[barStyles.track, { backgroundColor: theme.backgroundElement }]}>
          <View style={[barStyles.fill, { flex: etfFlex, backgroundColor: theme.assetEtf }]} />
          <View style={{ flex: 100 - etfFlex }} />
        </View>
        <ThemedText type="small" style={[barStyles.amount, { color: theme.assetEtf }]}>
          {abbreviateValue(etfValue, currency)}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const barStyles = StyleSheet.create({
  container: { gap: Spacing.two },
  title: { letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: { width: 36, flexShrink: 0 },
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

export default function CdtVsEtfScreen() {
  const router = useRouter();
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [currency, setCurrency] = useState<Currency>('COP');
  const [capital, setCapital] = useState('');
  const [months, setMonths] = useState('');
  const [cdtRate, setCdtRate] = useState('');
  const [etfRate, setEtfRate] = useState('');
  const [result, setResult] = useState<{ cdt: CdtResult; etf: EtfResult } | null>(null);

  const currencyLabel = currency === 'COP' ? 'COP' : 'USD';

  function isValid(): boolean {
    return (
      parseFormattedInput(capital) > 0 &&
      parseFormattedInput(months) > 0 &&
      parseFormattedInput(cdtRate) > 0 &&
      parseFormattedInput(etfRate) > 0
    );
  }

  function handleCalculate() {
    if (!isValid()) return;
    const c = parseFormattedInput(capital);
    const m = parseFormattedInput(months);
    setResult({
      cdt: calcCDT(c, parseFormattedInput(cdtRate), m),
      etf: calcETF(c, parseFormattedInput(etfRate), m),
    });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function reset() {
    setResult(null);
  }

  const cdtRows: ResultRow[] = result
    ? [
        { label: 'Valor bruto al vencimiento', value: formatCurrency(result.cdt.finalValueGross, currency) },
        { label: 'Retefuente (4% sobre rendimientos)', value: '− ' + formatCurrency(result.cdt.retefuente, currency), color: theme.risk },
        { label: 'Valor neto recibido', value: formatCurrency(result.cdt.finalValueNet, currency), highlight: true },
      ]
    : [];

  const etfRows: ResultRow[] = result
    ? [
        { label: 'Valor proyectado', value: formatCurrency(result.etf.finalValue, currency), highlight: true },
        { label: 'Ganancia proyectada', value: formatCurrency(result.etf.gains, currency), color: theme.assetEtf },
      ]
    : [];

  const diff = result ? result.etf.finalValue - result.cdt.finalValueNet : 0;
  const etfWins = diff > 0;

  const diffRows: ResultRow[] = result
    ? [
        {
          label: etfWins ? 'El ETF proyecta más por' : 'El CDT neto da más por',
          value: formatCurrency(Math.abs(diff), currency),
          highlight: true,
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
              <Ionicons name="scale-outline" size={22} color={theme.positive} />
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.titleBlock}>
            <ThemedText type="subtitle" style={styles.title}>
              Simulador CDT vs ETF
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Compara el retorno neto de un CDT —descontando retefuente— frente a la proyección de un ETF indexado sobre el mismo horizonte.
            </ThemedText>
          </ThemedView>

          <CurrencySelector value={currency} onChange={(c) => { setCurrency(c); reset(); }} />

          <ThemedView style={styles.form}>
            <InputField
              label="Capital a invertir"
              value={capital}
              onChangeText={(t) => { setCapital(t); reset(); }}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
              suffix={currencyLabel}
              placeholder="10.000.000"
              inputType={currency === 'COP' ? 'currency-cop' : 'currency-usd'}
            />
            <InputField
              label="Horizonte de inversión"
              value={months}
              onChangeText={(t) => { setMonths(t); reset(); }}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
              suffix="meses"
              placeholder="12"
              hint="Ej: 12 → 1 año, 36 → 3 años, 60 → 5 años."
              inputType="integer"
            />
            <InputField
              label="Tasa del CDT (EA)"
              value={cdtRate}
              onChangeText={(t) => { setCdtRate(t); reset(); }}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
              suffix="%"
              placeholder="13.5"
              hint="Tasa efectiva anual que ofrece el banco. Los CDTs en Colombia suelen estar entre 10% y 16% EA."
              inputType="percent"
            />
            <InputField
              label="Rendimiento esperado del ETF (EA)"
              value={etfRate}
              onChangeText={(t) => { setEtfRate(t); reset(); }}
              suffix="%"
              placeholder="10"
              hint="Promedio histórico del índice. El S&P 500 ha rendido ~10% anual en USD a largo plazo."
              inputType="percent"
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
            />
          </ThemedView>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.positive }, !isValid() && styles.buttonDisabled]}
            onPress={handleCalculate}
            disabled={!isValid()}
            activeOpacity={0.8}>
            <ThemedText type="smallBold" style={styles.buttonLabel}>
              Comparar
            </ThemedText>
          </TouchableOpacity>

          {result && (
            <ThemedView style={styles.resultSection}>
              <ValueBars
                cdtValue={result.cdt.finalValueNet}
                etfValue={result.etf.finalValue}
                currency={currency}
              />

              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                CDT
              </ThemedText>
              <ResultCard rows={cdtRows} />

              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                ETF
              </ThemedText>
              <ResultCard rows={etfRows} />

              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                DIFERENCIA
              </ThemedText>
              <ResultCard rows={diffRows} />

              <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
                El CDT incluye retefuente del 4% sobre rendimientos (retención en la fuente para personas naturales en Colombia). El ETF no aplica retefuente local, pero puede estar sujeto a retención en origen. La proyección del ETF asume tasa constante — los rendimientos reales varían año a año.
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
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  sectionLabel: {
    letterSpacing: 0.5,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  disclaimer: {
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
    marginTop: Spacing.two,
  },
});
