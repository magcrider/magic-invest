import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PageHeader } from '@/components/page-header';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { RiskProfileFlow } from '@/components/risk-profile-flow';
import { InfoModal } from '@/components/info-modal';
import { OfflineScreen } from '@/components/offline-screen';
import { Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PROFILE_CONFIG, PROFILE_BANDS, type RiskProfile } from '@/constants/risk-profile';
import { getRiskProfile, setRiskProfile, getAllCdts, getAllEtfs, getMacroContext, getCdtMarketRates, getLatestEodPrices, getTrmHistory, getInboxEvents, type MacroContext, type CdtMarketRate, type EodPrice } from '@/services/supabase-queries';
import { calculateDevaluation, calculatePortfolioHurdleRate } from '@/lib/hurdle-rate';
import { profileEvents } from '@/utils/profile-events';
import { formatCurrency, abbreviateValue } from '@/utils/format';
import { useAuth } from '@/hooks/use-auth';
import type { CdtPosition, EtfPosition, AllocationBands } from '@/types/database';

// ── Tasas hardcodeadas mientras implementamos backend completo ──────────
const CDT_MKT_RATE  = 11.2;  // TODO: vendrá de cdt_rates cuando implementemos API CDT
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

function etfInvestedCOP(etf: EtfPosition, trm: number): number {
  if (etf.currency === 'COP' && etf.total_invested_cop != null) return etf.total_invested_cop;
  if (etf.total_invested_usd != null) return etf.total_invested_usd * trm;
  if (etf.shares > 0 && etf.average_cost_usd > 0) return etf.shares * etf.average_cost_usd * trm;
  return 0;
}

function etfCurrentValueCOP(etf: EtfPosition, trm: number, currentPrice?: number): number {
  if (!currentPrice || etf.shares <= 0) {
    return etfInvestedCOP(etf, trm);
  }
  return etf.shares * currentPrice * trm;
}

function bandHealth(pct: number, min: number, max: number): BandHealth {
  if (pct >= min && pct <= max) return 'dentro';
  if (pct >= min - 0.05 && pct <= max + 0.05) return 'cerca';
  return 'fuera';
}

// ── Main screen ───────────────────────────────────────────────────────────

