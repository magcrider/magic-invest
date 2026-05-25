import { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { DrawerMenu } from './drawer-menu';
import { Spacing, Tokens } from '@/constants/theme';

interface Props {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <ThemedView style={styles.header}>
        <ThemedView style={styles.text}>
          <ThemedText type="title" style={styles.title}>{title}</ThemedText>
          {subtitle ? (
            <ThemedText type="default" themeColor="textSecondary">{subtitle}</ThemedText>
          ) : null}
        </ThemedView>
        <TouchableOpacity onPress={() => setDrawerOpen(true)} hitSlop={8}>
          <Ionicons name="menu-outline" size={26} color={Tokens.neutral.muted} />
        </TouchableOpacity>
      </ThemedView>

      <DrawerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  text: { gap: Spacing.two, flex: 1 },
  title: { color: Tokens.neutral.text },
});
