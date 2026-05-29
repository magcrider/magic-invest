import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppTabs from '@/components/app-tabs';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { migrateDbIfNeeded } from '@/db';
import { useAuth } from '@/hooks/use-auth';
import { signOutState } from '@/utils/sign-out-state';
import LoginScreen from './login';

function AppContent() {
  const colorScheme = useColorScheme();
  const theme = useTheme();
  const { session, loading } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    return signOutState.subscribe(() => setSigningOut(signOutState.active));
  }, []);

  // Cuando la sesión se limpia tras el signOut, resetear el flag
  useEffect(() => {
    if (!loading && !session) {
      signOutState.reset();
      setSigningOut(false);
    }
  }, [session, loading]);

  if (loading || signingOut) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        {signingOut ? (
          <Text style={[styles.signingOutText, { color: theme.textSecondary }]}>Cerrando sesión...</Text>
        ) : (
          <ActivityIndicator color={theme.textSecondary} />
        )}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  signingOutText: {
    fontSize: 15,
    marginTop: Spacing.two,
  },
});
