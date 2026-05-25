import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Tokens } from '@/constants/theme';

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
  return (
    <View style={styles.card}>
      {rows.map((row, index) => (
        <View key={row.label}>
          {index > 0 && <View style={styles.divider} />}
          <View style={[styles.row, row.highlight && styles.rowHighlight]}>
            <View style={styles.labelRow}>
              {row.color ? (
                <View style={[styles.colorDot, { backgroundColor: row.color }]} />
              ) : null}
              <ThemedText
                type={row.highlight ? 'smallBold' : 'small'}
                themeColor="textSecondary"
                style={row.highlight && styles.labelHighlight}>
                {row.label}
              </ThemedText>
            </View>
            <ThemedText
              type={row.highlight ? 'smallBold' : 'small'}
              style={[styles.value, row.highlight && styles.valueHighlight]}>
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
    backgroundColor: '#F0F0EC',
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
  rowHighlight: {
    backgroundColor: '#5B8E8E18',
  },
  labelHighlight: {
    color: Tokens.structural.positive,
  },
  value: {
    textAlign: 'right',
    color: Tokens.neutral.text,
    flexShrink: 1,
  },
  valueHighlight: {
    color: Tokens.structural.positive,
    fontSize: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0DC',
    marginHorizontal: Spacing.three,
  },
});
