import { Dimensions, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PageHeader } from '@/components/page-header';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { TOOLS, type ToolDefinition } from '@/constants/tools-data';

function ToolCard({ tool }: { tool: ToolDefinition }) {
  const router = useRouter();
  const theme  = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}
      onPress={() => router.push(`/tools/${tool.id}`)}
      activeOpacity={0.7}>
      <ThemedView style={[styles.iconBox, { backgroundColor: theme.positiveSubtle }]}>
        <Ionicons name={tool.icon} size={24} color={theme.positive} />
      </ThemedView>
      <ThemedText type="small" style={styles.cardTitle} numberOfLines={2}>
        {tool.name}
      </ThemedText>
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
          numColumns={3}
          style={styles.flatList}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const CARD_WIDTH = (Dimensions.get('window').width - (Spacing.four * 2) - (Spacing.two * 2)) / 3;

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
    paddingBottom: BottomTabInset + Spacing.three,
  },
  row: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  card: {
    width: CARD_WIDTH,
    aspectRatio: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  cardTitle: {
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
