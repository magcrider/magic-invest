import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PageHeader } from '@/components/page-header';
import { ThemedView } from '@/components/themed-view';
import { RiskProfileFlow } from '@/components/risk-profile-flow';
import { Tokens, Spacing, BottomTabInset } from '@/constants/theme';
import {
  PROFILE_CONFIG,
  PROFILE_BANDS,
  type RiskProfile,
} from '@/constants/risk-profile';
import { getRiskProfile, setRiskProfile } from '@/db/queries/config';
import { profileEvents } from '@/utils/profile-events';
import { useAuth } from '@/hooks/use-auth';

type ScreenState = 'loading' | 'risk_profile' | 'empty';

export default function PortfolioScreen() {
  const { displayName }             = useAuth();
  const db                          = useSQLiteContext();
  const [state, setState]           = useState<ScreenState>('loading');
  const [profile, setProfile]       = useState<RiskProfile | null>(null);

  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        setState('loading');
        isFirstFocus.current = false;
      }
      getRiskProfile(db).then((p) => {
        setProfile(p);
        setState(p ? 'empty' : 'risk_profile');
      });
    }, [db])
  );

  useEffect(() => {
    return profileEvents.subscribe(() => {
      setProfile(null);
      setState('risk_profile');
    });
  }, []);

  async function handleProfileComplete(p: RiskProfile) {
    await setRiskProfile(db, p);
    setProfile(p);
    setState('empty');
  }

  const subtitle = displayName ? `Hola, ${displayName}` : 'Tus posiciones reales';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <PageHeader title="Portafolio" subtitle={subtitle} />

        {state === 'loading' && (
          <View style={styles.centered}>
            <ActivityIndicator color={Tokens.neutral.muted} />
          </View>
        )}

        {state === 'risk_profile' && (
          <RiskProfileFlow onComplete={handleProfileComplete} />
        )}

        {state === 'empty' && profile && (
          <EmptyPortfolio profile={profile} />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function EmptyPortfolio({ profile }: { profile: RiskProfile }) {
  const config = PROFILE_CONFIG[profile.label];
  const bands  = PROFILE_BANDS[profile.label];

  return (
    <View style={styles.portfolioContent}>
      <View style={[styles.profileChip, { borderColor: config.color + '60' }]}>
        <View style={[styles.chipDot, { backgroundColor: config.color }]} />
        <Text style={[styles.chipLabel, { color: config.color }]}>{config.title}</Text>
        <Text style={styles.chipBands}>
          CDTs {Math.round(bands.cdt_min * 100)}–{Math.round(bands.cdt_max * 100)}%
          {'  ·  '}
          ETFs {Math.round(bands.etf_min * 100)}–{Math.round(bands.etf_max * 100)}%
        </Text>
      </View>

      <View style={styles.emptyCard}>
        <Ionicons name="layers-outline" size={40} color={Tokens.neutral.muted} />
        <Text style={styles.emptyTitle}>No tienes posiciones registradas</Text>
        <Text style={styles.emptySubtitle}>
          Registra los activos que ya tienes en tu banco o broker para comenzar a analizar tu portafolio.
        </Text>
      </View>

      <View style={styles.ctaRow}>
        <TouchableOpacity style={[styles.ctaButton, styles.ctaPrimary]} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.ctaPrimaryText}>Agregar CDT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.ctaButton, styles.ctaSecondary]} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={18} color={Tokens.structural.attention} />
          <Text style={styles.ctaSecondaryText}>Agregar ETF</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  portfolioContent: {
    flex: 1,
    gap: Spacing.three,
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 100,
    borderWidth: 1,
    backgroundColor: '#F0F0EC',
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipBands: {
    fontSize: 12,
    color: Tokens.neutral.muted,
  },
  emptyCard: {
    flex: 1,
    backgroundColor: '#F0F0EC',
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Tokens.neutral.text,
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Tokens.neutral.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  ctaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
  ctaPrimary: {
    backgroundColor: Tokens.structural.positive,
  },
  ctaSecondary: {
    backgroundColor: `${Tokens.structural.attention}18`,
    borderWidth: 1,
    borderColor: `${Tokens.structural.attention}60`,
  },
  ctaPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ctaSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: Tokens.structural.attention,
  },
});
