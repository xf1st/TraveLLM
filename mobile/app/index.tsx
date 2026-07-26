import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { Colors, BorderRadius, FontSize, Spacing } from '../constants/theme';

const { width, height } = Dimensions.get('window');

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<'welcome' | 'login' | 'signup'>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 15,
        stiffness: 100,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        damping: 12,
        stiffness: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle background animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim, { toValue: 1, duration: 4000, useNativeDriver: false }),
        Animated.timing(bgAnim, { toValue: 0, duration: 4000, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (session && !loading) {
      router.replace('/(tabs)/plan');
    }
  }, [session, loading]);

  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      setError('');
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'travelm://auth/callback',
          skipBrowserRedirect: true,
        },
      });
      if (authError) throw authError;
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, 'travelm://auth/callback');
        if (result.type === 'success' && result.url) {
          const params = new URL(result.url);
          const accessToken = params.searchParams.get('access_token');
          const refreshToken = params.searchParams.get('refresh_token');
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка авторизации через Google');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError('Заполните все поля');
      return;
    }
    try {
      setAuthLoading(true);
      setError('');
      if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      } else {
        const { error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;
        setError('Проверьте почту для подтверждения аккаунта');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка авторизации');
    } finally {
      setAuthLoading(false);
    }
  };

  // Skip to demo mode
  const handleDemoMode = () => {
    router.replace('/(tabs)/plan');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={['#0A0A1A', '#141428', '#1A1A30']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#7CB9D4" />
      </View>
    );
  }

  const renderWelcome = () => (
    <Animated.View style={[styles.contentContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Logo */}
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
        <LinearGradient
          colors={['#7CB9D4', '#5A9BB8', '#4FC3F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoGradient}
        >
          <Ionicons name="airplane" size={40} color="#fff" />
        </LinearGradient>
      </Animated.View>

      <Text style={styles.title}>TraveLM</Text>
      <Text style={styles.subtitle}>AI-гид для путешествий</Text>
      <Text style={styles.description}>
        Создавайте персональные маршруты{'\n'}с помощью искусственного интеллекта
      </Text>

      {/* Feature cards */}
      <View style={styles.featuresRow}>
        <FeatureCard icon="map-outline" label="Маршруты" />
        <FeatureCard icon="chatbubble-outline" label="AI Гид" />
        <FeatureCard icon="compass-outline" label="Карта" />
      </View>

      {/* Auth buttons */}
      <Pressable style={styles.googleButton} onPress={handleGoogleSignIn} disabled={authLoading}>
        <Ionicons name="logo-google" size={20} color="#fff" />
        <Text style={styles.googleButtonText}>Войти через Google</Text>
      </Pressable>

      <Pressable
        style={styles.emailButton}
        onPress={() => setMode('login')}
      >
        <Ionicons name="mail-outline" size={20} color="#7CB9D4" />
        <Text style={styles.emailButtonText}>Войти по email</Text>
      </Pressable>

      <Pressable style={styles.demoButton} onPress={handleDemoMode}>
        <Text style={styles.demoButtonText}>Демо-режим без входа</Text>
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </Animated.View>
  );

  const renderEmailForm = () => (
    <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
      <Pressable style={styles.backButton} onPress={() => setMode('welcome')}>
        <Ionicons name="arrow-back" size={24} color="#F0F0F0" />
      </Pressable>

      <View style={styles.logoContainerSmall}>
        <LinearGradient
          colors={['#7CB9D4', '#5A9BB8']}
          style={styles.logoGradientSmall}
        >
          <Ionicons name="airplane" size={28} color="#fff" />
        </LinearGradient>
      </View>

      <Text style={styles.formTitle}>
        {mode === 'login' ? 'Вход в аккаунт' : 'Регистрация'}
      </Text>

      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color="#6B6B80" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#6B6B80"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#6B6B80" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Пароль"
          placeholderTextColor="#6B6B80"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <Pressable
        style={[styles.submitButton, authLoading && styles.submitButtonDisabled]}
        onPress={handleEmailAuth}
        disabled={authLoading}
      >
        {authLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>
            {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </Text>
        )}
      </Pressable>

      <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        <Text style={styles.switchModeText}>
          {mode === 'login'
            ? 'Нет аккаунта? Зарегистрироваться'
            : 'Уже есть аккаунт? Войти'}
        </Text>
      </Pressable>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>или</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable style={styles.googleButtonSmall} onPress={handleGoogleSignIn} disabled={authLoading}>
        <Ionicons name="logo-google" size={18} color="#fff" />
        <Text style={styles.googleButtonSmallText}>Google</Text>
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0A1A', '#0E1428', '#0A1A2A']}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated decorative circles */}
      <Animated.View style={[styles.circle1, {
        opacity: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.12] }),
      }]} />
      <Animated.View style={[styles.circle2, {
        opacity: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.15] }),
      }]} />
      <Animated.View style={[styles.circle3, {
        opacity: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.1] }),
      }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {mode === 'welcome' ? renderWelcome() : renderEmailForm()}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function FeatureCard({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIconContainer}>
        <Ionicons name={icon} size={22} color="#7CB9D4" />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  contentContainer: {
    alignItems: 'center',
  },
  // Decorative animated circles
  circle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#7CB9D4',
    top: -80,
    right: -100,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#4FC3F7',
    bottom: 100,
    left: -60,
  },
  circle3: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#5A9BB8',
    bottom: -40,
    right: -30,
  },
  // Logo
  logoContainer: {
    marginBottom: 24,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainerSmall: {
    marginBottom: 20,
  },
  logoGradientSmall: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Typography
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FAFAFA',
    letterSpacing: 1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#7CB9D4',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#A0A0B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  // Features
  featuresRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  featureCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(124,185,212,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureLabel: {
    fontSize: 12,
    color: '#A0A0B8',
    fontWeight: '500',
  },
  // Buttons
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    gap: 10,
    marginBottom: 12,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124,185,212,0.1)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(124,185,212,0.2)',
    marginBottom: 12,
  },
  emailButtonText: {
    color: '#7CB9D4',
    fontSize: 16,
    fontWeight: '600',
  },
  demoButton: {
    paddingVertical: 12,
  },
  demoButtonText: {
    color: '#6B6B80',
    fontSize: 14,
  },
  // Form
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FAFAFA',
    marginBottom: 28,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    marginBottom: 14,
    width: '100%',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#F0F0F0',
  },
  submitButton: {
    backgroundColor: '#7CB9D4',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#0A0A1A',
    fontSize: 16,
    fontWeight: '700',
  },
  switchModeText: {
    color: '#7CB9D4',
    fontSize: 14,
    marginBottom: 20,
  },
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    color: '#6B6B80',
    paddingHorizontal: 16,
    fontSize: 13,
  },
  googleButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  googleButtonSmallText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF5350',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
});
