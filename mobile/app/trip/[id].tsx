import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  ActivityIndicator,
  Dimensions,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import MapView, { Marker, Region } from 'react-native-maps';
import { Colors, BorderRadius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { sendTripAssistantMessage, type ChatMessage as APIChatMessage } from '../../lib/api';
import type { Trip, DayPlan, Activity } from '../../lib/types';
import { CITY_COORDS } from '../../lib/types';

const { width } = Dimensions.get('window');

type TabType = 'itinerary' | 'map' | 'budget' | 'chat';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('itinerary');
  const [activeDay, setActiveDay] = useState(1);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'system',
      role: 'assistant',
      content: 'Привет! Я помогу изменить маршрут. Спросите что-нибудь или попросите заменить активность.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatListRef = useRef<FlatList>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (id) fetchTrip();
  }, [id]);

  const fetchTrip = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTrip(data as Trip);
    } catch (e) {
      console.error('Error fetching trip:', e);
      Alert.alert('Ошибка', 'Не удалось загрузить маршрут');
    } finally {
      setLoading(false);
    }
  };

  const itinerary: DayPlan[] = Array.isArray(trip?.itinerary) ? trip.itinerary as DayPlan[] : [];
  const currentDay = itinerary.find(d => d.day === activeDay);

  const handleShare = async () => {
    if (!trip) return;
    try {
      await Share.share({
        message: `${trip.title || trip.destination}\nПосмотри мой маршрут в TraveLM!`,
      });
    } catch {
      // User cancelled
    }
  };

  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || chatSending || !trip) return;
    const text = chatInput.trim();
    setChatInput('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatSending(true);

    try {
      const history: APIChatMessage[] = chatMessages
        .filter(m => m.id !== 'system')
        .map(m => ({ role: m.role, content: m.content }));

      const response = await sendTripAssistantMessage(trip.id, text, itinerary, history);

      setChatMessages(prev => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.content || 'Не удалось получить ответ',
        },
      ]);
    } catch {
      setChatMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Ошибка при отправке сообщения. Попробуйте ещё раз.',
        },
      ]);
    } finally {
      setChatSending(false);
      setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [chatInput, chatSending, trip, itinerary, chatMessages]);

  const getCategoryIcon = (category?: string): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'museum': return 'business-outline';
      case 'food': return 'restaurant-outline';
      case 'nature': return 'leaf-outline';
      case 'beach': return 'sunny-outline';
      case 'shopping': return 'bag-outline';
      case 'nightlife': return 'moon-outline';
      case 'transport': return 'train-outline';
      case 'hotel': return 'bed-outline';
      default: return 'location-outline';
    }
  };

  const getMapRegion = (): Region | undefined => {
    if (!currentDay?.activities?.length) {
      // Try city coords from title
      if (currentDay?.title) {
        for (const [city, coords] of Object.entries(CITY_COORDS)) {
          if (currentDay.title.includes(city)) {
            return {
              latitude: coords[0],
              longitude: coords[1],
              latitudeDelta: 0.15,
              longitudeDelta: 0.15,
            };
          }
        }
      }
      return undefined;
    }

    const activitiesWithCoords = currentDay.activities.filter(a => a.coords);
    if (activitiesWithCoords.length === 0) return undefined;

    const lats = activitiesWithCoords.map(a => a.coords![0]);
    const lngs = activitiesWithCoords.map(a => a.coords![1]);

    return {
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      latitudeDelta: Math.max(0.05, (Math.max(...lats) - Math.min(...lats)) * 1.5),
      longitudeDelta: Math.max(0.05, (Math.max(...lngs) - Math.min(...lngs)) * 1.5),
    };
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#7CB9D4" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Маршрут не найден</Text>
      </View>
    );
  }

  const budgetAnalysis = trip.budget_analysis as any;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {trip.title || trip.destination}
          </Text>
          {trip.start_date && trip.end_date && (
            <Text style={[styles.headerDates, { color: colors.textSecondary }]}>
              {new Date(trip.start_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(trip.end_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </Text>
          )}
        </View>
        <Pressable style={styles.headerBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {([
          { id: 'itinerary', label: 'Маршрут', icon: 'list-outline' },
          { id: 'map', label: 'Карта', icon: 'map-outline' },
          { id: 'budget', label: 'Бюджет', icon: 'wallet-outline' },
          { id: 'chat', label: 'Чат', icon: 'chatbubble-outline' },
        ] as const).map(tab => (
          <Pressable
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeTab === tab.id ? '#7CB9D4' : colors.textMuted}
            />
            <Text style={[
              styles.tabLabel,
              { color: activeTab === tab.id ? '#7CB9D4' : colors.textMuted },
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content based on active tab */}
      {activeTab === 'itinerary' && (
        <>
          {/* Day selector */}
          <FlatList
            horizontal
            data={itinerary}
            keyExtractor={item => `day-${item.day}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daySelectorList}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.dayChip,
                  {
                    backgroundColor: activeDay === item.day ? '#7CB9D4' : colors.inputBackground,
                    borderColor: activeDay === item.day ? '#7CB9D4' : colors.inputBorder,
                  },
                ]}
                onPress={() => setActiveDay(item.day)}
              >
                <Text style={[
                  styles.dayChipNumber,
                  { color: activeDay === item.day ? '#0A0A1A' : colors.text },
                ]}>
                  День {item.day}
                </Text>
                {item.date && (
                  <Text style={[
                    styles.dayChipDate,
                    { color: activeDay === item.day ? 'rgba(10,10,26,0.6)' : colors.textMuted },
                  ]}>
                    {new Date(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </Text>
                )}
              </Pressable>
            )}
          />

          {/* Day content */}
          <ScrollView
            contentContainerStyle={styles.dayContent}
            showsVerticalScrollIndicator={false}
          >
            {currentDay && (
              <>
                <Text style={[styles.dayTitle, { color: colors.text }]}>{currentDay.title}</Text>

                {/* Logistics */}
                {currentDay.logistics && (
                  <View style={[styles.logisticsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <Ionicons name="train-outline" size={18} color="#7CB9D4" />
                    <View style={styles.logisticsInfo}>
                      <Text style={[styles.logisticsText, { color: colors.text }]}>
                        {currentDay.logistics.from} → {currentDay.logistics.to}
                      </Text>
                      <Text style={[styles.logisticsDetails, { color: colors.textSecondary }]}>
                        {currentDay.logistics.mode}
                        {currentDay.logistics.duration ? ` · ${currentDay.logistics.duration}` : ''}
                        {currentDay.logistics.price ? ` · ${currentDay.logistics.price}` : ''}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Activities timeline */}
                {currentDay.activities?.map((activity, index) => (
                  <View key={index} style={styles.activityRow}>
                    {/* Timeline */}
                    <View style={styles.timeline}>
                      <View style={[styles.timelineDot, { backgroundColor: '#7CB9D4' }]} />
                      {index < (currentDay.activities?.length || 0) - 1 && (
                        <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                      )}
                    </View>

                    {/* Activity card */}
                    <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                      <View style={styles.activityHeader}>
                        <View style={[styles.activityIcon, { backgroundColor: 'rgba(124,185,212,0.1)' }]}>
                          <Ionicons name={getCategoryIcon(activity.category)} size={16} color="#7CB9D4" />
                        </View>
                        <View style={styles.activityHeaderInfo}>
                          <Text style={[styles.activityTime, { color: '#7CB9D4' }]}>
                            {activity.time}
                          </Text>
                          {activity.duration && (
                            <Text style={[styles.activityDuration, { color: colors.textMuted }]}>
                              {activity.duration}
                            </Text>
                          )}
                        </View>
                        {activity.cost != null && activity.cost > 0 && (
                          <View style={[styles.costBadge, { backgroundColor: isDark ? 'rgba(76,175,80,0.12)' : 'rgba(76,175,80,0.08)' }]}>
                            <Text style={styles.costText}>
                              {activity.cost.toLocaleString()} ₽
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={[styles.activityName, { color: colors.text }]}>
                        {activity.placeName}
                      </Text>
                      <Text style={[styles.activityDesc, { color: colors.textSecondary }]}>
                        {activity.desc}
                      </Text>

                      {(activity.rating || activity.reviews) && (
                        <View style={styles.activityMeta}>
                          {activity.rating && (
                            <View style={styles.ratingBadge}>
                              <Ionicons name="star" size={12} color="#FFA726" />
                              <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                                {activity.rating}
                              </Text>
                            </View>
                          )}
                          {activity.reviews && (
                            <Text style={[styles.reviewsText, { color: colors.textMuted }]}>
                              {activity.reviews} отзывов
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        </>
      )}

      {activeTab === 'map' && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            region={getMapRegion()}
            customMapStyle={isDark ? DARK_MAP_STYLE : undefined}
            showsUserLocation
          >
            {currentDay?.activities
              ?.filter(a => a.coords)
              .map((activity, i) => (
                <Marker
                  key={i}
                  coordinate={{
                    latitude: activity.coords![0],
                    longitude: activity.coords![1],
                  }}
                  title={activity.placeName}
                  description={`${activity.time} · ${activity.desc?.substring(0, 60)}...`}
                />
              ))}
          </MapView>

          {/* Day selector overlay */}
          <View style={styles.mapDaySelector}>
            <FlatList
              horizontal
              data={itinerary}
              keyExtractor={item => `map-day-${item.day}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12 }}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.mapDayChip,
                    {
                      backgroundColor: activeDay === item.day
                        ? 'rgba(124,185,212,0.9)'
                        : 'rgba(0,0,0,0.5)',
                    },
                  ]}
                  onPress={() => setActiveDay(item.day)}
                >
                  <Text style={styles.mapDayChipText}>День {item.day}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      )}

      {activeTab === 'budget' && (
        <ScrollView contentContainerStyle={styles.budgetContent} showsVerticalScrollIndicator={false}>
          {budgetAnalysis ? (
            <>
              <View style={[styles.budgetTotalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.budgetTotalLabel, { color: colors.textSecondary }]}>Общий бюджет</Text>
                <Text style={[styles.budgetTotalValue, { color: colors.text }]}>
                  {budgetAnalysis.totalEstimate?.toLocaleString() || '—'} ₽
                </Text>
                {budgetAnalysis.perDay && (
                  <Text style={[styles.budgetPerDay, { color: '#7CB9D4' }]}>
                    ~{budgetAnalysis.perDay.toLocaleString()} ₽/день
                  </Text>
                )}
              </View>

              {budgetAnalysis.breakdown && (
                <View style={[styles.budgetBreakdown, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.budgetBreakdownTitle, { color: colors.text }]}>Расходы по категориям</Text>
                  {Object.entries(budgetAnalysis.breakdown).map(([key, value]) => (
                    <BudgetRow
                      key={key}
                      label={getBudgetCategoryLabel(key)}
                      icon={getBudgetCategoryIcon(key)}
                      amount={value as number}
                      total={budgetAnalysis.totalEstimate || 1}
                      colors={colors}
                      isDark={isDark}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyBudget}>
              <Ionicons name="wallet-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyBudgetText, { color: colors.textSecondary }]}>
                Информация о бюджете недоступна
              </Text>
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {activeTab === 'chat' && (
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 140 : 0}
        >
          <FlatList
            ref={chatListRef}
            data={chatMessages}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.chatList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={[
                styles.chatBubbleRow,
                item.role === 'user' ? styles.chatBubbleRight : styles.chatBubbleLeft,
              ]}>
                <View style={[
                  styles.chatBubble,
                  item.role === 'user'
                    ? styles.chatBubbleUser
                    : [styles.chatBubbleAssistant, { backgroundColor: colors.card, borderColor: colors.cardBorder }],
                ]}>
                  <Text style={[
                    styles.chatBubbleText,
                    { color: item.role === 'user' ? '#fff' : colors.text },
                  ]}>
                    {item.content}
                  </Text>
                </View>
              </View>
            )}
            ListFooterComponent={
              chatSending ? (
                <View style={[styles.chatBubbleRow, styles.chatBubbleLeft]}>
                  <View style={[styles.chatBubble, styles.chatBubbleAssistant, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <ActivityIndicator size="small" color="#7CB9D4" />
                  </View>
                </View>
              ) : null
            }
          />

          <View style={[styles.chatInputBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <View style={[styles.chatInputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
              <TextInput
                style={[styles.chatInput, { color: colors.text }]}
                placeholder="Замени музей на кафе..."
                placeholderTextColor={colors.textMuted}
                value={chatInput}
                onChangeText={setChatInput}
                multiline
                onSubmitEditing={sendChat}
              />
              <Pressable
                style={[styles.chatSendBtn, (!chatInput.trim() || chatSending) && styles.chatSendBtnDisabled]}
                onPress={sendChat}
                disabled={!chatInput.trim() || chatSending}
              >
                <Ionicons name="send" size={16} color="#fff" />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function BudgetRow({
  label,
  icon,
  amount,
  total,
  colors,
  isDark,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  amount: number;
  total: number;
  colors: typeof Colors.dark;
  isDark: boolean;
}) {
  const percentage = Math.round((amount / total) * 100);
  return (
    <View style={budgetStyles.row}>
      <View style={budgetStyles.left}>
        <Ionicons name={icon} size={18} color={colors.textMuted} />
        <Text style={[budgetStyles.label, { color: colors.text }]}>{label}</Text>
      </View>
      <View style={budgetStyles.right}>
        <View style={[budgetStyles.bar, { backgroundColor: colors.inputBackground }]}>
          <View style={[budgetStyles.barFill, { width: `${percentage}%` }]} />
        </View>
        <Text style={[budgetStyles.amount, { color: colors.textSecondary }]}>
          {amount.toLocaleString()} ₽
        </Text>
      </View>
    </View>
  );
}

function getBudgetCategoryLabel(key: string) {
  const map: Record<string, string> = {
    accommodation: 'Жильё',
    food: 'Еда',
    transport: 'Транспорт',
    activities: 'Активности',
    other: 'Прочее',
  };
  return map[key] || key;
}

function getBudgetCategoryIcon(key: string): keyof typeof Ionicons.glyphMap {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    accommodation: 'bed-outline',
    food: 'restaurant-outline',
    transport: 'train-outline',
    activities: 'ticket-outline',
    other: 'ellipsis-horizontal-outline',
  };
  return map[key] || 'ellipsis-horizontal-outline';
}

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
];

const budgetStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '30%',
  },
  label: {
    fontSize: 14,
  },
  right: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#7CB9D4',
    borderRadius: 3,
  },
  amount: {
    fontSize: 13,
    fontWeight: '500',
    minWidth: 70,
    textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerDates: {
    fontSize: 12,
    marginTop: 2,
  },
  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#7CB9D4',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Day selector
  daySelectorList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 8,
    minWidth: 70,
  },
  dayChipNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  dayChipDate: {
    fontSize: 10,
    marginTop: 2,
  },
  // Day content
  dayContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  // Logistics
  logisticsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  logisticsInfo: {
    flex: 1,
  },
  logisticsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  logisticsDetails: {
    fontSize: 12,
    marginTop: 2,
  },
  // Activity
  activityRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timeline: {
    alignItems: 'center',
    width: 24,
    paddingTop: 8,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  activityCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginLeft: 8,
    marginBottom: 10,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityHeaderInfo: {
    flex: 1,
  },
  activityTime: {
    fontSize: 14,
    fontWeight: '700',
  },
  activityDuration: {
    fontSize: 11,
    marginTop: 1,
  },
  costBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  costText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  reviewsText: {
    fontSize: 12,
  },
  // Map
  mapContainer: {
    flex: 1,
  },
  mapDaySelector: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  mapDayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  mapDayChipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Budget
  budgetContent: {
    padding: 20,
  },
  budgetTotalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetTotalLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  budgetTotalValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  budgetPerDay: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 4,
  },
  budgetBreakdown: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  budgetBreakdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyBudget: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyBudgetText: {
    fontSize: 15,
  },
  // Chat
  chatContainer: {
    flex: 1,
  },
  chatList: {
    padding: 16,
    paddingBottom: 8,
  },
  chatBubbleRow: {
    marginBottom: 8,
    maxWidth: '82%',
  },
  chatBubbleRight: {
    alignSelf: 'flex-end',
  },
  chatBubbleLeft: {
    alignSelf: 'flex-start',
  },
  chatBubble: {
    borderRadius: 16,
    padding: 12,
  },
  chatBubbleUser: {
    backgroundColor: '#7CB9D4',
    borderBottomRightRadius: 4,
  },
  chatBubbleAssistant: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  chatBubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  chatInputBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    borderTopWidth: 1,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
  },
  chatInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
  },
  chatSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7CB9D4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatSendBtnDisabled: {
    backgroundColor: 'rgba(124,185,212,0.3)',
  },
});
