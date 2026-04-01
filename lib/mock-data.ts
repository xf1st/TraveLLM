export interface TripPreferences {
  destination: "russia" | "abroad"
  region?: string
  budget: "economy" | "comfort" | "premium"
  duration: number
  travelStyle: string[]
  dietary?: string[]
  religion?: string
  companions: string
  interests: string[]
}

export interface Trip {
  id: string
  title: string
  destination: string
  duration: string
  tags: string[]
  safetyLevel: number
  budget: string
  image: string
  days: DayPlan[]
  preferences: TripPreferences
  createdAt: string
}

export interface DayPlan {
  day: number
  title: string
  activities: Activity[]
}

export interface Activity {
  time: string
  title: string
  description: string
  location: string
  address?: string
  coordinates?: { lat: number; lng: number }
  distance?: string
  transport?: "walk" | "car" | "transit" | "bike"
  tips?: string
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export const mockTrips: Trip[] = [
  {
    id: "1",
    title: "Тбилиси и винные долины",
    destination: "Грузия",
    duration: "7 дней",
    tags: ["#уютно", "#гастрономия", "#русскиеговорят"],
    safetyLevel: 9,
    budget: "₽45,000",
    image: "/tbilisi-old-town-colorful-balconies.jpg",
    createdAt: "2026-01-15",
    preferences: {
      destination: "abroad",
      budget: "comfort",
      duration: 7,
      travelStyle: ["culture", "food"],
      companions: "couple",
      interests: ["wine", "history"],
    },
    days: [
      {
        day: 1,
        title: "Прибытие и знакомство со Старым городом",
        activities: [
          {
            time: "14:00",
            title: "Прибытие в Тбилиси",
            description: "Встреча в аэропорту, трансфер в отель в районе Старого города",
            location: "Международный аэропорт Тбилиси",
            address: "Sagarejo Hwy, Tbilisi",
            coordinates: { lat: 41.6692, lng: 44.9547 },
            distance: "18 км до центра",
            transport: "car",
          },
          {
            time: "16:00",
            title: "Прогулка по району Абанотубани",
            description: "Знаменитые серные бани, набережная Куры, водопад",
            location: "Старый город, Абанотубани",
            address: "Abanotubani, Old Tbilisi",
            coordinates: { lat: 41.6897, lng: 44.8096 },
            distance: "1.2 км",
            transport: "walk",
            tips: "Здесь много русскоговорящих, легко общаться",
          },
          {
            time: "19:00",
            title: "Ужин в традиционном ресторане",
            description: "Хинкали, хачапури, местное вино",
            location: 'Ресторан "Шави Ломи"',
            address: "13 Zandukeli St, Tbilisi",
            coordinates: { lat: 41.6945, lng: 44.8015 },
            distance: "800 м",
            transport: "walk",
          },
        ],
      },
    ],
  },
  {
    id: "2",
    title: "Бали: Йога и природа",
    destination: "Индонезия",
    duration: "10 дней",
    tags: ["#релакс", "#природа", "#йога"],
    safetyLevel: 8,
    budget: "₽65,000",
    image: "/bali-rice-terraces-sunset.jpg",
    createdAt: "2026-01-10",
    preferences: {
      destination: "abroad",
      budget: "comfort",
      duration: 10,
      travelStyle: ["relax", "nature"],
      companions: "couple",
      interests: ["yoga", "nature"],
    },
    days: [],
  },
  {
    id: "3",
    title: "Стамбул: Восток и Запад",
    destination: "Турция",
    duration: "5 дней",
    tags: ["#культура", "#халяль", "#история"],
    safetyLevel: 8,
    budget: "₽28,000",
    image: "/istanbul-blue-mosque-architecture.jpg",
    createdAt: "2026-01-05",
    preferences: {
      destination: "abroad",
      budget: "economy",
      duration: 5,
      travelStyle: ["culture"],
      companions: "solo",
      interests: ["history", "architecture"],
    },
    days: [],
  },
  {
    id: "4",
    title: "Алтай: Сила природы",
    destination: "Россия",
    duration: "8 дней",
    tags: ["#природа", "#активность", "#треккинг"],
    safetyLevel: 9,
    budget: "₽42,000",
    image: "/------------------------.jpg",
    createdAt: "2026-01-12",
    preferences: {
      destination: "russia",
      budget: "comfort",
      duration: 8,
      travelStyle: ["nature", "adventure"],
      companions: "friends",
      interests: ["hiking", "photography"],
    },
    days: [],
  },
  {
    id: "5",
    title: "Дубай: Город будущего",
    destination: "ОАЭ",
    duration: "6 дней",
    tags: ["#современность", "#шоппинг", "#халяль"],
    safetyLevel: 10,
    budget: "₽95,000",
    image: "/---------------------.jpg",
    createdAt: "2026-01-08",
    preferences: {
      destination: "abroad",
      budget: "premium",
      duration: 6,
      travelStyle: ["shopping", "relax"],
      companions: "family",
      interests: ["shopping", "beaches"],
    },
    days: [],
  },
  {
    id: "6",
    title: "Казань: Две культуры",
    destination: "Россия",
    duration: "4 дня",
    tags: ["#культура", "#халяль", "#история"],
    safetyLevel: 10,
    budget: "₽22,000",
    image: "/--------------------.jpg",
    createdAt: "2026-01-03",
    preferences: {
      destination: "russia",
      budget: "economy",
      duration: 4,
      travelStyle: ["culture", "food"],
      companions: "couple",
      interests: ["history", "food"],
    },
    days: [],
  },
  {
    id: "7",
    title: "Золотое кольцо России",
    destination: "Россия",
    duration: "5 дней",
    tags: ["#история", "#православие", "#культура"],
    safetyLevel: 10,
    budget: "₽28,000",
    image: "/-----------------------------.jpg",
    createdAt: "2026-01-20",
    preferences: {
      destination: "russia",
      budget: "economy",
      duration: 5,
      travelStyle: ["culture", "history"],
      companions: "couple",
      interests: ["history", "architecture"],
    },
    days: [],
  },
  {
    id: "8",
    title: "Сочи: Море и горы",
    destination: "Россия",
    duration: "7 дней",
    tags: ["#море", "#активность", "#природа"],
    safetyLevel: 10,
    budget: "₽55,000",
    image: "/------------------------.jpg",
    createdAt: "2026-01-18",
    preferences: {
      destination: "russia",
      budget: "comfort",
      duration: 7,
      travelStyle: ["relax", "adventure"],
      companions: "family",
      interests: ["beach", "mountains"],
    },
    days: [],
  },
  {
    id: "9",
    title: "Байкал: Чистейшее озеро планеты",
    destination: "Россия",
    duration: "6 дней",
    tags: ["#природа", "#экотуризм", "#треккинг"],
    safetyLevel: 9,
    budget: "₽52,000",
    image: "/------------------------.jpg",
    createdAt: "2026-01-16",
    preferences: {
      destination: "russia",
      budget: "comfort",
      duration: 6,
      travelStyle: ["nature", "adventure"],
      companions: "friends",
      interests: ["nature", "hiking"],
    },
    days: [],
  },
]

export const mockChatResponses: Record<string, string> = {
  "где поесть халяль":
    'В Тбилиси много халяльных заведений! Рекомендую ресторан "Samikitno" на проспекте Руставели — там отличные грузинские блюда с халяль-сертификацией. Также загляните в "Machakhela" возле станции метро Руставели.',
  "где обменять деньги":
    "Лучший курс в обменниках TBC Bank и Bank of Georgia. Они на каждом углу в центре. Карта МИР работает в большинстве банкоматов TBC и BOG. Избегайте обменников в аэропорту — курс там хуже.",
  "что посмотреть вечером":
    "Вечером советую подняться на фуникулёре к крепости Нарикала — оттуда открывается потрясающий вид на подсвеченный город. После можно спуститься пешком через Ботанический сад и поужинать на набережной.",
  "безопасно ли гулять ночью":
    "Тбилиси очень безопасный город, особенно центр. Можно спокойно гулять до позднего вечера. Районы Старого города, Руставели, Ваке — всё безопасно. Избегайте только окраинных районов типа Дидубе поздно ночью.",
  "где найти веганское кафе":
    'Рекомендую кафе "Kiwi Vegan Café" на улице Котэ Абхази — большой выбор растительных блюд и отличные десерты. Также "Organique" на Руставели предлагает органическую еду и много веганских опций.',
  "какие музеи работают в воскресенье":
    "В воскресенье работают: Национальный музей Грузии (10:00-18:00), Музей искусств (11:00-17:00), Этнографический музей под открытым небом (10:00-17:00). Понедельник — выходной в большинстве музеев.",
  "где православный храм":
    "Ближайший к центру — собор Сиони (VI век), он в 10 минутах пешком от вашей локации. Также рекомендую Анчисхати (VI век) — старейшая церковь Тбилиси. Службы обычно утром и вечером.",
  "что попробовать из местной кухни":
    "Обязательно попробуйте: хинкали (сочные пельмени), хачапури (сырный хлеб), харчо (пряный суп), чахохбили (курица в томатах), сациви (курица в ореховом соусе). И обязательно грузинское вино!",
  "как добраться до аэропорта":
    "До аэропорта: автобус №37 от станции метро Руставели (1₾, ~40 мин), такси Bolt/Yandex (15-20₾, ~25 мин), или трансфер от отеля (~30₾). Автобусы ходят с 07:00 до 00:30.",
  "где арендовать велосипед":
    'Аренда велосипедов: "Velo Tbilisi" на проспекте Руставели (10₾/день), "Biking Georgia" в Старом городе (15₾/день с шлемом и картой). Есть веломаршрут вдоль набережной Куры.',
}
