import { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PageHeader } from '@/components/page-header';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { EVENT_TYPE_CONFIG, INBOX_EVENTS, type EventType, type InboxEvent } from '@/constants/inbox-mock';
import { inboxState } from '@/utils/inbox-state';

type ThemeColors = ReturnType<typeof useTheme>;

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

function buildEvents(): InboxEvent[] {
  return INBOX_EVENTS
    .filter((e) => !inboxState.isDeleted(e.id))
    .map((e) => ({
      ...e,
      isRead: inboxState.isUnread(e.id) ? false : e.isRead || inboxState.isRead(e.id),
    }));
}

export default function InboxScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<InboxEvent[]>(buildEvents);

  useEffect(() => {
    return inboxState.subscribe(() => setEvents(buildEvents()));
  }, []);

  function handleOpen(id: string) {
    router.push(`/inbox/${id}`);
  }

  function handleDelete(id: string) {
    inboxState.markDeleted(id);
  }

  function handleMarkUnread(id: string) {
    inboxState.markUnread(id);
  }

  const unreadCount = events.filter((e) => !e.isRead).length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <PageHeader
          title="Buzón"
          subtitle={
            unreadCount > 0
              ? `${unreadCount} sin leer · sin notificaciones push`
              : 'Eventos del sistema · sin notificaciones push'
          }
        />

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
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
