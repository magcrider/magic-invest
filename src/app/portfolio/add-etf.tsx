import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseNumber } from '@/utils/format';
import { createEtf } from '@/services/supabase-queries';

const ETF_CATALOG: Record<string, string> = {
  VOO:  'Vanguard S&P 500 ETF',
  VTI:  'Vanguard Total Stock Market ETF',
  VXUS: 'Vanguard Total International Stock ETF',
  VEA:  'Vanguard FTSE Developed Markets ETF',
  VWO:  'Vanguard FTSE Emerging Markets ETF',
  BND:  'Vanguard Total Bond Market ETF',
  BNDW: 'Vanguard Total World Bond ETF',
  SCHB: 'Schwab US Broad Market ETF',
  IVV:  'iShares Core S&P 500 ETF',
  QQQ:  'Invesco QQQ Trust',
  AGG:  'iShares Core US Aggregate Bond ETF',
  VGT:  'Vanguard Information Technology ETF',
  CSPX: 'iShares Core S&P 500 UCITS ETF',
  IWDA: 'iShares Core MSCI World UCITS ETF',
  VUAA: 'Vanguard S&P 500 UCITS ETF (Acc)',
  EIMI: 'iShares Core MSCI EM IMI UCITS ETF',
};

const TER_PRESETS = ['0.03', '0.07', '0.20'];

type EntryMode = 'COP' | 'USD';
type CostMode  = 'total' | 'price';

// Strips all non-digit characters — handles "2.000.000" and "2,000,000" as COP amounts
function parseCOP(raw: string): number {
  return parseInt(raw.replace(/\D/g, ''), 10) || 0;
}

