import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
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
import { Calendar } from 'react-native-calendars';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCurrency, parseNumber } from '@/utils/format';
import { createCdt } from '@/services/supabase-queries';
import type { CdtCapitalization } from '@/db/schema';

const BANKS = [
  'Bancolombia', 'Banco de Bogotá', 'Davivienda',
  'BBVA', 'Banco Popular', 'Colpatria',
  'Itaú', 'AV Villas', 'Otro',
];

const TERM_PRESETS = [1, 3, 6, 9, 12, 18, 24];

const CAP_OPTIONS: { value: CdtCapitalization; label: string }[] = [
  { value: 'maturity',  label: 'Al vencimiento' },
  { value: 'monthly',   label: 'Mensual'         },
  { value: 'quarterly', label: 'Trimestral'       },
];

const MONTHS_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function addMonths(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function daysBetween(isoStart: string, isoEnd: string): number {
  const start = new Date(`${isoStart}T00:00:00`);
  const end   = new Date(`${isoEnd}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function fmtDateDisplay(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${MONTHS_ES[parseInt(m) - 1]} ${y}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseCOP(raw: string): number {
  return parseInt(raw.replace(/\D/g, ''), 10) || 0;
}

export default function AddCdtScreen() {
  const router = useRouter();
  const theme  = useTheme();

  const [bank,             setBank]             = useState('');
  const [customBank,       setCustomBank]       = useState('');
  const [amount,           setAmount]           = useState('');
  const [rate,             setRate]             = useState('');
  const [isoStart,         setIsoStart]         = useState<string | null>(null);
  const [showCalendar,     setShowCalendar]     = useState(false);
  const [termPreset,       setTermPreset]       = useState<number | 'custom' | null>(null);
  const [customTermMonths, setCustomTermMonths] = useState('');
  const [cap,              setCap]              = useState<CdtCapitalization>('maturity');
  const [saving,           setSaving]           = useState(false);

  const bankFinal  = bank === 'Otro' ? customBank.trim() : bank;
  const termMonths = termPreset === 'custom'
    ? (parseInt(customTermMonths, 10) || 0)
    : (termPreset ?? 0);
  const isoEnd     = isoStart && termMonths > 0 ? addMonths(isoStart, termMonths) : null;
  const termDays   = isoStart && isoEnd ? daysBetween(isoStart, isoEnd) : 0;
  const amountNum  = parseCOP(amount);
  const rateNum    = parseNumber(rate) / 100;

  const grossYield = isoEnd ? amountNum * (Math.pow(1 + rateNum, termDays / 365) - 1) : 0;
  const retefuente = grossYield * 0.04;
  const netYield   = grossYield - retefuente;

  const isValid = !!(bankFinal && isoStart && termMonths > 0 && amountNum > 0 && rateNum > 0);

  async function handleSave() {
    if (!isValid || !isoStart || !isoEnd) return;
    setSaving(true);
    try {
      await createCdt({
        bank: bankFinal,
        amount: amountNum,
        rate: rateNum,
        term_days: termDays,
        start_date: isoStart,
        end_date: isoEnd,
        capitalization: cap,
        withholding_rate: 0.04,
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
                <Ionicons name="time-outline" size={20} color={theme.assetCdt} />
              </View>
            </View>
            <ThemedText style={styles.screenTitle}>Registrar CDT</ThemedText>
            <ThemedText style={[styles.screenSubtitle, { color: theme.textSecondary }]}>
              Ingresa los datos del CDT que ya tienes en tu banco.
            </ThemedText>

            {/* Banco */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>Banco</ThemedText>
              <View style={styles.chipGrid}>
                {BANKS.map((b) => (
                  <Chip key={b} label={b} selected={bank === b} onPress={() => setBank(b)} />
                ))}
              </View>
              {bank === 'Otro' && (
                <TextInput
                  style={[styles.inputRow, styles.textInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                  value={customBank}
                  onChangeText={setCustomBank}
                  placeholder="Nombre del banco"
                  placeholderTextColor={theme.textSecondary}
                  returnKeyType="done"
                />
              )}
            </View>

            {/* Monto */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>Monto</ThemedText>
              <View style={[styles.inputRow, { backgroundColor: theme.backgroundElement }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  returnKeyType="done"
                />
                <ThemedText style={[styles.suffix, { color: theme.textSecondary }]}>COP</ThemedText>
              </View>
            </View>

            {/* Tasa EA */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>Tasa EA</ThemedText>
              <View style={[styles.inputRow, { backgroundColor: theme.backgroundElement }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={rate}
                  onChangeText={setRate}
                  placeholder="0.00"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
                <ThemedText style={[styles.suffix, { color: theme.textSecondary }]}>%</ThemedText>
              </View>
            </View>

            {/* Fecha de inicio */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>Fecha de inicio</ThemedText>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: theme.backgroundElement }]}
                onPress={() => setShowCalendar(true)}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.dateButtonText, { color: isoStart ? theme.text : theme.textSecondary }]}>
                  {isoStart ? fmtDateDisplay(isoStart) : 'Seleccionar fecha'}
                </ThemedText>
                <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Plazo */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>Plazo</ThemedText>
              <View style={styles.chipGrid}>
                {TERM_PRESETS.map((m) => (
                  <Chip
                    key={m}
                    label={m === 1 ? '1 mes' : `${m} meses`}
                    selected={termPreset === m}
                    onPress={() => setTermPreset(m)}
                  />
                ))}
                <Chip
                  label="Otro"
                  selected={termPreset === 'custom'}
                  onPress={() => setTermPreset('custom')}
                />
              </View>
              {termPreset === 'custom' && (
                <View style={[styles.inputRow, { marginTop: Spacing.two, backgroundColor: theme.backgroundElement }]}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    value={customTermMonths}
                    onChangeText={setCustomTermMonths}
                    placeholder="Número de meses"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                  <ThemedText style={[styles.suffix, { color: theme.textSecondary }]}>meses</ThemedText>
                </View>
              )}
            </View>

            {/* Capitalización */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>Capitalización</ThemedText>
              <View style={styles.chipGrid}>
                {CAP_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    label={o.label}
                    selected={cap === o.value}
                    onPress={() => setCap(o.value)}
                  />
                ))}
              </View>
            </View>

            {/* Preview */}
            {isValid && isoEnd && (
              <View style={[styles.previewCard, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={[styles.previewTitle, { color: theme.textSecondary }]}>VISTA PREVIA</ThemedText>
                <PreviewRow label="Vencimiento"      value={fmtDateDisplay(isoEnd)} />
                <PreviewRow label="Plazo real"        value={`${termDays} días`} />
                <View style={[styles.previewDivider, { backgroundColor: theme.divider }]} />
                <PreviewRow label="Rendimiento bruto" value={formatCurrency(grossYield, 'COP')} />
                <PreviewRow label="Retefuente (4%)"   value={`− ${formatCurrency(retefuente, 'COP')}`} />
                <PreviewRow
                  label="Rendimiento neto"
                  value={formatCurrency(netYield, 'COP')}
                  highlight
                />
              </View>
            )}

            {/* Save */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: theme.assetCdt },
                (!isValid || saving) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!isValid || saving}
              activeOpacity={0.8}
            >
              <ThemedText style={[styles.saveText, { color: '#FFFFFF' }]}>
                {saving ? 'Guardando…' : 'Guardar CDT'}
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowCalendar(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <ThemedText style={[styles.calendarTitle, { color: '#1F2024' }]}>
                Seleccionar fecha de inicio
              </ThemedText>
              <TouchableOpacity onPress={() => setShowCalendar(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <Calendar
              current={isoStart ?? todayIso()}
              onDayPress={(day) => {
                setIsoStart(day.dateString);
                setShowCalendar(false);
              }}
              markedDates={
                isoStart
                  ? { [isoStart]: { selected: true, selectedColor: theme.assetCdt } }
                  : {}
              }
              theme={{
                backgroundColor: '#FFFFFF',
                calendarBackground: '#FFFFFF',
                selectedDayBackgroundColor: theme.assetCdt,
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: theme.assetCdt,
                dayTextColor: '#1F2024',
                textDisabledColor: '#9CA3AF',
                monthTextColor: '#1F2024',
                arrowColor: theme.assetCdt,
                textMonthFontWeight: '600',
                textDayFontSize: 14,
                textMonthFontSize: 15,
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
        selected && { backgroundColor: theme.backgroundSelected, borderColor: theme.assetCdt },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <ThemedText style={[
        styles.chipText,
        { color: selected ? theme.assetCdt : theme.text },
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
        { color: highlight ? theme.assetCdt : theme.text },
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
  section: { marginBottom: Spacing.four },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  dateButtonText: { fontSize: 16 },
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
  suffix:    { fontSize: 14 },
  textInput: { fontSize: 16, marginTop: Spacing.two },
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
  saveButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveText: { fontSize: 16, fontWeight: '600' },

  // Calendar modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  calendarTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
});
