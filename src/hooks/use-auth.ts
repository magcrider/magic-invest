import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

function extractAuthCode(url: string): string | null {
  if (!url.includes('auth/callback')) return null;
  const match = url.match(/[?&]code=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function processDeepLink(url: string) {
  const code = extractAuthCode(url);
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    // Cold start: app opened from a tapped deep link
    Linking.getInitialURL().then((url) => {
      if (url) processDeepLink(url);
    });

    // Warm start: deep link received while app is already running
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      processDeepLink(url);
    });

    return () => {
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const fullName: string = session?.user?.user_metadata?.full_name ?? '';
  const displayName: string = fullName.split(' ')[0] || '';

  return { session, loading, displayName };
}
