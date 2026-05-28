import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { Tokens, Spacing, BottomTabInset } from '@/constants/theme';

interface AssetOption {
  icon: string;
  label: string;
  description: string;
  route?: '/portfolio/add-etf' | '/portfolio/add-cdt';
  enabled: boolean;
}

const OPTIONS: AssetOption[] = [
  {
    icon: 'analytics-outline',
    label: 'ETF indexado',
    description: 'Fondos cotizados globales (VOO, IWDA, QQQ…)',
    route: '/portfolio/add-etf',
    enabled: true,
  },
  {
    icon: 'time-outline',
    label: 'CDT colombiano',
    description: 'Certificado de depósito a término fijo',
    route: '/portfolio/add-cdt',
    enabled: true,
  },
  {
    icon: 'trending-up-outline',
    label: 'Acción individual',
    description: 'Renta variable directa en bolsa',
    enabled: false,
  },
  {
    icon: 'pie-chart-outline',
    label: 'Fondo de inversión',
    description: 'Fondos locales y fiduciarias',
    enabled: false,
  },
  {
    icon: 'diamond-outline',
    label: 'Criptomoneda',
    description: 'Activos digitales',
    enabled: false,
  },
];

export default function AddAssetScreen() {
  const router = useRouter();

  function handleSelect(option: AssetOption) {
    if (!option.enabled || !option.route) return;
    router.push(option.route);
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="arrow-back-outline" size={24} color={Tokens.neutral.muted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>¿Qué quieres agregar?</Text>
          <Text style={styles.subtitle}>
            Selecciona el tipo de activo para registrarlo en tu portafolio.
          </Text>

          {/* Options list */}
          <View style={styles.list}>
            {OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={option.label}
                style={[
                  styles.item,
                  index === 0 && styles.itemFirst,
                  index === OPTIONS.length - 1 && styles.itemLast,
                  !option.enabled && styles.itemDisabled,
                ]}
                onPress={() => handleSelect(option)}
                disabled={!option.enabled}
                activeOpacity={0.7}
              >
                <View style={[styles.itemIcon, !option.enabled && styles.itemIconDisabled]}>
                  <Ionicons
                    name={option.icon as any}
                    size={22}
                    color={option.enabled ? Tokens.neutral.text : Tokens.neutral.muted}
                  />
                </View>

                <View style={styles.itemBody}>
                  <Text style={[styles.itemLabel, !option.enabled && styles.itemLabelDisabled]}>
                    {option.label}
                  </Text>
                  <Text style={styles.itemDesc}>{option.description}</Text>
                </View>

                {option.enabled ? (
                  <Ionicons name="chevron-forward" size={18} color={Tokens.neutral.muted} />
                ) : (
                  <View style={styles.soonBadge}>
                    <Text style={styles.soonText}>próximamente</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
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
    paddingTop: Spacing.three,
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Tokens.neutral.text,
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 14,
    color: Tokens.neutral.muted,
    lineHeight: 20,
    marginBottom: Spacing.four,
  },

  list: {
    backgroundColor: '#F0F0EC',
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0DC',
  },
  itemFirst: { borderTopLeftRadius: Spacing.two, borderTopRightRadius: Spacing.two },
  itemLast:  { borderBottomWidth: 0, borderBottomLeftRadius: Spacing.two, borderBottomRightRadius: Spacing.two },
  itemDisabled: { opacity: 0.45 },

  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FAFAF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconDisabled: { backgroundColor: '#EBEBЕ8' },

  itemBody: { flex: 1 },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Tokens.neutral.text,
    marginBottom: 2,
  },
  itemLabelDisabled: { color: Tokens.neutral.muted },
  itemDesc: {
    fontSize: 12,
    color: Tokens.neutral.muted,
    lineHeight: 17,
  },

  soonBadge: {
    backgroundColor: '#E8E8E4',
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: 100,
  },
  soonText: {
    fontSize: 11,
    color: Tokens.neutral.muted,
    fontWeight: '500',
  },
});
