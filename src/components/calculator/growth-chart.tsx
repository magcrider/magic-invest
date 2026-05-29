import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { abbreviateValue, type Currency } from '@/utils/format';

const CHART_HEIGHT = 160;
const LABEL_HEIGHT = 18;
const BAR_WIDTH = 24;
const BAR_GAP = 10;

interface DataPoint {
  year: number;
  contributed: number;
  total: number;
}

function buildPoints(
  principal: number,
  monthly: number,
  annualRate: number,
  years: number,
): DataPoint[] {
  const r = annualRate / 100 / 12;
  const count = Math.min(years, 10);
  const step = years / count;

  const points: DataPoint[] = [];
  for (let i = 1; i <= count; i++) {
    const y = i === count ? years : Math.round(i * step);
    const n = y * 12;
    const total =
      r === 0
        ? principal + monthly * n
        : principal * Math.pow(1 + r, n) + monthly * ((Math.pow(1 + r, n) - 1) / r);
    const contributed = principal + monthly * n;
    points.push({ year: y, contributed, total });
  }

  return points;
}

interface Props {
  principal: number;
  monthly: number;
  annualRate: number;
  years: number;
  currency: Currency;
}

export function GrowthChart({ principal, monthly, annualRate, years, currency }: Props) {
  const theme = useTheme();
  const points = buildPoints(principal, monthly, annualRate, years);
  const maxValue = points[points.length - 1].total;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.title}>
        CRECIMIENTO PROYECTADO
      </ThemedText>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.barsArea}>
            {points.map((point) => {
              const barH = Math.max(4, Math.round((point.total / maxValue) * CHART_HEIGHT));
              const contributedH = Math.round((point.contributed / point.total) * barH);
              const gainsH = barH - contributedH;

              return (
                <View key={point.year} style={[styles.barOuter, { height: CHART_HEIGHT + LABEL_HEIGHT }]}>
                  <ThemedText
                    type="small"
                    style={[styles.valueLabel, { bottom: barH + 4, color: theme.textSecondary }]}
                    numberOfLines={1}>
                    {abbreviateValue(point.total, currency)}
                  </ThemedText>

                  <View style={[styles.bar, { height: barH }]}>
                    {gainsH > 0 && (
                      <View style={[styles.barSection, { height: gainsH, backgroundColor: theme.positive }]} />
                    )}
                    <View style={[styles.barSection, { height: contributedH, backgroundColor: theme.positiveChart }]} />
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.labelsRow}>
            {points.map((point) => (
              <ThemedText
                key={point.year}
                type="small"
                themeColor="textSecondary"
                style={styles.yearLabel}>
                {point.year}a
              </ThemedText>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.positive }]} />
          <ThemedText type="small" themeColor="textSecondary">Ganancias</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.positiveChart }]} />
          <ThemedText type="small" themeColor="textSecondary">Capital aportado</ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  title: {
    letterSpacing: 0.5,
  },
  barsArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: BAR_GAP,
  },
  barOuter: {
    width: BAR_WIDTH,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  valueLabel: {
    position: 'absolute',
    fontSize: 10,
    width: BAR_WIDTH + BAR_GAP,
    textAlign: 'center',
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barSection: {
    width: BAR_WIDTH,
  },
  labelsRow: {
    flexDirection: 'row',
    gap: BAR_GAP,
    marginTop: Spacing.one,
  },
  yearLabel: {
    width: BAR_WIDTH,
    textAlign: 'center',
    fontSize: 11,
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
