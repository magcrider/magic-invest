import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppTabs from '@/components/app-tabs';
import { Tokens } from '@/constants/theme';
import { migrateDbIfNeeded } from '@/db';
import { useAuth } from '@/hooks/use-auth';
import LoginScreen from './login';

function AppContent() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Tokens.neutral.muted} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {session ? <AppTabs /> : <LoginScreen />}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SQLiteProvider databaseName="magic-invest.db" onInit={migrateDbIfNeeded}>
        <AppContent />
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: {
    flex: 1,
    backgroundColor: Tokens.neutral.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
