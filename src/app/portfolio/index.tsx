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
import { formatCurrency, abbreviateValue } from '@/utils/format';
import { useAuth } from '@/hooks/use-auth';
import type { CdtPosition, EtfPosition, AllocationBands } from '@/db/schema';

// ── Macro context hardcodeado — vendrá del backend §8 ────────────────────
const TRM_COP       = 4_200;  // COP por USD
const BANREP_RATE   = 9.25;   // %
const CDT_MKT_RATE  = 11.2;   // %
const INFLATION_COL = 5.3;    // %
// Supuestos CAGR ETF (nominal USD) para proyección pesimista/optimista
const ETF_CAGR_LOW  = 0.05;
const ETF_CAGR_HIGH = 0.11;
// ─────────────────────────────────────────────────────────────────────────

type ScreenState = 'loading' | 'risk_profile' | 'portfolio';
type BandHealth  = 'dentro' | 'cerca' | 'fuera';

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

function etfValueCOP(etf: EtfPosition): number {
  if (etf.currency === 'COP' && etf.total_invested_cop != null) return etf.total_invested_cop;
  if (etf.total_invested_usd != null) return etf.total_invested_usd * TRM_COP;
  if (etf.shares > 0 && etf.average_cost_usd > 0) return etf.shares * etf.average_cost_usd * TRM_COP;
  return 0;
}

function bandHealth(pct: number, min: number, max: number): BandHealth {
  if (pct >= min && pct <= max) return 'dentro';
  if (pct >= min - 0.05 && pct <= max + 0.05) return 'cerca';
  return 'fuera';
}

function bandColor(h: BandHealth): string {
  if (h === 'dentro') return Tokens.structural.positive;
  if (h === 'cerca')  return Tokens.structural.attention;
  return Tokens.structural.risk;
}

