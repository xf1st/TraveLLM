// Shared types for the mobile app

export interface Trip {
  id: string;
  user_id: string | null;
  title: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  budget_range: string | null;
  description: string | null;
  itinerary: DayPlan[] | null;
  safety_info: SafetyInfo | null;
  visa_advice: unknown | null;
  budget_analysis: BudgetAnalysis | null;
  payment_advice: unknown | null;
  restrictions: unknown | null;
  countries: string[] | null;
  cover_image: string | null;
  tags: string[] | null;
  total_cost: string | null;
  created_at: string;
  updated_at: string;
}

export interface DayPlan {
  day: number;
  title: string;
  date?: string;
  activities: Activity[];
  logistics?: Logistics;
}

export interface Activity {
  time: string;
  placeName: string;
  desc: string;
  cost?: number;
  category?: string;
  link?: string;
  duration?: string;
  coords?: [number, number];
  reviews?: number;
  rating?: number;
}

export interface Logistics {
  mode: string;
  from: string;
  to: string;
  distance?: string;
  duration?: string;
  price?: string | number;
  bookingLink?: string;
}

export interface SafetyInfo {
  level?: string;
  tips?: string[];
  emergency?: string;
  health?: string[];
}

export interface BudgetAnalysis {
  totalEstimate?: number;
  perDay?: number;
  breakdown?: {
    accommodation?: number;
    food?: number;
    transport?: number;
    activities?: number;
    other?: number;
  };
  currency?: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  preferences?: Record<string, unknown>;
  access_mode?: string;
  created_at?: string;
}

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

// Form types for step-by-step planning
export type DestinationType = 'russia' | 'abroad' | 'mixed' | 'custom';
export type BudgetType = 'economy' | 'comfort' | 'luxury' | 'custom';
export type CompanionType = 'solo' | 'couple' | 'family' | 'friends' | 'business';

export interface PlanFormData {
  departureCity: string;
  destination: DestinationType;
  customDestination: string;
  countryCount: string;
  startDate: Date | null;
  endDate: Date | null;
  budget: BudgetType;
  customBudget: string;
  travelStyles: string[];
  companions: CompanionType;
  interests: string[];
  creativityLevel: 'conservative' | 'balanced' | 'creative';
}

export const TRAVEL_STYLES = [
  { id: 'nature', label: 'Природа', icon: '🌿' },
  { id: 'culture', label: 'Культура', icon: '🏛️' },
  { id: 'urban', label: 'Городской', icon: '🏙️' },
  { id: 'adventure', label: 'Приключения', icon: '🧗' },
  { id: 'relaxation', label: 'Релакс', icon: '🧘' },
  { id: 'luxury', label: 'Люкс', icon: '💎' },
  { id: 'budget', label: 'Бюджетный', icon: '💰' },
  { id: 'events', label: 'Мероприятия', icon: '🎉' },
  { id: 'culinary', label: 'Гастро', icon: '🍽️' },
  { id: 'active', label: 'Активный', icon: '🏃' },
  { id: 'romantic', label: 'Романтика', icon: '💕' },
  { id: 'beach', label: 'Пляжный', icon: '🏖️' },
] as const;

export const INTERESTS = [
  'Музеи', 'Архитектура', 'Природные парки', 'Пляжи',
  'Ночная жизнь', 'Шоппинг', 'Спорт', 'Фотография',
  'Местная кухня', 'Уличная еда', 'Винодельни', 'Спа',
  'Исторические места', 'Религиозные места', 'Фестивали', 'Рынки',
] as const;

// City coordinates for the map
export const CITY_COORDS: Record<string, [number, number]> = {
  'Москва': [55.7558, 37.6173],
  'Санкт-Петербург': [59.9343, 30.3351],
  'Казань': [55.7887, 49.1221],
  'Сочи': [43.5855, 39.7231],
  'Калининград': [54.7104, 20.4522],
  'Екатеринбург': [56.8389, 60.6057],
  'Новосибирск': [55.0084, 82.9357],
  'Владивосток': [43.1155, 131.8855],
  'Нижний Новгород': [56.2965, 43.9361],
  'Самара': [53.1959, 50.1001],
  'Стамбул': [41.0082, 28.9784],
  'Дубай': [25.2048, 55.2708],
  'Бангкок': [13.7563, 100.5018],
  'Париж': [48.8566, 2.3522],
  'Рим': [41.9028, 12.4964],
  'Барселона': [41.3874, 2.1686],
  'Лондон': [51.5074, -0.1278],
  'Токио': [35.6762, 139.6503],
  'Нью-Йорк': [40.7128, -74.006],
  'Бали': [-8.3405, 115.092],
  'Пхукет': [7.8804, 98.3923],
  'Тбилиси': [41.7151, 44.8271],
  'Ереван': [40.1792, 44.4991],
  'Баку': [40.4093, 49.8671],
  'Ташкент': [41.2995, 69.2401],
  'Минск': [53.9006, 27.559],
  'Алматы': [43.2220, 76.8512],
  'Прага': [50.0755, 14.4378],
  'Будапешт': [47.4979, 19.0402],
  'Вена': [48.2082, 16.3738],
  'Берлин': [52.5200, 13.4050],
  'Амстердам': [52.3676, 4.9041],
  'Лиссабон': [38.7223, -9.1393],
  'Мадрид': [40.4168, -3.7038],
  'Афины': [37.9838, 23.7275],
  'Каир': [30.0444, 31.2357],
  'Марракеш': [31.6295, -7.9811],
  'Кейптаун': [-33.9249, 18.4241],
  'Сидней': [-33.8688, 151.2093],
  'Сеул': [37.5665, 126.978],
  'Сингапур': [1.3521, 103.8198],
  'Куала-Лумпур': [3.1390, 101.6869],
  'Мехико': [19.4326, -99.1332],
  'Буэнос-Айрес': [-34.6037, -58.3816],
  'Рио-де-Жанейро': [-22.9068, -43.1729],
};
