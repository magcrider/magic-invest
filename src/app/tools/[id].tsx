import { StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { TOOLS } from '@/constants/tools-data';

export default function ToolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme  = useTheme();
  const tool = TOOLS.find((t) => t.id === id);

  if (!tool) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <ThemedText type="default" themeColor="textSecondary">Herramienta no encontrada.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>

        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back-outline" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
          <ThemedView style={[styles.iconBox, { backgroundColor: theme.positiveSubtle }]}>
            <Ionicons name={tool.icon} size={22} color={theme.positive} />
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.titleBlock}>
          <ThemedText type="subtitle" style={styles.title}>{tool.name}</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">{tool.description}</ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.placeholder}>
          <Ionicons name="construct-outline" size={32} color={theme.textSecondary} />
          <ThemedText type="default" themeColor="textSecondary">En construcción</ThemedText>
        </ThemedView>

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
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
  },
  placeholder: {
    flex: 1,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
