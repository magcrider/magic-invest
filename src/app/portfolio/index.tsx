import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
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
import { ThemedText } from '@/components/themed-text';
import { RiskProfileFlow } from '@/components/risk-profile-flow';
import { Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PROFILE_CONFIG, PROFILE_BANDS, type RiskProfile } from '@/constants/risk-profile';
import { getRiskProfile, setRiskProfile } from '@/db/queries/config';
import { profileEvents } from '@/utils/profile-events';
import { getAllCdts } from '@/db/queries/cdt';
import { getAllEtfs } from '@/db/queries/etf';
import { formatCurrency, abbreviateValue } from '@/utils/format';
import { useAuth } from '@/hooks/use-auth';
import type { CdtPosition, EtfPosition, AllocationBands } from '@/db/schema';
import { INBOX_EVENTS, type InboxEvent } from '@/constants/inbox-mock';
import { inboxState } from '@/utils/inbox-state';

// ── Macro context hardcodeado — vendrá del backend §8 ────────────────────
const TRM_COP       = 4_200;
const BANREP_RATE   = 9.25;
const CDT_MKT_RATE  = 11.2;
const INFLATION_COL = 5.3;
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

function isEffectivelyUnread(evt: InboxEvent): boolean {
  if (inboxState.isDeleted(evt.id)) return false;
  if (inboxState.isUnread(evt.id)) return true;
  if (inboxState.isRead(evt.id)) return false;
  return !evt.isRead;
}

function relatedUnreadCount(cdts: CdtPosition[], etfs: EtfPosition[]): number {
  return INBOX_EVENTS.filter((evt) => {
    if (!isEffectivelyUnread(evt) || !evt.relatedAsset) return false;
    const asset = evt.relatedAsset;
    if (asset.startsWith('CDT ')) {
      const bank = asset.slice(4);
      return cdts.some((c) => c.bank.toLowerCase() === bank.toLowerCase());
    }
    return etfs.some((e) => e.ticker === asset);
  }).length;
}

function hasCdtUnread(cdt: CdtPosition): boolean {
  return INBOX_EVENTS.some(
    (evt) =>
      isEffectivelyUnread(evt) &&
      evt.relatedAsset?.toLowerCase().includes(cdt.bank.toLowerCase()),
  );
}

function hasEtfUnread(etf: EtfPosition): boolean {
  return INBOX_EVENTS.some(
    (evt) => isEffectivelyUnread(evt) && evt.relatedAsset === etf.ticker,
  );
}

// ── Main screen ───────────────────────────────────────────────────────────

