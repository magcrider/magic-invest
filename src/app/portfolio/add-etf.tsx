import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { Tokens, Spacing, BottomTabInset } from '@/constants/theme';
import { parseNumber } from '@/utils/format';
import { createEtf } from '@/db/queries/etf';

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
  const db     = useSQLiteContext();

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
  const [shares,          setShares]          = useState('');
  const [showSharesInfo,  setShowSharesInfo]  = useState(false);

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
      await createEtf(db, {
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
                <Ionicons name="arrow-back-outline" size={24} color={Tokens.neutral.muted} />
              </TouchableOpacity>
              <View style={styles.headerIcon}>
                <Ionicons name="analytics-outline" size={20} color={Tokens.structural.attention} />
              </View>
            </View>
            <Text style={styles.screenTitle}>Registrar ETF</Text>
            <Text style={styles.screenSubtitle}>
              Ingresa los datos del ETF que ya tienes en tu broker.
            </Text>

            {/* ── Ticker ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ticker</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.tickerInput]}
                  value={ticker}
                  onChangeText={handleTickerChange}
                  placeholder="VOO"
                  placeholderTextColor={Tokens.neutral.muted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                  maxLength={6}
                />
              </View>
              {ETF_CATALOG[ticker] ? (
                <Text style={styles.catalogHint}>
                  <Ionicons name="checkmark-circle" size={13} color={Tokens.structural.positive} />
                  {'  '}{ETF_CATALOG[ticker]}
                </Text>
              ) : ticker.length >= 2 ? (
                <Text style={styles.fieldHint}>Ticker no reconocido — escribe el nombre del fondo manualmente.</Text>
              ) : null}
            </View>

            {/* ── Nombre del fondo ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nombre del fondo</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Nombre completo del ETF"
                  placeholderTextColor={Tokens.neutral.muted}
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* ── Costo de adquisición ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Costo de adquisición</Text>
              <Text style={styles.fieldHint}>
                Necesitamos esto para calcular tu ganancia o pérdida cuando conectemos precios de mercado.
              </Text>

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
                  <Text style={styles.inputLabel}>Total invertido</Text>
                  <View style={styles.inputRow}>
                    <Text style={styles.prefix}>$</Text>
                    <TextInput
                      style={styles.input}
                      value={totalCop}
                      onChangeText={setTotalCop}
                      placeholder="2 000 000"
                      placeholderTextColor={Tokens.neutral.muted}
                      keyboardType="numeric"
                      returnKeyType="done"
                    />
                    <Text style={styles.suffix}>COP</Text>
                  </View>

                  <Text style={[styles.inputLabel, { marginTop: Spacing.three }]}>TRM (tasa de cambio COP/USD)</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={trm}
                      onChangeText={setTrm}
                      placeholder="4200"
                      placeholderTextColor={Tokens.neutral.muted}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                    <Text style={styles.suffix}>COP / USD</Text>
                  </View>
                  <Text style={styles.fieldHint}>
                    Busca "TRM Colombia hoy" en Google para obtener el valor actual. Próximamente la consultaremos automáticamente.
                  </Text>
                  {totalCopNum > 0 && trmNum > 0 && (
                    <Text style={styles.computedHint}>
                      → Equivalente: USD {(totalCopNum / trmNum).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
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
                      <View style={styles.inputRow}>
                        <TextInput
                          style={styles.input}
                          value={totalUsd}
                          onChangeText={setTotalUsd}
                          placeholder="0.00"
                          placeholderTextColor={Tokens.neutral.muted}
                          keyboardType="decimal-pad"
                          returnKeyType="done"
                        />
                        <Text style={styles.suffix}>USD total</Text>
                      </View>
                      {totalUsdNum > 0 && sharesNum > 0 && (
                        <Text style={styles.computedHint}>
                          → Precio por acción: USD {(totalUsdNum / sharesNum).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      )}
                    </>
                  ) : (
                    <>
                      <View style={styles.inputRow}>
                        <TextInput
                          style={styles.input}
                          value={priceUsd}
                          onChangeText={setPriceUsd}
                          placeholder="0.00"
                          placeholderTextColor={Tokens.neutral.muted}
                          keyboardType="decimal-pad"
                          returnKeyType="done"
                        />
                        <Text style={styles.suffix}>USD / acción</Text>
                      </View>
                      <Text style={styles.fieldHint}>
                        Precio promedio de compra por acción. Aparece en el historial de transacciones de tu broker.
                      </Text>
                    </>
                  )}
                </>
              )}
            </View>

            {/* ── Acciones (opcional) ── */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Número de acciones</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                  <Text style={styles.optionalLabel}>opcional</Text>
                  <TouchableOpacity onPress={() => setShowSharesInfo(!showSharesInfo)} hitSlop={8}>
                    <Ionicons
                      name={showSharesInfo ? 'information-circle' : 'information-circle-outline'}
                      size={17}
                      color={Tokens.structural.attention}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {showSharesInfo && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoText}>
                    Con el número de acciones podemos calcular el precio promedio exacto y analizar el rendimiento por unidad.{'\n\n'}
                    Sin él, registramos solo el monto total invertido — suficiente para comenzar, pero con menos detalle para analizar después.
                  </Text>
                </View>
              )}

              <Text style={styles.fieldHint}>
                Si no lo tienes a mano puedes omitirlo — el registro igual se guarda.
              </Text>
              <View style={[styles.inputRow, { marginTop: Spacing.two }]}>
                <TextInput
                  style={styles.input}
                  value={shares}
                  onChangeText={setShares}
                  placeholder="0"
                  placeholderTextColor={Tokens.neutral.muted}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
                <Text style={styles.suffix}>acc</Text>
              </View>
            </View>

            {/* ── TER (opcional) ── */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>
                  TER — gasto anual del fondo
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                  <Text style={styles.optionalLabel}>opcional</Text>
                  <TouchableOpacity onPress={() => setShowTerInfo(!showTerInfo)} hitSlop={8}>
                    <Ionicons
                      name={showTerInfo ? 'information-circle' : 'information-circle-outline'}
                      size={17}
                      color={Tokens.structural.attention}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {showTerInfo && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoText}>
                    El TER (Total Expense Ratio) es el costo anual del fondo. Lo descuenta el fondo automáticamente — nunca lo pagas de tu bolsillo, pero reduce tu rentabilidad compuesta.{'\n\n'}
                    Cómo encontrarlo: busca "{ticker || 'TICKER'} expense ratio" en Google, o consulta la ficha técnica en la web del emisor.{'\n\n'}
                    Ejemplos: VOO → 0.03% · VTI → 0.03% · IWDA → 0.20% · EIMI → 0.18%
                  </Text>
                </View>
              )}

              <View style={[styles.inputRow, { marginTop: Spacing.two }]}>
                <TextInput
                  style={styles.input}
                  value={ter}
                  onChangeText={setTer}
                  placeholder="0.03"
                  placeholderTextColor={Tokens.neutral.muted}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
                <Text style={styles.suffix}>%</Text>
              </View>
              <View style={[styles.chipGrid, { marginTop: Spacing.two }]}>
                {TER_PRESETS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, ter === t && styles.chipSelected]}
                    onPress={() => setTer(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, ter === t && styles.chipTextSelected]}>{t}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── Preview ── */}
            {isValid && (
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>VISTA PREVIA</Text>

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
                    <View style={styles.previewDivider} />
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
                    <View style={styles.previewDivider} />
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
                  <Text style={styles.previewNote}>
                    Sin fracciones registradas — podrás agregarlas después.
                  </Text>
                )}
              </View>
            )}

            {/* ── Save ── */}
            <TouchableOpacity
              style={[styles.saveButton, (!isValid || saving) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!isValid || saving}
              activeOpacity={0.8}
            >
              <Text style={styles.saveText}>{saving ? 'Guardando…' : 'Guardar ETF'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
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
    backgroundColor: `${Tokens.structural.attention}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Tokens.neutral.text,
    marginBottom: Spacing.one,
  },
  screenSubtitle: {
    fontSize: 14,
    color: Tokens.neutral.muted,
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
    color: Tokens.neutral.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.one,
  },
  optionalLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: Tokens.neutral.muted,
  },
  inputLabel: {
    fontSize: 12,
    color: Tokens.neutral.muted,
    marginBottom: Spacing.one,
    marginTop: Spacing.one,
  },
  fieldHint: {
    fontSize: 12,
    color: Tokens.neutral.muted,
    lineHeight: 17,
    marginBottom: Spacing.one,
  },
  computedHint: {
    fontSize: 13,
    color: Tokens.structural.positive,
    marginTop: Spacing.one,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: `${Tokens.structural.attention}10`,
    borderLeftWidth: 3,
    borderLeftColor: Tokens.structural.attention,
    borderRadius: Spacing.one,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  infoText: {
    fontSize: 13,
    color: Tokens.neutral.text,
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
    backgroundColor: '#F0F0EC',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: `${Tokens.structural.positive}18`,
    borderColor: Tokens.structural.positive,
  },
  chipText:         { fontSize: 14, color: Tokens.neutral.text },
  chipTextSelected: { color: Tokens.structural.positive, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0EC',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Tokens.neutral.text,
    padding: 0,
  },
  tickerInput: { fontWeight: '700', fontSize: 18, letterSpacing: 1 },
  prefix: { fontSize: 14, color: Tokens.neutral.muted, fontWeight: '600' },
  suffix: { fontSize: 13, color: Tokens.neutral.muted },
  catalogHint: {
    marginTop: Spacing.one,
    fontSize: 13,
    color: Tokens.structural.positive,
    paddingHorizontal: Spacing.one,
  },
  previewCard: {
    backgroundColor: '#F0F0EC',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.four,
    gap: Spacing.one,
  },
  previewTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Tokens.neutral.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.two,
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#E0E0DC',
    marginVertical: Spacing.two,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel:   { fontSize: 14, color: Tokens.neutral.muted },
  previewValue:   { fontSize: 14, fontWeight: '500', color: Tokens.neutral.text },
  previewValueHL: { fontSize: 15, fontWeight: '700', color: Tokens.structural.attention },
  previewNote: {
    marginTop: Spacing.two,
    fontSize: 12,
    color: Tokens.neutral.muted,
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: Tokens.structural.attention,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PreviewRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.previewRow}>
      <Text style={styles.previewLabel}>{label}</Text>
      <Text style={highlight ? styles.previewValueHL : styles.previewValue}>{value}</Text>
    </View>
  );
}
