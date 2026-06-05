/**
 * Pantalla de edición de perfil de usuario
 * Acceso: desde drawer menu > Mi perfil
 */

import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PageHeader } from '@/components/page-header';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { DocumentType } from '@/types/database';
import { getUserProfile, upsertUserProfile } from '@/services/supabase-queries-profiles';

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'cc', label: 'Cédula de Ciudadanía' },
  { value: 'ce', label: 'Cédula de Extranjería' },
  { value: 'nit', label: 'NIT' },
  { value: 'passport', label: 'Pasaporte' },
];

export default function ProfileScreen() {
  console.log('🟢 ProfileScreen: Component mounted');

  const theme = useTheme();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('cc');
  const [documentNumber, setDocumentNumber] = useState('');
  const [city, setCity] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    console.log('🔵 ProfileScreen: useEffect called, loading profile...');
    loadProfile();
  }, []);

  async function loadProfile() {
    console.log('🟡 loadProfile: Starting...');
    try {
      console.log('🟡 loadProfile: Calling getUserProfile()...');
      const profile = await getUserProfile();
      console.log('🟡 loadProfile: Got profile:', profile);

      if (profile) {
        console.log('✅ loadProfile: Setting profile data');
        setFullName(profile.full_name);
        setDocumentType(profile.document_type || 'cc');
        setDocumentNumber(profile.document_number || '');
        setCity(profile.city || '');
      } else {
        console.log('⚠️ loadProfile: No profile, loading from auth');
        // Si por alguna razón no hay perfil, usar datos de auth
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('✅ loadProfile: Setting auth data');
          setFullName(user.user_metadata?.full_name || user.email || '');
        }
      }
    } catch (error: any) {
      console.error('❌ loadProfile: Error:', error);
      setErrorMessage(error.message || 'No se pudo cargar el perfil');

      // Fallback: intentar cargar desde auth
      try {
        console.log('🔄 loadProfile: Fallback to auth');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('✅ loadProfile: Fallback successful');
          setFullName(user.user_metadata?.full_name || user.email || '');
        }
      } catch (e) {
        console.error('❌ loadProfile: Fallback failed:', e);
      }
    } finally {
      console.log('🏁 loadProfile: Setting loading to false');
      setLoading(false);
    }
  }

  async function handleSave() {
    setErrorMessage('');
    setSuccessMessage('');

    // Validaciones
    if (!fullName.trim()) {
      setErrorMessage('Ingresa tu nombre completo');
      return;
    }

    if (!documentNumber.trim()) {
      setErrorMessage('Ingresa tu número de documento');
      return;
    }

    if (documentNumber.trim().length < 6) {
      setErrorMessage('Número de documento inválido');
      return;
    }

    if (!city.trim()) {
      setErrorMessage('Ingresa tu ciudad');
      return;
    }

    setSaving(true);

    try {
      await upsertUserProfile({
        full_name: fullName.trim(),
        document_type: documentType,
        document_number: documentNumber.trim(),
        city: city.trim(),
      });

      setSuccessMessage('Perfil actualizado correctamente');

      // Limpiar mensaje después de 2 segundos
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setErrorMessage(error.message || 'No se pudo guardar el perfil');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.stickyHeader}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="arrow-back-outline" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.positive} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Header sticky */}
        <View style={styles.stickyHeader}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back-outline" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <ThemedText style={styles.title}>Mi Perfil</ThemedText>
            {/* Nombre completo */}
            <View style={styles.field}>
              <ThemedText type="defaultBold">Nombre completo</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundElement,
                    color: theme.text,
                    borderColor: theme.divider,
                  },
                ]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="ej: Juan Pérez"
                placeholderTextColor={theme.textPlaceholder}
                returnKeyType="next"
              />
            </View>

            {/* Tipo de documento */}
            <View style={styles.field}>
              <ThemedText type="defaultBold">Tipo de documento</ThemedText>
              <View
                style={[
                  styles.pickerContainer,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.divider,
                  },
                ]}
              >
                <Picker
                  selectedValue={documentType}
                  onValueChange={(value: DocumentType) => setDocumentType(value)}
                  style={{ color: theme.text }}
                  dropdownIconColor={theme.textSecondary}
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <Picker.Item key={type.value} label={type.label} value={type.value} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Número de documento */}
            <View style={styles.field}>
              <ThemedText type="defaultBold">Número de documento</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundElement,
                    color: theme.text,
                    borderColor: theme.divider,
                  },
                ]}
                value={documentNumber}
                onChangeText={setDocumentNumber}
                placeholder="ej: 1234567890"
                placeholderTextColor={theme.textPlaceholder}
                keyboardType="numeric"
                returnKeyType="next"
                maxLength={20}
              />
            </View>

            {/* Ciudad */}
            <View style={styles.field}>
              <ThemedText type="defaultBold">Ciudad</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundElement,
                    color: theme.text,
                    borderColor: theme.divider,
                  },
                ]}
                value={city}
                onChangeText={setCity}
                placeholder="ej: Bogotá, Medellín, Cali"
                placeholderTextColor={theme.textPlaceholder}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>

            {/* Mensajes de feedback */}
            {errorMessage ? (
              <View style={[styles.feedbackBox, { backgroundColor: theme.attentionSubtle }]}>
                <Ionicons name="alert-circle" size={20} color={theme.attention} />
                <ThemedText type="default" style={{ color: theme.attention, flex: 1 }}>
                  {errorMessage}
                </ThemedText>
              </View>
            ) : null}

            {successMessage ? (
              <View style={[styles.feedbackBox, { backgroundColor: theme.positiveSubtle }]}>
                <Ionicons name="checkmark-circle" size={20} color={theme.positive} />
                <ThemedText type="default" style={{ color: theme.positive, flex: 1 }}>
                  {successMessage}
                </ThemedText>
              </View>
            ) : null}

            {/* Botón guardar */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: theme.positive },
                (!fullName.trim() || !documentNumber.trim() || !city.trim() || saving) &&
                  styles.buttonDisabled,
              ]}
              onPress={handleSave}
              disabled={!fullName.trim() || !documentNumber.trim() || !city.trim() || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
                  Guardar cambios
                </ThemedText>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  stickyHeader: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.four,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    height: 48,
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  pickerContainer: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    overflow: 'hidden',
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  saveButton: {
    height: 52,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
