import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { resetRiskProfile } from '@/services/supabase-queries';
import { profileEvents } from '@/utils/profile-events';
import { signOutState } from '@/utils/sign-out-state';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.82;
const DURATION = 240;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function DrawerMenu({ visible, onClose }: Props) {
  const { displayName, session } = useAuth();
  const theme   = useTheme();
  const email   = session?.user?.email ?? '';
  const initial = (displayName || email)[0]?.toUpperCase() ?? '?';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const [modalVisible, setModalVisible] = useState(false);
  const translateX = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: DURATION, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: DURATION, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: DRAWER_WIDTH, duration: DURATION, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: DURATION, useNativeDriver: true }),
      ]).start(() => setModalVisible(false));
    }
  }, [visible]);

  async function handleSignOut() {
    onClose();
    signOutState.begin();
    await supabase.auth.signOut();
  }

  function handleResetProfile() {
    Alert.alert(
      'Reevaluar perfil de riesgo',
      'Se borrarán tus respuestas actuales y volverás a ver el cuestionario la próxima vez que abras la sección Portafolio.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reevaluar',
          style: 'destructive',
          onPress: async () => {
            await resetRiskProfile();
            profileEvents.emitReset();
            onClose();
          },
        },
      ]
    );
  }

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent>

      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[
        styles.panel,
        { backgroundColor: theme.background, transform: [{ translateX }] },
      ]}>
        <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </TouchableOpacity>

          <ThemedView style={styles.profile}>
            <ThemedView style={[styles.avatar, { backgroundColor: theme.positiveSubtle }]}>
              <ThemedText type="smallBold" style={[styles.avatarText, { color: theme.positive }]}>
                {initial}
              </ThemedText>
            </ThemedView>
            <ThemedText type="subtitle">{displayName || email}</ThemedText>
            {displayName ? (
              <ThemedText type="small" themeColor="textSecondary">{email}</ThemedText>
            ) : null}
          </ThemedView>

          <ThemedView style={[styles.divider, { backgroundColor: theme.divider }]} />

          <ScrollView showsVerticalScrollIndicator={false}>

            <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
              CONFIGURACIÓN
            </ThemedText>
            <ThemedView style={styles.row}>
              <ThemedText type="default">Autenticación biométrica</ThemedText>
              <Switch
                value={false}
                disabled
                trackColor={{ true: theme.positive, false: theme.divider }}
              />
            </ThemedView>
            <TouchableOpacity style={styles.row} onPress={handleResetProfile}>
              <ThemedText type="default">Reevaluar perfil de riesgo</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>

            <ThemedView style={[styles.divider, { backgroundColor: theme.divider }]} />

            <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
              LEGAL
            </ThemedText>
            <TouchableOpacity style={styles.row} disabled>
              <ThemedText type="default">Términos y condiciones</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.row} disabled>
              <ThemedText type="default">Política de privacidad</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>

          </ScrollView>

          <ThemedView style={styles.footer}>
            <ThemedText type="small" themeColor="textSecondary">Versión {version}</ThemedText>
            <TouchableOpacity style={styles.signOutRow} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={18} color={theme.risk} />
              <ThemedText type="default" style={{ color: theme.risk }}>Cerrar sesión</ThemedText>
            </TouchableOpacity>
          </ThemedView>

        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  safe: { flex: 1 },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: Spacing.three,
  },
  profile: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.one,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  avatarText: {
    fontSize: 20,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.two,
  },
  sectionLabel: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
});
