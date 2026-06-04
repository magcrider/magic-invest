import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { EVENT_TYPE_CONFIG } from '@/constants/inbox-mock';
import {
  getInboxEvents,
  markEventAsRead,
  getAllCdts,
  getEtfByTicker,
  type InboxEvent as InboxEventDB,
} from '@/services/supabase-queries';

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

const detailStyles = StyleSheet.create({
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.one },
  desc: { lineHeight: 19 },
});

export default function InboxDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme  = useTheme();

  const [event, setEvent] = useState<InboxEventDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [assetRoute, setAssetRoute] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    if (!id) return

    try {
      const events = await getInboxEvents()
      const found = events.find((e) => e.id.toString() === id)
      if (found) {
        setEvent(found)
        // Marcar como leído
        await markEventAsRead(found.id)
      }
    } catch (error) {
      console.error('Error loading event:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useFocusEffect(
    useCallback(() => {
      loadEvent()
    }, [loadEvent])
  )

  const config = event ? EVENT_TYPE_CONFIG[event.type as keyof typeof EVENT_TYPE_CONFIG] : null;

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

  // Formatear fecha legible
  const eventDate = event
    ? new Intl.DateTimeFormat('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(event.createdAt))
    : ''

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        </SafeAreaView>
      </ThemedView>
    )
  }

  if (!event || !config) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back-outline" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
          <ThemedText type="default" themeColor="textSecondary">Mensaje no encontrado.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // Estilos de Markdown siguiendo design system
  const markdownStyles = {
    body: {
      color: theme.textSecondary,
      fontSize: 15,
      lineHeight: 22,
    },
    heading1: {
      color: theme.text,
      fontSize: 24,
      fontWeight: '700' as const,
      lineHeight: 32,
      marginTop: 0,
      marginBottom: 16,
    },
    heading2: {
      color: theme.text,
      fontSize: 20,
      fontWeight: '700' as const,
      lineHeight: 26,
      marginTop: 24,
      marginBottom: 12,
    },
    heading3: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 22,
      marginTop: 16,
      marginBottom: 8,
    },
    paragraph: {
      color: theme.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 0,
      marginBottom: 12,
    },
    strong: {
      fontWeight: '700' as const,
      color: theme.text,
    },
    em: {
      fontStyle: 'italic' as const,
    },
    bullet_list: {
      marginBottom: 12,
    },
    ordered_list: {
      marginBottom: 12,
    },
    list_item: {
      color: theme.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 6,
    },
    hr: {
      backgroundColor: theme.divider,
      height: 1,
      marginVertical: 20,
    },
    blockquote: {
      backgroundColor: theme.backgroundElement,
      borderLeftColor: accentColor,
      borderLeftWidth: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginVertical: 12,
    },
    link: {
      color: theme.positive,
      textDecorationLine: 'underline' as const,
    },
    code_inline: {
      backgroundColor: theme.backgroundElement,
      color: theme.text,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      fontFamily: 'monospace',
    },
    table: {
      borderWidth: 1,
      borderColor: theme.divider,
      borderRadius: 8,
      marginVertical: 12,
    },
    thead: {
      backgroundColor: theme.backgroundElement,
    },
    tbody: {},
    th: {
      flex: 1,
      padding: 10,
      borderRightWidth: 1,
      borderRightColor: theme.divider,
      fontWeight: '600' as const,
      color: theme.text,
    },
    tr: {
      flexDirection: 'row' as const,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },
    td: {
      flex: 1,
      padding: 10,
      borderRightWidth: 1,
      borderRightColor: theme.divider,
      color: theme.textSecondary,
    },
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Header sticky */}
        <View style={styles.stickyHeader}>
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

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          <ThemedText type="small" themeColor="textSecondary">{eventDate}</ThemedText>

          {event.assetRef && (
            <RelatedAssetBox
              relatedAsset={event.assetRef}
              assetRoute={assetRoute}
              onPress={() => assetRoute && router.push(assetRoute as never)}
            />
          )}

          <ThemedText type="subtitle" style={styles.title}>{event.title}</ThemedText>

          <View style={styles.markdownContainer}>
            <Markdown style={markdownStyles}>
              {event.body}
            </Markdown>
          </View>

          <View style={[styles.disclaimerBox, { borderLeftColor: accentColor }]}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
              Este análisis se basa en datos históricos y actuales del mercado. El comportamiento pasado no garantiza resultados futuros. No constituye asesoría financiera ni una recomendación de compra, venta o rebalanceo. Las decisiones de inversión son responsabilidad exclusiva del usuario.
            </ThemedText>
          </View>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  scroll: { flex: 1, paddingHorizontal: Spacing.four },
  scrollContent: { gap: Spacing.four, paddingBottom: BottomTabInset + Spacing.three, paddingTop: Spacing.two },
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
  markdownContainer: {},
  section: { gap: Spacing.two },
  sectionLabel: { letterSpacing: 0.5 },
  disclaimerBox: { borderLeftWidth: 3, paddingLeft: Spacing.three, marginTop: Spacing.two },
  disclaimer: { lineHeight: 18, fontStyle: 'italic' },
});
