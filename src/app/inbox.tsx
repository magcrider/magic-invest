import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PageHeader } from '@/components/page-header';
import { BottomTabInset, Spacing } from '@/constants/theme';

export default function InboxScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <PageHeader title="Buzón" subtitle="Eventos del sistema · sin notificaciones push" />

        <ThemedView type="backgroundElement" style={styles.placeholder}>
          <ThemedText type="default" themeColor="textSecondary">Módulo en construcción</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Disparadores de mercado · acompañamiento educativo</ThemedText>
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
