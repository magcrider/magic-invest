import { useEffect } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing, Tokens } from '@/constants/theme';
import { INBOX_EVENTS, EVENT_TYPE_CONFIG, type ConsequenceRow } from '@/constants/inbox-mock';
import { inboxState } from '@/utils/inbox-state';

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

  const event = INBOX_EVENTS.find((e) => e.id === id);
  const config = event ? EVENT_TYPE_CONFIG[event.type] : null;

  useEffect(() => {
    if (id) inboxState.markRead(id);
  }, [id]);

  if (!event || !config) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back-outline" size={24} color={Tokens.neutral.muted} />
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
              <Ionicons name="arrow-back-outline" size={24} color={Tokens.neutral.muted} />
            </TouchableOpacity>
            <View style={[styles.typePill, { backgroundColor: config.bg }]}>
              <Ionicons name={config.icon} size={14} color={config.color} />
              <ThemedText style={[styles.typeLabel, { color: config.color }]}>
                {config.label}
              </ThemedText>
            </View>
          </View>

          <View style={styles.meta}>
            <ThemedText type="small" themeColor="textSecondary">{event.date}</ThemedText>
            {event.relatedAsset && (
              <>
                <ThemedText type="small" themeColor="textSecondary">·</ThemedText>
                <View style={styles.assetChip}>
                  <ThemedText style={styles.assetLabel}>{event.relatedAsset}</ThemedText>
                </View>
              </>
            )}
          </View>

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

          <View style={[styles.disclaimerBox, { borderLeftColor: config.color }]}>
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
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  assetChip: {
    backgroundColor: '#5B8E8E18',
    borderRadius: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  assetLabel: { fontSize: 12, fontWeight: '600', color: Tokens.structural.positive },
  title: { fontSize: 22, lineHeight: 30 },
  body: { gap: Spacing.three },
  paragraph: { lineHeight: 22 },
  section: { gap: Spacing.two },
  sectionLabel: { letterSpacing: 0.5 },
  disclaimerBox: { borderLeftWidth: 3, paddingLeft: Spacing.three, marginTop: Spacing.two },
  disclaimer: { lineHeight: 18, fontStyle: 'italic' },
});
