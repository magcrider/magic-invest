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
import { type Currency, formatCurrency, parseNumber } from '@/utils/format';

function calcCompoundInterest(
  principal: number,
  monthly: number,
  annualRate: number,
  years: number,
): { futureValue: number; totalContributed: number; totalGains: number } {
  const r = annualRate / 100 / 12;
  const n = years * 12;

  let futureValue: number;
  if (r === 0) {
    futureValue = principal + monthly * n;
  } else {
    futureValue = principal * Math.pow(1 + r, n) + monthly * ((Math.pow(1 + r, n) - 1) / r);
  }

  const totalContributed = principal + monthly * n;
  const totalGains = futureValue - totalContributed;
  return { futureValue, totalContributed, totalGains };
}

export default function CompoundInterestScreen() {
  const router = useRouter();
  const [currency, setCurrency] = useState<Currency>('COP');
  const [principal, setPrincipal] = useState('');
  const [monthly, setMonthly] = useState('');
  const [rate, setRate] = useState('');
  const [years, setYears] = useState('');
  const [result, setResult] = useState<ReturnType<typeof calcCompoundInterest> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const currencyLabel = currency === 'COP' ? 'COP' : 'USD';

  function isValid(): boolean {
    return (
      parseNumber(principal) > 0 &&
      parseNumber(monthly) >= 0 &&
      parseNumber(rate) > 0 &&
      parseNumber(years) >= 1
    );
  }

  function handleCalculate() {
    if (!isValid()) return;
    setResult(
      calcCompoundInterest(
        parseNumber(principal),
        parseNumber(monthly),
        parseNumber(rate),
        parseNumber(years),
      ),
    );
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  const rows: ResultRow[] = result
    ? [
        {
          label: 'Valor futuro',
          value: formatCurrency(result.futureValue, currency),
          highlight: true,
        },
        {
          label: 'Capital aportado',
          value: formatCurrency(result.totalContributed, currency),
          color: '#5B8E8E66',
        },
        {
          label: 'Ganancias generadas',
          value: formatCurrency(result.totalGains, currency),
          color: Tokens.structural.positive,
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
              <Ionicons name="trending-up-outline" size={22} color={Tokens.structural.positive} />
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.titleBlock}>
            <ThemedText type="subtitle" style={styles.title}>
              Interés compuesto
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Proyecta cuánto valdrá tu dinero si lo dejas crecer con aportes regulares.
            </ThemedText>
          </ThemedView>

          <CurrencySelector value={currency} onChange={(c) => { setCurrency(c); setResult(null); }} />

          <ThemedView style={styles.form}>
            <InputField
              label="Capital inicial"
              value={principal}
              onChangeText={(t) => { setPrincipal(t); setResult(null); }}
              suffix={currencyLabel}
              placeholder="10.000.000"
            />
            <InputField
              label="Aporte mensual"
              value={monthly}
              onChangeText={(t) => { setMonthly(t); setResult(null); }}
              suffix={currencyLabel}
              placeholder="500.000"
              hint="Puedes poner 0 si no harás aportes periódicos."
            />
            <InputField
              label="Tasa anual esperada"
              value={rate}
              onChangeText={(t) => { setRate(t); setResult(null); }}
              suffix="%"
              placeholder="10"
              hint="Usa el promedio histórico del ETF o la tasa del CDT."
            />
            <InputField
              label="Horizonte de tiempo"
              value={years}
              onChangeText={(t) => { setYears(t); setResult(null); }}
              suffix="años"
              placeholder="20"
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

          {result ? (
            <ThemedView style={styles.resultSection}>
              <GrowthChart
                principal={parseNumber(principal)}
                monthly={parseNumber(monthly)}
                annualRate={parseNumber(rate)}
                years={parseNumber(years)}
                currency={currency}
              />
              <ResultCard rows={rows} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
                Cálculo basado en tasa constante y aportes regulares. Los resultados son
                proyecciones, no garantías de rendimiento futuro.
              </ThemedText>
            </ThemedView>
          ) : null}

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: {
    flex: 1,
    paddingTop: Spacing.four,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  scrollContent: {
    paddingBottom: BottomTabInset + Spacing.three,
  },
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
  title: {
    fontSize: 24,
    lineHeight: 32,
  },
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
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonLabel: {
    color: '#FFFFFF',
  },
  resultSection: {
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  disclaimer: {
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
  },
});
