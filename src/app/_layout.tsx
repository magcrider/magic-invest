import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppTabs from '@/components/app-tabs';
import { Tokens, Spacing } from '@/constants/theme';
import { migrateDbIfNeeded } from '@/db';
import { useAuth } from '@/hooks/use-auth';
import { signOutState } from '@/utils/sign-out-state';
import LoginScreen from './login';

function AppContent() {
  const colorScheme = useColorScheme();
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
      <View style={styles.loading}>
        {signingOut ? (
          <Text style={styles.signingOutText}>Cerrando sesión...</Text>
        ) : (
          <ActivityIndicator color={Tokens.neutral.muted} />
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
    backgroundColor: Tokens.neutral.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signingOutText: {
    fontSize: 15,
    color: Tokens.neutral.muted,
    marginTop: Spacing.two,
  },
});
