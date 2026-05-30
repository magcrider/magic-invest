import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { InputField } from '@/components/calculator/input-field';
import { ResultCard, type ResultRow } from '@/components/calculator/result-card';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseFormattedInput } from '@/utils/format';

// ─── Tipos y conversiones ─────────────────────────────────────────────────────

type RateTab = 'NM' | 'NA' | 'EA';

interface TabConfig {
  id: RateTab;
  label: string;
  fullName: string;
  hint: string;
  placeholder: string;
}

const TABS: TabConfig[] = [
  {
    id: 'EA',
    label: 'EA',
    fullName: 'Efectiva Anual (EA)',
    hint: 'Lo que realmente ganas en el año con capitalización incluida. Ej: 10 para un ETF.',
    placeholder: '10.00',
  },
  {
    id: 'NM',
    label: 'NM / EM',
    fullName: 'Tasa Mensual (NM / EM)',
    hint: 'La tasa que recibes cada mes. Ej: 1.2 si el CDT paga 1.2% mensual.',
    placeholder: '1.20',
  },
  {
    id: 'NA',
    label: 'NA',
    fullName: 'Nominal Anual (NA)',
    hint: 'Tasa anual sin capitalización. Igual a la tasa mensual × 12. Ej: 14.4',
    placeholder: '14.40',
  },
];

interface ConversionResult {
  nm: number; // tasa mensual
  na: number; // nominal anual = nm × 12
  ea: number; // efectiva anual = (1+nm)^12 − 1
}

function convert(value: number, from: RateTab): ConversionResult {
  const r = value / 100;
  let nm: number;

  switch (from) {
    case 'NM':
      nm = r;
      break;
    case 'NA':
      nm = r / 12;
      break;
    case 'EA':
      nm = Math.pow(1 + r, 1 / 12) - 1;
      break;
  }

  return {
    nm: nm * 100,
    na: nm * 12 * 100,
    ea: (Math.pow(1 + nm, 12) - 1) * 100,
  };
}

function fmtRate(value: number): string {
  return value.toLocaleString('es-CO', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + ' %';
}

// ─── Componente tab bar ───────────────────────────────────────────────────────

interface TabBarProps {
  active: RateTab;
  onSelect: (tab: RateTab) => void;
}

function TabBar({ active, onSelect }: TabBarProps) {
  const theme = useTheme();
  return (
    <View style={[tabStyles.bar, { backgroundColor: theme.divider }]}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            tabStyles.tab,
            active === tab.id && [tabStyles.tabActive, { backgroundColor: theme.background }],
          ]}
          onPress={() => onSelect(tab.id)}
          activeOpacity={0.7}>
          <ThemedText
            type="smallBold"
            style={[
              tabStyles.label,
              { color: theme.textSecondary },
              active === tab.id && { color: theme.text },
            ]}>
            {tab.label}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.one + 2,
    borderRadius: Spacing.one + 1,
    alignItems: 'center',
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: 13,
  },
});

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function RateConverterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState<RateTab>('NM');
  const [inputValue, setInputValue] = useState('');
  const [result, setResult] = useState<ConversionResult | null>(null);

  const activeConfig = TABS.find((t) => t.id === activeTab)!;

  function handleTabChange(tab: RateTab) {
    setActiveTab(tab);
    setInputValue('');
    setResult(null);
  }

  function isValid(): boolean {
    return parseFormattedInput(inputValue) > 0;
  }

  function handleConvert() {
    if (!isValid()) return;
    setResult(convert(parseFormattedInput(inputValue), activeTab));
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function buildRows(): ResultRow[] {
    if (!result) return [];
    const rows: ResultRow[] = [];

    if (activeTab !== 'EA') {
      rows.push({
        label: 'Efectiva Anual (EA)',
        value: fmtRate(result.ea),
        highlight: true,
      });
    }
    if (activeTab !== 'NA') {
      rows.push({
        label: 'Nominal Anual (NA)',
        value: fmtRate(result.na),
      });
    }
    if (activeTab !== 'NM') {
      rows.push({
        label: 'NM / EM',
        value: fmtRate(result.nm),
      });
    }

    return rows;
  }

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
              <Ionicons name="swap-horizontal-outline" size={22} color={theme.positive} />
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.titleBlock}>
            <ThemedText type="subtitle" style={styles.title}>
              Conversor de tasas
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Convierte entre tasas mensuales, nominales anuales y efectivas anuales para comparar en igualdad de condiciones.
            </ThemedText>
          </ThemedView>

          <TabBar active={activeTab} onSelect={handleTabChange} />

          <ThemedView style={styles.form}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.tabHint}>
              {activeConfig.fullName} — {activeConfig.hint}
            </ThemedText>
            <InputField
              label={`Ingresa la tasa ${activeConfig.label}`}
              value={inputValue}
              onChangeText={(t) => { setInputValue(t); setResult(null); }}
              suffix="%"
              placeholder={activeConfig.placeholder}
              inputType="percent"
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
            />
          </ThemedView>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.positive }, !isValid() && styles.buttonDisabled]}
            onPress={handleConvert}
            disabled={!isValid()}
            activeOpacity={0.8}>
            <ThemedText type="smallBold" style={styles.buttonLabel}>
              Convertir
            </ThemedText>
          </TouchableOpacity>

          {result && (
            <ThemedView style={styles.resultSection}>
              <ResultCard rows={buildRows()} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
                Conversiones basadas en capitalización mensual compuesta. EA siempre será mayor que NA para tasas positivas.
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
    gap: Spacing.two,
    marginTop: Spacing.three,
    marginBottom: Spacing.four,
  },
  tabHint: {
    lineHeight: 20,
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
