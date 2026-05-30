import {
  ScrollView,
  StyleSheet,
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
  const theme  = useTheme();

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
              <Ionicons name="arrow-back-outline" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ThemedText style={styles.title}>¿Qué quieres agregar?</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            Selecciona el tipo de activo para registrarlo en tu portafolio.
          </ThemedText>

          {/* Options list */}
          <View style={[styles.list, { backgroundColor: theme.backgroundElement }]}>
            {OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={option.label}
                style={[
                  styles.item,
                  { borderBottomColor: theme.divider },
                  index === 0 && styles.itemFirst,
                  index === OPTIONS.length - 1 && styles.itemLast,
                  !option.enabled && styles.itemDisabled,
                ]}
                onPress={() => handleSelect(option)}
                disabled={!option.enabled}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.itemIcon,
                  { backgroundColor: option.enabled ? theme.background : theme.backgroundSelected },
                ]}>
                  <Ionicons
                    name={option.icon as any}
                    size={22}
                    color={option.enabled ? theme.text : theme.textSecondary}
                  />
                </View>

                <View style={styles.itemBody}>
                  <ThemedText style={[
                    styles.itemLabel,
                    { color: option.enabled ? theme.text : theme.textSecondary },
                  ]}>
                    {option.label}
                  </ThemedText>
                  <ThemedText style={[styles.itemDesc, { color: theme.textSecondary }]}>
                    {option.description}
                  </ThemedText>
                </View>

                {option.enabled ? (
                  <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                ) : (
                  <View style={[styles.soonBadge, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText style={[styles.soonText, { color: theme.textSecondary }]}>
                      próximamente
                    </ThemedText>
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
    lineHeight: 34,
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.four,
  },
  list: {
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
  },
  itemFirst: { borderTopLeftRadius: Spacing.two, borderTopRightRadius: Spacing.two },
  itemLast:  { borderBottomWidth: 0, borderBottomLeftRadius: Spacing.two, borderBottomRightRadius: Spacing.two },
  itemDisabled: { opacity: 0.45 },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: { flex: 1 },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  soonBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: 100,
  },
  soonText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
