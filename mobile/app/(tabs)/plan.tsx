import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Animated,
  useColorScheme,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { generateTrip } from '../../lib/api';
import {
  TRAVEL_STYLES,
  INTERESTS,
  type PlanFormData,
  type DestinationType,
  type BudgetType,
  type CompanionType,
} from '../../lib/types';

const { width } = Dimensions.get('window');
const TOTAL_STEPS = 5;

export default function PlanScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const progressAnim = useRef(new Animated.Value(1 / TOTAL_STEPS)).current;

  // Form state
  const [form, setForm] = useState<PlanFormData>({
    departureCity: '',
    destination: 'abroad',
    customDestination: '',
    countryCount: '1',
    startDate: null,
    endDate: null,
    budget: 'comfort',
    customBudget: '',
    travelStyles: [],
    companions: 'couple',
    interests: [],
    creativityLevel: 'balanced',
  });

  // Date picker state
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const updateForm = useCallback((updates: Partial<PlanFormData>) => {
    setForm(prev => ({ ...prev, ...updates }));
  }, []);

  const animateProgress = (step: number) => {
    Animated.spring(progressAnim, {
      toValue: step / TOTAL_STEPS,
      damping: 15,
      stiffness: 100,
      useNativeDriver: false,
    }).start();
  };

  const goNext = () => {
    if (currentStep < TOTAL_STEPS) {
      const next = currentStep + 1;
      setCurrentStep(next);
      animateProgress(next);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      animateProgress(prev);
    }
  };

  const handleGenerate = async () => {
    if (!form.departureCity) {
      Alert.alert('Ошибка', 'Укажите город отправления');
      return;
    }
    if (!form.startDate || !form.endDate) {
      Alert.alert('Ошибка', 'Выберите даты поездки');
      return;
    }

    const destinations = form.destination === 'custom'
      ? form.customDestination.split(',').map(d => d.trim()).filter(Boolean)
      : [form.destination];

    const budgetMap: Record<BudgetType, number> = {
      economy: 3000,
      comfort: 7000,
      luxury: 15000,
      custom: parseInt(form.customBudget) || 5000,
    };

    try {
      setLoading(true);
      const result = await generateTrip({
        departureCity: form.departureCity,
        destinations,
        startDate: form.startDate.toISOString().split('T')[0],
        endDate: form.endDate.toISOString().split('T')[0],
        budget: budgetMap[form.budget],
        travelStyle: form.travelStyles.join(', '),
        interests: form.interests,
        companions: form.companions,
      });

      if (result.success && result.tripId) {
        router.push(`/trip/${result.tripId}`);
      }
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось создать маршрут');
    } finally {
      setLoading(false);
    }
  };

  const toggleStyle = (styleId: string) => {
    updateForm({
      travelStyles: form.travelStyles.includes(styleId)
        ? form.travelStyles.filter(s => s !== styleId)
        : [...form.travelStyles, styleId],
    });
  };

  const toggleInterest = (interest: string) => {
    updateForm({
      interests: form.interests.includes(interest)
        ? form.interests.filter(i => i !== interest)
        : [...form.interests, interest],
    });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Выбрать';
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      default:
        return null;
    }
  };

  // Step 1: Where from / where to
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Откуда и куда?</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Выберите город отправления и направление
      </Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Город отправления</Text>
      <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
        <Ionicons name="location-outline" size={20} color={colors.textMuted} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Москва"
          placeholderTextColor={colors.textMuted}
          value={form.departureCity}
          onChangeText={v => updateForm({ departureCity: v })}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Направление</Text>
      <View style={styles.optionGrid}>
        {([
          { id: 'russia', label: 'Россия', icon: '🇷🇺' },
          { id: 'abroad', label: 'За рубеж', icon: '🌍' },
          { id: 'mixed', label: 'Смешанный', icon: '🗺️' },
          { id: 'custom', label: 'Свой', icon: '📍' },
        ] as const).map(opt => (
          <Pressable
            key={opt.id}
            style={[
              styles.optionCard,
              {
                backgroundColor: form.destination === opt.id
                  ? isDark ? 'rgba(124,185,212,0.15)' : 'rgba(90,155,184,0.1)'
                  : colors.card,
                borderColor: form.destination === opt.id ? '#7CB9D4' : colors.cardBorder,
              },
            ]}
            onPress={() => updateForm({ destination: opt.id })}
          >
            <Text style={styles.optionEmoji}>{opt.icon}</Text>
            <Text style={[styles.optionLabel, { color: form.destination === opt.id ? '#7CB9D4' : colors.text }]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {form.destination === 'custom' && (
        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Введите направления через запятую"
            placeholderTextColor={colors.textMuted}
            value={form.customDestination}
            onChangeText={v => updateForm({ customDestination: v })}
          />
        </View>
      )}

      {form.destination !== 'custom' && (
        <>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Количество стран</Text>
          <View style={styles.countRow}>
            {['1', '2', '3', '4+'].map(n => (
              <Pressable
                key={n}
                style={[
                  styles.countChip,
                  {
                    backgroundColor: form.countryCount === n
                      ? '#7CB9D4'
                      : colors.inputBackground,
                    borderColor: form.countryCount === n ? '#7CB9D4' : colors.inputBorder,
                  },
                ]}
                onPress={() => updateForm({ countryCount: n })}
              >
                <Text style={[
                  styles.countChipText,
                  { color: form.countryCount === n ? '#0A0A1A' : colors.text },
                ]}>{n}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );

  // Step 2: Dates
  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Когда едем?</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Выберите даты начала и конца поездки
      </Text>

      <View style={styles.dateRow}>
        <View style={styles.dateCard}>
          <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Начало</Text>
          <Pressable
            style={[styles.dateButton, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
            onPress={() => setShowStartPicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#7CB9D4" />
            <Text style={[styles.dateText, { color: form.startDate ? colors.text : colors.textMuted }]}>
              {formatDate(form.startDate)}
            </Text>
          </Pressable>
        </View>

        <Ionicons name="arrow-forward" size={20} color={colors.textMuted} style={styles.dateArrow} />

        <View style={styles.dateCard}>
          <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Конец</Text>
          <Pressable
            style={[styles.dateButton, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
            onPress={() => setShowEndPicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#7CB9D4" />
            <Text style={[styles.dateText, { color: form.endDate ? colors.text : colors.textMuted }]}>
              {formatDate(form.endDate)}
            </Text>
          </Pressable>
        </View>
      </View>

      {form.startDate && form.endDate && (
        <View style={[styles.durationBadge, { backgroundColor: isDark ? 'rgba(124,185,212,0.12)' : 'rgba(90,155,184,0.08)' }]}>
          <Ionicons name="time-outline" size={16} color="#7CB9D4" />
          <Text style={[styles.durationText, { color: '#7CB9D4' }]}>
            {Math.ceil((form.endDate.getTime() - form.startDate.getTime()) / (1000 * 60 * 60 * 24))} дней
          </Text>
        </View>
      )}

      {showStartPicker && (
        <DateTimePicker
          value={form.startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(_, date) => {
            setShowStartPicker(Platform.OS === 'ios');
            if (date) updateForm({ startDate: date });
          }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={form.endDate || form.startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={form.startDate || new Date()}
          onChange={(_, date) => {
            setShowEndPicker(Platform.OS === 'ios');
            if (date) updateForm({ endDate: date });
          }}
        />
      )}
    </View>
  );

  // Step 3: Budget
  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Какой бюджет?</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Укажите примерный бюджет на человека в день
      </Text>

      {([
        { id: 'economy', label: 'Эконом', desc: 'До 3 000 ₽/день', icon: 'wallet-outline', price: '~3 000 ₽' },
        { id: 'comfort', label: 'Комфорт', desc: '3 000 – 7 000 ₽/день', icon: 'star-outline', price: '~7 000 ₽' },
        { id: 'luxury', label: 'Люкс', desc: 'От 10 000 ₽/день', icon: 'diamond-outline', price: '15 000+ ₽' },
        { id: 'custom', label: 'Свой бюджет', desc: 'Указать вручную', icon: 'create-outline', price: '' },
      ] as const).map(opt => (
        <Pressable
          key={opt.id}
          style={[
            styles.budgetCard,
            {
              backgroundColor: form.budget === opt.id
                ? isDark ? 'rgba(124,185,212,0.12)' : 'rgba(90,155,184,0.08)'
                : colors.card,
              borderColor: form.budget === opt.id ? '#7CB9D4' : colors.cardBorder,
            },
          ]}
          onPress={() => updateForm({ budget: opt.id })}
        >
          <View style={[styles.budgetIconContainer, {
            backgroundColor: form.budget === opt.id ? 'rgba(124,185,212,0.15)' : colors.inputBackground,
          }]}>
            <Ionicons
              name={opt.icon as keyof typeof Ionicons.glyphMap}
              size={22}
              color={form.budget === opt.id ? '#7CB9D4' : colors.textMuted}
            />
          </View>
          <View style={styles.budgetInfo}>
            <Text style={[styles.budgetLabel, { color: form.budget === opt.id ? '#7CB9D4' : colors.text }]}>
              {opt.label}
            </Text>
            <Text style={[styles.budgetDesc, { color: colors.textSecondary }]}>{opt.desc}</Text>
          </View>
          {opt.price ? (
            <Text style={[styles.budgetPrice, { color: colors.textMuted }]}>{opt.price}</Text>
          ) : null}
        </Pressable>
      ))}

      {form.budget === 'custom' && (
        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
          <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>₽</Text>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Введите бюджет в рублях/день"
            placeholderTextColor={colors.textMuted}
            value={form.customBudget}
            onChangeText={v => updateForm({ customBudget: v })}
            keyboardType="numeric"
          />
        </View>
      )}
    </View>
  );

  // Step 4: Travel style & companions
  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Стиль поездки</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Выберите стиль путешествия и с кем едете
      </Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Стиль (можно несколько)</Text>
      <View style={styles.styleGrid}>
        {TRAVEL_STYLES.map(style => (
          <Pressable
            key={style.id}
            style={[
              styles.styleChip,
              {
                backgroundColor: form.travelStyles.includes(style.id)
                  ? isDark ? 'rgba(124,185,212,0.15)' : 'rgba(90,155,184,0.1)'
                  : colors.inputBackground,
                borderColor: form.travelStyles.includes(style.id) ? '#7CB9D4' : colors.inputBorder,
              },
            ]}
            onPress={() => toggleStyle(style.id)}
          >
            <Text style={styles.styleEmoji}>{style.icon}</Text>
            <Text style={[styles.styleLabel, {
              color: form.travelStyles.includes(style.id) ? '#7CB9D4' : colors.text,
            }]}>{style.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary, marginTop: 20 }]}>С кем едете</Text>
      <View style={styles.companionRow}>
        {([
          { id: 'solo', label: 'Один', icon: 'person-outline' },
          { id: 'couple', label: 'Пара', icon: 'heart-outline' },
          { id: 'family', label: 'Семья', icon: 'people-outline' },
          { id: 'friends', label: 'Друзья', icon: 'beer-outline' },
          { id: 'business', label: 'Бизнес', icon: 'briefcase-outline' },
        ] as const).map(opt => (
          <Pressable
            key={opt.id}
            style={[
              styles.companionChip,
              {
                backgroundColor: form.companions === opt.id
                  ? '#7CB9D4'
                  : colors.inputBackground,
                borderColor: form.companions === opt.id ? '#7CB9D4' : colors.inputBorder,
              },
            ]}
            onPress={() => updateForm({ companions: opt.id })}
          >
            <Ionicons
              name={opt.icon}
              size={18}
              color={form.companions === opt.id ? '#0A0A1A' : colors.textMuted}
            />
            <Text style={[styles.companionLabel, {
              color: form.companions === opt.id ? '#0A0A1A' : colors.text,
            }]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  // Step 5: Interests & generate
  const renderStep5 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Интересы</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Что вам интересно? Выберите любые пункты
      </Text>

      <View style={styles.interestGrid}>
        {INTERESTS.map(interest => (
          <Pressable
            key={interest}
            style={[
              styles.interestChip,
              {
                backgroundColor: form.interests.includes(interest)
                  ? isDark ? 'rgba(124,185,212,0.15)' : 'rgba(90,155,184,0.1)'
                  : colors.inputBackground,
                borderColor: form.interests.includes(interest) ? '#7CB9D4' : colors.inputBorder,
              },
            ]}
            onPress={() => toggleInterest(interest)}
          >
            <Text style={[styles.interestLabel, {
              color: form.interests.includes(interest) ? '#7CB9D4' : colors.text,
            }]}>{interest}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary, marginTop: 20 }]}>Креативность ИИ</Text>
      <View style={styles.creativityRow}>
        {([
          { id: 'conservative', label: 'Классика' },
          { id: 'balanced', label: 'Баланс' },
          { id: 'creative', label: 'Творчество' },
        ] as const).map(opt => (
          <Pressable
            key={opt.id}
            style={[
              styles.creativityChip,
              {
                backgroundColor: form.creativityLevel === opt.id ? '#7CB9D4' : colors.inputBackground,
                borderColor: form.creativityLevel === opt.id ? '#7CB9D4' : colors.inputBorder,
              },
            ]}
            onPress={() => updateForm({ creativityLevel: opt.id })}
          >
            <Text style={[styles.creativityLabel, {
              color: form.creativityLevel === opt.id ? '#0A0A1A' : colors.text,
            }]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Summary */}
      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.summaryTitle, { color: colors.text }]}>Итого</Text>
        <SummaryRow icon="location" label="Откуда" value={form.departureCity || '—'} colors={colors} />
        <SummaryRow icon="airplane" label="Куда" value={form.destination === 'custom' ? form.customDestination : form.destination} colors={colors} />
        <SummaryRow icon="calendar" label="Даты" value={form.startDate && form.endDate ? `${formatDate(form.startDate)} – ${formatDate(form.endDate)}` : '—'} colors={colors} />
        <SummaryRow icon="wallet" label="Бюджет" value={form.budget === 'custom' ? `${form.customBudget} ₽/день` : form.budget} colors={colors} />
        <SummaryRow icon="people" label="Компания" value={form.companions} colors={colors} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with progress */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {currentStep > 1 ? (
            <Pressable onPress={goBack} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
          ) : (
            <View style={styles.headerButton} />
          )}
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Шаг {currentStep} из {TOTAL_STEPS}
          </Text>
          <View style={styles.headerButton} />
        </View>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.inputBackground }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStep()}
      </ScrollView>

      {/* Bottom action button */}
      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {currentStep < TOTAL_STEPS ? (
          <Pressable style={styles.nextButton} onPress={goNext}>
            <LinearGradient
              colors={['#7CB9D4', '#5A9BB8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>Далее</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.nextButton, loading && styles.buttonDisabled]}
            onPress={handleGenerate}
            disabled={loading}
          >
            <LinearGradient
              colors={loading ? ['#888', '#666'] : ['#7CB9D4', '#4FC3F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextButtonGradient}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.nextButtonText}>Генерация...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#fff" />
                  <Text style={styles.nextButtonText}>Создать маршрут</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        )}
      </View>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingCard, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="large" color="#7CB9D4" />
            <Text style={[styles.loadingTitle, { color: colors.text }]}>
              Создаём маршрут...
            </Text>
            <Text style={[styles.loadingSubtitle, { color: colors.textSecondary }]}>
              AI подбирает лучшие места и составляет расписание
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  colors: typeof Colors.dark;
}) {
  return (
    <View style={summaryStyles.row}>
      <View style={summaryStyles.left}>
        <Ionicons name={`${icon}-outline` as any} size={16} color={colors.textMuted} />
        <Text style={[summaryStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[summaryStyles.value, { color: colors.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: { fontSize: 13 },
  value: { fontSize: 13, fontWeight: '500', maxWidth: '50%' },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7CB9D4',
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  stepContent: {
    paddingTop: 8,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  optionCard: {
    width: (width - 50) / 2 - 5,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  countRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  countChip: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  countChipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Dates
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dateCard: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateArrow: {
    marginTop: 24,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Budget
  budgetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    gap: 14,
  },
  budgetIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetInfo: {
    flex: 1,
  },
  budgetLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  budgetDesc: {
    fontSize: 13,
  },
  budgetPrice: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Styles
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  styleEmoji: {
    fontSize: 16,
  },
  styleLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Companions
  companionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  companionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  companionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Interests
  interestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  interestLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Creativity
  creativityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  creativityChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  creativityLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Summary
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  // Bottom
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
    borderTopWidth: 1,
  },
  nextButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '80%',
    gap: 16,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  loadingSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
