import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PageHeader } from '@/components/page-header';
import { OfflineScreen } from '@/components/offline-screen';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { EVENT_TYPE_CONFIG, type EventType } from '@/constants/inbox-mock';
import {
  getInboxEvents,
  markEventAsRead,
  markEventAsUnread,
  dismissEvent,
  type InboxEvent as InboxEventDB,
} from '@/services/supabase-queries';

type ThemeColors = ReturnType<typeof useTheme>;

// Tipo local para eventos adaptados
interface InboxEvent {
  id: string
  type: EventType
  title: string
  summary: string
  date: string
  isRead: boolean
  relatedAsset?: string
}

function getAssetColors(event: InboxEvent, theme: ThemeColors) {
  if (!event.relatedAsset)                      return { color: theme.textSecondary, bg: theme.backgroundElement };
  if (event.relatedAsset.startsWith('CDT '))    return { color: theme.assetCdt,      bg: theme.assetCdt + '12'  };
  return                                               { color: theme.assetEtf,      bg: theme.assetEtf + '12'  };
}

function getSemanticColors(type: EventType, theme: ThemeColors) {
  switch (type) {
    case 'rebalance':
      return { color: theme.positive,     bg: theme.positiveSubtle   };
    case 'cdt_maturity':
    case 'drawdown_context':
    case 'market_trigger':
      return { color: theme.attention,    bg: theme.attentionSubtle  };
    default:
      return { color: theme.textSecondary, bg: theme.backgroundElement };
  }
}

// ─── Acción izquierda: marcar como no leído (swipe derecho) ──────────────────

