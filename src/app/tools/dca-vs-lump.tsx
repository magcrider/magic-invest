import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
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
import { type Currency, formatCurrency, abbreviateValue, parseNumber } from '@/utils/format';

function calcLumpSum(capital: number, annualRateEA: number, totalMonths: number): number {
  const r = Math.pow(1 + annualRateEA / 100, 1 / 12) - 1;
  return capital * Math.pow(1 + r, totalMonths);
}

function calcDCA(capital: number, annualRateEA: number, totalMonths: number, dcaMonths: number): number {
  const r = Math.pow(1 + annualRateEA / 100, 1 / 12) - 1;
  const installment = capital / dcaMonths;
  let fv = 0;
  for (let i = 0; i < dcaMonths; i++) {
    fv += installment * Math.pow(1 + r, totalMonths - i);
  }
  return fv;
}

// ─── Barras comparativas ──────────────────────────────────────────────────────

interface ValueBarsProps {
  lumpValue: number;
  dcaValue: number;
  currency: Currency;
}

function ValueBars({ lumpValue, dcaValue, currency }: ValueBarsProps) {
  const theme    = useTheme();
  const max      = Math.max(lumpValue, dcaValue);
  const lumpFlex = Math.round((lumpValue / max) * 100);
  const dcaFlex  = Math.round((dcaValue  / max) * 100);

  return (
    <ThemedView style={barStyles.container}>
      <ThemedText type="small" themeColor="textSecondary" style={barStyles.title}>
        COMPARACIÓN DE VALOR FINAL
      </ThemedText>

      <View style={barStyles.row}>
        <ThemedText type="small" themeColor="textSecondary" style={barStyles.label}>
          De una vez
        </ThemedText>
        <View style={[barStyles.track, { backgroundColor: theme.backgroundElement }]}>
          <View style={[barStyles.fill, { flex: lumpFlex, backgroundColor: theme.positive }]} />
          <View style={{ flex: 100 - lumpFlex }} />
        </View>
        <ThemedText type="small" style={[barStyles.amount, { color: theme.positive }]}>
          {abbreviateValue(lumpValue, currency)}
        </ThemedText>
      </View>

      <View style={barStyles.row}>
        <ThemedText type="small" themeColor="textSecondary" style={barStyles.label}>
          Mes a mes
        </ThemedText>
        <View style={[barStyles.track, { backgroundColor: theme.backgroundElement }]}>
          <View style={[barStyles.fill, { flex: dcaFlex, backgroundColor: theme.attention }]} />
          <View style={{ flex: 100 - dcaFlex }} />
        </View>
        <ThemedText type="small" style={[barStyles.amount, { color: theme.attention }]}>
          {abbreviateValue(dcaValue, currency)}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const barStyles = StyleSheet.create({
  container: { gap: Spacing.two },
  title: { letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: { width: 64, flexShrink: 0 },
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

export default function DcaVsLumpScreen() {
  const router = useRouter();
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [currency, setCurrency] = useState<Currency>('COP');
  const [capital, setCapital]       = useState('');
  const [totalMonths, setTotalMonths] = useState('');
  const [dcaMonths, setDcaMonths]   = useState('');
  const [rate, setRate]             = useState('');
  const [result, setResult] = useState<{
    lumpFV: number;
    dcaFV: number;
    installment: number;
  } | null>(null);
  const [dcaError, setDcaError] = useState(false);

  const currencyLabel = currency === 'COP' ? 'COP' : 'USD';

  function isValid(): boolean {
    return (
      parseNumber(capital) > 0 &&
      parseNumber(totalMonths) > 0 &&
      parseNumber(dcaMonths) > 0 &&
      parseNumber(rate) >= 0
    );
  }

  function handleCalculate() {
    if (!isValid()) return;
    const c  = parseNumber(capital);
    const tm = Math.round(parseNumber(totalMonths));
    const dm = Math.round(parseNumber(dcaMonths));
    const r  = parseNumber(rate);

    if (dm > tm) {
      setDcaError(true);
      setResult(null);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    setDcaError(false);
    setResult({
      lumpFV: calcLumpSum(c, r, tm),
      dcaFV:  calcDCA(c, r, tm, dm),
      installment: c / dm,
    });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function reset() {
    setResult(null);
    setDcaError(false);
  }

  const lumpRows: ResultRow[] = result
    ? [
        { label: 'Valor final proyectado', value: formatCurrency(result.lumpFV, currency), highlight: true },
        { label: 'Ganancia total', value: formatCurrency(result.lumpFV - parseNumber(capital), currency), color: theme.positive },
      ]
    : [];

  const dcaRows: ResultRow[] = result
    ? [
        { label: 'Cuota mensual', value: formatCurrency(result.installment, currency) },
        { label: 'Valor final proyectado', value: formatCurrency(result.dcaFV, currency), highlight: true },
        { label: 'Ganancia total', value: formatCurrency(result.dcaFV - parseNumber(capital), currency), color: theme.attention },
      ]
    : [];

  const diff = result ? result.lumpFV - result.dcaFV : 0;

  const costRows: ResultRow[] = result
    ? [
        {
          label: 'Costo de promediar (oportunidad)',
          value: formatCurrency(Math.abs(diff), currency),
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
              <Ionicons name="arrow-back-outline" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
            <ThemedView style={[styles.iconBox, { backgroundColor: theme.positiveSubtle }]}>
              <Ionicons name="calendar-outline" size={22} color={theme.positive} />
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.titleBlock}>
            <ThemedText type="subtitle" style={styles.title}>
              ¿Invierto todo de una vez o mes a mes?
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Si ya tienes el capital disponible, ¿cuánto cuesta esperar y promediar en lugar de invertirlo todo hoy?
            </ThemedText>
          </ThemedView>

          <CurrencySelector value={currency} onChange={(c) => { setCurrency(c); reset(); }} />

          <ThemedView style={styles.form}>
            <InputField
              label="Capital total disponible"
              value={capital}
              onChangeText={(t) => { setCapital(t); reset(); }}
              suffix={currencyLabel}
              placeholder="10.000.000"
            />
            <InputField
              label="Horizonte total"
              value={totalMonths}
              onChangeText={(t) => { setTotalMonths(t); reset(); }}
              suffix="meses"
              placeholder="60"
              hint="Cuánto tiempo planeas mantener la inversión en total."
            />
            <InputField
              label="Meses para distribuir (DCA)"
              value={dcaMonths}
              onChangeText={(t) => { setDcaMonths(t); reset(); }}
              suffix="meses"
              placeholder="12"
              hint="En cuántos meses repartirías el capital. Ej: 12 → una cuota mensual durante 1 año."
            />
            <InputField
              label="Rendimiento anual esperado (EA)"
              value={rate}
              onChangeText={(t) => { setRate(t); reset(); }}
              suffix="%"
              placeholder="10"
              hint="Usa el promedio histórico del activo en el que invertirías."
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

          {dcaError && (
            <ThemedView style={[styles.alertBox, { backgroundColor: theme.attentionSubtle }]}>
              <Ionicons name="alert-circle-outline" size={24} color={theme.attention} />
              <ThemedText type="small" style={[styles.alertText, { color: theme.attention }]}>
                Los meses de distribución no pueden ser mayores al horizonte total de inversión.
              </ThemedText>
            </ThemedView>
          )}

          {result && (
            <ThemedView style={styles.resultSection}>
              <ValueBars
                lumpValue={result.lumpFV}
                dcaValue={result.dcaFV}
                currency={currency}
              />

              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                TODO DE UNA VEZ
              </ThemedText>
              <ResultCard rows={lumpRows} />

              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                MES A MES ({Math.round(parseNumber(dcaMonths))} cuotas)
              </ThemedText>
              <ResultCard rows={dcaRows} />

              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                COSTO DE ESPERAR
              </ThemedText>
              <ResultCard rows={costRows} />

              <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
                Con una tasa positiva constante, invertir todo de una vez siempre supera al promedio en el tiempo —el dinero empieza a trabajar antes. El DCA reduce el riesgo de entrar en el peor momento, pero tiene un costo de oportunidad real. Este modelo no incluye volatilidad ni variación de precios.
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
  alertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  alertText: {
    flex: 1,
    lineHeight: 20,
  },
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
