import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PageHeader } from '@/components/page-header';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';

export default function PortfolioScreen() {
  const { displayName } = useAuth();
  const subtitle = displayName
    ? `Hola, ${displayName} · Tus posiciones reales`
    : 'Tus posiciones reales';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <PageHeader title="Portafolio" subtitle={subtitle} />

        <ThemedView type="backgroundElement" style={styles.placeholder}>
          <ThemedText type="default" themeColor="textSecondary">Módulo en construcción</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">CDTs y ETFs indexados · datos EOD</ThemedText>
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