function MarkUnreadAction({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[markUnreadStyles.container, { backgroundColor: theme.positive }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name="mail-unread-outline" size={22} color="#FFFFFF" />
      <ThemedText style={[markUnreadStyles.label, { color: '#FFFFFF' }]}>No leído</ThemedText>
    </TouchableOpacity>
  );
}

const markUnreadStyles = StyleSheet.create({
  container: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});

// ─── Acción derecha: eliminar (swipe izquierdo) ───────────────────────────────

function DeleteAction({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={deleteStyles.container} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
      <ThemedText style={deleteStyles.label}>Eliminar</ThemedText>
    </TouchableOpacity>
  );
}

const deleteStyles = StyleSheet.create({
  container: {
    width: 80,
    backgroundColor: '#C0392B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});

// ─── Tarjeta de evento ────────────────────────────────────────────────────────

function EventCard({
  event,
  onPress,
  onDelete,
  onMarkUnread,
}: {
  event: InboxEvent;
  onPress: () => void;
  onDelete: () => void;
  onMarkUnread: () => void;
}) {
  const theme      = useTheme();
  const config     = EVENT_TYPE_CONFIG[event.type];
  const assetTc    = getAssetColors(event, theme);
  const semanticTc = getSemanticColors(event.type, theme);
  const swipeRef   = useRef<Swipeable>(null);

  function handleDelete() {
    swipeRef.current?.close();
    onDelete();
  }

  function handleMarkUnread() {
    swipeRef.current?.close();
    onMarkUnread();
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={event.isRead ? () => <MarkUnreadAction onPress={handleMarkUnread} /> : undefined}
      renderRightActions={() => <DeleteAction onPress={handleDelete} />}
      leftThreshold={80}
      rightThreshold={80}
      overshootLeft={false}
      overshootRight={false}>

      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.background }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <ThemedView style={[styles.iconBox, { backgroundColor: assetTc.bg }]}>
          <Ionicons name={config.icon} size={20} color={assetTc.color} />
        </ThemedView>

        <ThemedView style={styles.cardBody}>
          <ThemedText
            type={event.isRead ? 'default' : 'defaultBold'}
            numberOfLines={2}
            style={[
              styles.cardTitle,
              event.isRead && { color: theme.textSecondary, fontWeight: '400' as const },
            ]}>
            {event.title}
          </ThemedText>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            numberOfLines={2}
            style={[styles.cardSummary, event.isRead && styles.summaryRead]}>
            {event.summary}
          </ThemedText>
          <View style={styles.cardFooter}>
            <View style={[styles.typePill, { backgroundColor: semanticTc.bg }]}>
              <ThemedText style={[styles.typeLabel, { color: semanticTc.color }]}>
                {config.label}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.cardDate}>
              {event.date}
            </ThemedText>
          </View>
        </ThemedView>

        {!event.isRead && (
          <View style={[styles.unreadDot, { backgroundColor: semanticTc.color }]} />
        )}
      </TouchableOpacity>
    </Swipeable>
  );
}

function Separator() {
  const theme = useTheme();
  return <View style={[styles.separator, { backgroundColor: theme.divider }]} />;
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

/**
 * Convierte evento de BD a formato UI
 */
function adaptEventFromDB(dbEvent: InboxEventDB): InboxEvent {
  // Extraer primer párrafo del body como summary
  const summary = dbEvent.body.split('\n\n')[0].substring(0, 150) + (dbEvent.body.length > 150 ? '...' : '')

  // Formatear fecha
  const date = new Date(dbEvent.createdAt)
  const formatted = new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)

  return {
    id: dbEvent.id.toString(),
    type: dbEvent.type as EventType,
    title: dbEvent.title,
    summary,
    date: formatted,
    isRead: !!dbEvent.readAt,
    relatedAsset: dbEvent.assetRef,
  }
}

export default function InboxScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<InboxEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      const dbEvents = await getInboxEvents()
      const adapted = dbEvents.map(adaptEventFromDB)
      setEvents(adapted)
      setNetworkError(false)
    } catch (error) {
      // Error de red detectado
      setNetworkError(true)
    } finally {
      setLoading(false)
      setIsRetrying(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadEvents()
    }, [loadEvents])
  )

  function handleRetry() {
    setIsRetrying(true)
    setLoading(true)
    loadEvents()
  }

  function handleOpen(id: string) {
    // Marcar como leído al abrir
    markEventAsRead(parseInt(id)).catch(() => {})
    router.push(`/inbox/${id}`)
  }

  async function handleDelete(id: string) {
    try {
      await dismissEvent(parseInt(id))
      await loadEvents()
    } catch (error) {
      // Error silencioso - no hay conexión
    }
  }

  async function handleMarkUnread(id: string) {
    try {
      await markEventAsUnread(parseInt(id))
      await loadEvents()
    } catch (error) {
      // Error silencioso - no hay conexión
    }
  }

  const unreadCount = events.filter((e) => !e.isRead).length;
  const theme = useTheme();

  // Mostrar offline screen si hay error de red y no hay eventos previos
  if (networkError && events.length === 0 && !loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <OfflineScreen onRetry={handleRetry} isRetrying={isRetrying} />
        </SafeAreaView>
      </ThemedView>
    )
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <PageHeader title="Buzón" subtitle="Cargando mensajes..." />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.positive} />
          </View>
        </SafeAreaView>
      </ThemedView>
    )
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <PageHeader
          title="Buzón"
          subtitle={
            unreadCount > 0
              ? `${unreadCount} sin leer · sin notificaciones push`
              : events.length === 0
              ? 'No hay mensajes en este momento'
              : 'Mensajes del sistema · sin notificaciones push'
          }
        />

        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-open-outline" size={64} color={theme.textSecondary} />
            <ThemedText type="subtitle" themeColor="textSecondary" style={styles.emptyText}>
              No hay mensajes en el Buzón
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyHint}>
              El sistema generará mensajes cuando detecte condiciones relevantes en tu portafolio
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <EventCard
                event={item}
                onPress={() => handleOpen(item.id)}
                onDelete={() => handleDelete(item.id)}
                onMarkUnread={() => handleMarkUnread(item.id)}
              />
            )}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={Separator}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four * 2,
    gap: Spacing.two,
  },
  emptyText: {
    marginTop: Spacing.three,
    textAlign: 'center',
  },
  emptyHint: {
    textAlign: 'center',
    maxWidth: 280,
  },
  safe: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  list: { flex: 1 },
  listContent: { paddingBottom: BottomTabInset + Spacing.three },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  cardBody: { flex: 1, gap: Spacing.one },
  cardTitle: { lineHeight: 22 },
  cardSummary: { lineHeight: 18 },
  summaryRead: { opacity: 0.55 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  typePill: { borderRadius: 4, paddingHorizontal: Spacing.two, paddingVertical: 2 },
  typeLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  cardDate: { fontSize: 11 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 40 + Spacing.three,
  },
});
