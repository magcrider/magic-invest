import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CurrencySelector } from '@/components/calculator/currency-selector';
import { InputField } from '@/components/calculator/input-field';
import { ResultCard, type ResultRow } from '@/components/calculator/result-card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type Currency, formatCurrency, parseFormattedInput, formatInput } from '@/utils/format';
import { scrollToInputCenter } from '@/utils/scroll-to-input';

interface LoanResult {
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  firstMonthPrincipal: number;
  firstMonthInterest: number;
  lastMonthPrincipal: number;
  lastMonthInterest: number;
}

export default function LoanPaymentScreen() {
  const router = useRouter();
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const rateFieldRef = useRef<View>(null);
  const monthsFieldRef = useRef<View>(null);
  const [currency, setCurrency] = useState<Currency>('COP');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [months, setMonths] = useState('');
  const [result, setResult] = useState<LoanResult | null>(null);
  const [showRateInfo, setShowRateInfo] = useState(false);
  const [showMonthsInfo, setShowMonthsInfo] = useState(false);

  const currencyLabel = currency === 'COP' ? 'COP' : 'USD';

  function isValid(): boolean {
    const parsedAmount = parseFormattedInput(amount);
    const parsedRate = parseFormattedInput(rate);
    const parsedMonths = parseFormattedInput(months);
    return parsedAmount > 0 && parsedRate > 0 && parsedMonths >= 1;
  }

  function handleCalculate() {
    if (!isValid()) return;

    const P = parseFormattedInput(amount);
    const annualRate = parseFormattedInput(rate);
    const n = parseFormattedInput(months);

    // Tasa mensual
    const r = annualRate / 100 / 12;

    // Fórmula de cuota fija (French system)
    const monthlyPayment = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    const totalPaid = monthlyPayment * n;
    const totalInterest = totalPaid - P;

    // Calcular primer mes (más interés, menos capital)
    const firstMonthInterest = P * r;
    const firstMonthPrincipal = monthlyPayment - firstMonthInterest;

    // Calcular último mes (más capital, menos interés)
    // Balance al inicio del último mes
    const lastMonthBalance = monthlyPayment / (1 + r);
    const lastMonthInterest = lastMonthBalance * r;
    const lastMonthPrincipal = monthlyPayment - lastMonthInterest;

    setResult({
      monthlyPayment,
      totalPaid,
      totalInterest,
      firstMonthPrincipal,
      firstMonthInterest,
      lastMonthPrincipal,
      lastMonthInterest,
    });

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function reset() {
    setResult(null);
  }

  const summaryRows: ResultRow[] = result
    ? [
        { label: 'Cuota mensual fija', value: formatCurrency(result.monthlyPayment, currency), highlight: true },
        { label: 'Total a pagar', value: formatCurrency(result.totalPaid, currency) },
        { label: 'Total intereses', value: formatCurrency(result.totalInterest, currency), color: theme.attention },
        { label: 'Primera cuota — Capital', value: formatCurrency(result.firstMonthPrincipal, currency), color: theme.positive },
        { label: 'Primera cuota — Intereses', value: formatCurrency(result.firstMonthInterest, currency), color: theme.attention },
        { label: 'Última cuota — Capital', value: formatCurrency(result.lastMonthPrincipal, currency), color: theme.positive },
        { label: 'Última cuota — Intereses', value: formatCurrency(result.lastMonthInterest, currency), color: theme.attention },
      ]
    : [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Header sticky */}
        <ThemedView style={styles.stickyHeader}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back-outline" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
          <ThemedView style={[styles.iconBox, { backgroundColor: theme.positiveSubtle }]}>
            <Ionicons name="card-outline" size={22} color={theme.positive} />
          </ThemedView>
        </ThemedView>

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

          <ThemedView style={styles.titleBlock}>
            <ThemedText type="subtitle" style={styles.title}>
              Calcular cuota de crédito
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Descubre cuánto pagarás cada mes con cuota fija y cómo se distribuye entre capital e intereses.
            </ThemedText>
          </ThemedView>

          <CurrencySelector value={currency} onChange={(c) => { setCurrency(c); reset(); }} />

          <ThemedView style={styles.form}>
            <InputField
              label="Monto del crédito"
              value={amount}
              onChangeText={(t) => { setAmount(t); reset(); }}
              scrollRef={scrollRef}
              suffix={currencyLabel}
              placeholder="50.000.000"
              inputType={currency === 'COP' ? 'currency-cop' : 'currency-usd'}
            />

            {/* Tasa con info icon */}
            <View ref={rateFieldRef}>
            <ThemedView style={styles.fieldContainer}>
              <ThemedView style={styles.labelRow}>
                <ThemedText type="small" style={[styles.fieldLabel, { color: theme.text }]}>
                  Tasa de interés (EA)
                </ThemedText>
                <TouchableOpacity onPress={() => setShowRateInfo(!showRateInfo)} hitSlop={8}>
                  <Ionicons
                    name={showRateInfo ? 'information-circle' : 'information-circle-outline'}
                    size={17}
                    color={theme.positive}
                  />
                </TouchableOpacity>
              </ThemedView>

              {showRateInfo && (
                <ThemedView style={[styles.infoCard, { backgroundColor: theme.positiveSubtle, borderLeftColor: theme.positive }]}>
                  <ThemedText style={[styles.infoText, { color: theme.text }]}>
                    <ThemedText style={{ fontWeight: '600' }}>Tasa Efectiva Anual (EA)</ThemedText> — es la tasa que incluye todos los costos del crédito.{'\n\n'}
                    Rangos típicos:{'\n'}
                    • Hipotecario: 10-14%{'\n'}
                    • Vehículo: 14-18%{'\n'}
                    • Libre inversión: 18-24%{'\n'}
                    • Tarjeta de crédito: 24-30%
                  </ThemedText>
                </ThemedView>
              )}

              <ThemedView style={[styles.inputRow, { backgroundColor: theme.backgroundElement }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={rate}
                  onChangeText={(raw) => {
                    const formatted = formatInput(raw, 'percent', rate);
                    setRate(formatted);
                    reset();
                  }}
                  onFocus={() => scrollToInputCenter(scrollRef, rateFieldRef)}
                  placeholder="ej: 18"
                  placeholderTextColor={theme.textPlaceholder}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
                <ThemedText type="small" themeColor="textSecondary" style={styles.inputSuffix}>%</ThemedText>
              </ThemedView>
            </ThemedView>
            </View>

            {/* Plazo con info icon */}
            <View ref={monthsFieldRef}>
            <ThemedView style={styles.fieldContainer}>
              <ThemedView style={styles.labelRow}>
                <ThemedText type="small" style={[styles.fieldLabel, { color: theme.text }]}>
                  Plazo en meses
                </ThemedText>
                <TouchableOpacity onPress={() => setShowMonthsInfo(!showMonthsInfo)} hitSlop={8}>
                  <Ionicons
                    name={showMonthsInfo ? 'information-circle' : 'information-circle-outline'}
                    size={17}
                    color={theme.positive}
                  />
                </TouchableOpacity>
              </ThemedView>

              {showMonthsInfo && (
                <ThemedView style={[styles.infoCard, { backgroundColor: theme.positiveSubtle, borderLeftColor: theme.positive }]}>
                  <ThemedText style={[styles.infoText, { color: theme.text }]}>
                    <ThemedText style={{ fontWeight: '600' }}>Plazo típico por tipo de crédito:</ThemedText>{'\n\n'}
                    • Consumo: 12-60 meses{'\n'}
                    • Vehículo: 84-120 meses (7-10 años){'\n'}
                    • Vivienda: 120-240 meses (10-20 años){'\n\n'}
                    A mayor plazo, menor cuota mensual pero mayor costo total en intereses.
                  </ThemedText>
                </ThemedView>
              )}

              <ThemedView style={[styles.inputRow, { backgroundColor: theme.backgroundElement }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={months}
                  onChangeText={(raw) => {
                    const formatted = formatInput(raw, 'integer', months);
                    setMonths(formatted);
                    reset();
                  }}
                  onFocus={() => scrollToInputCenter(scrollRef, monthsFieldRef)}
                  placeholder="ej: 36"
                  placeholderTextColor={theme.textPlaceholder}
                  keyboardType="number-pad"
                  returnKeyType="done"
                />
              </ThemedView>
            </ThemedView>
            </View>
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

          {result && <ResultCard rows={summaryRows} />}

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  scroll: { flex: 1, paddingHorizontal: Spacing.four },
  scrollContent: { paddingTop: Spacing.two, paddingBottom: Spacing.four },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { gap: Spacing.two, marginBottom: Spacing.four },
  title: { fontWeight: '700' },
  form: { gap: Spacing.three, marginTop: Spacing.three },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.three,
    marginBottom: Spacing.four,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonLabel: { color: '#FFFFFF' },
  fieldContainer: {
    gap: Spacing.one,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  fieldLabel: {
    fontWeight: '600',
  },
  infoCard: {
    borderLeftWidth: 3,
    borderRadius: Spacing.one,
    padding: Spacing.three,
    marginTop: Spacing.one,
    marginBottom: Spacing.one,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 19,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    minHeight: 24,
  },
  inputSuffix: {
    flexShrink: 0,
  },
});
