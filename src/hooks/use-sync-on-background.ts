import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Hook that triggers a provided synchronization function the moment
 * the user sends the app to the background (or leaves the app).
 */
export function useSyncOnBackground(syncFunction: () => Promise<void>) {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // Detect transition from 'active' to 'inactive' or 'background'
      if (
        appState.current === 'active' &&
        (nextAppState === 'inactive' || nextAppState === 'background')
      ) {
        console.log('App moving to background. Triggering Sync to Supabase...');
        syncFunction().catch(err => console.error('Background sync failed:', err));
      }
      
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [syncFunction]);
}