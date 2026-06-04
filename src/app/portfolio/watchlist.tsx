import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PageHeader } from '@/components/page-header';
import { AddEtfToWatchlistModal } from '@/components/add-etf-to-watchlist-modal';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  getWatchlistEtfs,
  removeEtfFromWatchlist,
  type WatchlistEtf,
} from '@/services/supabase-queries';
import { getLatestEodPrices } from '@/services/supabase-queries';
import { getMacroContext, getCdtMarketRates, getTrmHistory } from '@/services/supabase-queries';
import { calculateDevaluation, calculatePortfolioHurdleRate } from '@/lib/hurdle-rate';

interface WatchlistEtfEnriched extends WatchlistEtf {
  priceUSD: number | null
  priceCOP: number | null
  exceedsHurdleRate: boolean | null
  loading: boolean
}

export default function WatchlistScreen() {
  const theme = useTheme();
  const [etfs, setEtfs] = useState<WatchlistEtfEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [hurdleRate, setHurdleRate] = useState<number | null>(null);
  const [trm, setTrm] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadWatchlist = useCallback(async () => {
    try {
      // 1. Cargar watchlist del usuario
      const watchlist = await getWatchlistEtfs();

      if (watchlist.length === 0) {
        setEtfs([]);
        setLoading(false);
        return;
      }

      // 2. Cargar Hurdle Rate del usuario
      try {
        const [macro, cdtRate, trmHistory] = await Promise.all([
          getMacroContext(),
          getCdtMarketRates(360).then(rates => rates[0]?.rate ?? null),
          getTrmHistory(5),
        ]);

        setTrm(macro.trm);

        if (cdtRate && trmHistory.length > 0) {
          const devaluationRate = calculateDevaluation(trmHistory, 5);
          const { hurdleRate: calculatedHurdleRate } = calculatePortfolioHurdleRate({
            cdtRate: cdtRate / 100,
            devaluationRate,
          });
          setHurdleRate(calculatedHurdleRate * 100);
        }
      } catch (error) {
        console.error('Error calculating hurdle rate:', error);
      }

      // 3. Cargar precios EOD de los ETFs
      const tickers = watchlist.map(e => e.ticker);
      const prices = await getLatestEodPrices(tickers);

      // 4. Enriquecer datos
      const enriched: WatchlistEtfEnriched[] = watchlist.map(etf => {
        const eodData = prices.get(etf.ticker) ?? null;
        const priceUSD = eodData ? eodData.close : null;
        const priceCOP = priceUSD && trm ? priceUSD * trm : null;

        return {
          ...etf,
          priceUSD,
          priceCOP,
          exceedsHurdleRate: null, // Se calcula después con retorno histórico
          loading: false,
        };
      });

      setEtfs(enriched);
    } catch (error) {
      console.error('Error loading watchlist:', error);
      Alert.alert('Error', 'No se pudo cargar la watchlist');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWatchlist();
    }, [loadWatchlist])
  );

  async function handleRemove(ticker: string) {
    Alert.alert(
      'Eliminar de Watchlist',
      `¿Eliminar ${ticker} de tu lista de seguimiento?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeEtfFromWatchlist(ticker);
              await loadWatchlist();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el ETF');
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <PageHeader title="Watchlist" subtitle="Cargando ETFs..." />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.positive} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <PageHeader
          title="Watchlist"
          subtitle={
            etfs.length > 0
              ? `${etfs.length} ETF${etfs.length > 1 ? 's' : ''} en seguimiento`
              : 'Lista vacía'
          }
        />

        {etfs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="eye-outline" size={64} color={theme.textSecondary} />
            <ThemedText type="subtitle" themeColor="textSecondary" style={styles.emptyText}>
              No hay ETFs en tu watchlist
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyHint}>
              Agrega ETFs para compararlos contra tu Hurdle Rate
            </ThemedText>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.positive }]}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <ThemedText style={styles.addButtonText}>Agregar ETF</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={etfs}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <EtfCard
                etf={item}
                hurdleRate={hurdleRate}
                onRemove={() => handleRemove(item.ticker)}
              />
            )}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.three }} />}
          />
        )}

        {/* Botón flotante agregar (cuando hay ETFs) */}
        {etfs.length > 0 && (
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: theme.positive }]}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Modal agregar ETF */}
        <AddEtfToWatchlistModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdded={loadWatchlist}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

interface EtfCardProps {
  etf: WatchlistEtfEnriched;
  hurdleRate: number | null;
  onRemove: () => void;
}

function EtfCard({ etf, hurdleRate, onRemove }: EtfCardProps) {
  const theme = useTheme();

  // Indicador visual simple por ahora (sin calcular retorno histórico)
  const hasPrice = etf.priceUSD !== null;
  const indicatorColor = theme.textSecondary;
  const indicatorBg = theme.backgroundElement;

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <ThemedText type="defaultBold" style={styles.ticker}>
            {etf.ticker}
          </ThemedText>
          {hurdleRate && (
            <View style={[styles.badge, { backgroundColor: indicatorBg }]}>
              <Ionicons name="speedometer-outline" size={12} color={indicatorColor} />
              <ThemedText style={[styles.badgeText, { color: indicatorColor }]}>
                vs HR
              </ThemedText>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <Ionicons name="close-circle-outline" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Precios */}
      {hasPrice && etf.priceUSD !== null ? (
        <View style={styles.cardPrices}>
          <View style={styles.priceRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Precio EOD:
            </ThemedText>
            <ThemedText type="default" style={styles.priceValue}>
              USD {etf.priceUSD.toFixed(2)}
            </ThemedText>
          </View>
          {etf.priceCOP && (
            <View style={styles.priceRow}>
              <ThemedText type="small" themeColor="textSecondary">
                En COP:
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                $ {etf.priceCOP.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
              </ThemedText>
            </View>
          )}
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary" style={styles.noPrice}>
          Sin precio disponible
        </ThemedText>
      )}

      {/* Hurdle Rate reference */}
      {hurdleRate && (
        <View style={[styles.hurdleBox, { backgroundColor: theme.background }]}>
          <ThemedText type="small" themeColor="textSecondary">
            Tu Hurdle Rate: {hurdleRate.toFixed(2)}% EA
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four * 2,
    gap: Spacing.two,
  },
  emptyText: {
    marginTop: Spacing.three,
    textAlign: 'center',
  },
  emptyHint: {
    textAlign: 'center',
    maxWidth: 280,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    marginTop: Spacing.four,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  list: { flex: 1 },
  listContent: {
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  card: {
    borderRadius: Spacing.two,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  ticker: {
    fontSize: 18,
    letterSpacing: 0.5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  cardPrices: {
    gap: Spacing.one,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceValue: {
    fontWeight: '600',
  },
  noPrice: {
    fontStyle: 'italic',
  },
  hurdleBox: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 6,
    marginTop: Spacing.one,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: BottomTabInset + Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
