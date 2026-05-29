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
import { formatCurrency } from '@/utils/format';
import { getCdtById, deleteCdt } from '@/db/queries/cdt';
import type { CdtCapitalization, CdtPosition } from '@/db/schema';
import { INBOX_EVENTS, EVENT_TYPE_CONFIG } from '@/constants/inbox-mock';
import { inboxState } from '@/utils/inbox-state';

const MONTHS_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

const CAP_LABELS: Record<CdtCapitalization, string> = {
  maturity:  'Al vencimiento',
  monthly:   'Mensual',
  quarterly: 'Trimestral',
};

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

function cdtYields(cdt: CdtPosition) {
  const gross = cdt.amount * (Math.pow(1 + cdt.rate, cdt.term_days / 365) - 1);
  const tax   = gross * cdt.withholding_rate;
  return { gross, tax, net: gross - tax };
}

export default function CdtDetailScreen() {
  const { id }    = useLocalSearchParams<{ id: string }>();
  const router    = useRouter();
  const db        = useSQLiteContext();
  const [cdt, setCdt]       = useState<CdtPosition | null | undefined>(undefined);
  const [deleting, setDeleting] = useState(false);

  function confirmDelete() {
    Alert.alert(
      'Eliminar inversión',
      `¿Seguro que quieres eliminar el CDT de ${cdt?.bank}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteCdt(db, Number(id));
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
    getCdtById(db, Number(id)).then(setCdt);
  }, [db, id]);

  if (cdt === undefined) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator color={Tokens.neutral.muted} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!cdt) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={styles.centered}>
          <Text style={styles.errorText}>CDT no encontrado.</Text>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const { gross, tax, net } = cdtYields(cdt);
  const totalAtMaturity     = cdt.amount + net;
  const days                = daysUntil(cdt.end_date);
  const expired             = days < 0;

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
            <View style={[styles.headerIcon, expired && styles.headerIconExpired]}>
              <Ionicons
                name="time-outline"
                size={20}
                color={expired ? Tokens.neutral.muted : Tokens.structural.positive}
              />
            </View>
          </View>

          <Text style={styles.bankName}>{cdt.bank}</Text>

          {/* Status badge */}
          <View style={[styles.statusBadge, expired ? styles.badgeExpired : styles.badgeActive]}>
            <View style={[styles.statusDot, expired ? styles.dotExpired : styles.dotActive]} />
            <Text style={[styles.statusText, expired ? styles.statusTextExpired : styles.statusTextActive]}>
              {expired ? 'Vencido' : `Vence en ${days} días`}
            </Text>
          </View>

          {/* Principal */}
          <View style={styles.principalCard}>
            <Text style={styles.principalLabel}>Capital invertido</Text>
            <Text style={styles.principalAmount}>{formatCurrency(cdt.amount, 'COP')}</Text>
            <Text style={styles.principalRate}>{(cdt.rate * 100).toFixed(2)}% EA</Text>
          </View>

          {/* Fechas y plazo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalles del plazo</Text>
            <View style={styles.detailCard}>
              <DetailRow label="Fecha de inicio"   value={fmtDate(cdt.start_date)} />
              <Divider />
              <DetailRow label="Fecha de vencimiento" value={fmtDate(cdt.end_date)} />
              <Divider />
              <DetailRow label="Plazo"              value={`${cdt.term_days} días`} />
              <Divider />
              <DetailRow label="Capitalización"     value={CAP_LABELS[cdt.capitalization]} />
            </View>
          </View>

          {/* Rendimiento */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rendimiento proyectado</Text>
            <View style={styles.detailCard}>
              <DetailRow
                label="Rendimiento bruto"
                value={formatCurrency(gross, 'COP')}
              />
              <Divider />
              <DetailRow
                label={`Retefuente (${(cdt.withholding_rate * 100).toFixed(0)}%)`}
                value={`− ${formatCurrency(tax, 'COP')}`}
                valueColor={Tokens.neutral.muted}
              />
              <Divider />
              <DetailRow
                label="Rendimiento neto"
                value={formatCurrency(net, 'COP')}
                valueColor={Tokens.structural.positive}
                bold
              />
            </View>
          </View>

          {/* Valor al vencimiento */}
          <View style={styles.maturityCard}>
            <Text style={styles.maturityLabel}>Valor total al vencimiento</Text>
            <Text style={styles.maturityAmount}>{formatCurrency(totalAtMaturity, 'COP')}</Text>
            <Text style={styles.maturityNote}>Capital + rendimiento neto</Text>
          </View>

          {/* Eventos relacionados */}
          <RelatedEvents bank={cdt.bank} onPress={(evtId) => router.push(`/inbox/${evtId}` as never)} />

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

function RelatedEvents({ bank, onPress }: { bank: string; onPress: (id: string) => void }) {
  const events = INBOX_EVENTS.filter(
    (e) =>
      !inboxState.isDeleted(e.id) &&
      e.relatedAsset?.toLowerCase().includes(bank.toLowerCase()),
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
  valueColor,
  bold,
}: {
  label: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[
        styles.detailValue,
        valueColor ? { color: valueColor } : undefined,
        bold ? { fontWeight: '700' } : undefined,
      ]}>
        {value}
      </Text>
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
    backgroundColor: `${Tokens.structural.positive}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconExpired: {
    backgroundColor: '#F0F0EC',
  },

  bankName: {
    fontSize: 28,
    fontWeight: '700',
    color: Tokens.neutral.text,
    marginBottom: Spacing.two,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 100,
    marginBottom: Spacing.four,
  },
  badgeActive:  { backgroundColor: `${Tokens.structural.positive}18` },
  badgeExpired: { backgroundColor: '#F0F0EC' },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  dotActive:   { backgroundColor: Tokens.structural.positive },
  dotExpired:  { backgroundColor: Tokens.neutral.muted },
  statusText:         { fontSize: 13, fontWeight: '500' },
  statusTextActive:   { color: Tokens.structural.positive },
  statusTextExpired:  { color: Tokens.neutral.muted },

  principalCard: {
    backgroundColor: '#F0F0EC',
    borderRadius: Spacing.two,
    padding: Spacing.four,
    alignItems: 'center',
    marginBottom: Spacing.four,
    gap: Spacing.one,
  },
  principalLabel:  { fontSize: 12, color: Tokens.neutral.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  principalAmount: { fontSize: 32, fontWeight: '700', color: Tokens.neutral.text },
  principalRate:   { fontSize: 15, fontWeight: '600', color: Tokens.structural.positive },

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
  detailLabel: { fontSize: 14, color: Tokens.neutral.muted },
  detailValue: { fontSize: 14, fontWeight: '500', color: Tokens.neutral.text },
  divider:     { height: 1, backgroundColor: '#E0E0DC' },

  maturityCard: {
    backgroundColor: `${Tokens.structural.positive}12`,
    borderWidth: 1,
    borderColor: `${Tokens.structural.positive}40`,
    borderRadius: Spacing.two,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.four,
  },
  maturityLabel:  { fontSize: 12, color: Tokens.structural.positive, textTransform: 'uppercase', letterSpacing: 0.5 },
  maturityAmount: { fontSize: 28, fontWeight: '700', color: Tokens.structural.positive },
  maturityNote:   { fontSize: 13, color: Tokens.structural.positive, opacity: 0.7 },

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
