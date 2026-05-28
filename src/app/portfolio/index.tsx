import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PageHeader } from '@/components/page-header';
import { ThemedView } from '@/components/themed-view';
import { RiskProfileFlow } from '@/components/risk-profile-flow';
import { Tokens, Spacing, BottomTabInset } from '@/constants/theme';
import { PROFILE_CONFIG, PROFILE_BANDS, type RiskProfile } from '@/constants/risk-profile';
import { getRiskProfile, setRiskProfile } from '@/db/queries/config';
import { profileEvents } from '@/utils/profile-events';
import { getAllCdts } from '@/db/queries/cdt';
import { getAllEtfs } from '@/db/queries/etf';
import { formatCurrency } from '@/utils/format';
import { useAuth } from '@/hooks/use-auth';
import type { CdtPosition, EtfPosition } from '@/db/schema';

type ScreenState = 'loading' | 'risk_profile' | 'portfolio';

const MONTHS_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${MONTHS_ES[parseInt(m) - 1]} ${y}`;
}

function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${iso}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function cdtNetYield(cdt: CdtPosition): number {
  const gross = cdt.amount * (Math.pow(1 + cdt.rate, cdt.term_days / 365) - 1);
  return gross * (1 - cdt.withholding_rate);
}

export default function PortfolioScreen() {
  const { displayName }       = useAuth();
  const db                    = useSQLiteContext();
  const router                = useRouter();
  const [state, setState]     = useState<ScreenState>('loading');
  const [profile, setProfile] = useState<RiskProfile | null>(null);
  const [cdts, setCdts]       = useState<CdtPosition[]>([]);
  const [etfs, setEtfs]       = useState<EtfPosition[]>([]);
  const isFirstFocus          = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        setState('loading');
        isFirstFocus.current = false;
      }
      Promise.all([getRiskProfile(db), getAllCdts(db), getAllEtfs(db)]).then(
        ([p, cdtList, etfList]) => {
          setProfile(p);
          setCdts(cdtList);
          setEtfs(etfList);
          setState(p ? 'portfolio' : 'risk_profile');
        }
      );
    }, [db])
  );

  useEffect(() => {
    return profileEvents.subscribe(() => {
      setProfile(null);
      setCdts([]);
      setEtfs([]);
      setState('risk_profile');
    });
  }, []);

  async function handleProfileComplete(p: RiskProfile) {
    await setRiskProfile(db, p);
    setProfile(p);
    setState('portfolio');
  }

  const subtitle = displayName ? `Hola, ${displayName}` : 'Tus posiciones reales';

  // FAB solo aparece cuando hay portafolio activo
  const fabAction = (state === 'portfolio' && profile) ? (
    <TouchableOpacity
      style={styles.fab}
      onPress={() => router.push('/portfolio/add')}
      activeOpacity={0.85}
    >
      <Ionicons name="add-outline" size={16} color="#FFFFFF" />
      <Text style={styles.fabText}>Agregar</Text>
    </TouchableOpacity>
  ) : undefined;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <PageHeader title="Portafolio" subtitle={subtitle} rightAction={fabAction} />

        {state === 'loading' && (
          <View style={styles.centered}>
            <ActivityIndicator color={Tokens.neutral.muted} />
          </View>
        )}

        {state === 'risk_profile' && (
          <RiskProfileFlow onComplete={handleProfileComplete} />
        )}

        {state === 'portfolio' && profile && (
          <PortfolioContent
            profile={profile}
            cdts={cdts}
            etfs={etfs}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

interface PortfolioContentProps {
  profile: RiskProfile;
  cdts:    CdtPosition[];
  etfs:    EtfPosition[];
}

function PortfolioContent({ profile, cdts, etfs }: PortfolioContentProps) {
  const router  = useRouter();
  const config  = PROFILE_CONFIG[profile.label];
  const bands   = PROFILE_BANDS[profile.label];
  const isEmpty = cdts.length === 0 && etfs.length === 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile chip */}
      <View style={[styles.profileChip, { borderColor: config.color + '60' }]}>
        <View style={[styles.chipDot, { backgroundColor: config.color }]} />
        <Text style={[styles.chipLabel, { color: config.color }]}>{config.title}</Text>
        <Text style={styles.chipBands}>
          CDTs {Math.round(bands.cdt_min * 100)}–{Math.round(bands.cdt_max * 100)}%
          {'  ·  '}
          ETFs {Math.round(bands.etf_min * 100)}–{Math.round(bands.etf_max * 100)}%
        </Text>
      </View>

      {isEmpty ? (
        <View style={styles.emptyCard}>
          <Ionicons name="layers-outline" size={40} color={Tokens.neutral.muted} />
          <Text style={styles.emptyTitle}>No tienes posiciones registradas</Text>
          <Text style={styles.emptySubtitle}>
            Registra los activos que ya tienes en tu banco o broker para comenzar a analizar tu portafolio.
          </Text>
        </View>
      ) : (
        <>
          {/* ETFs — primero */}
          {etfs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>ETFs Indexados</Text>
              {etfs.map((etf) => (
                <EtfCard
                  key={etf.id}
                  etf={etf}
                  onPress={() => router.push({ pathname: '/portfolio/etf/[id]', params: { id: etf.id } })}
                />
              ))}
            </View>
          )}

          {/* CDTs — después */}
          {cdts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Certificados de Depósito</Text>
              {cdts.map((cdt) => (
                <CdtCard
                  key={cdt.id}
                  cdt={cdt}
                  onPress={() => router.push({ pathname: '/portfolio/cdt/[id]', params: { id: cdt.id } })}
                />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function CdtCard({ cdt, onPress }: { cdt: CdtPosition; onPress: () => void }) {
  const days    = daysUntil(cdt.end_date);
  const net     = cdtNetYield(cdt);
  const expired = days < 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardRow}>
        <Text style={styles.cardTitle}>{cdt.bank}</Text>
        <Text style={styles.cardRate}>{(cdt.rate * 100).toFixed(2)}% EA</Text>
      </View>
      <Text style={styles.cardAmount}>{formatCurrency(cdt.amount, 'COP')}</Text>
      <View style={styles.cardRow}>
        <Text style={styles.cardMeta}>
          {expired ? 'Venció ' : 'Vence '}
          {fmtDate(cdt.end_date)}
          {!expired ? `  ·  ${days} días` : ''}
        </Text>
        <Text style={[styles.cardNet, { color: Tokens.structural.positive }]}>
          Neto {formatCurrency(net, 'COP')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function EtfCard({ etf, onPress }: { etf: EtfPosition; onPress: () => void }) {
  const isCop     = etf.currency === 'COP';
  const hasShares = etf.shares > 0;

  const totalDisplay =
    isCop && etf.total_invested_cop != null
      ? formatCurrency(etf.total_invested_cop, 'COP')
      : etf.total_invested_usd != null
      ? `USD ${etf.total_invested_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : hasShares && etf.average_cost_usd > 0
      ? `USD ${(etf.shares * etf.average_cost_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '—';

  const sharesDisplay = hasShares
    ? `${etf.shares % 1 === 0 ? etf.shares.toFixed(0) : etf.shares.toFixed(4)} acc`
    : 'sin acciones';

  const costDisplay = etf.average_cost_usd > 0
    ? `USD ${etf.average_cost_usd.toFixed(2)} avg`
    : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardRow}>
        <Text style={styles.cardTitle}>{etf.ticker}</Text>
        {etf.ter > 0 && (
          <Text style={styles.cardMeta}>TER {(etf.ter * 100).toFixed(2)}%</Text>
        )}
      </View>
      <Text style={styles.cardSubtitle}>{etf.name}</Text>
      <View style={styles.cardRow}>
        <Text style={styles.cardMeta}>
          {sharesDisplay}{costDisplay ? ` · ${costDisplay}` : ''}
        </Text>
        <Text style={[styles.cardNet, { color: Tokens.structural.attention }]}>
          {totalDisplay}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // FAB — vive dentro del rightGroup del PageHeader
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: Tokens.structural.positive,
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: 6,
    borderRadius: 100,
  },
  fabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  scroll: { flex: 1 },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },

  // Profile chip
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
  chipDot:   { width: 6, height: 6, borderRadius: 3 },
  chipLabel: { fontSize: 13, fontWeight: '600' },
  chipBands: { fontSize: 12, color: Tokens.neutral.muted },

  // Empty state
  emptyCard: {
    minHeight: 260,
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

  // Positions
  section: { gap: Spacing.two },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: Tokens.neutral.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#F0F0EC',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle:    { fontSize: 15, fontWeight: '600', color: Tokens.neutral.text },
  cardSubtitle: { fontSize: 13, color: Tokens.neutral.muted },
  cardAmount:   { fontSize: 16, fontWeight: '700', color: Tokens.neutral.text },
  cardRate:     { fontSize: 13, fontWeight: '600', color: Tokens.structural.positive },
  cardMeta:     { fontSize: 13, color: Tokens.neutral.muted },
  cardNet:      { fontSize: 13, fontWeight: '600' },
});
