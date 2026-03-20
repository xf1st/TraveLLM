"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Shield,
  ArrowRight,
  Sparkles,
  MapPin,
  Loader2,
  CheckCircle2,
  Wallet,
  Camera,
  Mountain,
  Music,
  Tent,
  TreeDeciduous,
  Utensils,
  Waves,
  Landmark,
  ShoppingBag,
  Palmtree,
  Heart,
} from "lucide-react";
import Image from "next/image";
import { TripImage } from "@/components/TripImage";
import { FadeIn } from "@/components/FadeIn";
import { RouteSearch } from "@/components/RouteSearch";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { FloatingIcons } from "@/components/FloatingIcons";

// Dynamic import for WebGL component (client-side only)

const mockRecommendations = [
  // КЛАССИЧЕСКИЕ ПОПУЛЯРНЫЕ
  {
    id: "pop-1",
    title: "Неделя в Ялте: Крымская классика",
    destination: "Крым, Россия",
    duration: "7 дней",
    tags: ["море", "пляж", "культура"],
    safetyLevel: 10,
    budget: "55 000 ₽",
    image:
      "https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&q=80&w=800",
    description:
      "Ласточкино гнездо, Ливадийский дворец, Массандра. Идеальный пляжный отдых с историей.",
    style: "Классика",
  },
  {
    id: "pop-2",
    title: "Сочи: Горы + Море",
    destination: "Сочи, Россия",
    duration: "7 дней",
    tags: ["природа", "активный", "горы"],
    safetyLevel: 10,
    budget: "85 000 ₽",
    image:
      "https://images.unsplash.com/photo-1612194600203-34e2c244b7d0?auto=format&fit=crop&q=80&w=800",
    description:
      "Красная Поляна, Олимпийский парк, Агурские водопады. Зимой — лыжи, летом — море.",
    style: "Активный",
  },
  {
    id: "pop-3",
    title: "Турция: Анталья всё включено",
    destination: "Анталья, Турция",
    duration: "10 дней",
    tags: ["пляж", "релакс", "аквапарк"],
    safetyLevel: 9,
    budget: "120 000 ₽",
    image:
      "https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?auto=format&fit=crop&q=80&w=800",
    description:
      "All-inclusive отели 5*, пляжи, экскурсия в Памуккале и Каппадокию.",
    style: "Расслабленный",
  },
  {
    id: "pop-4",
    title: "Египет: Хургада без суеты",
    destination: "Хургада, Египет",
    duration: "9 дней",
    tags: ["море", "релакс", "дайвинг"],
    safetyLevel: 8,
    budget: "95 000 ₽",
    image:
      "https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&q=80&w=800",
    description:
      "Прямой рейс, Красное море, снорклинг с рыбками-клоунами. Пирамиды опционально.",
    style: "Пляжный",
  },
  {
    id: "pop-5",
    title: "Тбилиси и Кахетия",
    destination: "Грузия",
    duration: "7 дней",
    tags: ["гастрономия", "культура", "вино"],
    safetyLevel: 9,
    budget: "75 000 ₽",
    image:
      "https://images.unsplash.com/photo-1565008576549-57569a49371d?auto=format&fit=crop&q=80&w=800",
    description:
      "Хинкали, хачапури, вино в Кахетии. Серные бани и ночной Тбилиси.",
    style: "Гастро-тур",
  },
  // НЕОБЫЧНЫЕ / НЕСТАНДАРТНЫЕ
  {
    id: "pop-6",
    title: "Алтай: Дикий и прекрасный",
    destination: "Алтай, Россия",
    duration: "10 дней",
    tags: ["природа", "активный", "горы"],
    safetyLevel: 9,
    budget: "110 000 ₽",
    image:
      "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&q=80&w=800",
    description:
      "Чуйский тракт, Телецкое озеро, Марсианские пейзажи. Для любителей природы.",
    style: "Приключение",
  },
  {
    id: "pop-7",
    title: "Узбекистан: Шёлковый путь",
    destination: "Узбекистан",
    duration: "8 дней",
    tags: ["история", "культура", "еда"],
    safetyLevel: 9,
    budget: "70 000 ₽",
    image:
      "https://images.unsplash.com/photo-1565967511849-76a60a516170?auto=format&fit=crop&q=80&w=800",
    description: "Самарканд, Бухара, Хива. Плов каждый день, мечети и медресе.",
    style: "Культурный",
  },
  {
    id: "pop-8",
    title: "ОАЭ: Дубай за 5 дней",
    destination: "Дубай, ОАЭ",
    duration: "5 дней",
    tags: ["шопинг", "развлечения", "пляж"],
    safetyLevel: 10,
    budget: "150 000 ₽",
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=800",
    description: "Бурдж Халифа, Palm Jumeirah, Dubai Mall. Прямой рейс 5ч.",
    style: "Люкс",
  },
  {
    id: "pop-9",
    title: "Сербия: Белград + Нови-Сад",
    destination: "Сербия",
    duration: "5 дней",
    tags: ["культура", "еда", "история"],
    safetyLevel: 10,
    budget: "60 000 ₽",
    image:
      "https://images.unsplash.com/photo-1580915411954-282cb1b0d780?auto=format&fit=crop&q=80&w=800",
    description:
      "Безвиз, прямой рейс, вкусная еда. Белградская крепость, район Скадарлия.",
    style: "Городской",
  },
  {
    id: "pop-10",
    title: "Байкал: Зимняя сказка",
    destination: "Байкал, Россия",
    duration: "7 дней",
    tags: ["природа", "активный", "уникальный"],
    safetyLevel: 9,
    budget: "95 000 ₽",
    image:
      "https://images.unsplash.com/photo-1551845041-63e8e76836ea?auto=format&fit=crop&q=80&w=800",
    description: "Прозрачный лёд, хивусы, остров Ольхон. Незабываемые фото.",
    style: "Эко-туризм",
  },
];

