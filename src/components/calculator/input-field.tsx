import { useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatInput, type InputType } from '@/utils/format';

interface Props {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  suffix?: string;
  placeholder?: string;
  hint?: string;
  inputType?: InputType;
  onFocus?: () => void;
}

export function InputField({
  label,
  value,
  onChangeText,
  suffix,
  placeholder = '0',
  hint,
  inputType = 'decimal',
  onFocus,
}: Props) {
  const theme = useTheme();

  function handleChange(raw: string) {
    const formatted = formatInput(raw, inputType, value);
    onChangeText(formatted);
  }

  // Determinar keyboardType según inputType
  const keyboardType =
    inputType === 'integer' ? 'number-pad' :
    inputType === 'currency-cop' ? 'numeric' :
    'decimal-pad';

  // Agregar prefijo "ej: " si el placeholder parece un valor numérico
  const displayPlaceholder = /^[0-9.,\s]+$/.test(placeholder) ? `ej: ${placeholder}` : placeholder;

  return (
    <View style={styles.container}>
      <ThemedText type="small" style={[styles.label, { color: theme.text }]}>{label}</ThemedText>
      <View style={[styles.inputRow, { backgroundColor: theme.backgroundElement }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={value}
          onChangeText={handleChange}
          onFocus={onFocus}
          placeholder={displayPlaceholder}
          placeholderTextColor={theme.textPlaceholder}
          keyboardType={keyboardType}
          returnKeyType="done"
        />
        {suffix ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.suffix}>
            {suffix}
          </ThemedText>
        ) : null}
      </View>
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>{hint}</ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  label: {
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  suffix: {
    flexShrink: 0,
  },
  hint: {
    paddingHorizontal: Spacing.one,
  },
});
