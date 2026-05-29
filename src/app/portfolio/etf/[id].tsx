import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { Tokens, Spacing, BottomTabInset } from '@/constants/theme';
import { getEtfById, deleteEtf } from '@/db/queries/etf';
import type { EtfPosition } from '@/db/schema';
import { INBOX_EVENTS, EVENT_TYPE_CONFIG } from '@/constants/inbox-mock';
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
  const db        = useSQLiteContext();
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
              await deleteEtf(db, Number(id));
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
    getEtfById(db, Number(id)).then(setEtf);
  }, [db, id]);

  if (etf === undefined) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator color={Tokens.neutral.muted} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!etf) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={styles.centered}>
          <Text style={styles.errorText}>ETF no encontrado.</Text>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const isCop         = etf.currency === 'COP';
  const hasShares     = etf.shares > 0;
  const hasCostPerShare = etf.average_cost_usd > 0;

  // Best estimate of total USD equivalent
  const totalUsd =
    etf.total_invested_usd != null
      ? etf.total_invested_usd
      : hasShares && hasCostPerShare
      ? etf.shares * etf.average_cost_usd
      : null;

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
              <Ionicons name="arrow-back-outline" size={24} color={Tokens.neutral.muted} />
            </TouchableOpacity>
            <View style={styles.headerIcon}>
              <Ionicons name="analytics-outline" size={20} color={Tokens.structural.attention} />
            </View>
          </View>

          <Text style={styles.tickerText}>{etf.ticker}</Text>
          <Text style={styles.fundName}>{etf.name}</Text>

          {/* Currency badge */}
          <View style={[styles.badge, isCop ? styles.badgeCop : styles.badgeUsd]}>
            <View style={[styles.badgeDot, isCop ? styles.dotCop : styles.dotUsd]} />
            <Text style={[styles.badgeText, isCop ? styles.textCop : styles.textUsd]}>
              {isCop ? 'Inversión en COP' : 'Inversión en USD'}
            </Text>
          </View>

          {/* Investment card */}
          <View style={styles.principalCard}>
            {isCop && etf.total_invested_cop != null ? (
              <>
                <Text style={styles.principalLabel}>Total invertido</Text>
                <Text style={styles.principalAmount}>{fmtCop(etf.total_invested_cop)}</Text>
                {etf.trm_at_purchase != null && (
                  <Text style={styles.principalSub}>
                    TRM al registrar: {etf.trm_at_purchase.toLocaleString('es-CO')}
                  </Text>
                )}
                {totalUsd != null && (
                  <Text style={styles.principalSub}>
                    ≈ USD {fmtUsd(totalUsd)}
                  </Text>
                )}
              </>
            ) : totalUsd != null ? (
              <>
                <Text style={styles.principalLabel}>Total invertido</Text>
                <Text style={styles.principalAmount}>USD {fmtUsd(totalUsd)}</Text>
              </>
            ) : (
              <>
                <Text style={styles.principalLabel}>Total invertido</Text>
                <Text style={styles.principalAmountMuted}>No registrado</Text>
              </>
            )}
          </View>

          {/* Position section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Posición</Text>
            <View style={styles.detailCard}>
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
              <Text style={styles.sectionTitle}>Costo operativo</Text>
              <View style={styles.detailCard}>
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
            <Text style={styles.sectionTitle}>Registro</Text>
            <View style={styles.detailCard}>
              <DetailRow
                label="Registrado el"
                value={fmtDate(etf.created_at.slice(0, 10))}
              />
            </View>
          </View>

          {/* Future data note */}
          <View style={styles.futureCard}>
            <Ionicons name="time-outline" size={16} color={Tokens.structural.attention} />
            <Text style={styles.futureText}>
              Próximamente conectaremos precios de mercado en tiempo real para mostrarte el valor actual y tu rentabilidad neta.
            </Text>
          </View>

          {/* Eventos relacionados */}
          <RelatedEvents ticker={etf.ticker} onPress={(evtId) => router.push(`/inbox/${evtId}` as never)} />

          {/* Eliminar */}
          <TouchableOpacity
            style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
            onPress={confirmDelete}
            disabled={deleting}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color={Tokens.structural.risk} />
            <Text style={styles.deleteText}>
              {deleting ? 'Eliminando…' : 'Eliminar inversión'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function RelatedEvents({ ticker, onPress }: { ticker: string; onPress: (id: string) => void }) {
  const events = INBOX_EVENTS.filter(
    (e) => !inboxState.isDeleted(e.id) && e.relatedAsset === ticker,
  );
  if (events.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Eventos relacionados</Text>
      <View style={styles.detailCard}>
        {events.map((evt, i) => {
          const cfg = EVENT_TYPE_CONFIG[evt.type];
          return (
            <View key={evt.id}>
              {i > 0 && <Divider />}
              <TouchableOpacity
                style={styles.eventRow}
                onPress={() => onPress(evt.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.eventIconBg, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={14} color={cfg.color} />
                </View>
                <View style={styles.eventContent}>
                  <Text style={styles.eventType}>{cfg.label}</Text>
                  <Text style={styles.eventTitle} numberOfLines={2}>{evt.title}</Text>
                </View>
                <Text style={styles.eventDate}>{evt.date}</Text>
                <Ionicons name="chevron-forward" size={14} color={Tokens.neutral.muted} />
              </TouchableOpacity>
            </View>
          );
        })}
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
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueMuted && styles.detailValueMuted]}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
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
  errorText: { fontSize: 15, color: Tokens.neutral.muted },

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
    backgroundColor: `${Tokens.structural.attention}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tickerText: {
    fontSize: 32,
    fontWeight: '700',
    color: Tokens.neutral.text,
    letterSpacing: 1,
    marginBottom: Spacing.one,
  },
  fundName: {
    fontSize: 15,
    color: Tokens.neutral.muted,
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
  badgeCop:  { backgroundColor: `${Tokens.structural.positive}18` },
  badgeUsd:  { backgroundColor: `${Tokens.structural.attention}18` },
  badgeDot:  { width: 6, height: 6, borderRadius: 3 },
  dotCop:    { backgroundColor: Tokens.structural.positive },
  dotUsd:    { backgroundColor: Tokens.structural.attention },
  badgeText: { fontSize: 13, fontWeight: '500' },
  textCop:   { color: Tokens.structural.positive },
  textUsd:   { color: Tokens.structural.attention },

  principalCard: {
    backgroundColor: '#F0F0EC',
    borderRadius: Spacing.two,
    padding: Spacing.four,
    alignItems: 'center',
    marginBottom: Spacing.four,
    gap: Spacing.one,
  },
  principalLabel:  {
    fontSize: 12,
    color: Tokens.neutral.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  principalAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: Tokens.neutral.text,
  },
  principalAmountMuted: {
    fontSize: 20,
    fontWeight: '500',
    color: Tokens.neutral.muted,
  },
  principalSub: {
    fontSize: 13,
    color: Tokens.neutral.muted,
  },

  section:      { marginBottom: Spacing.four },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Tokens.neutral.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
  },

  detailCard: {
    backgroundColor: '#F0F0EC',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  detailLabel:      { fontSize: 14, color: Tokens.neutral.muted },
  detailValue:      { fontSize: 14, fontWeight: '500', color: Tokens.neutral.text },
  detailValueMuted: { color: Tokens.neutral.muted, fontWeight: '400' },
  divider:          { height: 1, backgroundColor: '#E0E0DC' },

  futureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    backgroundColor: `${Tokens.structural.attention}10`,
    borderWidth: 1,
    borderColor: `${Tokens.structural.attention}30`,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  futureText: {
    flex: 1,
    fontSize: 13,
    color: Tokens.neutral.muted,
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
    borderColor: `${Tokens.structural.risk}40`,
    backgroundColor: `${Tokens.structural.risk}08`,
    marginBottom: Spacing.four,
  },
  deleteButtonDisabled: { opacity: 0.5 },
  deleteText: {
    fontSize: 15,
    fontWeight: '500',
    color: Tokens.structural.risk,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  eventIconBg: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  eventContent: { flex: 1 },
  eventType: {
    fontSize: 10,
    fontWeight: '600',
    color: Tokens.neutral.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 13,
    color: Tokens.neutral.text,
    lineHeight: 17,
  },
  eventDate: {
    fontSize: 11,
    color: Tokens.neutral.muted,
    flexShrink: 0,
  },
});
