import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface OfflineScreenProps {
  onRetry: () => void;
  isRetrying?: boolean;
}

export function OfflineScreen({ onRetry, isRetrying = false }: OfflineScreenProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        {/* Ícono */}
        <View style={[styles.iconBox, { backgroundColor: theme.attentionSubtle }]}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.attention} />
        </View>

        {/* Título */}
        <ThemedText style={[styles.title, { color: theme.text }]}>
          Sin conexión
        </ThemedText>

        {/* Descripción */}
        <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
          Magic Invest requiere conexión a internet para sincronizar tasas de mercado, precios de ETFs y datos macroeconómicos.
        </ThemedText>

        <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
          Verifica tu conexión WiFi o datos móviles e intenta nuevamente.
        </ThemedText>

        {/* Botón Reintentar */}
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.positive },
            isRetrying && styles.buttonDisabled
          ]}
          onPress={onRetry}
          disabled={isRetrying}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isRetrying ? 'hourglass-outline' : 'refresh-outline'}
            size={20}
            color="#FFFFFF"
            style={styles.buttonIcon}
          />
          <ThemedText style={styles.buttonText}>
            {isRetrying ? 'Conectando...' : 'Reintentar'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
  },
  content: {
    maxWidth: 400,
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 32,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.two,
    marginTop: Spacing.three,
    minWidth: 160,
    gap: Spacing.one,
  },
  buttonIcon: {
    marginRight: Spacing.one,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