export default function PortfolioScreen() {
  const { displayName }       = useAuth();
  const router                = useRouter();
  const theme                 = useTheme();
  const [state, setState]     = useState<ScreenState>('loading');
  const [profile, setProfile] = useState<RiskProfile | null>(null);
  const [cdts, setCdts]       = useState<CdtPosition[]>([]);
  const [etfs, setEtfs]       = useState<EtfPosition[]>([]);
  const [macroContext, setMacroContext] = useState<MacroContext | null>(null);
  const [cdtRate360, setCdtRate360] = useState<number | null>(null);
  const [eodPrices, setEodPrices] = useState<Map<string, EodPrice>>(new Map());
  const [hurdleRate, setHurdleRate] = useState<number | null>(null);
  const [networkError, setNetworkError] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProjectionModal, setShowProjectionModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [cdtUnreadMap, setCdtUnreadMap] = useState<Map<string, boolean>>(new Map());
  const [etfUnreadMap, setEtfUnreadMap] = useState<Map<string, boolean>>(new Map());
  const isFirstFocus          = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        setState('loading');
        isFirstFocus.current = false;
      }
      Promise.all([
        getRiskProfile().catch(() => null),
        getAllCdts().catch(() => []),
        getAllEtfs().catch(() => []),
        getMacroContext().catch(() => null),
        getCdtMarketRates(360).then(rates => rates[0]?.rate ?? null).catch(() => null)
      ]).then(
        async ([p, cdtList, etfList, macro, cdtRate]) => {
          setProfile(p);
          setCdts(cdtList);
          setEtfs(etfList);
          setMacroContext(macro);
          setCdtRate360(cdtRate);

          // Detectar error de red: si no hay macro data y tampoco CDT rate, probablemente no hay conexión
          if (!macro && !cdtRate) {
            setNetworkError(true);
          } else {
            setNetworkError(false);
          }

          // Cargar precios EOD de todos los ETFs
          if (etfList.length > 0) {
            const tickers = etfList.map(e => e.ticker);
            const prices = await getLatestEodPrices(tickers).catch(() => new Map());
            setEodPrices(prices);
          }

          // Cargar mensajes no leídos relacionados
          try {
            const events = await getInboxEvents();
            const unreadEvents = events.filter(evt => !evt.readAt && evt.assetRef);

            // Contar total de mensajes relacionados
            const relatedCount = unreadEvents.filter((evt) => {
              const asset = evt.assetRef!;
              if (asset.startsWith('CDT ')) {
                const bank = asset.slice(4);
                return cdtList.some((c) => c.bank.toLowerCase() === bank.toLowerCase());
              }
              return etfList.some((e) => e.ticker === asset);
            }).length;
            setUnreadCount(relatedCount);

            // Mapear badges por CDT
            const cdtMap = new Map<string, boolean>();
            cdtList.forEach(cdt => {
              const hasUnread = unreadEvents.some(
                evt => evt.assetRef?.toLowerCase().includes(cdt.bank.toLowerCase())
              );
              cdtMap.set(cdt.id, hasUnread);
            });
            setCdtUnreadMap(cdtMap);

            // Mapear badges por ETF
            const etfMap = new Map<string, boolean>();
            etfList.forEach(etf => {
              const hasUnread = unreadEvents.some(evt => evt.assetRef === etf.ticker);
              etfMap.set(etf.id, hasUnread);
            });
            setEtfUnreadMap(etfMap);
          } catch (error) {
            console.error('Error loading inbox events:', error);
            setUnreadCount(0);
          }

          // Calcular Hurdle Rate solo si tenemos todos los datos necesarios
          if (macro && cdtRate) {
            try {
              const trmHistory = await getTrmHistory(5);
              if (trmHistory.length > 0) {
                const devaluationRate = calculateDevaluation(trmHistory, 5);
                const { hurdleRate: calculatedHurdleRate } = calculatePortfolioHurdleRate({
                  cdtRate: cdtRate / 100,
                  devaluationRate,
                });
                setHurdleRate(calculatedHurdleRate * 100);
              } else {
                setHurdleRate(null);
              }
            } catch (error) {
              console.error('Error calculating hurdle rate:', error);
              setHurdleRate(null);
            }
          } else {
            setHurdleRate(null);
          }

          setState(p ? 'portfolio' : 'risk_profile');
        }
      ).catch((error) => {
        console.error('Error loading portfolio:', error);
        setNetworkError(true);
        setState('portfolio'); // Mostrar portfolio vacío con mensaje de error
      });
    }, [])
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
    await setRiskProfile(p);
    setProfile(p);
    setState('portfolio');
  }

  function handleRetry() {
    // Limpiar error de red y reiniciar carga
    setNetworkError(false);
    setState('loading');
    isFirstFocus.current = true; // Forzar recarga completa

    // Reinvocar el efecto de carga
    Promise.all([
      getRiskProfile().catch(() => null),
      getAllCdts().catch(() => []),
      getAllEtfs().catch(() => []),
      getMacroContext().catch(() => null),
      getCdtMarketRates(360).then(rates => rates[0]?.rate ?? null).catch(() => null)
    ]).then(
      async ([p, cdtList, etfList, macro, cdtRate]) => {
        setProfile(p);
        setCdts(cdtList);
        setEtfs(etfList);
        setMacroContext(macro);
        setCdtRate360(cdtRate);

        if (!macro && !cdtRate) {
          setNetworkError(true);
        } else {
          setNetworkError(false);
        }

        // Cargar precios EOD
        if (etfList.length > 0) {
          const tickers = etfList.map(e => e.ticker);
          const prices = await getLatestEodPrices(tickers).catch(() => new Map());
          setEodPrices(prices);
        }

        // Cargar mensajes no leídos
        try {
          const events = await getInboxEvents();
          const unreadEvents = events.filter(evt => !evt.readAt && evt.assetRef);
          const relatedCount = unreadEvents.filter((evt) => {
            const asset = evt.assetRef!;
            if (asset.startsWith('CDT ')) {
              const bank = asset.slice(4);
              return cdtList.some((c) => c.bank.toLowerCase() === bank.toLowerCase());
            }
            return etfList.some((e) => e.ticker === asset);
          }).length;
          setUnreadCount(relatedCount);

          const cdtMap = new Map<string, boolean>();
          cdtList.forEach(cdt => {
            const hasUnread = unreadEvents.some(
              evt => evt.assetRef?.toLowerCase().includes(cdt.bank.toLowerCase())
            );
            cdtMap.set(cdt.id, hasUnread);
          });
          setCdtUnreadMap(cdtMap);

          const etfMap = new Map<string, boolean>();
          etfList.forEach(etf => {
            const hasUnread = unreadEvents.some(evt => evt.assetRef === etf.ticker);
            etfMap.set(etf.id, hasUnread);
          });
          setEtfUnreadMap(etfMap);
        } catch (error) {
          console.error('Error loading inbox events:', error);
          setUnreadCount(0);
        }

        // Calcular Hurdle Rate
        if (macro && cdtRate) {
          try {
            const trmHistory = await getTrmHistory(5);
            if (trmHistory.length > 0) {
              const devaluationRate = calculateDevaluation(trmHistory, 5);
              const { hurdleRate: calculatedHurdleRate } = calculatePortfolioHurdleRate({
                cdtRate: cdtRate / 100,
                devaluationRate,
              });
              setHurdleRate(calculatedHurdleRate * 100);
            } else {
              setHurdleRate(null);
            }
          } catch (error) {
            console.error('Error calculating hurdle rate:', error);
            setHurdleRate(null);
          }
        } else {
          setHurdleRate(null);
        }

        setState(p ? 'portfolio' : 'risk_profile');
      }
    ).catch((error) => {
      console.error('Error loading portfolio:', error);
      setNetworkError(true);
      setState('portfolio');
    });
  }

  const subtitle = displayName ? `Hola, ${displayName}` : 'Tus posiciones reales';

  // Si hay error de red sin datos, mostrar pantalla offline completa
  if (networkError && !profile) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <OfflineScreen onRetry={handleRetry} isRetrying={state === 'loading'} />
        </SafeAreaView>
      </ThemedView>
    );
  }

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
          <PortfolioContent
            profile={profile}
            cdts={cdts}
            etfs={etfs}
            macroContext={macroContext}
            cdtRate360={cdtRate360}
            eodPrices={eodPrices}
            hurdleRate={hurdleRate}
            networkError={networkError}
            showProfileModal={showProfileModal}
            setShowProfileModal={setShowProfileModal}
            showProjectionModal={showProjectionModal}
            setShowProjectionModal={setShowProjectionModal}
            unreadCount={unreadCount}
            cdtUnreadMap={cdtUnreadMap}
            etfUnreadMap={etfUnreadMap}
          />
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
  macroContext: MacroContext | null;
  cdtRate360: number | null;
  eodPrices: Map<string, EodPrice>;
  hurdleRate: number | null;
  networkError: boolean;
  showProfileModal: boolean;
  setShowProfileModal: (show: boolean) => void;
  showProjectionModal: boolean;
  setShowProjectionModal: (show: boolean) => void;
  unreadCount: number;
  cdtUnreadMap: Map<string, boolean>;
  etfUnreadMap: Map<string, boolean>;
}

