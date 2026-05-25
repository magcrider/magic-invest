import { FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PageHeader } from '@/components/page-header';
import { BottomTabInset, Spacing, Tokens } from '@/constants/theme';
import { TOOLS, type ToolDefinition } from '@/constants/tools-data';

function ToolCard({ tool }: { tool: ToolDefinition }) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/tools/${tool.id}`)}
      activeOpacity={0.7}>
      <ThemedView style={styles.cardContent}>
        <ThemedView style={styles.cardText}>
          <ThemedText type="default" style={styles.cardTitle}>{tool.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{tool.description}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.iconBox}>
          <Ionicons name={tool.icon} size={22} color={Tokens.structural.positive} />
        </ThemedView>
      </ThemedView>
    </TouchableOpacity>
  );
}

export default function ToolsScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <PageHeader
          title="Herramientas"
          subtitle="Simulaciones locales · sin conexión a red"
        />
        <FlatList
          data={TOOLS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ToolCard tool={item} />}
          style={styles.flatList}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
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
  flatList: {
    flex: 1,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
    borderRadius: Spacing.three,
  },
  cardText: {
    flex: 1,
    gap: Spacing.half,
  },
  cardTitle: {
    fontWeight: '600',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#5B8E8E22',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
