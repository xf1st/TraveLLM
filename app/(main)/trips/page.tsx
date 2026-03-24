"use client";

import { useState, useEffect, Suspense, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import {
  Search,
  ArrowRight,
  Sparkles,
  MapPin,
  Loader2,
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
  Plus,
  Globe,
  Clock,
  CheckCircle2,
  Shield,
  TrendingUp,
  Star,
} from "lucide-react";
import { TripImage } from "@/components/TripImage";
import { FadeIn } from "@/components/FadeIn";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AppEmptyState } from "@/components/ui/empty-state";

// ─── Tag config (same as /trips) ───────────────────────────────────────────
const tagColors: Record<string, string> = {
  пляж: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
  шопинг: "bg-pink-500/20 text-pink-300 border border-pink-500/30",
  аквапарк: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  горы: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  море: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  природа: "bg-green-500/20 text-green-300 border border-green-500/30",
  культура: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  развлечения: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
  вино: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  гастрономия: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
  еда: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
  релакс: "bg-teal-500/20 text-teal-300 border border-teal-500/30",
  история: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  активный: "bg-lime-500/20 text-lime-300 border border-lime-500/30",
  дайвинг: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  уникальный: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
  default: "bg-white/10 text-white/70 border border-white/15",
};

const tagIcons: Record<string, any> = {
  пляж: Palmtree, море: Waves, горы: Mountain, природа: TreeDeciduous,
  гастрономия: Utensils, еда: Utensils, вино: Utensils,
  шопинг: ShoppingBag, культура: Landmark, история: Landmark,
  развлечения: Music, активный: Tent, релакс: Sparkles,
  дайвинг: Waves, уникальный: Camera, аквапарк: Waves,
  default: Sparkles,
};

function getTagStyle(tag: string) {
  const clean = tag.toLowerCase().replace("#", "").trim();
  const colorKey = Object.keys(tagColors).find(k => clean.includes(k)) || "default";
  const iconKey = Object.keys(tagIcons).find(k => clean.includes(k)) || "default";
  return { color: tagColors[colorKey], Icon: tagIcons[iconKey] };
}

