import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing, Tokens } from '@/constants/theme';

export default function ToolsScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ThemedText type="title" style={styles.title}>
          Herramientas
        </ThemedText>
        <ThemedText type="secondary" style={styles.subtitle}>
          Simulaciones locales · no tocan el portafolio real
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.placeholder}>
          <ThemedText type="secondary" style={styles.placeholderText}>
            Módulo en construcción
          </ThemedText>
          <ThemedText type="small" style={styles.placeholderNote}>
            Interés compuesto · aportes · comparadores
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.two,
  },
  title: {
    color: Tokens.neutral.text,
  },
  subtitle: {
    color: Tokens.neutral.muted,
    marginBottom: Spacing.three,
  },
  placeholder: {
    flex: 1,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  placeholderText: {
    color: Tokens.neutral.muted,
  },
  placeholderNote: {
    color: Tokens.neutral.muted,
  },
});
