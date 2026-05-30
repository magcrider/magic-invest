import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CurrencySelector } from '@/components/calculator/currency-selector';
import { InputField } from '@/components/calculator/input-field';
import { ResultCard, type ResultRow } from '@/components/calculator/result-card';
import { GrowthChart } from '@/components/calculator/growth-chart';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type Currency, formatCurrency, parseFormattedInput } from '@/utils/format';

interface GoalResult {
  months: number;
  totalContributed: number;
  totalGains: number;
  alreadyReached: boolean;
  unreachable: boolean;
}

function calcTimeToGoal(
  principal: number,
  monthly: number,
  annualRate: number,
  target: number,
): GoalResult {
  if (principal >= target) {
    return { months: 0, totalContributed: principal, totalGains: 0, alreadyReached: true, unreachable: false };
  }

  const r = annualRate / 100 / 12;

  function fv(n: number): number {
    if (r === 0) return principal + monthly * n;
    return principal * Math.pow(1 + r, n) + monthly * ((Math.pow(1 + r, n) - 1) / r);
  }

  // Sin aporte y sin tasa: imposible crecer
  if (monthly === 0 && r === 0) {
    return { months: 0, totalContributed: principal, totalGains: 0, alreadyReached: false, unreachable: true };
  }

  const MAX_MONTHS = 600; // 50 años
  if (fv(MAX_MONTHS) < target) {
    return { months: 0, totalContributed: 0, totalGains: 0, alreadyReached: false, unreachable: true };
  }

  // Búsqueda binaria para encontrar el mes exacto
  let lo = 0;
  let hi = MAX_MONTHS;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (fv(mid) >= target) hi = mid;
    else lo = mid;
  }

  const months = hi;
  const total = fv(months);
  const contributed = principal + monthly * months;
  return { months, totalContributed: contributed, totalGains: total - contributed, alreadyReached: false, unreachable: false };
}

function formatTime(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} año${years !== 1 ? 's' : ''}`);
  if (remainingMonths > 0) parts.push(`${remainingMonths} mes${remainingMonths !== 1 ? 'es' : ''}`);
  return parts.join(' ') || 'menos de 1 mes';
}

export default function TimeToGoalScreen() {
  const router = useRouter();
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [currency, setCurrency] = useState<Currency>('COP');
  const [target, setTarget] = useState('');
  const [principal, setPrincipal] = useState('');
  const [monthly, setMonthly] = useState('');
  const [rate, setRate] = useState('');
  const [result, setResult] = useState<GoalResult | null>(null);

  const currencyLabel = currency === 'COP' ? 'COP' : 'USD';

  function isValid(): boolean {
    return (
      parseFormattedInput(target) > 0 &&
      parseFormattedInput(principal) >= 0 &&
      parseFormattedInput(monthly) >= 0 &&
      parseFormattedInput(rate) >= 0 &&
      (parseFormattedInput(principal) > 0 || parseFormattedInput(monthly) > 0)
    );
  }

  function handleCalculate() {
    if (!isValid()) return;
    setResult(
      calcTimeToGoal(
        parseFormattedInput(principal),
        parseFormattedInput(monthly),
        parseFormattedInput(rate),
        parseFormattedInput(target),
      ),
    );
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  const years = result ? Math.ceil(result.months / 12) : 0;

  const rows: ResultRow[] = result && !result.alreadyReached && !result.unreachable
    ? [
        {
          label: 'Tiempo para alcanzar tu meta',
          value: formatTime(result.months),
          highlight: true,
        },
        {
          label: 'Capital aportado',
          value: formatCurrency(result.totalContributed, currency),
          color: theme.positiveChart,
        },
        {
          label: 'Ganancias al llegar',
          value: formatCurrency(result.totalGains, currency),
          color: theme.positive,
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
              <Ionicons name="flag-outline" size={22} color={theme.positive} />
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.titleBlock}>
            <ThemedText type="subtitle" style={styles.title}>
              Tiempo para alcanzar tu meta
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Descubre en cuánto tiempo puedes alcanzar tu número con lo que inviertes hoy.
            </ThemedText>
          </ThemedView>

          <CurrencySelector value={currency} onChange={(c) => { setCurrency(c); setResult(null); }} />

          <ThemedView style={styles.form}>
            <InputField
              label="¿Cuánto quieres acumular?"
              value={target}
              onChangeText={(t) => { setTarget(t); setResult(null); }}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
              suffix={currencyLabel}
              placeholder="100.000.000"
              inputType={currency === 'COP' ? 'currency-cop' : 'currency-usd'}
            />
            <InputField
              label="Capital inicial"
              value={principal}
              onChangeText={(t) => { setPrincipal(t); setResult(null); }}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
              suffix={currencyLabel}
              placeholder="0"
              hint="Puedes poner 0 si empiezas desde cero."
              inputType={currency === 'COP' ? 'currency-cop' : 'currency-usd'}
            />
            <InputField
              label="Aporte mensual"
              value={monthly}
              onChangeText={(t) => { setMonthly(t); setResult(null); }}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
              suffix={currencyLabel}
              placeholder="500.000"
              inputType={currency === 'COP' ? 'currency-cop' : 'currency-usd'}
            />
            <InputField
              label="Tasa anual esperada"
              value={rate}
              onChangeText={(t) => { setRate(t); setResult(null); }}
              suffix="%"
              placeholder="10"
              hint="Usa el promedio histórico del ETF o la tasa del CDT."
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
              Calcular
            </ThemedText>
          </TouchableOpacity>

          {result?.alreadyReached && (
            <ThemedView style={[styles.specialMessage, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="checkmark-circle-outline" size={28} color={theme.positive} />
              <ThemedText type="default" style={styles.specialMessageText}>
                ¡Ya alcanzaste tu meta con el capital inicial!
              </ThemedText>
            </ThemedView>
          )}

          {result?.unreachable && (
            <ThemedView style={[styles.specialMessage, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="alert-circle-outline" size={28} color={theme.attention} />
              <ThemedText type="default" style={styles.specialMessageText}>
                Con estos parámetros no es posible alcanzar la meta en 50 años. Intenta aumentar el aporte mensual o la tasa esperada.
              </ThemedText>
            </ThemedView>
          )}

          {result && !result.alreadyReached && !result.unreachable && (
            <ThemedView style={styles.resultSection}>
              <ResultCard rows={rows} />
              {years >= 1 && (
                <GrowthChart
                  principal={parseFormattedInput(principal)}
                  monthly={parseFormattedInput(monthly)}
                  annualRate={parseFormattedInput(rate)}
                  years={years}
                  currency={currency}
                />
              )}
              <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
                Proyección basada en tasa constante y aportes regulares. Los resultados son
                estimaciones, no garantías de rendimiento futuro.
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
  specialMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  specialMessageText: {
    flex: 1,
    lineHeight: 22,
  },
  disclaimer: {
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
  },
});
