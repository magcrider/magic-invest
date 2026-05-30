import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { INBOX_EVENTS, EVENT_TYPE_CONFIG, type ConsequenceRow } from '@/constants/inbox-mock';
import { inboxState } from '@/utils/inbox-state';
import { getAllCdts, getEtfByTicker } from '@/services/supabase-queries';

function RelatedAssetBox({
  relatedAsset,
  assetRoute,
  onPress,
}: {
  relatedAsset: string;
  assetRoute: string | null;
  onPress: () => void;
}) {
  const theme  = useTheme();
  const isCdt  = relatedAsset.startsWith('CDT ');
  const name   = isCdt ? relatedAsset.slice(4) : relatedAsset;
  const color  = isCdt ? theme.assetCdt : theme.assetEtf;
  const boxStyle = [styles.assetBox, { backgroundColor: color + '10', borderColor: color + '35' }];

  const inner = (
    <>
      <View style={[styles.assetBoxIcon, { backgroundColor: color + '20' }]}>
        <Ionicons
          name={isCdt ? 'business-outline' : 'analytics-outline'}
          size={15}
          color={color}
        />
      </View>
      <View style={styles.assetBoxContent}>
        <ThemedText style={[styles.assetBoxType, { color }]}>
          {isCdt ? 'CDT' : 'ETF'} · Activo relacionado
        </ThemedText>
        <ThemedText style={[styles.assetBoxName, { color: theme.text }]}>{name}</ThemedText>
      </View>
      {assetRoute && <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />}
    </>
  );

  if (assetRoute) {
    return (
      <TouchableOpacity style={boxStyle} onPress={onPress} activeOpacity={0.8}>
        {inner}
      </TouchableOpacity>
    );
  }
  return <View style={boxStyle}>{inner}</View>;
}

function ConsequenceCard({ row }: { row: ConsequenceRow }) {
  return (
    <ThemedView type="backgroundElement" style={detailStyles.card}>
      <ThemedText type="smallBold">{row.label}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={detailStyles.desc}>
        {row.description}
      </ThemedText>
    </ThemedView>
  );
}

const detailStyles = StyleSheet.create({
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.one },
  desc: { lineHeight: 19 },
});

export default function InboxDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme  = useTheme();

  const event  = INBOX_EVENTS.find((e) => e.id === id);
  const config = event ? EVENT_TYPE_CONFIG[event.type] : null;

  const accentColor =
    event?.type === 'rebalance'                                   ? theme.positive
    : (event?.type === 'cdt_maturity'
      || event?.type === 'drawdown_context'
      || event?.type === 'market_trigger')                        ? theme.attention
    : theme.textSecondary;
  const accentBg =
    event?.type === 'rebalance'                                   ? theme.positiveSubtle
    : (event?.type === 'cdt_maturity'
      || event?.type === 'drawdown_context'
      || event?.type === 'market_trigger')                        ? theme.attentionSubtle
    : theme.backgroundElement;

  const [assetRoute, setAssetRoute] = useState<string | null>(null);

  useEffect(() => {
    if (id) inboxState.markRead(id);
  }, [id]);

  useEffect(() => {
    if (!event?.relatedAsset) return;
    const label = event.relatedAsset;
    async function resolve() {
      if (label.startsWith('CDT ')) {
        const bankName = label.slice(4);
        const cdts = await getAllCdts();
        const found = cdts.find((c) => c.bank.toLowerCase() === bankName.toLowerCase());
        if (found) setAssetRoute(`/portfolio/cdt/${found.id}`);
      } else {
        const etf = await getEtfByTicker(label);
        if (etf) setAssetRoute(`/portfolio/etf/${etf.id}`);
      }
    }
    resolve();
  }, [event?.relatedAsset]);

  if (!event || !config) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back-outline" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
          <ThemedText type="default" themeColor="textSecondary">Evento no encontrado.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="arrow-back-outline" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
            <View style={[styles.typePill, { backgroundColor: accentBg }]}>
              <Ionicons name={config.icon} size={14} color={accentColor} />
              <ThemedText style={[styles.typeLabel, { color: accentColor }]}>
                {config.label}
              </ThemedText>
            </View>
          </View>

          <ThemedText type="small" themeColor="textSecondary">{event.date}</ThemedText>

          {event.relatedAsset && (
            <RelatedAssetBox
              relatedAsset={event.relatedAsset}
              assetRoute={assetRoute}
              onPress={() => router.push(assetRoute as never)}
            />
          )}

          <ThemedText type="subtitle" style={styles.title}>{event.title}</ThemedText>

          <View style={styles.body}>
            {event.body.map((paragraph, i) => (
              <ThemedText key={i} type="default" themeColor="textSecondary" style={styles.paragraph}>
                {paragraph}
              </ThemedText>
            ))}
          </View>

          {event.consequences && event.consequences.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                ESCENARIOS POSIBLES
              </ThemedText>
              {event.consequences.map((row, i) => (
                <ConsequenceCard key={i} row={row} />
              ))}
            </View>
          )}

          <View style={[styles.disclaimerBox, { borderLeftColor: accentColor }]}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
              {event.disclaimer}
            </ThemedText>
          </View>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingTop: Spacing.four },
  scroll: { flex: 1, paddingHorizontal: Spacing.four },
  scrollContent: { gap: Spacing.four, paddingBottom: BottomTabInset + Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  typeLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  assetBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  assetBoxIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  assetBoxContent: { flex: 1, gap: 2 },
  assetBoxType: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  assetBoxName: {
    fontSize: 15,
    fontWeight: '600',
  },
  title: { fontSize: 22, lineHeight: 30 },
  body: { gap: Spacing.three },
  paragraph: { lineHeight: 22 },
  section: { gap: Spacing.two },
  sectionLabel: { letterSpacing: 0.5 },
  disclaimerBox: { borderLeftWidth: 3, paddingLeft: Spacing.three, marginTop: Spacing.two },
  disclaimer: { lineHeight: 18, fontStyle: 'italic' },
});
