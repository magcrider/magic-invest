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
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type Currency, formatCurrency, formatPercent, parseNumber } from '@/utils/format';

// ─── Lógica de cálculo ────────────────────────────────────────────────────────

interface RealReturnResult {
  realRateEA: number;       // Fisher: (1+nominal)/(1+inflation) − 1
  nominalFV: number;        // capital · (1+nominal)^years
  realFV: number;           // poder adquisitivo equivalente en pesos de hoy
  realGain: number;         // realFV − capital (puede ser negativo)
}

function calcRealReturn(
  capital: number,
  nominalEA: number,
  inflationEA: number,
  years: number,
): RealReturnResult {
  const realRateEA = ((1 + nominalEA / 100) / (1 + inflationEA / 100) - 1) * 100;
  const nominalFV = capital * Math.pow(1 + nominalEA / 100, years);
  const realFV    = nominalFV / Math.pow(1 + inflationEA / 100, years);
  return { realRateEA, nominalFV, realFV, realGain: realFV - capital };
}

type Verdict = 'grows' | 'holds' | 'loses';

function getVerdict(realRate: number): Verdict {
  if (realRate > 0.05) return 'grows';
  if (realRate < -0.05) return 'loses';
  return 'holds';
}

// ─── Bloque de veredicto ──────────────────────────────────────────────────────

interface VerdictBlockProps {
  verdict: Verdict;
  realRate: number;
}

function VerdictBlock({ verdict, realRate }: VerdictBlockProps) {
  const theme = useTheme();
  const config = {
    grows: {
      icon: 'trending-up-outline' as const,
      color: theme.positive,
      bg: theme.positiveSubtle,
      text: 'Tu plata CRECE en términos reales.',
      sub: 'Cada año ganas poder adquisitivo por encima de la inflación.',
    },
    holds: {
      icon: 'remove-outline' as const,
      color: theme.attention,
      bg: theme.attentionSubtle,
      text: 'Tu plata apenas AGUANTA.',
      sub: 'El rendimiento cubre la inflación pero no genera ganancia real.',
    },
    loses: {
      icon: 'trending-down-outline' as const,
      color: theme.risk,
      bg: theme.riskSubtle,
      text: 'Tu plata PIERDE poder adquisitivo.',
      sub: 'El rendimiento no alcanza a cubrir la inflación.',
    },
  }[verdict];

  return (
    <ThemedView style={[verdictStyles.container, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={28} color={config.color} />
      <ThemedView style={verdictStyles.textBlock}>
        <ThemedText type="defaultBold" style={{ color: config.color }}>
          {config.text}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={verdictStyles.sub}>
          {config.sub}
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: config.color }}>
          Tasa real: {realRate >= 0 ? '+' : ''}{formatPercent(realRate)} EA
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const verdictStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  textBlock: { flex: 1, gap: Spacing.one },
  sub: { lineHeight: 18 },
});

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function RealReturnScreen() {
  const router = useRouter();
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [currency, setCurrency] = useState<Currency>('COP');
  const [capital, setCapital]     = useState('');
  const [nominal, setNominal]     = useState('');
  const [inflation, setInflation] = useState('');
  const [years, setYears]         = useState('');
  const [result, setResult]       = useState<RealReturnResult | null>(null);

  const currencyLabel = currency === 'COP' ? 'COP' : 'USD';

  function isValid(): boolean {
    return (
      parseNumber(capital) > 0 &&
      parseNumber(nominal) > 0 &&
      parseNumber(inflation) >= 0 &&
      parseNumber(years) > 0
    );
  }

  function handleCalculate() {
    if (!isValid()) return;
    setResult(
      calcRealReturn(
        parseNumber(capital),
        parseNumber(nominal),
        parseNumber(inflation),
        parseNumber(years),
      ),
    );
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function reset() { setResult(null); }

  const verdict = result ? getVerdict(result.realRateEA) : null;

  const rows: ResultRow[] = result
    ? [
        {
          label: 'Valor nominal al final',
          value: formatCurrency(result.nominalFV, currency),
        },
        {
          label: 'Equivalente en pesos de hoy',
          value: formatCurrency(result.realFV, currency),
          highlight: true,
        },
        {
          label: result.realGain >= 0 ? 'Ganancia real' : 'Pérdida de poder adquisitivo',
          value: formatCurrency(Math.abs(result.realGain), currency),
          color: result.realGain >= 0 ? theme.positive : theme.risk,
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
              <Ionicons name="pulse-outline" size={22} color={theme.positive} />
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.titleBlock}>
            <ThemedText type="subtitle" style={styles.title}>
              ¿Tu plata crece o solo aguanta?
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Descubre cuánto poder adquisitivo real ganas (o pierdes) después de descontarle la inflación a tu rendimiento.
            </ThemedText>
          </ThemedView>

          <CurrencySelector value={currency} onChange={(c) => { setCurrency(c); reset(); }} />

          <ThemedView style={styles.form}>
            <InputField
              label="Capital actual"
              value={capital}
              onChangeText={(t) => { setCapital(t); reset(); }}
              suffix={currencyLabel}
              placeholder="10.000.000"
            />
            <InputField
              label="Rendimiento nominal (EA)"
              value={nominal}
              onChangeText={(t) => { setNominal(t); reset(); }}
              suffix="%"
              placeholder="13.5"
              hint="La tasa que te prometió el CDT o el promedio histórico del ETF."
            />
            <InputField
              label="Inflación esperada (IPC)"
              value={inflation}
              onChangeText={(t) => { setInflation(t); reset(); }}
              suffix="%"
              placeholder="5"
              hint="Inflación proyectada en Colombia. La meta del Banrep es 3%. En 2024 fue ~5.2%."
            />
            <InputField
              label="Horizonte"
              value={years}
              onChangeText={(t) => { setYears(t); reset(); }}
              suffix="años"
              placeholder="10"
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

          {result && verdict && (
            <ThemedView style={styles.resultSection}>
              <VerdictBlock verdict={verdict} realRate={result.realRateEA} />

              <ResultCard rows={rows} />

              <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
                Usa la ecuación de Fisher: tasa real = (1 + nominal) ÷ (1 + inflación) − 1. El "equivalente en pesos de hoy" te dice cuánto comprarías con tu dinero futuro en términos del poder adquisitivo actual. La inflación real puede diferir de la proyectada.
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
  disclaimer: {
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
  },
});