export default function PortfolioScreen() {
  const { displayName }       = useAuth();
  const db                    = useSQLiteContext();
  const router                = useRouter();
  const theme                 = useTheme();
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
            <ActivityIndicator color={theme.textSecondary} />
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
  const theme   = useTheme();
  const config  = PROFILE_CONFIG[profile.label];
  const bands   = PROFILE_BANDS[profile.label];
  const isEmpty = cdts.length === 0 && etfs.length === 0;
  const [tab, setTab] = useState<PortfolioTab>('resumen');

  useEffect(() => {
    if (isEmpty) setTab('resumen');
  }, [isEmpty]);

  const [, setInboxTick] = useState(0);
  useEffect(() => {
    return inboxState.subscribe(() => setInboxTick((n) => n + 1));
  }, []);

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
  const unreadCount = relatedUnreadCount(cdts, etfs);

  return (
    <View style={styles.contentRoot}>
      {/* Fila superior: chip de perfil + botón Agregar */}
      <View style={styles.profileRow}>
        <View style={[styles.profileChip, {
          borderColor: config.color + '60',
          backgroundColor: theme.backgroundElement,
        }]}>
          <ThemedText style={styles.chipLine} numberOfLines={1}>
            <ThemedText style={[styles.chipLabel, { color: config.color }]}>{config.title}</ThemedText>
            <ThemedText style={[styles.chipBands, { color: theme.textSecondary }]}>
              {`: CDT ${Math.round(bands.cdt_min * 100)}–${Math.round(bands.cdt_max * 100)}% / ETF ${Math.round(bands.etf_min * 100)}–${Math.round(bands.etf_max * 100)}%`}
            </ThemedText>
          </ThemedText>
        </View>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.positive }]}
          onPress={() => router.push('/portfolio/add')}
          activeOpacity={0.85}
        >
          <Ionicons name="add-outline" size={15} color="#FFFFFF" />
          <ThemedText style={styles.fabText}>Agregar</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.backgroundElement }]}>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'resumen' && { backgroundColor: theme.background }]}
          onPress={() => setTab('resumen')}
          activeOpacity={0.7}
        >
          <ThemedText style={[styles.tabLabel, { color: tab === 'resumen' ? theme.text : theme.textSecondary },
            tab === 'resumen' && { fontWeight: '600' }]}>
            Resumen
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'detalle' && { backgroundColor: theme.background }, isEmpty && styles.tabItemDisabled]}
          onPress={() => { if (!isEmpty) setTab('detalle'); }}
          activeOpacity={isEmpty ? 1 : 0.7}
        >
          <ThemedText style={[styles.tabLabel, { color: (tab === 'detalle' && !isEmpty) ? theme.text : theme.textSecondary },
            tab === 'detalle' && !isEmpty && { fontWeight: '600' }]}>
            Detalle
          </ThemedText>
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
            <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="layers-outline" size={40} color={theme.textSecondary} />
              <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
                Tu portafolio está vacío
              </ThemedText>
              <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Registra los activos que ya tienes en tu banco o broker para ver el análisis completo.
              </ThemedText>
              <View style={styles.emptyCtas}>
                <TouchableOpacity
                  style={[styles.emptyCtaBtn, { backgroundColor: theme.background, borderColor: theme.divider }]}
                  onPress={() => router.push('/portfolio/add-cdt')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="business-outline" size={16} color={theme.assetCdt} />
                  <ThemedText style={[styles.emptyCtaText, { color: theme.assetCdt }]}>
                    Agregar CDT
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.emptyCtaBtn, { backgroundColor: theme.background, borderColor: theme.divider }]}
                  onPress={() => router.push('/portfolio/add-etf')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trending-up-outline" size={16} color={theme.assetEtf} />
                  <ThemedText style={[styles.emptyCtaText, { color: theme.assetEtf }]}>
                    Agregar ETF
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {unreadCount > 0 && (
                <TouchableOpacity
                  style={[styles.inboxBanner, { backgroundColor: theme.attentionSubtle, borderColor: theme.attentionBorder }]}
                  onPress={() => setTab('detalle')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.inboxBannerIcon, { backgroundColor: theme.attentionSubtle }]}>
                    <Ionicons name="mail-outline" size={16} color={theme.attention} />
                  </View>
                  <View style={styles.inboxBannerText}>
                    <ThemedText style={[styles.inboxBannerTitle, { color: theme.text }]}>
                      {unreadCount === 1 ? '1 mensaje' : `${unreadCount} mensajes`} en el Buzón
                    </ThemedText>
                    <ThemedText style={[styles.inboxBannerSub, { color: theme.textSecondary }]}>
                      relacionados con tu portafolio
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
                </TouchableOpacity>
              )}

              <View style={[styles.metricsRow, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.metricLeft}>
                  <ThemedText style={[styles.metricLabel, { color: theme.textSecondary }]}>Portafolio</ThemedText>
                  <ThemedText style={[styles.metricTotal, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    ${abbreviateValue(portfolioTotal, 'COP')}
                  </ThemedText>
                  <View style={styles.metricBreakdown}>
                    <View style={styles.summaryBreakdownItem}>
                      <View style={[styles.summaryDot, { backgroundColor: theme.assetCdt }]} />
                      <ThemedText style={[styles.metricPart, { color: theme.textSecondary }]}>
                        CDT  ${abbreviateValue(cdtTotal, 'COP')}
                      </ThemedText>
                    </View>
                    <View style={styles.summaryBreakdownItem}>
                      <View style={[styles.summaryDot, { backgroundColor: theme.assetEtf }]} />
                      <ThemedText style={[styles.metricPart, { color: theme.textSecondary }]}>
                        ETF  ${abbreviateValue(etfTotalCOP, 'COP')}
                      </ThemedText>
                    </View>
                  </View>
                </View>
                <View style={[styles.metricDivider, { backgroundColor: theme.divider }]} />
                <View style={styles.metricRight}>
                  <ThemedText style={[styles.metricLabel, { color: theme.positive }]}>
                    Proyección 10A
                  </ThemedText>
                  <ThemedText style={[styles.metricRange, { color: theme.text }]} numberOfLines={2} adjustsFontSizeToFit>
                    ${abbreviateValue(projLow, 'COP')} –{'\n'}${abbreviateValue(projHigh, 'COP')}
                  </ThemedText>
                </View>
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
              <ThemedText style={[styles.sectionHeader, { color: theme.assetCdt }]}>
                Certificados de Depósito
              </ThemedText>
              {cdts.map((cdt) => (
                <CdtCard
                  key={cdt.id}
                  cdt={cdt}
                  hasUnread={hasCdtUnread(cdt)}
                  onPress={() => router.push({ pathname: '/portfolio/cdt/[id]', params: { id: cdt.id } })}
                />
              ))}
            </View>
          )}
          {etfs.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionHeader, { color: theme.assetEtf }]}>
                ETFs Indexados
              </ThemedText>
              {etfs.map((etf) => (
                <EtfCard
                  key={etf.id}
                  etf={etf}
                  hasUnread={hasEtfUnread(etf)}
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
  const theme = useTheme();
  const cdtH = bandHealth(cdtPct, bands.cdt_min, bands.cdt_max);
  const etfH = bandHealth(etfPct, bands.etf_min, bands.etf_max);
  const overallH: BandHealth =
    cdtH === 'fuera' || etfH === 'fuera' ? 'fuera' :
    cdtH === 'cerca' || etfH === 'cerca' ? 'cerca' :
    'dentro';
  const hc = overallH === 'dentro' ? theme.positive : overallH === 'cerca' ? theme.attention : theme.risk;
  const statusLabel =
    overallH === 'dentro' ? 'Dentro de bandas' :
    overallH === 'cerca'  ? 'Cerca del límite' :
    'Fuera de bandas';

  const cdtHc = cdtH === 'dentro' ? theme.positive : cdtH === 'cerca' ? theme.attention : theme.risk;
  const etfHc = etfH === 'dentro' ? theme.positive : etfH === 'cerca' ? theme.attention : theme.risk;
  const cdtN  = Math.round(cdtPct * 100);
  const etfN  = Math.round(etfPct * 100);

  return (
    <View style={[styles.distributionSection, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.distributionHeader}>
        <ThemedText style={[styles.sectionHeader, { color: theme.textSecondary }]}>Distribución</ThemedText>
        <View style={[styles.healthBadge, { backgroundColor: hc + '18', borderColor: hc + '50' }]}>
          <ThemedText style={[styles.healthLabel, { color: hc }]}>{statusLabel}</ThemedText>
        </View>
      </View>

      <View style={[styles.stackedTrack, { backgroundColor: theme.divider }]}>
        <View style={{ flex: cdtN, backgroundColor: theme.assetCdt }} />
        <View style={{ flex: etfN, backgroundColor: theme.assetEtf }} />
      </View>

      <View style={styles.distLegendRow}>
        <View style={[styles.distDot, { backgroundColor: theme.assetCdt }]} />
        <ThemedText style={[styles.distLabel, { color: theme.text }]}>CDT</ThemedText>
        <ThemedText style={[styles.distPct, { color: theme.assetCdt }]}>{cdtN}%</ThemedText>
        <ThemedText style={[styles.distBand, { color: theme.textSecondary }]}>
          [{Math.round(bands.cdt_min * 100)}–{Math.round(bands.cdt_max * 100)}%]
        </ThemedText>
        {cdtH === 'dentro' && <Ionicons name="checkmark"            size={13} color={cdtHc} />}
        {cdtH === 'cerca'  && <Ionicons name="alert-circle-outline" size={13} color={cdtHc} />}
        {cdtH === 'fuera'  && <Ionicons name="close-circle-outline" size={13} color={cdtHc} />}
      </View>

      <View style={styles.distLegendRow}>
        <View style={[styles.distDot, { backgroundColor: theme.assetEtf }]} />
        <ThemedText style={[styles.distLabel, { color: theme.text }]}>ETF</ThemedText>
        <ThemedText style={[styles.distPct, { color: theme.assetEtf }]}>{etfN}%</ThemedText>
        <ThemedText style={[styles.distBand, { color: theme.textSecondary }]}>
          [{Math.round(bands.etf_min * 100)}–{Math.round(bands.etf_max * 100)}%]
        </ThemedText>
        {etfH === 'dentro' && <Ionicons name="checkmark"            size={13} color={etfHc} />}
        {etfH === 'cerca'  && <Ionicons name="alert-circle-outline" size={13} color={etfHc} />}
        {etfH === 'fuera'  && <Ionicons name="close-circle-outline" size={13} color={etfHc} />}
      </View>
    </View>
  );
}

// ── Contexto macro ────────────────────────────────────────────────────────

function ContextStrip() {
  const theme = useTheme();
  return (
    <View style={[styles.contextStrip, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText style={[styles.contextTitle, { color: theme.textSecondary }]}>Contexto actual</ThemedText>
      <View style={styles.contextRow}>
        <ContextItem label="Banrep"      value={`${BANREP_RATE}%`} />
        <ContextItem label="CDT mercado" value={`${CDT_MKT_RATE}%`} />
        <ContextItem label="Inflación"   value={`${INFLATION_COL}%`} />
        <ContextItem label="TRM"         value={`$${TRM_COP.toLocaleString('es-CO')}`} />
      </View>
      <ThemedText style={[styles.contextNote, { color: theme.textSecondary }]}>
        Datos de referencia · se actualizarán automáticamente en §8
      </ThemedText>
    </View>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.contextItem}>
      <ThemedText style={[styles.contextValue, { color: theme.text }]}>{value}</ThemedText>
      <ThemedText style={[styles.contextLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
    </View>
  );
}

// ── Tarjetas de activos ───────────────────────────────────────────────────

function CdtCard({ cdt, onPress, hasUnread }: { cdt: CdtPosition; onPress: () => void; hasUnread: boolean }) {
  const theme   = useTheme();
  const days    = daysUntil(cdt.end_date);
  const net     = cdtNetYield(cdt);
  const expired = days < 0;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {hasUnread && <View style={[styles.cardInboxDot, { backgroundColor: theme.attention }]} />}
      <View style={styles.cardRow}>
        <ThemedText style={[styles.cardTitle, { color: theme.text }]}>{cdt.bank}</ThemedText>
        <ThemedText style={[styles.cardRate, { color: theme.assetCdt }]}>
          {(cdt.rate * 100).toFixed(2)}% EA
        </ThemedText>
      </View>
      <ThemedText style={[styles.cardAmount, { color: theme.text }]}>
        {formatCurrency(cdt.amount, 'COP')}
      </ThemedText>
      <View style={styles.cardRow}>
        <ThemedText style={[styles.cardMeta, { color: theme.textSecondary }]}>
          {expired ? 'Venció ' : 'Vence '}
          {fmtDate(cdt.end_date)}
          {!expired && days <= 90 ? `  ·  ${days} días` : ''}
        </ThemedText>
        <ThemedText style={[styles.cardNet, { color: theme.assetCdt }]}>
          +{abbreviateValue(net, 'COP')} neto
        </ThemedText>
      </View>
    </TouchableOpacity>
  );
}

function EtfCard({ etf, onPress, hasUnread }: { etf: EtfPosition; onPress: () => void; hasUnread: boolean }) {
  const theme     = useTheme();
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
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {hasUnread && <View style={[styles.cardInboxDot, { backgroundColor: theme.attention }]} />}
      <View style={styles.cardRow}>
        <ThemedText style={[styles.cardTitle, { color: theme.text }]}>{etf.ticker}</ThemedText>
        {etf.ter > 0 && (
          <ThemedText style={[styles.cardMeta, { color: theme.textSecondary }]}>
            TER {(etf.ter * 100).toFixed(2)}%
          </ThemedText>
        )}
      </View>
      <ThemedText style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{etf.name}</ThemedText>
      <View style={styles.cardRow}>
        <ThemedText style={[styles.cardMeta, { color: theme.textSecondary }]}>
          {sharesDisplay}{costDisplay ? ` · ${costDisplay}` : ''}
        </ThemedText>
        <ThemedText style={[styles.cardNet, { color: theme.assetEtf }]}>
          {totalDisplay}
        </ThemedText>
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
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 100,
  },
  fabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contentRoot: {
    flex: 1,
    gap: Spacing.two,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  tabItem: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Spacing.one + Spacing.half,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0,
    shadowRadius: 2,
    elevation: 0,
  },
  tabItemDisabled: {
    opacity: 0.38,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  scroll: { flex: 1 },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  profileChip: {
    flex: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 100,
    borderWidth: 1,
  },
  chipLine:  { fontSize: 12, flexShrink: 1 },
  chipLabel: { fontSize: 12, fontWeight: '600' },
  chipBands: { fontSize: 12 },
  emptyCard: {
    borderRadius: Spacing.three,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  emptySubtitle: {
    fontSize: 14,
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
    borderWidth: 1,
  },
  emptyCtaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inboxBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  inboxBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  inboxBannerText: { flex: 1, gap: 2 },
  inboxBannerTitle: { fontSize: 13, fontWeight: '600' },
  inboxBannerSub:   { fontSize: 12 },
  metricsRow: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  metricLeft:    { flex: 1, gap: Spacing.one },
  metricRight:   { flex: 1, paddingLeft: Spacing.three, gap: Spacing.one },
  metricDivider: { width: 1, marginVertical: 2 },
  metricLabel:   { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  metricTotal:   { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  metricRange:   { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, lineHeight: 26 },
  metricBreakdown: { gap: 3, marginTop: Spacing.one },
  metricPart:    { fontSize: 11 },
  summaryBreakdownItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + Spacing.half },
  summaryDot:    { width: 6, height: 6, borderRadius: 3 },
  distributionSection: {
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
  healthLabel:  { fontSize: 11, fontWeight: '600' },
  stackedTrack:  { height: 10, borderRadius: 5, flexDirection: 'row', overflow: 'hidden' },
  distLegendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  distDot:       { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  distLabel:     { fontSize: 13, fontWeight: '500', width: 36 },
  distPct:       { fontSize: 13, fontWeight: '700', width: 36 },
  distBand:      { fontSize: 11, flex: 1 },
  contextStrip: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  contextTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  contextRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  contextItem:  { alignItems: 'center', gap: 2 },
  contextValue: { fontSize: 14, fontWeight: '600' },
  contextLabel: { fontSize: 10, textAlign: 'center' },
  contextNote:  { fontSize: 10, fontStyle: 'italic' },
  section:      { gap: Spacing.two },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  cardInboxDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle:   { fontSize: 15, fontWeight: '600' },
  cardSubtitle:{ fontSize: 13 },
  cardAmount:  { fontSize: 16, fontWeight: '700' },
  cardRate:    { fontSize: 13, fontWeight: '600' },
  cardMeta:    { fontSize: 13 },
  cardNet:     { fontSize: 13, fontWeight: '600' },
});
