import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { DrawerMenu } from './drawer-menu';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export function PageHeader({ title, subtitle, rightAction }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();

  return (
    <>
      <ThemedView style={styles.header}>
        <ThemedView style={styles.text}>
          <ThemedText type="title">{title}</ThemedText>
          {subtitle ? (
            <ThemedText type="default" themeColor="textSecondary">{subtitle}</ThemedText>
          ) : null}
        </ThemedView>
        <View style={styles.rightGroup}>
          <TouchableOpacity onPress={() => setDrawerOpen(true)} hitSlop={8}>
            <Ionicons name="menu-outline" size={26} color={theme.textSecondary} />
          </TouchableOpacity>
          {rightAction}
        </View>
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
  rightGroup: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
});