// ─── Featured Card (first / hero trip) ───────────────────────────────────────
function FeaturedTripCard({ trip, isFav, onToggleFav }: { trip: any; isFav: boolean; onToggleFav: (id: string, e: React.MouseEvent) => void }) {
  const t = useTranslations("trips");
  const locale = useLocale();
  return (
    <Link href={`/trip/${trip.id}`} className="group block">
      <div className="relative overflow-hidden rounded-2xl sm:rounded-[2.5rem] h-[200px] sm:h-[320px] md:h-[380px] shadow-md md:shadow-2xl border border-white/10">
        {/* Image */}
        <TripImage
          src={trip.image}
          query={trip.destination || "travel"}
          alt={trip.title}
          className="absolute inset-0 w-full h-full"
          imgClassName="transition-transform duration-700 group-hover:scale-105"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

        {/* Top badges */}
        <div className="absolute top-3 sm:top-5 left-3 sm:left-5 right-3 sm:right-5 flex items-center justify-between z-10">
          <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/90 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full">
            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
            {t("latestBadge")}
          </span>
          {/* Mobile: compact label */}
          <span className="sm:hidden flex items-center gap-1 text-[9px] font-black uppercase text-amber-300">
            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            {t("newest")}
          </span>
          <button
            onClick={(e) => onToggleFav(trip.id, e)}
            className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-black/50 transition-colors"
          >
            <Heart className={cn("h-3 sm:h-4 w-3 sm:w-4 transition-all", isFav ? "fill-rose-500 text-rose-500" : "text-white")} />
          </button>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-6 md:p-8 z-10">
          <div className="flex items-center gap-1.5 sm:gap-2 text-white/60 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-1.5 sm:mb-3">
            <MapPin className="h-2.5 sm:h-3 w-2.5 sm:w-3 text-primary shrink-0" />
            <span className="truncate">{trip.destination}</span>
            <span className="text-white/30 shrink-0">·</span>
            <Clock className="h-2.5 sm:h-3 w-2.5 sm:w-3 shrink-0" />
            <span className="shrink-0">{trip.duration}</span>
          </div>

          <h2 className="text-sm sm:text-2xl md:text-3xl font-black text-white leading-tight mb-2 sm:mb-4 line-clamp-2 group-hover:text-primary transition-colors">
            {trip.title}
          </h2>

          {/* Tags + budget + button — скрыты на мобилке */}
          <div className="hidden sm:flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {(trip.tags || []).slice(0, 3).map((tag: string) => {
                const { color, Icon } = getTagStyle(tag);
                return (
                  <span key={tag} className={cn("flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full", color)}>
                    <Icon className="h-2.5 w-2.5" />
                    {tag.replace("#", "")}
                  </span>
                );
              })}
            </div>
              <div className="flex items-center gap-4">
              {trip.budget && (
                <span className="whitespace-nowrap text-white font-black text-lg">
                  {typeof trip.budget === "number"
                    ? new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 0 }).format(trip.budget) + " ₽"
                    : trip.budget.toString().replace("₽", " ₽")}
                </span>
              )}
              <div className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm group-hover:bg-primary group-hover:text-white transition-all shadow-lg">
                {t("open")} <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Mobile: budget only */}
          <div className="sm:hidden flex items-center justify-between">
            {trip.budget && (
              <span className="whitespace-nowrap text-white font-black text-xs">
                {typeof trip.budget === "number"
                  ? new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 0 }).format(trip.budget) + " ₽"
                  : trip.budget.toString().replace("₽", " ₽")}
              </span>
            )}
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowRight className="h-3 w-3 text-white" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Grid Card ────────────────────────────────────────────────────────────────
function TripCard({ trip, isFav, onToggleFav, index }: { trip: any; isFav: boolean; onToggleFav: (id: string, e: React.MouseEvent) => void; index: number }) {
  const t = useTranslations("trips");
  const locale = useLocale();
  const budget = trip.budget
    ? (typeof trip.budget === "number"
      ? new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 0 }).format(trip.budget) + " ₽"
      : trip.budget.toString().replace("₽", " ₽"))
    : null;

  return (
    <FadeIn delay={index * 40} className="h-full">
      <Link href={`/trip/${trip.id}`} className="group block h-full">

        {/* ── Mobile: горизонтальная полоска ── */}
        <div className="sm:hidden flex h-[140px] overflow-hidden rounded-2xl border border-white/10 shadow-md trip-glass hover:border-white/20 transition-all active:scale-[0.98]">
          {/* Картинка слева */}
          <div className="relative w-[130px] shrink-0 overflow-hidden">
            <TripImage
              src={trip.image}
              query={trip.destination || "travel"}
              alt={trip.title}
              className="absolute inset-0 w-full h-full"
              imgClassName="transition-transform duration-500 group-hover:scale-105"
            />
            {/* Fav overlay */}
            <button
              onClick={(e) => onToggleFav(trip.id, e)}
              className="absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
            >
              <Heart className={cn("h-3 w-3", isFav ? "fill-rose-500 text-rose-500" : "text-white/80")} />
            </button>
            {trip.status === "completed" && (
              <div className="absolute bottom-1.5 left-1.5">
                <span className="flex items-center gap-0.5 text-[8px] font-black uppercase bg-blue-500/90 text-white px-1.5 py-0.5 rounded-full">
                  <CheckCircle2 className="h-2 w-2" />
                  {t("completed")}
                </span>
              </div>
            )}
          </div>

          {/* Контент справа */}
          <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground truncate flex items-center gap-1 mb-1">
                <MapPin className="h-2 w-2 text-primary shrink-0" />
                {trip.destination}
                {trip.duration && <><span className="text-muted-foreground/40">·</span>{trip.duration}</>}
              </p>
              <h3 className="text-xs font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {trip.title}
              </h3>
            </div>

            <div className="space-y-1.5">
              {/* Теги */}
              {(trip.tags || []).length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {(trip.tags as string[]).slice(0, 3).map((tag) => {
                    const { color, Icon } = getTagStyle(tag);
                    return (
                      <span key={tag} className={cn("flex items-center gap-0.5 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full", color)}>
                        <Icon className="h-1.5 w-1.5" />{tag.replace("#", "")}
                      </span>
                    );
                  })}
                </div>
              )}
              {/* Бюджет + стрелка */}
              <div className="flex items-center justify-between">
                {budget && <span className="whitespace-nowrap text-[11px] font-black text-foreground">{budget}</span>}
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all ml-auto" />
              </div>
            </div>
          </div>
        </div>

        <div className="hidden sm:block relative overflow-hidden rounded-[2rem] h-full min-h-[260px] border border-white/10 shadow-md md:shadow-xl hover:-translate-y-1 transition-all duration-300 hover:border-white/20 hover:shadow-md md:shadow-2xl">
          <TripImage
            src={trip.image}
            query={trip.destination || "travel"}
            alt={trip.title}
            className="absolute inset-0 w-full h-full"
            imgClassName="transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <div className="flex items-center gap-1 bg-emerald-500/90 text-white text-[9px] font-black uppercase px-2 py-1 rounded-full whitespace-nowrap">
              <Shield className="h-2.5 w-2.5" />{trip.safetyLevel || 10}/10
            </div>
            <button
              onClick={(e) => onToggleFav(trip.id, e)}
              className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-black/60 transition-colors"
            >
              <Heart className={cn("h-3.5 w-3.5 transition-all", isFav ? "fill-rose-500 text-rose-500" : "text-white")} />
            </button>
          </div>

          {trip.status === "completed" && (
            <div className="absolute top-4 left-4 z-10">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/trip/completed?tripId=${trip.id}` }}
                className="flex items-center gap-1 text-[9px] font-black uppercase bg-blue-500/80 text-white px-2 py-1 rounded-full backdrop-blur-md hover:bg-blue-500 transition-colors whitespace-nowrap"
              >
                <CheckCircle2 className="h-2.5 w-2.5" />{t("completed")}
              </button>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
            <div className="flex items-center gap-1.5 text-white/50 text-[10px] font-semibold uppercase tracking-widest mb-2">
              <MapPin className="h-2.5 w-2.5 text-primary shrink-0" />
              <span className="truncate">{trip.destination}</span>
              <span className="text-white/20 shrink-0">·</span>
              <span className="shrink-0">{trip.duration}</span>
            </div>
            <h3 className="text-base font-bold text-white leading-snug mb-3 line-clamp-2 group-hover:text-primary transition-colors">
              {trip.title}
            </h3>
            {(trip.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(trip.tags as string[]).slice(0, 2).map((tag) => {
                  const { color, Icon } = getTagStyle(tag);
                  return (
                    <span key={tag} className={cn("flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full", color)}>
                      <Icon className="h-2 w-2" />{tag.replace("#", "")}
                    </span>
                  );
                })}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="whitespace-nowrap text-white font-black text-sm">{budget || "—"}</span>
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all">
                <ArrowRight className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
          </div>
        </div>

      </Link>
    </FadeIn>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ view }: { view: "my" | "favorites" }) {
  const t = useTranslations("trips");
  return (
    <div className="col-span-full">
      <AppEmptyState
        icon={view === "favorites" ? Heart : Globe}
        title={view === "favorites" ? t("noFavorites") : t("empty")}
        description={view === "my" ? t("emptySubtitle") : t("noFavoritesHint")}
        badge={<Sparkles className="h-4 w-4 text-amber-400" aria-hidden />}
      >
        {view === "my" && (
          <Button asChild className="rounded-full px-8 py-5 text-base font-bold shadow-lg hover:scale-105 transition-transform">
            <Link href="/plan">
              <Plus className="h-4 w-4 mr-2" />
              {t("createFirst")}
            </Link>
          </Button>
        )}
      </AppEmptyState>
    </div>
  );
}

function TripsLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Skeleton className="h-[200px] w-full rounded-2xl sm:h-[320px] sm:rounded-[2.5rem]" />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[140px] w-full rounded-2xl sm:h-[260px]" />
        ))}
      </div>
    </div>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────
function TripsContent() {
  const t = useTranslations("trips");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const source = searchParams.get("source");

  const [userRoutes, setUserRoutes] = useState<any[]>([]);
  const [favoriteRoutes, setFavoriteRoutes] = useState<any[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"my" | "favorites">(source === "favorites" ? "favorites" : "my");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [hasMoreRoutes, setHasMoreRoutes] = useState(true);
  const [totalRoutes, setTotalRoutes] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isLoadingMoreRef = useRef(false);
  const PAGE_SIZE = 12;

  // Fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user || null;

        if (user) {
          const { count } = await supabase
            .from("trips").select("*", { count: "exact", head: true }).eq("user_id", user.id);
          setTotalRoutes(count || 0);
          setHasMoreRoutes((count || 0) > PAGE_SIZE);

          const { data: myTrips } = await supabase
            .from("trips").select("*").eq("user_id", user.id)
            .order("created_at", { ascending: false }).range(0, PAGE_SIZE - 1);
          if (myTrips) setUserRoutes(myTrips);

          const { data: favs } = await supabase
            .from("favorites").select("trip_id, trips(*)").eq("user_id", user.id)
            .order("created_at", { ascending: false });
          if (favs) {
            setFavoriteIds(new Set(favs.map((f: any) => f.trip_id)));
            setFavoriteRoutes(favs.map((f: any) => f.trips).filter(Boolean));
          }
        }
      } catch (e) {
        console.warn("Error fetching trips:", e);
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
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const from = userRoutes.length;
        const { data } = await supabase.from("trips").select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
        if (data && data.length > 0) {
          setUserRoutes(prev => [...prev, ...data]);
          setHasMoreRoutes(from + data.length < totalRoutes);
        } else setHasMoreRoutes(false);
      }
    } catch (e) {}
    setIsLoadingMore(false);
    isLoadingMoreRef.current = false;
  };

  const handleToggleFav = async (tripId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isFav = favoriteIds.has(tripId);
    const newFavs = new Set(favoriteIds);
    if (isFav) {
      newFavs.delete(tripId);
      setFavoriteRoutes(prev => prev.filter(r => r.id !== tripId));
    } else {
      newFavs.add(tripId);
      const trip = userRoutes.find(r => r.id === tripId);
      if (trip) setFavoriteRoutes(prev => [trip, ...prev]);
    }
    setFavoriteIds(newFavs);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("trip_id", tripId);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, trip_id: tripId });
    }
  };

  // Normalize display routes
  const normalize = (r: any) => ({
    ...r,
    image: r.cover_image || undefined,
    duration: `${r.itinerary?.length || 0} ${t("days")}`,
    safetyLevel: r.safety_info?.level || 10,
    budget: r.total_cost || r.budget || r.budget_range,
    tags: r.tags || [],
  });

  const displayRoutes = useMemo(() =>
    (view === "my" ? userRoutes : favoriteRoutes).map(normalize),
    [view, userRoutes, favoriteRoutes]
  );

  const allTags = useMemo(() =>
    Array.from(new Set(displayRoutes.flatMap(r => r.tags || []))).filter(Boolean) as string[],
    [displayRoutes]
  );

  const filteredRoutes = useMemo(() =>
    displayRoutes.filter(r => {
      const matchSearch = !searchQuery ||
        r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.destination?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTag = !selectedTag || (r.tags || []).includes(selectedTag);
      return matchSearch && matchTag;
    }),
    [displayRoutes, searchQuery, selectedTag]
  );

  // Unique destination count
  const uniqueDests = useMemo(() =>
    new Set(userRoutes.map(r => r.destination).filter(Boolean)).size,
    [userRoutes]
  );

  const [featured, ...rest] = filteredRoutes;
  const hasMore = view === "my" ? hasMoreRoutes : false;

  return (
    <AppLayout title={t("title")} description={t("description")} className="trip-bg">
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">

        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{t("collectionLabel")}</p>
            <h1 className="text-3xl md:text-4xl font-black text-foreground leading-none">
              {t("title")}
            </h1>
          </div>
          {/* Stats row */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 trip-glass px-4 py-2.5 rounded-2xl border border-white/20 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-black text-foreground">{totalRoutes}</span>
              <span className="text-muted-foreground font-medium">{t("routesCount")}</span>
            </div>
            <div className="flex items-center gap-2 trip-glass px-4 py-2.5 rounded-2xl border border-white/20 text-sm">
              <Globe className="h-4 w-4 text-emerald-400" />
              <span className="font-black text-foreground">{uniqueDests}</span>
              <span className="text-muted-foreground font-medium">{t("destinationsCount")}</span>
            </div>
            <Button asChild size="sm" className="rounded-full px-5 py-2.5 h-auto font-bold shadow-lg hover:scale-105 transition-transform">
              <Link href="/plan">
                <Plus className="h-4 w-4 mr-1.5" />
                {t("newTrip")}
              </Link>
            </Button>
          </div>
        </div>

        {/* ─── Controls ─── */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* View tabs */}
            <div className="flex trip-glass border border-white/20 rounded-2xl p-1 gap-1 w-full sm:w-auto">
              {(["my", "favorites"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => { setView(v); setSelectedTag(null); setSearchQuery(""); }}
                  className={cn(
                    "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                    view === v
                      ? "bg-white dark:bg-white/15 text-foreground shadow-sm border border-white/30 dark:border-white/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-white/5"
                  )}
                >
                  {v === "my" ? (
                    <><Globe className="h-3.5 w-3.5" /> {t("myTrips")} {totalRoutes > 0 && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-black">{totalRoutes}</span>}</>
                  ) : (
                    <><Heart className="h-3.5 w-3.5" /> {t("favorites")} {favoriteRoutes.length > 0 && <span className="text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-full font-black">{favoriteRoutes.length}</span>}</>
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
              <input
                type="text"
                placeholder={t("search")}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-11 pr-4 rounded-2xl border border-white/20 bg-white/30 dark:bg-white/5 backdrop-blur-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>
          </div>

          {/* Tag pills */}
          {allTags.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedTag(null)}
                className={cn(
                  "shrink-0 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all border",
                  !selectedTag
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-white/20 text-muted-foreground hover:text-foreground hover:border-white/40"
                )}
              >
                {tc("all")}
              </button>
              {allTags.map(tag => {
                const { color, Icon } = getTagStyle(tag);
                const active = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(active ? null : tag)}
                    className={cn(
                      "shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all border",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-white/20 text-muted-foreground hover:text-foreground hover:border-white/40"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {tag.replace("#", "")}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Content ─── */}
        {loading ? (
          <TripsLoadingSkeleton />
        ) : filteredRoutes.length === 0 ? (
          <div className="grid">
            <EmptyState view={view} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Featured card (first result) */}
            {featured && (
              <FadeIn delay={0}>
                <FeaturedTripCard
                  trip={featured}
                  isFav={favoriteIds.has(featured.id)}
                  onToggleFav={handleToggleFav}
                />
              </FadeIn>
            )}

            {/* Grid: rest of trips */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-5 auto-rows-fr">
                {rest.map((trip, i) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    isFav={favoriteIds.has(trip.id)}
                    onToggleFav={handleToggleFav}
                    index={i}
                  />
                ))}
              </div>
            )}

            {/* Load more */}
            {hasMore && view === "my" && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="flex items-center gap-2 px-8 py-3 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-sm font-semibold transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> {t("loadingMore")}</>
                  ) : (
                    <>{t("loadMore")}</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function TripsPage() {
  return (
    <Suspense
      fallback={
        <AppLayout title="" description="" className="trip-bg">
          <div className="relative z-10 mx-auto max-w-7xl space-y-8">
            <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-end sm:justify-between">
              <Skeleton className="h-10 w-48 rounded-lg" />
              <Skeleton className="h-12 w-full rounded-2xl sm:w-64" />
            </div>
            <TripsLoadingSkeleton />
          </div>
        </AppLayout>
      }
    >
      <TripsContent />
    </Suspense>
  );
}
