import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getEtfById, deleteEtf } from '@/services/supabase-queries';
import type { EtfPosition } from '@/db/schema';
import { INBOX_EVENTS } from '@/constants/inbox-mock';
import { inboxState } from '@/utils/inbox-state';

const MONTHS_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${MONTHS_ES[parseInt(m) - 1]} ${y}`;
}

function fmtUsd(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtCop(n: number): string {
  return '$ ' + Math.round(n).toLocaleString('es-CO') + ' COP';
}

export default function EtfDetailScreen() {
  const { id }    = useLocalSearchParams<{ id: string }>();
  const router    = useRouter();
  const theme     = useTheme();
  const [etf, setEtf]           = useState<EtfPosition | null | undefined>(undefined);
  const [deleting, setDeleting] = useState(false);

  function confirmDelete() {
    Alert.alert(
      'Eliminar inversión',
      `¿Seguro que quieres eliminar ${etf?.ticker} de tu portafolio? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteEtf(Number(id));
              router.navigate('/portfolio');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  useEffect(() => {
    getEtfById(Number(id)).then(setEtf);
  }, [id]);

  if (etf === undefined) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator color={theme.textSecondary} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!etf) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={styles.centered}>
          <ThemedText themeColor="textSecondary">ETF no encontrado.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const isCop         = etf.currency === 'COP';
  const hasShares     = etf.shares > 0;
  const hasCostPerShare = etf.average_cost_usd > 0;

  const totalUsd =
    etf.total_invested_usd != null
      ? etf.total_invested_usd
      : hasShares && hasCostPerShare
      ? etf.shares * etf.average_cost_usd
      : null;

  const badgeColor = isCop ? theme.positive : theme.assetEtf;

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="arrow-back-outline" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
            <View style={[styles.headerIcon, { backgroundColor: theme.positiveSubtle }]}>
              <Ionicons name="analytics-outline" size={20} color={theme.assetEtf} />
            </View>
          </View>

          <ThemedText style={[styles.tickerText, { color: theme.assetEtf }]}>{etf.ticker}</ThemedText>
          <ThemedText style={[styles.fundName, { color: theme.textSecondary }]}>{etf.name}</ThemedText>

          {/* Currency badge */}
          <View style={[styles.badge, { backgroundColor: `${badgeColor}18` }]}>
            <View style={[styles.badgeDot, { backgroundColor: badgeColor }]} />
            <ThemedText style={[styles.badgeText, { color: badgeColor }]}>
              {isCop ? 'Inversión en COP' : 'Inversión en USD'}
            </ThemedText>
          </View>

          <RelatedMessages ticker={etf.ticker} onPress={(evtId) => router.push(`/inbox/${evtId}` as never)} />

          {/* Investment card */}
          <View style={[styles.principalCard, { backgroundColor: theme.backgroundElement }]}>
            {isCop && etf.total_invested_cop != null ? (
              <>
                <ThemedText style={[styles.principalLabel, { color: theme.textSecondary }]}>
                  Total invertido
                </ThemedText>
                <ThemedText style={[styles.principalAmount, { color: theme.text }]}>
                  {fmtCop(etf.total_invested_cop)}
                </ThemedText>
                {etf.trm_at_purchase != null && (
                  <ThemedText style={[styles.principalSub, { color: theme.textSecondary }]}>
                    TRM al registrar: {etf.trm_at_purchase.toLocaleString('es-CO')}
                  </ThemedText>
                )}
                {totalUsd != null && (
                  <ThemedText style={[styles.principalSub, { color: theme.textSecondary }]}>
                    ≈ USD {fmtUsd(totalUsd)}
                  </ThemedText>
                )}
              </>
            ) : totalUsd != null ? (
              <>
                <ThemedText style={[styles.principalLabel, { color: theme.textSecondary }]}>
                  Total invertido
                </ThemedText>
                <ThemedText style={[styles.principalAmount, { color: theme.text }]}>
                  USD {fmtUsd(totalUsd)}
                </ThemedText>
              </>
            ) : (
              <>
                <ThemedText style={[styles.principalLabel, { color: theme.textSecondary }]}>
                  Total invertido
                </ThemedText>
                <ThemedText style={[styles.principalAmountMuted, { color: theme.textSecondary }]}>
                  No registrado
                </ThemedText>
              </>
            )}
          </View>

          {/* Position section */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>Posición</ThemedText>
            <View style={[styles.detailCard, { backgroundColor: theme.backgroundElement }]}>
              <DetailRow
                label="Fracciones (acciones)"
                value={
                  hasShares
                    ? (etf.shares % 1 === 0 ? etf.shares.toFixed(0) : etf.shares.toFixed(4))
                    : 'No registradas'
                }
                valueMuted={!hasShares}
              />
              <Divider />
              <DetailRow
                label="Precio promedio"
                value={
                  hasCostPerShare
                    ? `USD ${fmtUsd(etf.average_cost_usd)} / acc`
                    : '—'
                }
                valueMuted={!hasCostPerShare}
              />
            </View>
          </View>

          {/* Costs section */}
          {etf.ter > 0 && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                Costo operativo
              </ThemedText>
              <View style={[styles.detailCard, { backgroundColor: theme.backgroundElement }]}>
                <DetailRow
                  label="TER (gasto anual del fondo)"
                  value={`${(etf.ter * 100).toFixed(2)}%`}
                />
                <Divider />
                <DetailRow
                  label="Este % se descuenta del fondo"
                  value="automáticamente"
                  valueMuted
                />
              </View>
            </View>
          )}

          {/* Registration */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>Registro</ThemedText>
            <View style={[styles.detailCard, { backgroundColor: theme.backgroundElement }]}>
              <DetailRow
                label="Registrado el"
                value={fmtDate(etf.created_at.slice(0, 10))}
              />
            </View>
          </View>

          {/* Future data note */}
          <View style={[styles.futureCard, { backgroundColor: theme.attentionSubtle, borderColor: theme.attentionBorder }]}>
            <Ionicons name="time-outline" size={16} color={theme.attention} />
            <ThemedText style={[styles.futureText, { color: theme.textSecondary }]}>
              Próximamente conectaremos precios de mercado en tiempo real para mostrarte el valor actual y tu rentabilidad neta.
            </ThemedText>
          </View>

          {/* Eliminar */}
          <TouchableOpacity
            style={[
              styles.deleteButton,
              { borderColor: theme.riskBorder, backgroundColor: theme.riskSubtle },
              deleting && styles.deleteButtonDisabled,
            ]}
            onPress={confirmDelete}
            disabled={deleting}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color={theme.risk} />
            <ThemedText style={[styles.deleteText, { color: theme.risk }]}>
              {deleting ? 'Eliminando…' : 'Eliminar inversión'}
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function RelatedMessages({ ticker, onPress }: { ticker: string; onPress: (id: string) => void }) {
  const theme = useTheme();
  const events = INBOX_EVENTS.filter(
    (e) => !inboxState.isDeleted(e.id) && e.relatedAsset === ticker,
  );
  if (events.length === 0) return null;

  return (
    <View style={[styles.msgBox, { backgroundColor: theme.assetEtf + '10', borderColor: theme.assetEtf + '35' }]}>
      <View style={styles.msgMailIcon}>
        <Ionicons name="mail-outline" size={15} color={theme.assetEtf} />
      </View>
      <View style={styles.msgList}>
        {events.map((evt, i) => (
          <View key={evt.id}>
            {i > 0 && <View style={[styles.msgDivider, { backgroundColor: theme.assetEtf + '35' }]} />}
            <TouchableOpacity
              style={styles.msgRow}
              onPress={() => onPress(evt.id)}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.msgTitle, { color: theme.text }]} numberOfLines={2}>
                {evt.title}
              </ThemedText>
              <Ionicons name="chevron-forward" size={13} color={theme.assetEtf} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

function DetailRow({
  label,
  value,
  valueMuted,
}: {
  label: string;
  value: string;
  valueMuted?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.detailRow}>
      <ThemedText style={[styles.detailLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
      <ThemedText style={[
        styles.detailValue,
        { color: valueMuted ? theme.textSecondary : theme.text },
        valueMuted && { fontWeight: '400' },
      ]}>
        {value}
      </ThemedText>
    </View>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.divider }]} />;
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
    marginBottom: Spacing.three,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickerText: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.one,
  },
  fundName: {
    fontSize: 15,
    marginBottom: Spacing.two,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 100,
    marginBottom: Spacing.four,
  },
  badgeDot:  { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 13, fontWeight: '500' },
  principalCard: {
    borderRadius: Spacing.two,
    padding: Spacing.four,
    alignItems: 'center',
    marginBottom: Spacing.four,
    gap: Spacing.one,
  },
  principalLabel:  { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  principalAmount: { fontSize: 28, fontWeight: '700' },
  principalAmountMuted: { fontSize: 20, fontWeight: '500' },
  principalSub: { fontSize: 13 },
  section:      { marginBottom: Spacing.four },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
  },
  detailCard: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: '500' },
  divider:     { height: 1 },
  futureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  futureText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  deleteButtonDisabled: { opacity: 0.5 },
  deleteText: { fontSize: 15, fontWeight: '500' },
  msgBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  msgMailIcon: { marginTop: 2, flexShrink: 0 },
  msgList:     { flex: 1 },
  msgDivider:  { height: 1, marginVertical: Spacing.one },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  msgTitle: { flex: 1, fontSize: 13, lineHeight: 18 },
});
