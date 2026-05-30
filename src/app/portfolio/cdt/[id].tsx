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
import { formatCurrency } from '@/utils/format';
import { getCdtById, deleteCdt } from '@/services/supabase-queries';
import type { CdtCapitalization, CdtPosition } from '@/db/schema';
import { INBOX_EVENTS } from '@/constants/inbox-mock';
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
  const theme     = useTheme();
  const [cdt, setCdt]           = useState<CdtPosition | null | undefined>(undefined);
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
              await deleteCdt(Number(id));
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
    getCdtById(Number(id)).then(setCdt);
  }, [id]);

  if (cdt === undefined) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator color={theme.textSecondary} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!cdt) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={styles.centered}>
          <ThemedText themeColor="textSecondary">CDT no encontrado.</ThemedText>
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
              <Ionicons name="arrow-back-outline" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
            <View style={[
              styles.headerIcon,
              { backgroundColor: expired ? theme.backgroundElement : theme.positiveSubtle },
            ]}>
              <Ionicons
                name="time-outline"
                size={20}
                color={expired ? theme.textSecondary : theme.assetCdt}
              />
            </View>
          </View>

          <ThemedText style={[styles.bankName, { color: theme.assetCdt }]}>{cdt.bank}</ThemedText>

          {/* Status badge */}
          <View style={[
            styles.statusBadge,
            { backgroundColor: expired ? theme.backgroundElement : theme.positiveSubtle },
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: expired ? theme.textSecondary : theme.assetCdt },
            ]} />
            <ThemedText style={[
              styles.statusText,
              { color: expired ? theme.textSecondary : theme.assetCdt },
            ]}>
              {expired ? 'Vencido' : `Vence en ${days} días`}
            </ThemedText>
          </View>

          <RelatedMessages bank={cdt.bank} onPress={(evtId) => router.push(`/inbox/${evtId}` as never)} />

          {/* Principal */}
          <View style={[styles.principalCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={[styles.principalLabel, { color: theme.textSecondary }]}>
              Capital invertido
            </ThemedText>
            <ThemedText style={[styles.principalAmount, { color: theme.text }]}>
              {formatCurrency(cdt.amount, 'COP')}
            </ThemedText>
            <ThemedText style={[styles.principalRate, { color: theme.assetCdt }]}>
              {(cdt.rate * 100).toFixed(2)}% EA
            </ThemedText>
          </View>

          {/* Fechas y plazo */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              Detalles del plazo
            </ThemedText>
            <View style={[styles.detailCard, { backgroundColor: theme.backgroundElement }]}>
              <DetailRow label="Fecha de inicio"      value={fmtDate(cdt.start_date)} />
              <Divider />
              <DetailRow label="Fecha de vencimiento" value={fmtDate(cdt.end_date)} />
              <Divider />
              <DetailRow label="Plazo"                value={`${cdt.term_days} días`} />
              <Divider />
              <DetailRow label="Capitalización"       value={CAP_LABELS[cdt.capitalization]} />
            </View>
          </View>

          {/* Rendimiento */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              Rendimiento proyectado
            </ThemedText>
            <View style={[styles.detailCard, { backgroundColor: theme.backgroundElement }]}>
              <DetailRow label="Rendimiento bruto" value={formatCurrency(gross, 'COP')} />
              <Divider />
              <DetailRow
                label={`Retefuente (${(cdt.withholding_rate * 100).toFixed(0)}%)`}
                value={`− ${formatCurrency(tax, 'COP')}`}
                valueColor={theme.textSecondary}
              />
              <Divider />
              <DetailRow
                label="Rendimiento neto"
                value={formatCurrency(net, 'COP')}
                valueColor={theme.assetCdt}
                bold
              />
            </View>
          </View>

          {/* Valor al vencimiento */}
          <View style={[
            styles.maturityCard,
            { backgroundColor: theme.assetCdt + '18', borderColor: theme.assetCdt + '35' },
          ]}>
            <ThemedText style={[styles.maturityLabel, { color: theme.assetCdt }]}>
              Valor total al vencimiento
            </ThemedText>
            <ThemedText style={[styles.maturityAmount, { color: theme.assetCdt }]}>
              {formatCurrency(totalAtMaturity, 'COP')}
            </ThemedText>
            <ThemedText style={[styles.maturityNote, { color: theme.assetCdt, opacity: 0.7 }]}>
              Capital + rendimiento neto
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

function RelatedMessages({ bank, onPress }: { bank: string; onPress: (id: string) => void }) {
  const theme = useTheme();
  const events = INBOX_EVENTS.filter(
    (e) =>
      !inboxState.isDeleted(e.id) &&
      e.relatedAsset?.toLowerCase().includes(bank.toLowerCase()),
  );
  if (events.length === 0) return null;

  return (
    <View style={[styles.msgBox, { backgroundColor: theme.assetCdt + '10', borderColor: theme.assetCdt + '35' }]}>
      <View style={styles.msgMailIcon}>
        <Ionicons name="mail-outline" size={15} color={theme.assetCdt} />
      </View>
      <View style={styles.msgList}>
        {events.map((evt, i) => (
          <View key={evt.id}>
            {i > 0 && <View style={[styles.msgDivider, { backgroundColor: theme.assetCdt + '35' }]} />}
            <TouchableOpacity
              style={styles.msgRow}
              onPress={() => onPress(evt.id)}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.msgTitle, { color: theme.text }]} numberOfLines={2}>
                {evt.title}
              </ThemedText>
              <Ionicons name="chevron-forward" size={13} color={theme.assetCdt} />
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
  valueColor,
  bold,
}: {
  label: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.detailRow}>
      <ThemedText style={[styles.detailLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
      <ThemedText style={[
        styles.detailValue,
        { color: valueColor ?? theme.text },
        bold ? { fontWeight: '700' } : undefined,
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
  bankName: {
    fontSize: 28,
    fontWeight: '700',
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
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 13, fontWeight: '500' },
  principalCard: {
    borderRadius: Spacing.two,
    padding: Spacing.four,
    alignItems: 'center',
    marginBottom: Spacing.four,
    gap: Spacing.one,
  },
  principalLabel:  { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  principalAmount: { fontSize: 32, fontWeight: '700' },
  principalRate:   { fontSize: 15, fontWeight: '600' },
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
  maturityCard: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.four,
  },
  maturityLabel:  { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  maturityAmount: { fontSize: 28, fontWeight: '700' },
  maturityNote:   { fontSize: 13 },
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
