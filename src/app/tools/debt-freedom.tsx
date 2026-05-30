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
import { type Currency, formatCurrency, formatMonths, parseNumber } from '@/utils/format';

interface PayoffResult {
  months: number;
  totalPaid: number;
  totalInterest: number;
}

function calcPayoff(balance: number, annualRate: number, monthlyPayment: number): PayoffResult | null {
  const r = annualRate / 100 / 12;
  const minToSurvive = balance * r;
  if (monthlyPayment <= minToSurvive) return null;

  const months = Math.ceil(-Math.log(1 - (balance * r) / monthlyPayment) / Math.log(1 + r));
  const totalPaid = monthlyPayment * months;
  const totalInterest = totalPaid - balance;
  return { months, totalPaid, totalInterest };
}

interface ComparisonBarsProps {
  monthsBase: number;
  monthsExtra: number;
}

function ComparisonBars({ monthsBase, monthsExtra }: ComparisonBarsProps) {
  const theme = useTheme();
  return (
    <ThemedView style={barStyles.container}>
      <ThemedText type="small" themeColor="textSecondary" style={barStyles.title}>
        COMPARACIÓN DE TIEMPO
      </ThemedText>

      <View style={barStyles.row}>
        <ThemedText type="small" themeColor="textSecondary" style={barStyles.label}>
          Solo mínimo
        </ThemedText>
        <View style={[barStyles.track, { backgroundColor: theme.backgroundElement }]}>
          <View style={[barStyles.fill, { flex: monthsBase, backgroundColor: theme.divider }]} />
        </View>
        <ThemedText type="small" style={[barStyles.months, { color: theme.textSecondary }]}>
          {monthsBase}m
        </ThemedText>
      </View>

      <View style={barStyles.row}>
        <ThemedText type="small" themeColor="textSecondary" style={barStyles.label}>
          Con extra
        </ThemedText>
        <View style={[barStyles.track, { backgroundColor: theme.backgroundElement }]}>
          <View style={[barStyles.fill, { flex: monthsExtra, backgroundColor: theme.positive }]} />
          <View style={{ flex: monthsBase - monthsExtra }} />
        </View>
        <ThemedText type="small" style={[barStyles.months, { color: theme.positive, fontWeight: '600' as const }]}>
          {monthsExtra}m
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const barStyles = StyleSheet.create({
  container: { gap: Spacing.two },
  title: { letterSpacing: 0.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    width: 72,
    flexShrink: 0,
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 5,
  },
  months: {
    width: 32,
    textAlign: 'right',
    fontSize: 12,
    flexShrink: 0,
  },
});

export default function DebtFreedomScreen() {
  const router = useRouter();
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [currency, setCurrency] = useState<Currency>('COP');
  const [balance, setBalance] = useState('');
  const [rate, setRate] = useState('');
  const [minPayment, setMinPayment] = useState('');
  const [extraPayment, setExtraPayment] = useState('');
  const [result, setResult] = useState<{
    base: PayoffResult;
    accelerated: PayoffResult | null;
  } | null>(null);
  const [paymentTooLow, setPaymentTooLow] = useState(false);

  const currencyLabel = currency === 'COP' ? 'COP' : 'USD';
  const hasExtra = parseNumber(extraPayment) > 0;

  function isValid(): boolean {
    return parseNumber(balance) > 0 && parseNumber(rate) > 0 && parseNumber(minPayment) > 0;
  }

  function handleCalculate() {
    if (!isValid()) return;
    const b = parseNumber(balance);
    const r = parseNumber(rate);
    const min = parseNumber(minPayment);
    const extra = parseNumber(extraPayment);

    const base = calcPayoff(b, r, min);
    if (!base) {
      setPaymentTooLow(true);
      setResult(null);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    setPaymentTooLow(false);
    const accelerated = extra > 0 ? calcPayoff(b, r, min + extra) : null;
    setResult({ base, accelerated });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function reset() {
    setResult(null);
    setPaymentTooLow(false);
  }

  const baseRows: ResultRow[] = result
    ? [
        { label: 'Tiempo para quedar libre', value: formatMonths(result.base.months) },
        { label: 'Total pagado', value: formatCurrency(result.base.totalPaid, currency) },
        { label: 'Intereses totales', value: formatCurrency(result.base.totalInterest, currency), color: theme.risk },
      ]
    : [];

  const accelRows: ResultRow[] = result?.accelerated
    ? [
        { label: 'Tiempo para quedar libre', value: formatMonths(result.accelerated.months), highlight: true },
        { label: 'Total pagado', value: formatCurrency(result.accelerated.totalPaid, currency) },
        { label: 'Intereses totales', value: formatCurrency(result.accelerated.totalInterest, currency), color: theme.positive },
      ]
    : [];

  const savedMonths = result?.accelerated ? result.base.months - result.accelerated.months : 0;
  const savedInterest = result?.accelerated ? result.base.totalInterest - result.accelerated.totalInterest : 0;

  const savingsRows: ResultRow[] = result?.accelerated
    ? [
        { label: 'Meses que te ahorras', value: formatMonths(savedMonths), highlight: true },
        { label: 'Intereses que no pagas', value: formatCurrency(savedInterest, currency), color: theme.positive },
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
              <Ionicons name="remove-circle-outline" size={22} color={theme.positive} />
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.titleBlock}>
            <ThemedText type="subtitle" style={styles.title}>
              Salir de deudas
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Crea una estrategia para eliminar tu deuda y descubre cuánto ahorras pagando un poco más cada mes.
            </ThemedText>
          </ThemedView>

          <CurrencySelector value={currency} onChange={(c) => { setCurrency(c); reset(); }} />

          <ThemedView style={styles.form}>
            <InputField
              label="Saldo actual de la deuda"
              value={balance}
              onChangeText={(t) => { setBalance(t); reset(); }}
              suffix={currencyLabel}
              placeholder="5.000.000"
            />
            <InputField
              label="Tasa anual de interés"
              value={rate}
              onChangeText={(t) => { setRate(t); reset(); }}
              suffix="%"
              placeholder="24"
              hint="Las tarjetas de crédito en Colombia suelen estar entre 18% y 30%."
            />
            <InputField
              label="Pago mínimo mensual"
              value={minPayment}
              onChangeText={(t) => { setMinPayment(t); reset(); }}
              suffix={currencyLabel}
              placeholder="200.000"
            />
            <InputField
              label="Pago extra mensual (opcional)"
              value={extraPayment}
              onChangeText={(t) => { setExtraPayment(t); reset(); }}
              suffix={currencyLabel}
              placeholder="0"
              hint="¿Cuánto más puedes destinar cada mes? Incluso poco hace una gran diferencia."
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

          {paymentTooLow && (
            <ThemedView style={[styles.alertBox, { backgroundColor: theme.attentionSubtle }]}>
              <Ionicons name="alert-circle-outline" size={24} color={theme.attention} />
              <ThemedText type="small" style={[styles.alertText, { color: theme.attention }]}>
                El pago mínimo no alcanza a cubrir los intereses mensuales de esta deuda. Aumenta el pago mínimo para poder saldar la deuda.
              </ThemedText>
            </ThemedView>
          )}

          {result && (
            <ThemedView style={styles.resultSection}>

              {result.accelerated && (
                <ComparisonBars
                  monthsBase={result.base.months}
                  monthsExtra={result.accelerated.months}
                />
              )}

              {hasExtra && result.accelerated && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                  SOLO CON EL PAGO MÍNIMO
                </ThemedText>
              )}
              <ResultCard rows={baseRows} />

              {result.accelerated && (
                <>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                    CON EL PAGO EXTRA
                  </ThemedText>
                  <ResultCard rows={accelRows} />

                  <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                    LO QUE TE AHORRAS
                  </ThemedText>
                  <ResultCard rows={savingsRows} />
                </>
              )}

              <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
                Cálculo basado en tasa fija y pagos regulares. No incluye seguros, comisiones ni cambios en la tasa.
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