// ── Main screen ───────────────────────────────────────────────────────────

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

        {state === 'portfolio' && profile && (
          <PortfolioContent profile={profile} cdts={cdts} etfs={etfs} />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

// ── Portfolio content ─────────────────────────────────────────────────────

type PortfolioTab = 'resumen' | 'detalle';

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
  const [tab, setTab] = useState<PortfolioTab>('resumen');

  // Si se eliminan todos los activos estando en Detalle, volver a Resumen
  useEffect(() => {
    if (isEmpty) setTab('resumen');
  }, [isEmpty]);

  // Totales del portafolio
  const cdtTotal       = cdts.reduce((s, c) => s + c.amount, 0);
  const etfTotalCOP    = etfs.reduce((s, e) => s + etfValueCOP(e), 0);
  const portfolioTotal = cdtTotal + etfTotalCOP;
  const cdtPct = portfolioTotal > 0 ? cdtTotal / portfolioTotal : 0;
  const etfPct = portfolioTotal > 0 ? etfTotalCOP / portfolioTotal : 0;

  const avgCdtRateNet = cdtTotal > 0
    ? cdts.reduce((s, c) => s + c.rate * (1 - c.withholding_rate) * c.amount, 0) / cdtTotal
    : (CDT_MKT_RATE / 100) * 0.96;

  const blendedLow  = cdtPct * avgCdtRateNet + etfPct * ETF_CAGR_LOW;
  const blendedHigh = cdtPct * avgCdtRateNet + etfPct * ETF_CAGR_HIGH;
  const projLow     = portfolioTotal * Math.pow(1 + blendedLow,  10);
  const projHigh    = portfolioTotal * Math.pow(1 + blendedHigh, 10);

  return (
    <View style={styles.contentRoot}>
      {/* Fila superior: chip de perfil (izq) + botón Agregar (der) */}
      <View style={styles.profileRow}>
        <View style={[styles.profileChip, { borderColor: config.color + '60' }]}>
          <Text style={styles.chipLine} numberOfLines={1}>
            <Text style={[styles.chipLabel, { color: config.color }]}>{config.title}</Text>
            <Text style={styles.chipBands}>
              {`: CDT ${Math.round(bands.cdt_min * 100)}–${Math.round(bands.cdt_max * 100)}% / ETF ${Math.round(bands.etf_min * 100)}–${Math.round(bands.etf_max * 100)}%`}
            </Text>
          </Text>
        </View>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/portfolio/add')}
          activeOpacity={0.85}
        >
          <Ionicons name="add-outline" size={15} color="#FFFFFF" />
          <Text style={styles.fabText}>Agregar</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar — siempre visible; Detalle desactivado sin activos */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'resumen' && styles.tabItemActive]}
          onPress={() => setTab('resumen')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabLabel, tab === 'resumen' && styles.tabLabelActive]}>
            Resumen
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'detalle' && styles.tabItemActive, isEmpty && styles.tabItemDisabled]}
          onPress={() => { if (!isEmpty) setTab('detalle'); }}
          activeOpacity={isEmpty ? 1 : 0.7}
        >
          <Text style={[styles.tabLabel, tab === 'detalle' && styles.tabLabelActive, isEmpty && styles.tabLabelDisabled]}>
            Detalle
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Pestaña Resumen ── */}
      {tab === 'resumen' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isEmpty ? (
            /* Estado vacío */
            <View style={styles.emptyCard}>
              <Ionicons name="layers-outline" size={40} color={Tokens.neutral.muted} />
              <Text style={styles.emptyTitle}>Tu portafolio está vacío</Text>
              <Text style={styles.emptySubtitle}>
                Registra los activos que ya tienes en tu banco o broker para ver el análisis completo.
              </Text>
              <View style={styles.emptyCtas}>
                <TouchableOpacity
                  style={styles.emptyCtaBtn}
                  onPress={() => router.push('/portfolio/add-cdt')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="business-outline" size={16} color={Tokens.structural.positive} />
                  <Text style={[styles.emptyCtaText, { color: Tokens.structural.positive }]}>
                    Agregar CDT
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.emptyCtaBtn}
                  onPress={() => router.push('/portfolio/add-etf')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trending-up-outline" size={16} color={Tokens.structural.attention} />
                  <Text style={[styles.emptyCtaText, { color: Tokens.structural.attention }]}>
                    Agregar ETF
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Con activos */
            <>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Valor del portafolio</Text>
                <Text style={styles.summaryTotal}>{formatCurrency(portfolioTotal, 'COP')}</Text>
                <View style={styles.summaryBreakdown}>
                  <View style={styles.summaryBreakdownItem}>
                    <View style={[styles.summaryDot, { backgroundColor: Tokens.structural.positive }]} />
                    <Text style={styles.summaryPart}>CDTs  {formatCurrency(cdtTotal, 'COP')}</Text>
                  </View>
                  <View style={styles.summaryBreakdownItem}>
                    <View style={[styles.summaryDot, { backgroundColor: Tokens.structural.attention }]} />
                    <Text style={styles.summaryPart}>ETFs  {formatCurrency(etfTotalCOP, 'COP')}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.projBanner}>
                <Text style={styles.projLabel}>Proyección a 10 años</Text>
                <Text style={styles.projRange}>
                  ${abbreviateValue(projLow, 'COP')} – ${abbreviateValue(projHigh, 'COP')}
                </Text>
                <Text style={styles.projNote}>
                  Pesimista (ETF +5% USD) · Optimista (ETF +11% USD) · CDT al neto actual
                </Text>
              </View>

              <DistributionSection cdtPct={cdtPct} etfPct={etfPct} bands={bands} />
              <ContextStrip />
            </>
          )}
        </ScrollView>
      )}

      {/* ── Pestaña Detalle ── */}
      {tab === 'detalle' && !isEmpty && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
        </ScrollView>
      )}
    </View>
  );
}

// ── Distribución vs bandas ────────────────────────────────────────────────

