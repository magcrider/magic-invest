import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Tokens } from '@/constants/theme';
import type { Currency } from '@/utils/format';

interface Props {
  value: Currency;
  onChange: (currency: Currency) => void;
}

export function CurrencySelector({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      {(['COP', 'USD'] as Currency[]).map((c) => (
        <TouchableOpacity
          key={c}
          style={[styles.option, value === c && styles.optionActive]}
          onPress={() => onChange(c)}
          activeOpacity={0.7}>
          <ThemedText
            type="small"
            style={[styles.label, value === c && styles.labelActive]}>
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
    backgroundColor: '#E0E0DC',
    borderRadius: Spacing.two,
    padding: 3,
    alignSelf: 'flex-start',
  },
  option: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one + 1,
  },
  optionActive: {
    backgroundColor: '#FAFAF7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    color: Tokens.neutral.muted,
  },
  labelActive: {
    color: Tokens.neutral.text,
    fontWeight: '600',
  },
});
