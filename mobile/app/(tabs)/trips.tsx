import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  useColorScheme,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, BorderRadius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import type { Trip } from '../../lib/types';

export default function TripsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrips = useCallback(async () => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips((data as Trip[]) || []);
    } catch (e) {
      console.error('Error fetching trips:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrips();
    setRefreshing(false);
  }, [fetchTrips]);

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start) return '';
    const s = new Date(start);
    const e = end ? new Date(end) : null;
    const startStr = s.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    if (!e) return startStr;
    const endStr = e.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    const days = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    return `${startStr} – ${endStr} (${days} дн.)`;
  };

  const getDaysCount = (itinerary: unknown) => {
    if (Array.isArray(itinerary)) return itinerary.length;
    return 0;
  };

  const renderTrip = ({ item }: { item: Trip }) => (
    <Pressable
      style={[styles.tripCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={() => router.push(`/trip/${item.id}`)}
    >
      {/* Cover image or gradient */}
      <View style={styles.tripCover}>
        {item.cover_image ? (
          <Image source={{ uri: item.cover_image }} style={styles.tripCoverImage} />
        ) : (
          <LinearGradient
            colors={isDark ? ['#1A1A30', '#252540'] : ['#E8E4DF', '#D0CCC6']}
            style={styles.tripCoverGradient}
          >
            <Ionicons name="airplane" size={32} color={isDark ? '#7CB9D4' : '#5A9BB8'} />
          </LinearGradient>
        )}
      </View>

      <View style={styles.tripInfo}>
        <Text style={[styles.tripTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title || item.destination}
        </Text>

        <View style={styles.tripMeta}>
          <View style={styles.tripMetaItem}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.tripMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.destination}
            </Text>
          </View>

          {item.start_date && (
            <View style={styles.tripMetaItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.tripMetaText, { color: colors.textSecondary }]}>
                {formatDateRange(item.start_date, item.end_date)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.tripFooter}>
          <View style={[styles.daysBadge, { backgroundColor: isDark ? 'rgba(124,185,212,0.12)' : 'rgba(90,155,184,0.08)' }]}>
            <Text style={styles.daysBadgeText}>
              {getDaysCount(item.itinerary)} дней
            </Text>
          </View>

          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {item.tags.slice(0, 2).map((tag, i) => (
                <View key={i} style={[styles.tag, { backgroundColor: colors.inputBackground }]}>
                  <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </View>
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(124,185,212,0.1)' : 'rgba(90,155,184,0.08)' }]}>
        <Ionicons name="airplane-outline" size={48} color="#7CB9D4" />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Нет маршрутов</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Создайте свой первый маршрут{'\n'}с помощью AI
      </Text>
      <Pressable
        style={styles.emptyButton}
        onPress={() => router.push('/(tabs)/plan')}
      >
        <LinearGradient
          colors={['#7CB9D4', '#5A9BB8']}
          style={styles.emptyButtonGradient}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.emptyButtonText}>Создать маршрут</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Мои поездки</Text>
        <Pressable
          style={[styles.addButton, { backgroundColor: isDark ? 'rgba(124,185,212,0.12)' : 'rgba(90,155,184,0.08)' }]}
          onPress={() => router.push('/(tabs)/plan')}
        >
          <Ionicons name="add" size={22} color="#7CB9D4" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7CB9D4" />
        </View>
      ) : (
        <FlatList
          data={trips}
          renderItem={renderTrip}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContent,
            trips.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#7CB9D4"
              colors={['#7CB9D4']}
            />
          }
          ListEmptyComponent={renderEmpty}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyList: {
    flexGrow: 1,
  },
  // Trip card
  tripCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  tripCover: {
    height: 120,
  },
  tripCoverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  tripCoverGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripInfo: {
    padding: 16,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  tripMeta: {
    gap: 6,
    marginBottom: 12,
  },
  tripMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tripMetaText: {
    fontSize: 13,
    flex: 1,
  },
  tripFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  daysBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  daysBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7CB9D4',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
  },
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