function PortfolioContent({
  profile,
  cdts,
  etfs,
  macroContext,
  cdtRate360,
  eodPrices,
  hurdleRate,
  networkError,
  showProfileModal,
  setShowProfileModal,
  showProjectionModal,
  setShowProjectionModal,
  unreadCount,
  cdtUnreadMap,
  etfUnreadMap,
}: PortfolioContentProps) {
  const router  = useRouter();
  const theme   = useTheme();
  const config  = PROFILE_CONFIG[profile.label];
  const bands   = PROFILE_BANDS[profile.label];
  const isEmpty = cdts.length === 0 && etfs.length === 0;
  const [tab, setTab] = useState<PortfolioTab>('resumen');
  const [contextModal, setContextModal] = useState<'banrep' | 'cdt' | 'inflation' | 'trm' | 'hurdle' | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isEmpty) setTab('resumen');
  }, [isEmpty]);

  const cdtTotal       = cdts.reduce((s, c) => s + c.amount, 0);
  const etfTotalInvestedCOP = etfs.reduce((s, e) => s + etfInvestedCOP(e, macroContext?.trm ?? 4200), 0);
  const etfTotalCurrentCOP = etfs.reduce((s, e) => {
    const price = eodPrices.get(e.ticker);
    return s + etfCurrentValueCOP(e, macroContext?.trm ?? 4200, price?.adjustedClose);
  }, 0);
  const portfolioTotal = cdtTotal + etfTotalCurrentCOP;
  const cdtPct = portfolioTotal > 0 ? cdtTotal / portfolioTotal : 0;
  const etfPct = portfolioTotal > 0 ? etfTotalCurrentCOP / portfolioTotal : 0;

  const avgCdtRateNet = cdtTotal > 0
    ? cdts.reduce((s, c) => s + c.rate * (1 - c.withholding_rate) * c.amount, 0) / cdtTotal
    : (CDT_MKT_RATE / 100) * 0.96;

  const blendedLow  = cdtPct * avgCdtRateNet + etfPct * ETF_CAGR_LOW;
  const blendedHigh = cdtPct * avgCdtRateNet + etfPct * ETF_CAGR_HIGH;
  const projLow     = portfolioTotal * Math.pow(1 + blendedLow,  10);
  const projHigh    = portfolioTotal * Math.pow(1 + blendedHigh, 10);
  const proj2Low    = portfolioTotal * Math.pow(1 + blendedLow,  2);
  const proj2High   = portfolioTotal * Math.pow(1 + blendedHigh, 2);
  const proj5Low    = portfolioTotal * Math.pow(1 + blendedLow,  5);
  const proj5High   = portfolioTotal * Math.pow(1 + blendedHigh, 5);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  return (
    <View style={styles.contentRoot}>
      {/* Fila superior: chip de perfil + botón Agregar */}
      <View style={styles.profileRow}>
        <TouchableOpacity
          style={[styles.profileChip, {
            borderColor: config.color + '60',
            backgroundColor: theme.backgroundElement,
          }]}
          onPress={() => setShowProfileModal(true)}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.chipLine} numberOfLines={1}>
            <ThemedText style={[styles.chipLabel, { color: config.color }]}>{config.title}</ThemedText>
            <ThemedText style={[styles.chipBands, { color: theme.textSecondary }]}>
              {`: CDT ${Math.round(bands.cdt_min * 100)}–${Math.round(bands.cdt_max * 100)}% / ETF ${Math.round(bands.etf_min * 100)}–${Math.round(bands.etf_max * 100)}%`}
            </ThemedText>
          </ThemedText>
        </TouchableOpacity>
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
                        ETF  ${abbreviateValue(etfTotalCurrentCOP, 'COP')}
                      </ThemedText>
                    </View>
                  </View>
                </View>
                <View style={[styles.metricDivider, { backgroundColor: theme.divider }]} />
                <TouchableOpacity
                  style={styles.metricRight}
                  onPress={() => setShowProjectionModal(true)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.metricLabel, { color: theme.positive }]}>
                    Proyección
                  </ThemedText>
                  <View style={styles.projectionLines}>
                    <View style={styles.projectionRow}>
                      <ThemedText style={[styles.projectionYear, { color: theme.textSecondary }]}>
                        2A @ {new Date().getFullYear() + 2}{' '}
                      </ThemedText>
                      <ThemedText style={[styles.projectionValue, { color: theme.text }]}>
                        ${abbreviateValue(proj2Low, 'COP')} – ${abbreviateValue(proj2High, 'COP')}
                      </ThemedText>
                    </View>
                    <View style={styles.projectionRow}>
                      <ThemedText style={[styles.projectionYear, { color: theme.textSecondary }]}>
                        5A @ {new Date().getFullYear() + 5}{' '}
                      </ThemedText>
                      <ThemedText style={[styles.projectionValue, { color: theme.text }]}>
                        ${abbreviateValue(proj5Low, 'COP')} – ${abbreviateValue(proj5High, 'COP')}
                      </ThemedText>
                    </View>
                    <View style={styles.projectionRow}>
                      <ThemedText style={[styles.projectionYear, { color: theme.textSecondary }]}>
                        10A @ {new Date().getFullYear() + 10}{' '}
                      </ThemedText>
                      <ThemedText style={[styles.projectionValue, { color: theme.text }]}>
                        ${abbreviateValue(projLow, 'COP')} – ${abbreviateValue(projHigh, 'COP')}
                      </ThemedText>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              <DistributionSection cdtPct={cdtPct} etfPct={etfPct} bands={bands} />
              <ContextStrip macroContext={macroContext} cdtRate360={cdtRate360} hurdleRate={hurdleRate} networkError={networkError} onOpenModal={setContextModal} />
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
            <AssetAccordion
              title="Certificados de Depósito"
              count={cdts.length}
              color={theme.assetCdt}
              isExpanded={expandedSections.has('cdt')}
              onToggle={() => toggleSection('cdt')}
            >
              {cdts.map((cdt) => (
                <CdtCard
                  key={cdt.id}
                  cdt={cdt}
                  hasUnread={cdtUnreadMap.get(cdt.id) || false}
                  onPress={() => router.push({ pathname: '/portfolio/cdt/[id]', params: { id: cdt.id } })}
                />
              ))}
            </AssetAccordion>
          )}
          {etfs.length > 0 && (
            <AssetAccordion
              title="ETFs Indexados"
              count={etfs.length}
              color={theme.assetEtf}
              isExpanded={expandedSections.has('etf')}
              onToggle={() => toggleSection('etf')}
            >
              {etfs.map((etf) => (
                <EtfCard
                  key={etf.id}
                  etf={etf}
                  hasUnread={etfUnreadMap.get(etf.id) || false}
                  eodPrice={eodPrices.get(etf.ticker)}
                  trm={macroContext?.trm ?? 4200}
                  onPress={() => router.push({ pathname: '/portfolio/etf/[id]', params: { id: etf.id } })}
                />
              ))}
            </AssetAccordion>
          )}
        </ScrollView>
      )}

      {/* Modal: Perfil de Inversión */}
      <InfoModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Tu Perfil de Inversión"
      >
        <View style={styles.modalSection}>
          <View style={[styles.modalBadge, {
            borderColor: config.color + '60',
            backgroundColor: theme.background,
          }]}>
            <ThemedText style={[styles.modalBadgeLabel, { color: config.color }]}>
              {config.title}
            </ThemedText>
            <ThemedText style={[styles.modalBadgeBands, { color: theme.text }]}>
              CDT {Math.round(bands.cdt_min * 100)}–{Math.round(bands.cdt_max * 100)}% / ETF {Math.round(bands.etf_min * 100)}–{Math.round(bands.etf_max * 100)}%
            </ThemedText>
          </View>
        </View>

        <View style={styles.modalSection}>
          <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
            ¿Qué significa esto?
          </ThemedText>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
            Tu perfil sugiere una mezcla equilibrada: CDTs para estabilidad, ETFs para crecimiento a largo plazo.
          </ThemedText>
        </View>

        <View style={styles.modalSection}>
          <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
            ¿Cómo se calculó?
          </ThemedText>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
            Basado en tus respuestas al cuestionario inicial:
          </ThemedText>
          <View style={styles.modalList}>
            <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
              • Horizonte temporal
            </ThemedText>
            <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
              • Reacción ante caídas del mercado
            </ThemedText>
            <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
              • Objetivo de inversión
            </ThemedText>
          </View>
        </View>
      </InfoModal>

      {/* Modal: Proyección */}
      <InfoModal
        visible={showProjectionModal}
        onClose={() => setShowProjectionModal(false)}
        title="Proyección de tu portafolio"
      >
        <View style={styles.modalSectionCompact}>
          <View style={styles.projectionModalLines}>
            <View style={styles.projectionModalRow}>
              <ThemedText style={[styles.projectionModalYear, { color: theme.textSecondary }]}>
                2A @ {new Date().getFullYear() + 2}
              </ThemedText>
              <ThemedText style={[styles.projectionModalValue, { color: theme.text }]}>
                ${abbreviateValue(proj2Low, 'COP')} – ${abbreviateValue(proj2High, 'COP')}
              </ThemedText>
            </View>
            <View style={styles.projectionModalRow}>
              <ThemedText style={[styles.projectionModalYear, { color: theme.textSecondary }]}>
                5A @ {new Date().getFullYear() + 5}
              </ThemedText>
              <ThemedText style={[styles.projectionModalValue, { color: theme.text }]}>
                ${abbreviateValue(proj5Low, 'COP')} – ${abbreviateValue(proj5High, 'COP')}
              </ThemedText>
            </View>
            <View style={styles.projectionModalRow}>
              <ThemedText style={[styles.projectionModalYear, { color: theme.textSecondary }]}>
                10A @ {new Date().getFullYear() + 10}
              </ThemedText>
              <ThemedText style={[styles.projectionModalValue, { color: theme.text }]}>
                ${abbreviateValue(projLow, 'COP')} – ${abbreviateValue(projHigh, 'COP')}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.modalSectionCompact}>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary, marginBottom: Spacing.two }]}>
            El rango muestra dos escenarios:
          </ThemedText>
          <View style={[styles.modalTable, { borderColor: theme.divider }]}>
            <View style={[styles.modalTableRow, { borderBottomColor: theme.divider }]}>
              <ThemedText style={[styles.modalTableLabel, { color: theme.text }]}>
                Pesimista
              </ThemedText>
              <ThemedText style={[styles.modalTableValue, { color: theme.textSecondary }]}>
                CDTs {(avgCdtRateNet * 100).toFixed(1)}% · ETFs 5%
              </ThemedText>
            </View>
            <View style={[styles.modalTableRow, { borderBottomWidth: 0 }]}>
              <ThemedText style={[styles.modalTableLabel, { color: theme.text }]}>
                Optimista
              </ThemedText>
              <ThemedText style={[styles.modalTableValue, { color: theme.textSecondary }]}>
                CDTs {(avgCdtRateNet * 100).toFixed(1)}% · ETFs 11%
              </ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary, marginTop: Spacing.two }]}>
            Tu portafolio real estará probablemente dentro de este rango, pero puede salirse en años de alta volatilidad.
          </ThemedText>
        </View>

        <View style={styles.modalSectionCompact}>
          <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
            Supuestos
          </ThemedText>
          <View style={[styles.modalTable, { borderColor: theme.divider }]}>
            <View style={[styles.modalTableRow, { borderBottomColor: theme.divider }]}>
              <ThemedText style={[styles.modalTableLabel, { color: theme.text }]}>
                CDTs
              </ThemedText>
              <ThemedText style={[styles.modalTableValue, { color: theme.textSecondary }]}>
                Tasa neta promedio (retefuente 4%)
              </ThemedText>
            </View>
            <View style={[styles.modalTableRow, { borderBottomColor: theme.divider }]}>
              <ThemedText style={[styles.modalTableLabel, { color: theme.text }]}>
                ETFs
              </ThemedText>
              <ThemedText style={[styles.modalTableValue, { color: theme.textSecondary }]}>
                5-11% CAGR (rango histórico)
              </ThemedText>
            </View>
            <View style={[styles.modalTableRow, { borderBottomWidth: 0 }]}>
              <ThemedText style={[styles.modalTableLabel, { color: theme.text }]}>
                Aportes
              </ThemedText>
              <ThemedText style={[styles.modalTableValue, { color: theme.textSecondary }]}>
                Sin aportes adicionales
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={[styles.modalDisclaimer, {
          backgroundColor: theme.background,
          borderLeftColor: theme.attention,
        }]}>
          <ThemedText style={[styles.modalDisclaimerText, { color: theme.textSecondary }]}>
            Esta proyección es educativa. No es una garantía ni una promesa de rendimiento futuro.
          </ThemedText>
        </View>
      </InfoModal>

      {/* Modales educativos: Contexto Actual */}
      <InfoModal
        visible={contextModal === 'banrep'}
        onClose={() => setContextModal(null)}
        title="Tasa Banrep"
      >
        <View style={styles.modalSection}>
          <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
            ¿Qué es?
          </ThemedText>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
            Es la <ThemedText style={{ fontWeight: '600' }}>tasa de política monetaria</ThemedText> del Banco de la República (banco central de Colombia). Es la tasa a la que el Banrep presta dinero a los bancos comerciales.
          </ThemedText>
        </View>

        <View style={styles.modalSection}>
          <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
            ¿Para qué sirve?
          </ThemedText>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
            Es el <ThemedText style={{ fontWeight: '600' }}>piso de rentabilidad</ThemedText> de la economía colombiana. Las tasas de CDT y otros productos de renta fija se calculan a partir de esta tasa base.
          </ThemedText>
        </View>

        <View style={styles.modalSection}>
          <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
            ¿Cómo me afecta?
          </ThemedText>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
            Cuando la tasa sube:
          </ThemedText>
          <View style={styles.modalList}>
            <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
              • Los CDT pagan más intereses
            </ThemedText>
            <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
              • Los créditos se vuelven más caros
            </ThemedText>
            <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
              • La inflación tiende a bajar
            </ThemedText>
          </View>
        </View>
      </InfoModal>

      <InfoModal
        visible={contextModal === 'cdt'}
        onClose={() => setContextModal(null)}
        title="CDT Mercado"
      >
        <View style={styles.modalSection}>
          <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
            ¿Qué es?
          </ThemedText>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
            Es el <ThemedText style={{ fontWeight: '600' }}>promedio ponderado</ThemedText> de las tasas que ofrecen todos los bancos colombianos para CDTs a <ThemedText style={{ fontWeight: '600' }}>360 días</ThemedText>.
          </ThemedText>
        </View>

        <View style={styles.modalSection}>
          <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
            ¿Para qué sirve?
          </ThemedText>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
            Es una <ThemedText style={{ fontWeight: '600' }}>referencia de mercado</ThemedText> para saber si la tasa que te ofrece tu banco es competitiva o no.
          </ThemedText>
        </View>

        <View style={styles.modalSection}>
          <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
            ¿De dónde viene este dato?
          </ThemedText>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
            Calculado con datos oficiales del Banco de la República, publicados en datos.gov.co. Se actualiza diariamente con información del día anterior.
          </ThemedText>
        </View>
      </InfoModal>

      <InfoModal
        visible={contextModal === 'inflation'}
        onClose={() => setContextModal(null)}
        title="Inflación COP"
      >
        <View style={styles.modalSection}>
          <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
            ¿Qué es?
          </ThemedText>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
            Es el <ThemedText style={{ fontWeight: '600' }}>aumento anual del costo de vida</ThemedText> en Colombia, medido por el índice de precios al consumidor (IPC).
          </ThemedText>
        </View>

        <View style={styles.modalSection}>
          <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
            ¿Para qué sirve?
          </ThemedText>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
            Mide cuánto <ThemedText style={{ fontWeight: '600' }}>poder adquisitivo pierden tus pesos</ThemedText> cada año. Si tu inversión renta menos que la inflación, estás perdiendo dinero en términos reales.
          </ThemedText>
        </View>

        <View style={styles.modalSection}>
          <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
            Ejemplo práctico
          </ThemedText>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
            Si guardas $100,000 bajo el colchón y la inflación es 5.3%, al cabo de un año necesitarás $105,300 para comprar lo mismo que hoy compras con $100,000.
          </ThemedText>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary, marginTop: 8 }]}>
            Por eso tu rentabilidad <ThemedText style={{ fontWeight: '600' }}>real</ThemedText> = rentabilidad nominal - inflación.
          </ThemedText>
        </View>
      </InfoModal>

      <InfoModal
        visible={contextModal === 'trm'}
        onClose={() => setContextModal(null)}
        title="TRM (Tasa Representativa del Mercado)"
      >
        <View style={styles.modalSection}>
          <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
            ¿Qué es?
          </ThemedText>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
            Es el <ThemedText style={{ fontWeight: '600' }}>precio oficial del dólar en Colombia</ThemedText>, calculado diariamente por el Banco de la República con base en las transacciones del día anterior.
          </ThemedText>
        </View>

        <View style={styles.modalSection}>
          <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
            ¿Para qué sirve en Magic Invest?
          </ThemedText>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
            La usamos para convertir tus ETFs (cotizados en dólares) a pesos colombianos y calcular:
          </ThemedText>
          <View style={styles.modalList}>
            <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
              • Valor actual de tu portafolio
            </ThemedText>
            <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
              • Ganancia/pérdida en pesos
            </ThemedText>
            <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
              • Distribución CDT vs ETF
            </ThemedText>
          </View>
        </View>

        <View style={styles.modalSection}>
          <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
            ¿Cuándo se actualiza?
          </ThemedText>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
            Todos los días hábiles (lunes a viernes, excepto festivos) a las 12:30 AM (hora Colombia). Magic Invest sincroniza automáticamente esta información.
          </ThemedText>
        </View>
      </InfoModal>

      <InfoModal
        visible={contextModal === 'hurdle'}
        onClose={() => setContextModal(null)}
        title="Hurdle Rate"
      >
        <View style={styles.modalSection}>
          <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
            ¿Qué es?
          </ThemedText>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
            Es la <ThemedText style={{ fontWeight: '600' }}>tasa mínima que un ETF debe superar</ThemedText> para justificar el riesgo vs un CDT (sin riesgo, garantizado).
          </ThemedText>
        </View>

        <View style={styles.modalSection}>
          <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
            ¿Cómo se calcula?
          </ThemedText>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
            Ajustamos la tasa CDT con la <ThemedText style={{ fontWeight: '600' }}>Ecuación de Fisher</ThemedText>:
          </ThemedText>
          <View style={styles.modalList}>
            <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
              + Devaluación COP/USD (últimos 5 años)
            </ThemedText>
            <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
              − Diferencial de inflación (COP vs USD)
            </ThemedText>
            <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
              − Costos del ETF (TER)
            </ThemedText>
          </View>
        </View>

        <View style={styles.modalSection}>
          <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
            ¿Para qué sirve?
          </ThemedText>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
            Separa inversiones sensatas de emocionales:
          </ThemedText>
          <View style={styles.modalList}>
            <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
              • <ThemedText style={{ fontWeight: '600' }}>ETF arriba</ThemedText> → Justifica el riesgo
            </ThemedText>
            <ThemedText style={[styles.modalListItem, { color: theme.textSecondary }]}>
              • <ThemedText style={{ fontWeight: '600' }}>ETF abajo</ThemedText> → Mejor en CDTs
            </ThemedText>
          </View>
        </View>

        <View style={styles.modalSection}>
          <ThemedText style={[styles.modalSectionTitle, { color: theme.text }]}>
            ¿Es fijo?
          </ThemedText>
          <ThemedText style={[styles.modalSectionText, { color: theme.textSecondary }]}>
            No. Cambia cuando varían las tasas Banrep, la devaluación o la inflación. Te avisamos en el Buzón.
          </ThemedText>
        </View>

        <View style={[styles.modalDisclaimer, {
          backgroundColor: theme.background,
          borderLeftColor: theme.positive,
        }]}>
          <ThemedText style={[styles.modalDisclaimerText, { color: theme.textSecondary }]}>
            Este es el <ThemedText style={{ fontWeight: '600' }}>fundamento matemático</ThemedText> de Magic Invest. No es una sugerencia — es una línea objetiva calculada con datos reales.
          </ThemedText>
        </View>
      </InfoModal>
    </View>
  );
}

