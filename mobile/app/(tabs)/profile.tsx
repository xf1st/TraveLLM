import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useColorScheme,
  Alert,
  Image,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../lib/auth-context';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { user, profile, signOut } = useAuth();

  const [notifications, setNotifications] = useState(true);

  const handleSignOut = async () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти из аккаунта?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/');
          },
        },
      ]
    );
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Путешественник';
  const displayEmail = user?.email || '';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={[styles.pageTitle, { color: colors.text }]}>Профиль</Text>

        {/* User card */}
        <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={['#7CB9D4', '#5A9BB8']}
                style={styles.avatarPlaceholder}
              >
                <Text style={styles.avatarText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            )}
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{displayEmail}</Text>

          {profile?.role && (
            <View style={[styles.roleBadge, { backgroundColor: 'rgba(124,185,212,0.12)' }]}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#7CB9D4" />
              <Text style={styles.roleText}>{profile.role}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Маршрутов" value="—" icon="map-outline" colors={colors} isDark={isDark} />
          <StatCard label="Стран" value="—" icon="globe-outline" colors={colors} isDark={isDark} />
          <StatCard label="Дней" value="—" icon="calendar-outline" colors={colors} isDark={isDark} />
        </View>

        {/* Settings */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Настройки</Text>

        <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <SettingRow
            icon="notifications-outline"
            label="Уведомления"
            colors={colors}
            right={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: colors.inputBackground, true: 'rgba(124,185,212,0.4)' }}
                thumbColor={notifications ? '#7CB9D4' : colors.textMuted}
              />
            }
          />
          <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="moon-outline"
            label="Тёмная тема"
            colors={colors}
            right={
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                {isDark ? 'Вкл' : 'Выкл'} (Системная)
              </Text>
            }
          />
          <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="language-outline"
            label="Язык"
            colors={colors}
            right={
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>Русский</Text>
            }
          />
        </View>

        {/* About */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>О приложении</Text>

        <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <SettingRow
            icon="information-circle-outline"
            label="Версия"
            colors={colors}
            right={
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>1.0.0</Text>
            }
          />
          <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
          <Pressable>
            <SettingRow
              icon="document-text-outline"
              label="Политика конфиденциальности"
              colors={colors}
              right={<Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
            />
          </Pressable>
          <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
          <Pressable>
            <SettingRow
              icon="reader-outline"
              label="Условия использования"
              colors={colors}
              right={<Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
            />
          </Pressable>
        </View>

        {/* Sign out */}
        {user && (
          <Pressable style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#EF5350" />
            <Text style={styles.signOutText}>Выйти из аккаунта</Text>
          </Pressable>
        )}

        {!user && (
          <Pressable
            style={styles.signInButton}
            onPress={() => router.replace('/')}
          >
            <LinearGradient
              colors={['#7CB9D4', '#5A9BB8']}
              style={styles.signInGradient}
            >
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={styles.signInText}>Войти в аккаунт</Text>
            </LinearGradient>
          </Pressable>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  icon,
  colors,
  isDark,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: typeof Colors.dark;
  isDark: boolean;
}) {
  return (
    <View style={[statStyles.card, {
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
    }]}>
      <Ionicons name={icon} size={20} color="#7CB9D4" />
      <Text style={[statStyles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[statStyles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  colors,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: typeof Colors.dark;
  right: React.ReactNode;
}) {
  return (
    <View style={settingStyles.row}>
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <Text style={[settingStyles.label, { color: colors.text }]}>{label}</Text>
      {right}
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    gap: 6,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
  },
});

const settingStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  label: {
    flex: 1,
    fontSize: 15,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    paddingVertical: 16,
  },
  // User card
  userCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: '#7CB9D4',
    fontSize: 12,
    fontWeight: '600',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  // Section
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  settingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },
  settingDivider: {
    height: 1,
    marginLeft: 48,
  },
  settingValue: {
    fontSize: 14,
  },
  // Sign out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  signOutText: {
    color: '#EF5350',
    fontSize: 16,
    fontWeight: '600',
  },
  signInButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  signInGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  signInText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