const tagColors: Record<string, string> = {
  пляж: "bg-sky-100/80 text-sky-700 border-none dark:bg-sky-500/20 dark:text-sky-300",
  шопинг:
    "bg-pink-100/80 text-pink-700 border-none dark:bg-pink-500/20 dark:text-pink-300",
  аквапарк:
    "bg-cyan-100/80 text-cyan-700 border-none dark:bg-cyan-500/20 dark:text-cyan-300",
  горы: "bg-emerald-100/80 text-emerald-700 border-none dark:bg-emerald-500/20 dark:text-emerald-300",
  море: "bg-blue-100/80 text-blue-700 border-none dark:bg-blue-500/20 dark:text-blue-300",
  "торговые центры":
    "bg-purple-100/80 text-purple-700 border-none dark:bg-purple-500/20 dark:text-purple-300",
  природа:
    "bg-green-100/80 text-green-700 border-none dark:bg-green-500/20 dark:text-green-300",
  культура:
    "bg-amber-100/80 text-amber-800 border-none dark:bg-amber-500/20 dark:text-amber-300",
  развлечения:
    "bg-rose-100/80 text-rose-700 border-none dark:bg-rose-500/20 dark:text-rose-300",
  мероприятия:
    "bg-fuchsia-100/80 text-fuchsia-700 border-none dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
  вино: "bg-violet-100/80 text-violet-700 border-none dark:bg-violet-500/20 dark:text-violet-300",
  гастрономия:
    "bg-orange-100/80 text-orange-700 border-none dark:bg-orange-500/20 dark:text-orange-300",
  еда: "bg-orange-100/80 text-orange-700 border-none dark:bg-orange-500/20 dark:text-orange-300",
  релакс:
    "bg-teal-100/80 text-teal-700 border-none dark:bg-teal-500/20 dark:text-teal-300",
  храмы:
    "bg-stone-100/80 text-stone-700 border-none dark:bg-stone-500/20 dark:text-stone-300",
  история:
    "bg-yellow-100/80 text-yellow-800 border-none dark:bg-yellow-500/20 dark:text-yellow-300",
  активный:
    "bg-lime-100/80 text-lime-700 border-none dark:bg-lime-500/20 dark:text-lime-300",
  дайвинг:
    "bg-cyan-100/80 text-cyan-700 border-none dark:bg-cyan-500/20 dark:text-cyan-300",
  уникальный:
    "bg-indigo-100/80 text-indigo-700 border-none dark:bg-indigo-500/20 dark:text-indigo-300",
  premium:
    "bg-amber-100/80 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  умеренный:
    "bg-sky-100/80 text-sky-700 border-none dark:bg-sky-500/20 dark:text-sky-300",
  вдвоём:
    "bg-rose-100/80 text-rose-700 border-none dark:bg-rose-500/20 dark:text-rose-300",
  вдвоем:
    "bg-rose-100/80 text-rose-700 border-none dark:bg-rose-500/20 dark:text-rose-300",
  компания:
    "bg-indigo-100/80 text-indigo-700 border-none dark:bg-indigo-500/20 dark:text-indigo-300",
  default:
    "bg-slate-100/90 text-slate-600 border border-slate-200/80 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600/40",
};

