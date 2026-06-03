import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CurrencySelector } from '@/components/calculator/currency-selector';
import { InputField } from '@/components/calculator/input-field';
import { ResultCard, type ResultRow } from '@/components/calculator/result-card';
import { InfoModal } from '@/components/info-modal';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type Currency, formatCurrency, abbreviateValue, parseFormattedInput } from '@/utils/format';
import { getMacroContext, getCdtMarketRates, getTrmHistory } from '@/services/supabase-queries';
import { calculateDevaluation, calculatePortfolioHurdleRate } from '@/lib/hurdle-rate';

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
  const [hurdleRate, setHurdleRate] = useState<number | null>(null);
  const [showHurdleInfo, setShowHurdleInfo] = useState(false);
  const [verdictVariant, setVerdictVariant] = useState(0);

  const currencyLabel = currency === 'COP' ? 'COP' : 'USD';

  // Cargar Hurdle Rate al montar
  useFocusEffect(
    useCallback(() => {
      async function loadHurdleRate() {
        try {
          const macro = await getMacroContext();
          const cdtRates = await getCdtMarketRates(360);
          const cdtRate = cdtRates[0]?.rate;

          if (macro && cdtRate && macro.inflationCOP) {
            const trmHistory = await getTrmHistory(5);
            if (trmHistory.length > 0) {
              const devaluationRate = calculateDevaluation(trmHistory, 5);
              const { hurdleRate: calculatedHurdleRate } = calculatePortfolioHurdleRate({
                cdtRate: cdtRate / 100,
                devaluationRate,
                inflationCOP: macro.inflationCOP / 100,
                inflationUSD: (macro.inflationUSD ?? 3.0) / 100,
              });
              setHurdleRate(calculatedHurdleRate * 100);
            }
          }
        } catch (error) {
          console.error('Error loading hurdle rate:', error);
          setHurdleRate(null);
        }
      }
      loadHurdleRate();
    }, [])
  );

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
    // Seleccionar versión aleatoria del veredicto
    setVerdictVariant(Math.floor(Math.random() * 4));
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

              {/* Veredicto Matemático */}
              {(() => {
                const etfRateParsed = parseFormattedInput(etfRate);
                const etfBeatsHurdle = hurdleRate !== null && etfRateParsed >= hurdleRate;
                const etfWinsValue = result.etf.finalValue > result.cdt.finalValueNet;

                let verdict = '';
                let verdictColor = theme.text;
                let verdictBg = theme.backgroundElement;
                let verdictBorder = theme.divider;

                // Usar el estado para seleccionar versión
                const variantIndex = verdictVariant % 4;

                if (etfWinsValue && etfBeatsHurdle) {
                  const variants = [
                    'Te conviene más el ETF porque terminarías con más plata y la diferencia es suficiente para que valga la pena arriesgar en la bolsa.',
                    'Te conviene más el ETF porque tus ganancias serían mayores y compensa exponerte a la volatilidad del mercado.',
                    'Te conviene más el ETF porque tu capital final sería más alto y el retorno justifica el riesgo que tomarías.',
                    'Te conviene más el ETF porque la rentabilidad que obtendrías vale la pena frente a quedarte en algo seguro pero que rinde menos.',
                  ];
                  verdict = variants[variantIndex];
                  verdictColor = theme.positive;
                  verdictBg = theme.positiveSubtle;
                  verdictBorder = theme.positive;
                } else if (etfWinsValue && !etfBeatsHurdle) {
                  const variants = [
                    'Te conviene más el CDT porque aunque el ETF te daría un poco más de plata, la diferencia es tan chiquita que no vale la pena arriesgar tu dinero cuando lo podrías tener garantizado en el banco.',
                    'Te conviene más el CDT porque el ETF gana muy poco extra y no compensa apostarle a la bolsa cuando puedes tener tu inversión asegurada.',
                    'Te conviene más el CDT porque las ganancias adicionales del ETF son mínimas y no justifican exponerte a posibles pérdidas.',
                    'Te conviene más el CDT porque el retorno extra del ETF es tan bajo que sería una decisión riesgosa para ese beneficio tan pequeño.',
                  ];
                  verdict = variants[variantIndex];
                  verdictColor = theme.attention;
                  verdictBg = theme.attentionSubtle;
                  verdictBorder = theme.attention;
                } else if (!etfWinsValue && !etfBeatsHurdle) {
                  const variants = [
                    'Te conviene más el CDT porque terminarías con más plata sin arriesgar nada. El banco te garantiza ese dinero y el ETF no solo te daría menos, sino que además estarías expuesto a las subidas y bajadas de la bolsa.',
                    'Te conviene más el CDT porque tus ganancias serían mayores sin exponerte al riesgo. Tu capital estaría asegurado y encima rendirías más que con el ETF.',
                    'Te conviene más el CDT porque obtendrías mejor rentabilidad de forma garantizada. Irte al ETF sería arriesgar tu inversión para terminar con menos dinero.',
                    'Te conviene más el CDT porque tu retorno final sería superior sin ningún riesgo. El ETF implicaría apostar a la bolsa para terminar perdiendo frente al CDT.',
                  ];
                  verdict = variants[variantIndex];
                  verdictColor = theme.assetCdt;
                  verdictBg = theme.backgroundElement;
                  verdictBorder = theme.assetCdt;
                } else {
                  const variants = [
                    'Te conviene más el CDT porque terminarías con más plata en este escenario. Aunque el ETF teóricamente podría justificar el riesgo a largo plazo, aquí el CDT gana.',
                    'Te conviene más el CDT porque tus ganancias serían mayores. Aunque el ETF no es una mala opción, en este caso específico el CDT te deja con más capital.',
                    'Te conviene más el CDT porque tu inversión rendiría más. El ETF está bien planteado, pero los números favorecen al CDT en este escenario.',
                    'Te conviene más el CDT porque tu retorno final sería superior. Aunque el ETF podría tener sentido en otros escenarios, aquí el CDT te conviene más.',
                  ];
                  verdict = variants[variantIndex];
                  verdictColor = theme.assetCdt;
                  verdictBg = theme.backgroundElement;
                  verdictBorder = theme.assetCdt;
                }

                return (
                  <View style={[styles.verdictCard, {
                    backgroundColor: verdictBg,
                    borderColor: verdictBorder,
                  }]}>
                    <View style={styles.verdictHeader}>
                      <Ionicons name="checkmark-circle" size={22} color={verdictColor} />
                      <ThemedText style={[styles.verdictTitle, { color: verdictColor }]}>
                        Veredicto
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.verdictText, { color: theme.text }]}>
                      {verdict}
                    </ThemedText>
                    {hurdleRate !== null && (
                      <TouchableOpacity
                        style={styles.verdictFooter}
                        onPress={() => setShowHurdleInfo(true)}
                        activeOpacity={0.7}
                      >
                        <ThemedText style={[styles.verdictFooterText, { color: theme.textSecondary }]}>
                          Hurdle Rate: {hurdleRate.toFixed(2)}% · ¿Qué es?
                        </ThemedText>
                        <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}

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

          {/* Modal educativo Hurdle Rate */}
          <InfoModal
            visible={showHurdleInfo}
            onClose={() => setShowHurdleInfo(false)}
            title="Hurdle Rate"
          >
            <View style={styles.modalSection}>
              <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
                ¿Qué es?
              </ThemedText>
              <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
                Es la <ThemedText style={{ fontWeight: '600' }}>tasa mínima que un ETF debe superar</ThemedText> para justificar el riesgo vs un CDT (sin riesgo, garantizado).
              </ThemedText>
            </View>

            <View style={styles.modalSection}>
              <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
                ¿Cómo se calcula?
              </ThemedText>
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
            </View>

            <View style={styles.modalSection}>
              <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
                ¿Para qué sirve?
              </ThemedText>
              <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
                Separa inversiones sensatas de emocionales:
              </ThemedText>
              <View style={styles.modalList}>
                <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
                  • <ThemedText style={{ fontWeight: '600' }}>ETF arriba del Hurdle</ThemedText> → Justifica el riesgo
                </ThemedText>
                <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
                  • <ThemedText style={{ fontWeight: '600' }}>ETF abajo del Hurdle</ThemedText> → Mejor en CDTs
                </ThemedText>
              </View>
            </View>

            <View style={[styles.modalDisclaimer, {
              backgroundColor: theme.background,
              borderLeftColor: theme.primary,
            }]}>
              <ThemedText style={[styles.modalDisclaimerText, { color: theme.textSecondary }]}>
                Este es el <ThemedText style={{ fontWeight: '600' }}>fundamento matemático</ThemedText> de Magic Invest. No es una sugerencia — es una línea objetiva calculada con datos reales del mercado colombiano.
              </ThemedText>
            </View>
          </InfoModal>

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
  verdictCard: {
    borderRadius: Spacing.three,
    borderWidth: 2,
    padding: Spacing.four,
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  verdictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  verdictTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  verdictText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  verdictFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  verdictFooterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalSection: {
    marginBottom: Spacing.four,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 21,
    marginBottom: Spacing.two,
  },
  modalSectionText: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  modalList: {
    gap: Spacing.one + Spacing.half,
    marginTop: Spacing.two,
  },
  modalListItem: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  modalDisclaimer: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderLeftWidth: 4,
  },
  modalDisclaimerText: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