function DistributionSection({
  cdtPct, etfPct, bands,
}: {
  cdtPct: number;
  etfPct: number;
  bands:  AllocationBands;
}) {
  const cdtH = bandHealth(cdtPct, bands.cdt_min, bands.cdt_max);
  const etfH = bandHealth(etfPct, bands.etf_min, bands.etf_max);
  const overallH: BandHealth =
    cdtH === 'fuera' || etfH === 'fuera' ? 'fuera' :
    cdtH === 'cerca' || etfH === 'cerca' ? 'cerca' :
    'dentro';
  const hc = bandColor(overallH);
  const statusLabel =
    overallH === 'dentro' ? 'Dentro de bandas' :
    overallH === 'cerca'  ? 'Cerca del límite' :
    'Fuera de bandas';

  return (
    <View style={styles.distributionSection}>
      <View style={styles.distributionHeader}>
        <Text style={styles.sectionHeader}>Distribución</Text>
        <View style={[styles.healthBadge, { backgroundColor: hc + '18', borderColor: hc + '50' }]}>
          <Text style={[styles.healthLabel, { color: hc }]}>{statusLabel}</Text>
        </View>
      </View>
      <DistributionBar label="CDTs" pct={cdtPct} min={bands.cdt_min} max={bands.cdt_max} />
      <DistributionBar label="ETFs" pct={etfPct} min={bands.etf_min} max={bands.etf_max} />
    </View>
  );
}

