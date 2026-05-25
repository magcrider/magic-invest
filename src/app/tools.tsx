import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PageHeader } from '@/components/page-header';
import { BottomTabInset, Spacing } from '@/constants/theme';

export default function ToolsScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <PageHeader title="Herramientas" subtitle="Simulaciones locales · no tocan el portafolio real" />

        <ThemedView type="backgroundElement" style={styles.placeholder}>
          <ThemedText type="default" themeColor="textSecondary">Módulo en construcción</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Interés compuesto · aportes · comparadores</ThemedText>
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
  placeholder: {
    flex: 1,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
