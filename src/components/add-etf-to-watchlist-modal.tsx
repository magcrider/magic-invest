import { useState } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addEtfToWatchlist, isEtfInWatchlist } from '@/services/supabase-queries';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export function AddEtfToWatchlistModal({ visible, onClose, onAdded }: Props) {
  const theme = useTheme();
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    const cleanTicker = ticker.trim().toUpperCase();

    if (!cleanTicker) {
      Alert.alert('Campo vacío', 'Ingresa el símbolo del ETF');
      return;
    }

    // Validación básica: solo letras (máximo 5 caracteres)
    if (!/^[A-Z]{1,5}$/.test(cleanTicker)) {
      Alert.alert('Símbolo inválido', 'El ticker debe tener 1-5 letras (ej: VOO, VTI, QQQ)');
      return;
    }

    setLoading(true);

    try {
      // Verificar si ya existe
      const exists = await isEtfInWatchlist(cleanTicker);
      if (exists) {
        Alert.alert('Ya existe', `${cleanTicker} ya está en tu watchlist`);
        setLoading(false);
        return;
      }

      // Agregar
      await addEtfToWatchlist(cleanTicker);

      Alert.alert('✅ ETF agregado', `${cleanTicker} se agregó a tu watchlist`);
      setTicker('');
      onClose();
      onAdded();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo agregar el ETF');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setTicker('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose}>
          <TouchableOpacity
            style={[styles.modal, { backgroundColor: theme.background }]}
            activeOpacity={1}
          >
            {/* Header */}
            <View style={styles.header}>
              <ThemedText type="subtitle">Agregar ETF</ThemedText>
              <TouchableOpacity onPress={handleClose} hitSlop={8}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <View style={styles.body}>
              <ThemedText type="small" themeColor="textSecondary">
                Ingresa el símbolo del ETF que quieres seguir
              </ThemedText>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundElement,
                    color: theme.text,
                    borderColor: theme.divider,
                  },
                ]}
                value={ticker}
                onChangeText={setTicker}
                placeholder="ej: VOO, VTI, QQQ"
                placeholderTextColor={theme.textPlaceholder}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={5}
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />

              <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                El ETF se comparará contra tu Hurdle Rate y recibirás notificaciones cuando cruce el umbral.
              </ThemedText>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary, { borderColor: theme.divider }]}
                onPress={handleClose}
              >
                <ThemedText style={[styles.buttonText, { color: theme.textSecondary }]}>
                  Cancelar
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.buttonPrimary,
                  { backgroundColor: theme.positive },
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleAdd}
                disabled={loading}
              >
                <ThemedText style={[styles.buttonText, { color: '#FFFFFF' }]}>
                  {loading ? 'Agregando...' : 'Agregar'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '85%',
    maxWidth: 400,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  body: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  input: {
    height: 48,
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  hint: {
    lineHeight: 18,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    borderWidth: 1,
  },
  buttonPrimary: {},
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
