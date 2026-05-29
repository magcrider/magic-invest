import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Currency } from '@/utils/format';

interface Props {
  value: Currency;
  onChange: (currency: Currency) => void;
}

export function CurrencySelector({ value, onChange }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.divider }]}>
      {(['COP', 'USD'] as Currency[]).map((c) => (
        <TouchableOpacity
          key={c}
          style={[styles.option, value === c && { backgroundColor: theme.background }]}
          onPress={() => onChange(c)}
          activeOpacity={0.7}>
          <ThemedText
            type="small"
            style={value === c
              ? { color: theme.text, fontWeight: '600' }
              : { color: theme.textSecondary }}>
            $ {c}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    padding: 3,
    alignSelf: 'flex-start',
  },
  option: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one + 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0,
    shadowRadius: 2,
    elevation: 0,
  },
});