const tagIcons: Record<string, any> = {
  пляж: Palmtree,
  море: Waves,
  горы: Mountain,
  природа: TreeDeciduous,
  гастрономия: Utensils,
  еда: Utensils,
  вино: Utensils,
  шопинг: ShoppingBag,
  "торговые центры": ShoppingBag,
  культура: Landmark,
  история: Landmark,
  храмы: Landmark,
  развлечения: Music,
  активный: Tent,
  релакс: Sparkles,
  дайвинг: Waves,
  уникальный: Camera,
  аквапарк: Waves,
  default: Sparkles,
};

function ResultsContent() {
  const searchParams = useSearchParams();
  const source = searchParams.get("source");

  // State
  const [userRoutes, setUserRoutes] = useState<any[]>([]);
  const [favoriteRoutes, setFavoriteRoutes] = useState<any[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [aiRoute, setAiRoute] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Tabs: 'my' (My Routes) or 'favorites' (Favorites)
  // Default to 'my' unless source says otherwise
  const [view, setView] = useState<"favorites" | "my">(
    source === "favorites" ? "favorites" : "my",
  );

  // Pagination for My Routes
  const [visibleCount, setVisibleCount] = useState(9);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [hasMoreRoutes, setHasMoreRoutes] = useState(true);
  const [totalRoutes, setTotalRoutes] = useState(0);
  const isLoadingMoreRef = useRef(false);
  const PAGE_SIZE = 9;

  // Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const authUser = session?.user || null;

        if (authUser) {
          // 1. Fetch My Routes (First Page)
          const { count } = await supabase
            .from("trips")
            .select("*", { count: "exact", head: true })
            .eq("user_id", authUser.id);

          setTotalRoutes(count || 0);
          setHasMoreRoutes((count || 0) > PAGE_SIZE);

          const { data: myTrips } = await supabase
            .from("trips")
            .select("*")
            .eq("user_id", authUser.id)
            .order("created_at", { ascending: false })
            .range(0, PAGE_SIZE - 1);

          if (myTrips) setUserRoutes(myTrips);

          // 2. Fetch Favorites (IDs + Data)
          const { data: favs } = await supabase
            .from("favorites")
            .select("trip_id, trips(*)")
            .eq("user_id", authUser.id)
            .order("created_at", { ascending: false });

          if (favs) {
            const ids = new Set(favs.map((f: any) => f.trip_id));
            const trips = favs.map((f: any) => f.trips).filter(Boolean);
            setFavoriteIds(ids);
            setFavoriteRoutes(trips);
          }
        }
      } catch (err) {
        console.warn("Error fetching data:", err);
      }

      // Local Last Generated Request (only if strict match)
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("lastGeneratedRoute");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setAiRoute(parsed);
          } catch (e) {}
        }
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const loadMore = async () => {
    if (isLoadingMoreRef.current || !hasMoreRoutes || view !== "my") return;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const from = userRoutes.length;
        const to = from + PAGE_SIZE - 1;
        const { data } = await supabase
          .from("trips")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (data && data.length > 0) {
          setUserRoutes((prev) => [...prev, ...data]);
          setHasMoreRoutes(from + data.length < totalRoutes);
        } else {
          setHasMoreRoutes(false);
        }
      }
    } catch (e) {}
    setIsLoadingMore(false);
    isLoadingMoreRef.current = false;
  };

  // Toggle Favorite Handler
  const handleToggleFavorite = async (
    tripId: string,
    event: React.MouseEvent,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    // Optimistic Update
    const isFav = favoriteIds.has(tripId);
    const newFavs = new Set(favoriteIds);
    if (isFav) {
      newFavs.delete(tripId);
      setFavoriteRoutes((prev) => prev.filter((r) => r.id !== tripId));
    } else {
      newFavs.add(tripId);
      // We can't easily add to favoriteRoutes without data, but usually we toggle on existing route
      // If toggling on "My Routes", add it to "Favorite Routes"
      const trip =
        userRoutes.find((r) => r.id === tripId) ||
        mockRecommendations.find((r) => r.id === tripId);
      if (trip) setFavoriteRoutes((prev) => [trip, ...prev]);
    }
    setFavoriteIds(newFavs);

    // Server request (using lazy import or fetch)
    // We can use supabase client directly for simpler auth handling in CLIENT component
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (isFav) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("trip_id", tripId);
    } else {
      await supabase
        .from("favorites")
        .insert({ user_id: user.id, trip_id: tripId });
    }
  };

  // Combine Local + DB for My Routes
  const localTrip = aiRoute
    ? [
        {
          id: "ai-last",
          title: aiRoute.title,
          destination: aiRoute.countries?.[0]?.name || "Travel",
          duration: `${aiRoute.itinerary?.length || 0} дней`,
          tags: aiRoute.tags || ["черновик"],
          safetyLevel: 10,
          budget: aiRoute.totalBudget || "Индивидуально",
          image: `https://loremflickr.com/800/600/travel,${encodeURIComponent(aiRoute.countries?.[0]?.name || "city")}/all`,
          description: aiRoute.description,
          style: "Недавний",
        },
      ]
    : [];

  // Logic for display
  let displayRoutes: any[] = [];

  if (view === "my") {
    displayRoutes = [
      ...userRoutes.map((r) => ({
        ...r,
        image:
          r.cover_image ||
          `https://loremflickr.com/800/600/travel,${encodeURIComponent(r.destination || "city")}/all`,
        duration: `${r.itinerary?.length || 0} дней`,
        safetyLevel: r.safety_info?.level || 10,
        budget: r.total_cost || r.budget || r.budget_range,
      })),
      ...localTrip.filter(
        (lt) => !userRoutes.some((ur) => ur.title === lt.title),
      ),
    ];
  } else {
    // Favorites
    displayRoutes = favoriteRoutes.map((r) => ({
      ...r,
      image:
        r.cover_image ||
        `https://loremflickr.com/800/600/travel,${encodeURIComponent(r.destination || "city")}/all`,
      duration: `${r.itinerary?.length || 0} дней`,
      safetyLevel: r.safety_info?.level || 10,
      budget: r.total_cost || r.budget || r.budget_range,
      tags: r.tags || [],
    }));
  }

  const allTags = Array.from(
    new Set(displayRoutes.flatMap((r) => r.tags || [])),
  ).filter(Boolean) as string[];

  const filteredRoutes = displayRoutes.filter((route) => {
    const matchesSearch =
      searchQuery === "" ||
      route.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.destination?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag =
      !selectedTag || (route.tags && route.tags.includes(selectedTag));

    return matchesSearch && matchesTag;
  });

  const title = view === "my" ? "Ваша коллекция" : "Избранное";
  const description =
    view === "my"
      ? "Маршруты, которые вы создали."
      : "Маршруты, которые вам понравились.";

  const hasMore = view === "my" ? hasMoreRoutes : false;

  const { resolvedTheme } = useTheme();

  return (
    <AppLayout title={title} description={description} className="trip-bg">
      <div className="fixed inset-0 z-0 opacity-100 pointer-events-none">
        <FloatingIcons />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="mb-10 flex flex-col gap-6">
          <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-6">
            <div className="trip-glass p-1.5 rounded-2xl border border-white/20 backdrop-blur-md inline-flex w-full md:w-auto overflow-x-auto hide-scrollbar">
              <Button
                variant="ghost"
                onClick={() => setView("favorites")}
                className={cn(
                  "px-8 rounded-xl transition-all duration-300 whitespace-nowrap",
                  view === "favorites"
                    ? "bg-white/20 text-slate-800 dark:text-white shadow-lg border border-white/10"
                    : "text-slate-600 dark:text-white/60 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white",
                )}
              >
                Избранное
              </Button>
              <Button
                variant="ghost"
                onClick={() => setView("my")}
                className={cn(
                  "px-8 rounded-xl transition-all duration-300 whitespace-nowrap",
                  view === "my"
                    ? "bg-white/20 text-slate-800 dark:text-white shadow-lg border border-white/10"
                    : "text-slate-600 dark:text-white/60 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white",
                )}
              >
                Мои маршруты
              </Button>
            </div>

            <div className="w-full md:w-auto relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="text"
                placeholder={
                  view === "my"
                    ? "Поиск по моим маршрутам..."
                    : "Поиск по избранному..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 w-full md:w-[400px] shadow-md md:shadow-xl border border-white/20 bg-white/40 dark:bg-black/40 backdrop-blur-md md:backdrop-blur-xl rounded-full pl-12 pr-4 outline-none focus:ring-2 focus:ring-primary/50 text-slate-800 dark:text-white transition-all placeholder:text-slate-500"
              />
            </div>
          </div>

          {allTags.length > 0 && (
            <div className="flex overflow-x-auto pb-4 gap-2 hide-scrollbar mask-edges">
              <button
                onClick={() => setSelectedTag(null)}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all border outline-none focus:ring-2 focus:ring-primary/50",
                  !selectedTag
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-white/60 dark:bg-black/40 border-white/20 text-slate-600 dark:text-white/70 hover:bg-white/80 dark:hover:bg-white/10 backdrop-blur-md",
                )}
              >
                Все
              </button>
              {allTags.map((tag) => {
                const cleanTag = tag.toLowerCase().replace("#", "").trim();
                const matchKey =
                  Object.keys(tagIcons).find((key) =>
                    cleanTag.includes(key.toLowerCase()),
                  ) || "default";
                const TagIcon = tagIcons[matchKey] || tagIcons["default"];

                return (
                  <button
                    key={tag}
                    onClick={() =>
                      setSelectedTag(tag === selectedTag ? null : tag)
                    }
                    className={cn(
                      "flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all border outline-none focus:ring-2 focus:ring-primary/50",
                      tag === selectedTag
                        ? "bg-primary text-primary-foreground border-primary shadow-md"
                        : "bg-white/60 dark:bg-black/40 border-white/20 text-slate-600 dark:text-white/70 hover:bg-white/80 dark:hover:bg-white/10 backdrop-blur-md",
                    )}
                  >
                    <TagIcon className="h-3.5 w-3.5" />
                    {tag.replace("#", "")}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
              {filteredRoutes.length > 0 ? (
                filteredRoutes.map((trip, index) => {
                  const isFav = favoriteIds.has(trip.id);
                  return (
                    <FadeIn key={trip.id} delay={index * 50} className="h-full">
                      <Card className="group relative flex flex-col h-full overflow-hidden border border-white/20 trip-glass shadow-md md:shadow-xl backdrop-blur-md md:backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-md md:shadow-2xl rounded-[2rem] hover:bg-white/40 dark:hover:bg-black/40">
                        {/* Image Section */}
                        <div className="relative h-72 w-full shrink-0 overflow-hidden rounded-t-[2rem]">
                          <TripImage
                            src={trip.image}
                            query={trip.destination || "travel"}
                            alt={trip.title}
                            className="h-full w-full"
                            imgClassName="transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-card via-card/80 to-transparent dark:from-zinc-900 dark:via-zinc-900/80" />

                          {/* Favorite Button (Heart) */}
                          <div className="absolute top-4 left-4 z-30">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md text-white border-white/10"
                              onClick={(e) => handleToggleFavorite(trip.id, e)}
                            >
                              <Heart
                                className={cn(
                                  "h-5 w-5 transition-all duration-300",
                                  isFav
                                    ? "fill-rose-500 text-rose-500 scale-110"
                                    : "text-white",
                                )}
                              />
                            </Button>
                          </div>

                          {/* Safety Badge */}
                          <div className="absolute top-4 right-4 relative z-20 scale-90 origin-top-right">
                            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/90 text-white px-2 py-0.5 shadow-lg border border-emerald-400/30">
                              <Shield className="h-3 w-3" />
                              <div className="flex flex-col leading-none">
                                <span className="text-[7px] uppercase font-black opacity-90 tracking-tighter">
                                  Безопасность
                                </span>
                                <span className="text-[10px] font-black text-white">
                                  {trip.safetyLevel || 10}/10
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex flex-1 flex-col p-6 pt-0 relative z-10 -mt-20">
                          {/* Destination Flag/Name */}
                          <div className="mb-3 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-primary" />
                              {trip.destination}
                            </div>
                            <div className="h-1 w-1 rounded-full bg-border dark:bg-white/20" />
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                              {trip.duration}
                            </div>
                          </div>

                          <h3 className="text-2xl font-bold text-foreground dark:text-white mb-3 leading-tight group-hover:text-primary transition-colors">
                            {trip.title}
                          </h3>

                          <p className="mb-6 text-sm leading-relaxed text-muted-foreground dark:text-zinc-400 line-clamp-3 font-medium">
                            {trip.description}
                          </p>

                          <div className="mb-8 flex flex-wrap gap-2 mt-auto">
                            {trip.tags?.map((tag: string) => {
                              const cleanTag = tag
                                .toLowerCase()
                                .replace("#", "")
                                .trim();
                              const matchKey =
                                Object.keys(tagIcons).find((key) =>
                                  cleanTag.includes(key.toLowerCase()),
                                ) || "default";
                              const colorKey =
                                Object.keys(tagColors).find((key) =>
                                  cleanTag.includes(key.toLowerCase()),
                                ) || "default";
                              const TagIcon =
                                tagIcons[matchKey] || tagIcons["default"];
                              const colorClass =
                                tagColors[colorKey] || tagColors["default"];

                              return (
                                <span
                                  key={tag}
                                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide shadow-sm transition-transform hover:scale-105 ${colorClass}`}
                                >
                                  <TagIcon className="h-3 w-3" />
                                  {tag.replace("#", "")}
                                </span>
                              );
                            })}

                            {trip.status === "completed" && (
                              <Link href={`/trip/completed?tripId=${trip.id}`}>
                                <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide shadow-sm transition-transform hover:scale-105 bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-400/30 cursor-pointer hover:bg-blue-500/30">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Завершен
                                </span>
                              </Link>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-0 mt-auto">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                <Wallet className="h-5 w-5 text-blue-400" />
                              </div>
                              <span className="text-xl font-black text-foreground dark:text-white tracking-tight">
                                {typeof trip.budget === "number"
                                  ? new Intl.NumberFormat("ru-RU", {
                                      style: "currency",
                                      currency: "RUB",
                                      maximumFractionDigits: 0,
                                    }).format(trip.budget)
                                  : trip.budget
                                    ? trip.budget.toString().replace("₽", " ₽")
                                    : "Цена не указана"}
                              </span>
                            </div>

                            <Button
                              asChild
                              className="rounded-full bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-primary/90 dark:hover:bg-white/90 font-bold px-8 h-12 shadow-lg transition-all hover:scale-105 group/btn"
                            >
                              <Link href={`/trip/${trip.id}`}>
                                Открыть
                                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </FadeIn>
                  );
                })
              ) : (
                <div className="col-span-full py-20 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 dark:bg-white/5 border border-border/50 dark:border-white/10">
                    <Sparkles className="h-10 w-10 text-muted-foreground opacity-50" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground dark:text-white">
                    {view === "favorites"
                      ? "Нет избранных маршрутов"
                      : "Пока нет маршрутов"}
                  </h3>
                  <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                    {view === "my"
                      ? "Вы еще не создали ни одного маршрута."
                      : "Добавляйте понравившиеся маршруты в избранное, чтобы вернуться к ним позже."}
                  </p>
                  {view === "my" && (
                    <Button
                      asChild
                      className="mt-8 rounded-full px-8 py-6 text-lg shadow-glow"
                      variant="default"
                    >
                      <Link href="/plan">Спланировать поездку</Link>
                    </Button>
                  )}
                </div>
              )}
            </div>

            {hasMore && view === "my" && (
              <div className="flex justify-center py-8">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="rounded-full px-8 py-3 h-auto font-semibold border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Загружаем...
                    </>
                  ) : (
                    <>Загрузить ещё маршруты</>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