export default function AddEtfScreen() {
  const router = useRouter();
  const theme  = useTheme();

  // Identification
  const [ticker, setTicker] = useState('');
  const [name,   setName]   = useState('');

  // Cost of acquisition
  const [entryMode, setEntryMode] = useState<EntryMode>('COP');
  const [costMode,  setCostMode]  = useState<CostMode>('total');
  const [totalCop,  setTotalCop]  = useState('');
  const [trm,       setTrm]       = useState('');
  const [totalUsd,  setTotalUsd]  = useState('');
  const [priceUsd,  setPriceUsd]  = useState('');

  // Shares (always optional)
  const [shares,         setShares]         = useState('');
  const [showSharesInfo, setShowSharesInfo] = useState(false);

  // TER (optional)
  const [ter,         setTer]         = useState('');
  const [showTerInfo, setShowTerInfo] = useState(false);
  const [saving,      setSaving]      = useState(false);

  function handleTickerChange(raw: string) {
    const upper = raw.toUpperCase().replace(/[^A-Z]/g, '');
    setTicker(upper);
    if (ETF_CATALOG[upper]) setName(ETF_CATALOG[upper]);
  }

  // --- Derived values ---
  const sharesNum   = parseNumber(shares);
  const totalCopNum = parseCOP(totalCop);
  const trmNum      = parseNumber(trm);
  const totalUsdNum = parseNumber(totalUsd);
  const priceUsdNum = parseNumber(priceUsd);
  const terNum      = parseNumber(ter) / 100;

  // USD equivalent of the total investment
  const totalUsdEquiv: number =
    entryMode === 'COP' && totalCopNum > 0 && trmNum > 0
      ? totalCopNum / trmNum
      : entryMode === 'USD' && costMode === 'total'
      ? totalUsdNum
      : entryMode === 'USD' && costMode === 'price' && sharesNum > 0
      ? priceUsdNum * sharesNum
      : 0;

  // Price per share in USD (0 = unknown)
  const averageCostUsd: number =
    entryMode === 'COP' && trmNum > 0 && sharesNum > 0
      ? totalCopNum / trmNum / sharesNum
      : entryMode === 'USD' && costMode === 'total' && sharesNum > 0
      ? totalUsdNum / sharesNum
      : entryMode === 'USD' && costMode === 'price'
      ? priceUsdNum
      : 0;

  // Validation — shares are ALWAYS optional
  const hasCost =
    entryMode === 'COP'
      ? totalCopNum > 0 && trmNum > 0
      : costMode === 'total'
      ? totalUsdNum > 0
      : priceUsdNum > 0;

  const isValid = !!(ticker && name.trim() && hasCost);

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    try {
      await createEtf({
        ticker,
        name: name.trim(),
        shares: sharesNum,
        average_cost_usd: averageCostUsd,
        ter: terNum,
        currency: entryMode,
        total_invested_cop: entryMode === 'COP' ? totalCopNum : null,
        trm_at_purchase:    entryMode === 'COP' ? trmNum      : null,
        total_invested_usd: totalUsdEquiv > 0   ? totalUsdEquiv : null,
      });
      router.navigate('/portfolio');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="arrow-back-outline" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
              <View style={[styles.headerIcon, { backgroundColor: theme.positiveSubtle }]}>
                <Ionicons name="analytics-outline" size={20} color={theme.assetEtf} />
              </View>
            </View>
            <ThemedText style={styles.screenTitle}>Registrar ETF</ThemedText>
            <ThemedText style={[styles.screenSubtitle, { color: theme.textSecondary }]}>
              Ingresa los datos del ETF que ya tienes en tu broker.
            </ThemedText>

            {/* ── Ticker ── */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>Ticker</ThemedText>
              <View style={[styles.inputRow, { backgroundColor: theme.backgroundElement }]}>
                <TextInput
                  style={[styles.input, styles.tickerInput, { color: theme.text }]}
                  value={ticker}
                  onChangeText={handleTickerChange}
                  placeholder="VOO"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                  maxLength={6}
                />
              </View>
              {ETF_CATALOG[ticker] ? (
                <ThemedText style={[styles.catalogHint, { color: theme.positive }]}>
                  <Ionicons name="checkmark-circle" size={13} color={theme.positive} />
                  {'  '}{ETF_CATALOG[ticker]}
                </ThemedText>
              ) : ticker.length >= 2 ? (
                <ThemedText style={[styles.fieldHint, { color: theme.textSecondary }]}>
                  Ticker no reconocido — escribe el nombre del fondo manualmente.
                </ThemedText>
              ) : null}
            </View>

            {/* ── Nombre del fondo ── */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>Nombre del fondo</ThemedText>
              <View style={[styles.inputRow, { backgroundColor: theme.backgroundElement }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Nombre completo del ETF"
                  placeholderTextColor={theme.textSecondary}
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* ── Costo de adquisición ── */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>Costo de adquisición</ThemedText>
              <ThemedText style={[styles.fieldHint, { color: theme.textSecondary }]}>
                Necesitamos esto para calcular tu ganancia o pérdida cuando conectemos precios de mercado.
              </ThemedText>

              {/* Currency selector */}
              <View style={[styles.chipGrid, { marginTop: Spacing.two, marginBottom: Spacing.three }]}>
                <Chip
                  label="Pagué en COP"
                  selected={entryMode === 'COP'}
                  onPress={() => setEntryMode('COP')}
                />
                <Chip
                  label="Pagué en USD"
                  selected={entryMode === 'USD'}
                  onPress={() => setEntryMode('USD')}
                />
              </View>

              {entryMode === 'COP' ? (
                <>
                  <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Total invertido</ThemedText>
                  <View style={[styles.inputRow, { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText style={[styles.prefix, { color: theme.textSecondary }]}>$</ThemedText>
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      value={totalCop}
                      onChangeText={setTotalCop}
                      placeholder="2 000 000"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="numeric"
                      returnKeyType="done"
                    />
                    <ThemedText style={[styles.suffix, { color: theme.textSecondary }]}>COP</ThemedText>
                  </View>

                  <ThemedText style={[styles.inputLabel, { marginTop: Spacing.three, color: theme.textSecondary }]}>
                    TRM (tasa de cambio COP/USD)
                  </ThemedText>
                  <View style={[styles.inputRow, { backgroundColor: theme.backgroundElement }]}>
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      value={trm}
                      onChangeText={setTrm}
                      placeholder="4200"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                    <ThemedText style={[styles.suffix, { color: theme.textSecondary }]}>COP / USD</ThemedText>
                  </View>
                  <ThemedText style={[styles.fieldHint, { color: theme.textSecondary }]}>
                    Busca "TRM Colombia hoy" en Google para obtener el valor actual. Próximamente la consultaremos automáticamente.
                  </ThemedText>
                  {totalCopNum > 0 && trmNum > 0 && (
                    <ThemedText style={[styles.computedHint, { color: theme.assetEtf }]}>
                      → Equivalente: USD {(totalCopNum / trmNum).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </ThemedText>
                  )}
                </>
              ) : (
                <>
                  {/* USD mode toggle */}
                  <View style={[styles.chipGrid, { marginBottom: Spacing.two }]}>
                    <Chip
                      label="Por total invertido"
                      selected={costMode === 'total'}
                      onPress={() => setCostMode('total')}
                    />
                    <Chip
                      label="Por precio / acción"
                      selected={costMode === 'price'}
                      onPress={() => setCostMode('price')}
                    />
                  </View>

                  {costMode === 'total' ? (
                    <>
                      <View style={[styles.inputRow, { backgroundColor: theme.backgroundElement }]}>
                        <TextInput
                          style={[styles.input, { color: theme.text }]}
                          value={totalUsd}
                          onChangeText={setTotalUsd}
                          placeholder="0.00"
                          placeholderTextColor={theme.textSecondary}
                          keyboardType="decimal-pad"
                          returnKeyType="done"
                        />
                        <ThemedText style={[styles.suffix, { color: theme.textSecondary }]}>USD total</ThemedText>
                      </View>
                      {totalUsdNum > 0 && sharesNum > 0 && (
                        <ThemedText style={[styles.computedHint, { color: theme.assetEtf }]}>
                          → Precio por acción: USD {(totalUsdNum / sharesNum).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </ThemedText>
                      )}
                    </>
                  ) : (
                    <>
                      <View style={[styles.inputRow, { backgroundColor: theme.backgroundElement }]}>
                        <TextInput
                          style={[styles.input, { color: theme.text }]}
                          value={priceUsd}
                          onChangeText={setPriceUsd}
                          placeholder="0.00"
                          placeholderTextColor={theme.textSecondary}
                          keyboardType="decimal-pad"
                          returnKeyType="done"
                        />
                        <ThemedText style={[styles.suffix, { color: theme.textSecondary }]}>USD / acción</ThemedText>
                      </View>
                      <ThemedText style={[styles.fieldHint, { color: theme.textSecondary }]}>
                        Precio promedio de compra por acción. Aparece en el historial de transacciones de tu broker.
                      </ThemedText>
                    </>
                  )}
                </>
              )}
            </View>

            {/* ── Acciones (opcional) ── */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>Número de acciones</ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                  <ThemedText style={[styles.optionalLabel, { color: theme.textSecondary }]}>opcional</ThemedText>
                  <TouchableOpacity onPress={() => setShowSharesInfo(!showSharesInfo)} hitSlop={8}>
                    <Ionicons
                      name={showSharesInfo ? 'information-circle' : 'information-circle-outline'}
                      size={17}
                      color={theme.assetEtf}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {showSharesInfo && (
                <View style={[styles.infoCard, { backgroundColor: theme.attentionSubtle, borderLeftColor: theme.attention }]}>
                  <ThemedText style={[styles.infoText, { color: theme.text }]}>
                    Con el número de acciones podemos calcular el precio promedio exacto y analizar el rendimiento por unidad.{'\n\n'}
                    Sin él, registramos solo el monto total invertido — suficiente para comenzar, pero con menos detalle para analizar después.
                  </ThemedText>
                </View>
              )}

              <ThemedText style={[styles.fieldHint, { color: theme.textSecondary }]}>
                Si no lo tienes a mano puedes omitirlo — el registro igual se guarda.
              </ThemedText>
              <View style={[styles.inputRow, { marginTop: Spacing.two, backgroundColor: theme.backgroundElement }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={shares}
                  onChangeText={setShares}
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
                <ThemedText style={[styles.suffix, { color: theme.textSecondary }]}>acc</ThemedText>
              </View>
            </View>

            {/* ── TER (opcional) ── */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  TER — gasto anual del fondo
                </ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                  <ThemedText style={[styles.optionalLabel, { color: theme.textSecondary }]}>opcional</ThemedText>
                  <TouchableOpacity onPress={() => setShowTerInfo(!showTerInfo)} hitSlop={8}>
                    <Ionicons
                      name={showTerInfo ? 'information-circle' : 'information-circle-outline'}
                      size={17}
                      color={theme.assetEtf}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {showTerInfo && (
                <View style={[styles.infoCard, { backgroundColor: theme.attentionSubtle, borderLeftColor: theme.attention }]}>
                  <ThemedText style={[styles.infoText, { color: theme.text }]}>
                    El TER (Total Expense Ratio) es el costo anual del fondo. Lo descuenta el fondo automáticamente — nunca lo pagas de tu bolsillo, pero reduce tu rentabilidad compuesta.{'\n\n'}
                    Cómo encontrarlo: busca "{ticker || 'TICKER'} expense ratio" en Google, o consulta la ficha técnica en la web del emisor.{'\n\n'}
                    Ejemplos: VOO → 0.03% · VTI → 0.03% · IWDA → 0.20% · EIMI → 0.18%
                  </ThemedText>
                </View>
              )}

              <View style={[styles.inputRow, { marginTop: Spacing.two, backgroundColor: theme.backgroundElement }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={ter}
                  onChangeText={setTer}
                  placeholder="0.03"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
                <ThemedText style={[styles.suffix, { color: theme.textSecondary }]}>%</ThemedText>
              </View>
              <View style={[styles.chipGrid, { marginTop: Spacing.two }]}>
                {TER_PRESETS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.backgroundElement },
                      ter === t && { backgroundColor: theme.backgroundSelected, borderColor: theme.assetEtf },
                    ]}
                    onPress={() => setTer(t)}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={[
                      styles.chipText,
                      { color: ter === t ? theme.assetEtf : theme.text },
                      ter === t ? { fontWeight: '600' as const } : undefined,
                    ]}>
                      {t}%
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── Preview ── */}
            {isValid && (
              <View style={[styles.previewCard, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={[styles.previewTitle, { color: theme.textSecondary }]}>VISTA PREVIA</ThemedText>

                {entryMode === 'COP' && (
                  <>
                    <PreviewRow
                      label="Total invertido"
                      value={`$ ${totalCopNum.toLocaleString('es-CO')} COP`}
                    />
                    <PreviewRow
                      label="TRM aplicado"
                      value={trmNum.toLocaleString('es-CO')}
                    />
                    <View style={[styles.previewDivider, { backgroundColor: theme.divider }]} />
                    <PreviewRow
                      label="Equivalente USD"
                      value={`USD ${(totalCopNum / trmNum).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      highlight
                    />
                  </>
                )}

                {entryMode === 'USD' && costMode === 'total' && (
                  <PreviewRow
                    label="Total invertido"
                    value={`USD ${totalUsdNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    highlight
                  />
                )}

                {entryMode === 'USD' && costMode === 'price' && (
                  <>
                    <PreviewRow
                      label="Precio / acción"
                      value={`USD ${priceUsdNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      highlight
                    />
                    {sharesNum > 0 && (
                      <PreviewRow
                        label="Total estimado"
                        value={`USD ${(priceUsdNum * sharesNum).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      />
                    )}
                  </>
                )}

                {sharesNum > 0 && (
                  <>
                    <View style={[styles.previewDivider, { backgroundColor: theme.divider }]} />
                    <PreviewRow
                      label="Fracciones"
                      value={sharesNum % 1 === 0 ? sharesNum.toFixed(0) : sharesNum.toFixed(4)}
                    />
                    {averageCostUsd > 0 && (
                      <PreviewRow
                        label="Precio promedio"
                        value={`USD ${averageCostUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / acc`}
                      />
                    )}
                  </>
                )}

                {sharesNum === 0 && (
                  <ThemedText style={[styles.previewNote, { color: theme.textSecondary }]}>
                    Sin fracciones registradas — podrás agregarlas después.
                  </ThemedText>
                )}
              </View>
            )}

            {/* ── Save ── */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: theme.assetEtf },
                (!isValid || saving) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!isValid || saving}
              activeOpacity={0.8}
            >
              <ThemedText style={[styles.saveText, { color: '#FFFFFF' }]}>
                {saving ? 'Guardando…' : 'Guardar ETF'}
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        { backgroundColor: theme.backgroundElement },
        selected && { backgroundColor: theme.backgroundSelected, borderColor: theme.assetEtf },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <ThemedText style={[
        styles.chipText,
        { color: selected ? theme.assetEtf : theme.text },
        selected ? { fontWeight: '600' as const } : undefined,
      ]}>
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
}

function PreviewRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.previewRow}>
      <ThemedText style={[styles.previewLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
      <ThemedText style={[
        styles.previewValue,
        { color: highlight ? theme.assetEtf : theme.text },
        highlight ? { fontWeight: '700' as const, fontSize: 15 } : undefined,
      ]}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
    marginBottom: Spacing.three,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  screenSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.four,
  },
  section:      { marginBottom: Spacing.four },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.one,
  },
  optionalLabel: {
    fontSize: 11,
    fontWeight: '400',
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: Spacing.one,
    marginTop: Spacing.one,
  },
  fieldHint: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: Spacing.one,
  },
  computedHint: {
    fontSize: 13,
    marginTop: Spacing.one,
    fontWeight: '500',
  },
  infoCard: {
    borderLeftWidth: 3,
    borderRadius: Spacing.one,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 19,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipText: { fontSize: 14 },
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
  },
  tickerInput: { fontWeight: '700', fontSize: 18, letterSpacing: 1 },
  prefix: { fontSize: 14, fontWeight: '600' },
  suffix: { fontSize: 13 },
  catalogHint: {
    marginTop: Spacing.one,
    fontSize: 13,
    paddingHorizontal: Spacing.one,
  },
  previewCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.four,
    gap: Spacing.one,
  },
  previewTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.two,
  },
  previewDivider: {
    height: 1,
    marginVertical: Spacing.two,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: { fontSize: 14 },
  previewValue: { fontSize: 14, fontWeight: '500' },
  previewNote: {
    marginTop: Spacing.two,
    fontSize: 12,
    lineHeight: 18,
  },
  saveButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveText: { fontSize: 16, fontWeight: '600' },
});