// ── Acordeón de activos ───────────────────────────────────────────────────

interface AssetAccordionProps {
  title: string;
  count: number;
  color: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AssetAccordion({ title, count, color, isExpanded, onToggle, children }: AssetAccordionProps) {
  const theme = useTheme();

  return (
    <View style={styles.accordionContainer}>
      <TouchableOpacity
        style={[styles.accordionHeader, { backgroundColor: theme.backgroundElement }]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.accordionHeaderLeft}>
          <ThemedText style={[styles.accordionTitle, { color }]}>
            {title}
          </ThemedText>
          <View style={[styles.accordionBadge, { backgroundColor: color + '18', borderColor: color + '40' }]}>
            <ThemedText style={[styles.accordionCount, { color }]}>
              {count}
            </ThemedText>
          </View>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.textSecondary}
        />
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.accordionContent}>
          {children}
        </View>
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

function ContextStrip({
  macroContext,
  cdtRate360,
  hurdleRate,
  networkError,
  onOpenModal
}: {
  macroContext: MacroContext | null;
  cdtRate360: number | null;
  hurdleRate: number | null;
  networkError: boolean;
  onOpenModal: (type: 'banrep' | 'cdt' | 'inflation' | 'trm' | 'hurdle') => void;
}) {
  const theme = useTheme();

  // Si hay error de red, mostrar mensaje
  if (networkError) {
    return (
      <View style={[styles.contextStrip, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.networkErrorContainer}>
          <Ionicons name="cloud-offline-outline" size={24} color={theme.textSecondary} />
          <ThemedText style={[styles.networkErrorText, { color: theme.textSecondary }]}>
            Sin conexión a internet
          </ThemedText>
          <ThemedText style={[styles.networkErrorSubtext, { color: theme.textSecondary }]}>
            No se pueden cargar datos de mercado
          </ThemedText>
        </View>
      </View>
    );
  }

  // Si no hay datos disponibles, no mostrar nada
  const hasAnyData = macroContext || cdtRate360;
  if (!hasAnyData) return null;

  return (
    <View style={[styles.contextStrip, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText style={[styles.contextTitle, { color: theme.textSecondary }]}>Contexto actual</ThemedText>
      <View style={styles.contextRow}>
        {macroContext?.policyRate && (
          <ContextItem label="Banrep" value={`${macroContext.policyRate.toFixed(2)}%`} onPress={() => onOpenModal('banrep')} />
        )}
        {cdtRate360 && (
          <ContextItem label="CDT mercado" value={`${cdtRate360.toFixed(1)}%`} onPress={() => onOpenModal('cdt')} />
        )}
        {macroContext?.inflationCOP && (
          <ContextItem label="Inflación" value={`${macroContext.inflationCOP.toFixed(2)}%`} onPress={() => onOpenModal('inflation')} />
        )}
        {macroContext?.trm && (
          <ContextItem label="TRM" value={`$${macroContext.trm.toLocaleString('es-CO')}`} onPress={() => onOpenModal('trm')} />
        )}
      </View>
      {hurdleRate !== null && (
        <View style={[styles.hurdleRow, { borderTopColor: theme.divider, marginTop: Spacing.two, paddingTop: Spacing.two }]}>
          <TouchableOpacity style={styles.hurdleButton} onPress={() => onOpenModal('hurdle')} activeOpacity={0.7}>
            <ThemedText style={[styles.hurdleLabel, { color: theme.textSecondary }]}>Hurdle Rate</ThemedText>
            <View style={styles.hurdleValueRow}>
              <ThemedText style={[styles.hurdleValue, { color: theme.positive }]}>{hurdleRate.toFixed(2)}%</ThemedText>
              <Ionicons name="information-circle-outline" size={16} color={theme.positive} />
            </View>
          </TouchableOpacity>
        </View>
      )}
      {macroContext?.date && (
        <ThemedText style={[styles.contextNote, { color: theme.textSecondary }]}>
          TRM actualizada ({fmtDate(macroContext.date)})
        </ThemedText>
      )}
    </View>
  );
}

function ContextItem({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity style={styles.contextItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name="information-circle-outline" size={14} color={theme.textSecondary} style={styles.contextInfoIcon} />
      <ThemedText style={[styles.contextValue, { color: theme.text }]}>{value}</ThemedText>
      <ThemedText style={[styles.contextLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
    </TouchableOpacity>
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

function EtfCard({
  etf,
  onPress,
  hasUnread,
  eodPrice,
  trm
}: {
  etf: EtfPosition;
  onPress: () => void;
  hasUnread: boolean;
  eodPrice?: EodPrice;
  trm: number;
}) {
  const theme     = useTheme();
  const isCop     = etf.currency === 'COP';
  const hasShares = etf.shares > 0;

  // Calcular valor invertido original
  const investedUSD = etf.total_invested_usd ?? (hasShares && etf.average_cost_usd > 0 ? etf.shares * etf.average_cost_usd : 0);

  // Calcular valor actual con precio EOD
  const currentUSD = eodPrice && hasShares ? etf.shares * eodPrice.adjustedClose : investedUSD;

  // Calcular rentabilidad
  const gainUSD = currentUSD - investedUSD;
  const gainPct = investedUSD > 0 ? (gainUSD / investedUSD) * 100 : 0;

  const totalDisplay =
    isCop && etf.total_invested_cop != null
      ? formatCurrency(etf.total_invested_cop, 'COP')
      : `USD ${currentUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const sharesDisplay = hasShares
    ? `${etf.shares % 1 === 0 ? etf.shares.toFixed(0) : etf.shares.toFixed(4)} acc`
    : 'sin acciones';

  const costDisplay = etf.average_cost_usd > 0
    ? `USD ${etf.average_cost_usd.toFixed(2)} avg`
    : null;

  const gainDisplay = eodPrice && Math.abs(gainUSD) > 0.01
    ? `${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(1)}%`
    : null;

  // Calcular proyecciones simples (CAGR histórico ETFs: bajo 5%, alto 11%)
  const cagr = 0.08; // 8% promedio
  const invested = investedUSD * trm;
  const current = currentUSD * trm;
  const proj2y = current * Math.pow(1 + cagr, 2);
  const proj5y = current * Math.pow(1 + cagr, 5);
  const proj10y = current * Math.pow(1 + cagr, 10);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {hasUnread && <View style={[styles.cardInboxDot, { backgroundColor: theme.attention }]} />}

      {/* Header: Ticker + Nombre */}
      <ThemedText style={[styles.cardTitle, { color: theme.text, marginBottom: 10 }]}>
        {etf.ticker} · {etf.name}
      </ThemedText>

      {/* Fila 1: Invertido | Actual | Ganancia */}
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <ThemedText style={[styles.cardLabel, { color: theme.textSecondary }]}>Invertido</ThemedText>
          <ThemedText style={[styles.cardValue, { color: theme.text }]}>
            $ {abbreviateValue(invested, 'COP')}
          </ThemedText>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <ThemedText style={[styles.cardLabel, { color: theme.textSecondary }]}>Actual</ThemedText>
          <ThemedText style={[styles.cardValue, { color: theme.text, fontWeight: '600' }]}>
            $ {abbreviateValue(current, 'COP')}
          </ThemedText>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <ThemedText style={[styles.cardLabel, { color: theme.textSecondary }]}>Ganancia</ThemedText>
          <Text style={{
            fontSize: 15,
            fontWeight: '600',
            color: gainPct >= 0 ? theme.positive : theme.attention
          }}>
            {gainDisplay || '—'}
          </Text>
        </View>
      </View>

      {/* Fila 2: en 2 años | en 5 años | en 10 años */}
      <View style={[styles.cardRow, { marginTop: 8 }]}>
        <View style={{ flex: 1 }}>
          <ThemedText style={[styles.cardLabelSmall, { color: theme.textSecondary }]}>en 2 años</ThemedText>
          <ThemedText style={[styles.cardValueSmall, { color: theme.text }]}>
            $ {abbreviateValue(proj2y, 'COP')}
          </ThemedText>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <ThemedText style={[styles.cardLabelSmall, { color: theme.textSecondary }]}>en 5 años</ThemedText>
          <ThemedText style={[styles.cardValueSmall, { color: theme.text }]}>
            $ {abbreviateValue(proj5y, 'COP')}
          </ThemedText>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <ThemedText style={[styles.cardLabelSmall, { color: theme.textSecondary }]}>en 10 años</ThemedText>
          <ThemedText style={[styles.cardValueSmall, { color: theme.text }]}>
            $ {abbreviateValue(proj10y, 'COP')}
          </ThemedText>
        </View>
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
    gap: Spacing.one,
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
  metricLeft:    { flex: 0.33, gap: Spacing.one },
  metricRight:   { flex: 0.67, paddingLeft: Spacing.three, gap: Spacing.one },
  metricDivider: { width: 1, marginVertical: 2 },
  metricLabel:   { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  metricTotal:   { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, lineHeight: 28 },
  metricRange:   { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, lineHeight: 26 },
  projectionLines: { gap: Spacing.one },
  projectionRow:   { flexDirection: 'row', alignItems: 'baseline' },
  projectionYear:  { fontSize: 12, fontWeight: '500', letterSpacing: -0.1, minWidth: 70 },
  projectionSeparator: { fontSize: 12 },
  projectionValue: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
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
  contextItem:  { alignItems: 'center', gap: 2, minHeight: 50, position: 'relative', paddingTop: 16, paddingHorizontal: 4 },
  contextValue: { fontSize: 14, fontWeight: '600' },
  contextLabel: { fontSize: 10, textAlign: 'center' },
  contextInfoIcon: { position: 'absolute', top: 0, right: -2, opacity: 0.5 },
  contextNote:  { fontSize: 10, fontStyle: 'italic' },
  hurdleRow: {
    borderTopWidth: 1,
  },
  hurdleButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  hurdleLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hurdleValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  hurdleValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  networkErrorContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
  networkErrorText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: Spacing.one,
  },
  networkErrorSubtext: {
    fontSize: 11,
  },
  accordionContainer: {
    marginBottom: Spacing.one,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two + Spacing.one,
    borderRadius: Spacing.two,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  accordionBadge: {
    paddingHorizontal: Spacing.one + 4,
    paddingVertical: 2,
    borderRadius: Spacing.one,
    borderWidth: 1,
  },
  accordionCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  accordionContent: {
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
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
  cardLabel:   { fontSize: 13, marginBottom: 2 },
  cardValue:   { fontSize: 15, fontWeight: '500' },
  cardLabelSmall: { fontSize: 12, marginBottom: 2 },
  cardValueSmall: { fontSize: 14 },
  cardDivider: { height: 1 },

  // Modal styles
  modalSection: {
    marginBottom: Spacing.four,
  },
  modalSectionCompact: {
    marginBottom: Spacing.three,
  },
  modalBadge: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  modalBadgeLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalBadgeBands: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 21,
    marginBottom: Spacing.two,
  },
  modalSectionText: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  modalList: {
    gap: Spacing.one + Spacing.half,
    marginTop: Spacing.two,
  },
  modalListCompact: {
    gap: Spacing.one,
    marginTop: Spacing.one + Spacing.half,
  },
  modalListItem: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  modalTable: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  modalTableRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two + Spacing.half,
    borderBottomWidth: 1,
  },
  modalTableLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    width: 90,
    flexShrink: 0,
  },
  modalTableValue: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.1,
    flex: 1,
  },
  projectionModalLines: {
    gap: Spacing.two,
  },
  projectionModalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  projectionModalYear: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  projectionModalValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'right',
  },
  modalDisclaimer: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderLeftWidth: 4,
  },
  modalDisclaimerText: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
