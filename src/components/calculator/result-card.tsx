import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ResultRow {
  label: string;
  value: string;
  highlight?: boolean;
  color?: string;
}

interface Props {
  rows: ResultRow[];
}

export function ResultCard({ rows }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      {rows.map((row, index) => (
        <View key={row.label}>
          {index > 0 && <View style={[styles.divider, { backgroundColor: theme.divider }]} />}
          <View style={[styles.row, row.highlight && { backgroundColor: theme.positiveSubtle }]}>
            <View style={styles.labelRow}>
              {row.color ? (
                <View style={[styles.colorDot, { backgroundColor: row.color }]} />
              ) : null}
              <ThemedText
                type={row.highlight ? 'smallBold' : 'small'}
                themeColor="textSecondary"
                style={row.highlight && { color: theme.positive }}>
                {row.label}
              </ThemedText>
            </View>
            <ThemedText
              type={row.highlight ? 'smallBold' : 'small'}
              style={[
                styles.value,
                { color: theme.text },
                row.highlight && { color: theme.positive, fontSize: 18 },
              ]}>
              {row.value}
            </ThemedText>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexShrink: 1,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  value: {
    textAlign: 'right',
    flexShrink: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.three,
  },
});
