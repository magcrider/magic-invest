import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Tokens } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim() || password.length < 6) return;
    if (mode === 'signup' && !name.trim()) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: name.trim() } },
      });
      setLoading(false);
      if (error) {
        setError(translateError(error.message));
      } else if (data.session) {
        // Confirmación de email desactivada — sesión inmediata, useAuth redirige solo
      } else {
        // Confirmación de email activa — el usuario debe revisar su correo
        setSuccessMsg('Revisa tu email para confirmar la cuenta y luego inicia sesión.');
        setMode('signin');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      setLoading(false);
      if (error) {
        setError(translateError(error.message));
      }
      // Si no hay error, useAuth detecta la sesión y _layout muestra las tabs
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError('Ingresa tu email primero.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase()
    );
    setLoading(false);
    if (error) {
      setError(translateError(error.message));
    } else {
      setSuccessMsg('Te enviamos un enlace para restablecer tu contraseña.');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inner}>

          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Magic Invest
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Herramienta personal de análisis financiero
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.form}>
            {/* Selector de modo */}
            <ThemedView type="backgroundElement" style={styles.modeSelector}>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'signin' && styles.modeButtonActive]}
                onPress={() => { setMode('signin'); setName(''); setError(null); setSuccessMsg(null); }}>
                <ThemedText
                  type="small"
                  themeColor={mode === 'signin' ? 'text' : 'textSecondary'}>
                  Ingresar
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'signup' && styles.modeButtonActive]}
                onPress={() => { setMode('signup'); setError(null); setSuccessMsg(null); }}>

                <ThemedText
                  type="small"
                  themeColor={mode === 'signup' ? 'text' : 'textSecondary'}>
                  Crear cuenta
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>

            {mode === 'signup' && (
              <TextInput
                style={styles.input}
                placeholder="¿Cómo te llamamos?"
                placeholderTextColor={Tokens.neutral.muted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="tu@email.com"
              placeholderTextColor={Tokens.neutral.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Contraseña (mínimo 6 caracteres)"
                placeholderTextColor={Tokens.neutral.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(v => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Tokens.neutral.muted}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading || !email.trim() || password.length < 6 || (mode === 'signup' && !name.trim())}>
              {loading
                ? <ActivityIndicator color={Tokens.neutral.background} />
                : <ThemedText type="smallBold" style={styles.buttonText}>
                    {mode === 'signin' ? 'Ingresar' : 'Crear cuenta'}
                  </ThemedText>
              }
            </TouchableOpacity>

            {mode === 'signin' && (
              <TouchableOpacity style={styles.linkButton} onPress={handleForgotPassword}>
                <ThemedText type="small" themeColor="textSecondary">
                  Olvidé mi contraseña
                </ThemedText>
              </TouchableOpacity>
            )}

            {error && (
              <ThemedText type="small" style={styles.error}>{error}</ThemedText>
            )}
            {successMsg && (
              <ThemedText type="small" style={styles.success}>{successMsg}</ThemedText>
            )}
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
            No constituye asesoría de inversión.
          </ThemedText>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.';
  if (msg.includes('Email not confirmed')) return 'Confirma tu email antes de ingresar.';
  if (msg.includes('User already registered')) return 'Ya existe una cuenta con ese email.';
  if (msg.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres.';
  return 'Ocurrió un error. Intenta de nuevo.';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    justifyContent: 'space-between',
    paddingVertical: Spacing.five,
  },
  header: { gap: Spacing.two, paddingTop: Spacing.five },
  title: { color: Tokens.neutral.text },
  form: { gap: Spacing.three },
  modeSelector: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    padding: Spacing.one,
  },
  modeButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Spacing.one,
  },
  modeButtonActive: {
    backgroundColor: Tokens.neutral.background,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0DC',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    color: Tokens.neutral.text,
    backgroundColor: '#FFFFFF',
  },
  button: {
    backgroundColor: Tokens.neutral.text,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: Tokens.neutral.background },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: Spacing.three,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  linkButton: { alignItems: 'center', paddingVertical: Spacing.one },
  error: { color: Tokens.structural.risk, textAlign: 'center' },
  success: { color: Tokens.structural.positive, textAlign: 'center' },
  disclaimer: { textAlign: 'center' },
});