function DistributionBar({
  label, pct, min, max,
}: {
  label: string;
  pct:   number;
  min:   number;
  max:   number;
}) {
  const h    = bandHealth(pct, min, max);
  const hc   = bandColor(h);
  const pctN = Math.round(pct * 100);
  const minN = Math.round(min * 100);
  const maxN = Math.round(max * 100);

  return (
    <View style={styles.barRow}>
      <View style={styles.barLabelRow}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={[styles.barPct, { color: hc }]}>{pctN}%</Text>
        <Text style={styles.barBandText}>[{minN}–{maxN}%]</Text>
        {h === 'dentro' && <Ionicons name="checkmark"             size={13} color={hc} />}
        {h === 'cerca'  && <Ionicons name="alert-circle-outline"  size={13} color={hc} />}
        {h === 'fuera'  && <Ionicons name="close-circle-outline"  size={13} color={hc} />}
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pctN}%`, backgroundColor: hc }]} />
      </View>
    </View>
  );
}

// ── Contexto macro ────────────────────────────────────────────────────────

function ContextStrip() {
  return (
    <View style={styles.contextStrip}>
      <Text style={styles.contextTitle}>Contexto actual</Text>
      <View style={styles.contextRow}>
        <ContextItem label="Banrep"      value={`${BANREP_RATE}%`} />
        <ContextItem label="CDT mercado" value={`${CDT_MKT_RATE}%`} />
        <ContextItem label="Inflación"   value={`${INFLATION_COL}%`} />
        <ContextItem label="TRM"         value={`$${TRM_COP.toLocaleString('es-CO')}`} />
      </View>
      <Text style={styles.contextNote}>
        Datos de referencia · se actualizarán automáticamente en §8
      </Text>
    </View>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.contextItem}>
      <Text style={styles.contextValue}>{value}</Text>
      <Text style={styles.contextLabel}>{label}</Text>
    </View>
  );
}

// ── Tarjetas de activos ───────────────────────────────────────────────────

function CdtCard({ cdt, onPress }: { cdt: CdtPosition; onPress: () => void }) {
  const days    = daysUntil(cdt.end_date);
  const net     = cdtNetYield(cdt);
  const expired = days < 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardRow}>
        <Text style={styles.cardTitle}>{cdt.bank}</Text>
        <Text style={[styles.cardRate, { color: Tokens.structural.positive }]}>
          {(cdt.rate * 100).toFixed(2)}% EA
        </Text>
      </View>
      <Text style={styles.cardAmount}>{formatCurrency(cdt.amount, 'COP')}</Text>
      <View style={styles.cardRow}>
        <Text style={styles.cardMeta}>
          {expired ? 'Venció ' : 'Vence '}
          {fmtDate(cdt.end_date)}
          {!expired && days <= 90 ? `  ·  ${days} días` : ''}
        </Text>
        <Text style={[styles.cardNet, { color: Tokens.structural.positive }]}>
          +{abbreviateValue(net, 'COP')} neto
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

// ── Estilos ───────────────────────────────────────────────────────────────

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

  // Fila perfil + botón Agregar
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: Tokens.structural.positive,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 100,
  },
  fabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Contenedor del contenido del portafolio (chip + tab bar + scroll)
  contentRoot: {
    flex: 1,
    gap: Spacing.two,
  },

  // Tab bar Resumen / Detalle
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F0F0EC',
    borderRadius: Spacing.two,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  tabItem: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Spacing.one + Spacing.half,
  },
  tabItemActive: {
    backgroundColor: Tokens.neutral.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  tabItemDisabled: {
    opacity: 0.38,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Tokens.neutral.muted,
  },
  tabLabelActive: {
    color: Tokens.neutral.text,
    fontWeight: '600',
  },
  tabLabelDisabled: {
    color: Tokens.neutral.muted,
  },

  scroll: { flex: 1 },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },

  // Chip de perfil
  profileChip: {
    flex: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 100,
    borderWidth: 1,
    backgroundColor: '#F0F0EC',
  },
  chipLine:  { fontSize: 12, flexShrink: 1 },
  chipLabel: { fontSize: 12, fontWeight: '600' },
  chipBands: { fontSize: 12, color: Tokens.neutral.muted },

  // Estado vacío
  emptyCard: {
    backgroundColor: '#F0F0EC',
    borderRadius: Spacing.three,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
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
  emptyCtas: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  emptyCtaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: Tokens.neutral.background,
    borderWidth: 1,
    borderColor: '#E0E0DC',
  },
  emptyCtaText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Resumen
  summaryCard: {
    backgroundColor: '#F0F0EC',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Tokens.neutral.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryTotal: {
    fontSize: 26,
    fontWeight: '700',
    color: Tokens.neutral.text,
    letterSpacing: -0.5,
  },
  summaryBreakdown: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginTop: Spacing.one,
  },
  summaryBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + Spacing.half,
  },
  summaryDot: { width: 6, height: 6, borderRadius: 3 },
  summaryPart: {
    fontSize: 12,
    color: Tokens.neutral.muted,
  },

  // Proyección
  projBanner: {
    backgroundColor: Tokens.structural.positive + '14',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Tokens.structural.positive + '30',
    gap: Spacing.one,
  },
  projLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Tokens.structural.positive,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  projRange: {
    fontSize: 28,
    fontWeight: '700',
    color: Tokens.neutral.text,
    letterSpacing: -0.5,
  },
  projNote: {
    fontSize: 11,
    color: Tokens.neutral.muted,
    lineHeight: 16,
    marginTop: Spacing.one,
  },

  // Distribución
  distributionSection: {
    backgroundColor: '#F0F0EC',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  distributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half + 2,
    borderRadius: 100,
    borderWidth: 1,
  },
  healthLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Barra de distribución
  barRow: {
    gap: Spacing.one,
  },
  barLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Tokens.neutral.text,
    width: 38,
  },
  barPct: {
    fontSize: 13,
    fontWeight: '700',
    width: 36,
  },
  barBandText: {
    fontSize: 11,
    color: Tokens.neutral.muted,
    flex: 1,
  },
  barTrack: {
    height: 6,
    backgroundColor: '#E0E0DC',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },

  // Contexto macro
  contextStrip: {
    backgroundColor: '#F0F0EC',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  contextTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Tokens.neutral.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contextItem: {
    alignItems: 'center',
    gap: 2,
  },
  contextValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Tokens.neutral.text,
  },
  contextLabel: {
    fontSize: 10,
    color: Tokens.neutral.muted,
    textAlign: 'center',
  },
  contextNote: {
    fontSize: 10,
    color: Tokens.neutral.muted,
    fontStyle: 'italic',
  },

  // Listas de activos
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
  cardRate:     { fontSize: 13, fontWeight: '600' },
  cardMeta:     { fontSize: 13, color: Tokens.neutral.muted },
  cardNet:      { fontSize: 13, fontWeight: '600' },
});
