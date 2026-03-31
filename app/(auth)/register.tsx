import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '@/services/supabase';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isOperator, setIsOperator] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!displayName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords don\'t match', 'Please re-enter your password.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { display_name: displayName.trim(), is_operator: isOperator },
      },
    });
    setLoading(false);

    if (error) {
      Alert.alert('Registration failed', error.message);
      return;
    }

    // Update user_profiles with is_operator flag (trigger creates the row)
    if (data.user && isOperator) {
      await supabase
        .from('user_profiles')
        .upsert({
          user_id: data.user.id,
          display_name: displayName.trim(),
          is_operator: true,
        });
    }

    if (data.session) {
      // Email confirmed immediately (email confirmation disabled in Supabase dashboard)
      router.replace('/(tabs)');
    } else {
      Alert.alert(
        'Check your email',
        'We sent you a confirmation link. Please verify your email before signing in.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={16} color="#fff" />
          <Text style={styles.backText}>Sign in</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create account</Text>
          <Text style={styles.headerSub}>Join Lepidus — Cyprus's fuel marketplace</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full name</Text>
            <View style={styles.inputWrap}>
              <FontAwesome name="user-o" size={15} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nikos Papadopoulos"
                placeholderTextColor="#9CA3AF"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email address</Text>
            <View style={styles.inputWrap}>
              <FontAwesome name="envelope-o" size={15} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <FontAwesome name="lock" size={15} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="At least 8 characters"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                <FontAwesome name={showPassword ? 'eye-slash' : 'eye'} size={15} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm password</Text>
            <View style={styles.inputWrap}>
              <FontAwesome name="lock" size={15} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Same password again"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          </View>

          {/* Operator toggle */}
          <View style={styles.operatorRow}>
            <View style={styles.operatorLeft}>
              <Text style={styles.operatorTitle}>I own / manage a fuel station</Text>
              <Text style={styles.operatorDesc}>
                Enables the Operator Portal to post deals and manage your station
              </Text>
            </View>
            <Switch
              value={isOperator}
              onValueChange={setIsOperator}
              trackColor={{ false: '#E5E7EB', true: '#BBF7D0' }}
              thumbColor={isOperator ? '#16a34a' : '#9CA3AF'}
            />
          </View>

          {isOperator && (
            <View style={styles.operatorNote}>
              <FontAwesome name="info-circle" size={13} color="#2563eb" />
              <Text style={styles.operatorNoteText}>
                After creating your account you'll be able to claim your station(s) in the Operator Portal at lepidus.cy/portal
              </Text>
            </View>
          )}

          {/* Register button */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnLoading]}
            onPress={handleRegister}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>
                Create {isOperator ? 'operator' : ''} account
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.terms}>
            By creating an account you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>

        {/* Login link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.footerLink}>Sign in →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16a34a' },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },

  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  backText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  header: { marginBottom: 24 },
  headerTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
    marginBottom: 20,
  },

  fieldGroup: { marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 7,
    letterSpacing: -0.1,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    gap: 10,
  },
  inputIcon: { width: 18 },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: '#111827',
  },

  // Operator toggle
  operatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 14,
    gap: 12,
    marginBottom: 10,
    marginTop: 4,
  },
  operatorLeft: { flex: 1 },
  operatorTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  operatorDesc: { fontSize: 12, color: '#6B7280', lineHeight: 16 },
  operatorNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },
  operatorNoteText: { flex: 1, fontSize: 12, color: '#1d4ed8', lineHeight: 16 },

  primaryBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnLoading: { opacity: 0.7 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  terms: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  footerLink: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
