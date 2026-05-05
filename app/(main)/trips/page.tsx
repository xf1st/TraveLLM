"use client";

import { useState, useEffect, Suspense, useRef, useMemo, useCallback } from "react";
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
  Trash2,
  CheckSquare,
  Square,
  X,
  AlertTriangle,
} from "lucide-react";
import { TripImage } from "@/components/TripImage";
import { FadeIn } from "@/components/FadeIn";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AppEmptyState } from "@/components/ui/empty-state";
import { appToast as toast } from "@/components/ui/sonner";

// ─── Tag config ───────────────────────────────────────────────────────────────
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

// ─── Confirm Delete Dialog ─────────────────────────────────────────────────────
function DeleteConfirmDialog({
  count,
  onConfirm,
  onCancel,
  loading,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const t = useTranslations("trips");
  const tc = useTranslations("common");

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/20">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground">{t("deleteConfirmTitle")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{tc("noUndo") || "This action cannot be undone"}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {t("deleteConfirmBody", { count })}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-11 rounded-2xl border border-white/15 bg-white/5 text-sm font-semibold text-muted-foreground hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {tc("cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-11 rounded-2xl bg-red-500 text-sm font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}</>
            ) : (
              <><Trash2 className="h-4 w-4" /> {tc("delete")}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Featured Card ─────────────────────────────────────────────────────────────
function FeaturedTripCard({
  trip,
  isFav,
  onToggleFav,
  selectMode,
  isSelected,
  onToggleSelect,
}: {
  trip: any;
  isFav: boolean;
  onToggleFav: (id: string, e: React.MouseEvent) => void;
  selectMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const t = useTranslations("trips");
  const locale = useLocale();
  return (
    <div className="relative group">
      {/* Selection overlay */}
      {selectMode && (
        <button
          type="button"
          onClick={() => onToggleSelect(trip.id)}
          className="absolute inset-0 z-20 rounded-2xl sm:rounded-[2.5rem] flex items-start justify-start p-4"
        >
          <div className={cn(
            "flex h-7 w-7 items-center justify-center rounded-xl border-2 transition-all",
            isSelected
              ? "bg-red-500 border-red-500"
              : "bg-black/40 border-white/50 backdrop-blur-md"
          )}>
            {isSelected
              ? <CheckSquare className="h-4 w-4 text-white fill-white" />
              : <Square className="h-4 w-4 text-white" />
            }
          </div>
        </button>
      )}
      <Link
        href={selectMode ? "#" : `/trip/${trip.id}`}
        onClick={selectMode ? (e) => { e.preventDefault(); onToggleSelect(trip.id); } : undefined}
        className="group block"
      >
        <div className={cn(
          "relative overflow-hidden rounded-2xl sm:rounded-[2.5rem] h-[200px] sm:h-[320px] md:h-[380px] shadow-md md:shadow-2xl border transition-all",
          selectMode && isSelected ? "border-red-500/60 ring-2 ring-red-500/40" : "border-white/10"
        )}>
          <TripImage
            src={trip.image}
            query={trip.destination || "travel"}
            alt={trip.title}
            className="absolute inset-0 w-full h-full"
            imgClassName="transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

          <div className="absolute top-3 sm:top-5 left-3 sm:left-5 right-3 sm:right-5 flex items-center justify-between z-10">
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/90 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full">
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              {t("latestBadge")}
            </span>
            <span className="sm:hidden flex items-center gap-1 text-[9px] font-black uppercase text-amber-300">
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              {t("newest")}
            </span>
            {!selectMode && (
              <button
                type="button"
                onClick={(e) => onToggleFav(trip.id, e)}
                className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-full border border-white/20 bg-black/30 backdrop-blur-md transition-colors hover:bg-black/50 sm:h-9 sm:w-9"
              >
                <Heart className={cn("h-3 sm:h-4 w-3 sm:w-4 transition-all", isFav ? "fill-rose-500 text-rose-500" : "text-white")} />
              </button>
            )}
          </div>

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
                {!selectMode && (
                  <div className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm group-hover:bg-primary group-hover:text-white transition-all shadow-lg">
                    {t("open")} <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </div>
            </div>
            <div className="sm:hidden flex items-center justify-between">
              {trip.budget && (
                <span className="whitespace-nowrap text-white font-black text-xs">
                  {typeof trip.budget === "number"
                    ? new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 0 }).format(trip.budget) + " ₽"
                    : trip.budget.toString().replace("₽", " ₽")}
                </span>
              )}
              {!selectMode && (
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <ArrowRight className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

// ─── Grid Card ────────────────────────────────────────────────────────────────
function TripCard({
  trip,
  isFav,
  onToggleFav,
  index,
  selectMode,
  isSelected,
  onToggleSelect,
}: {
  trip: any;
  isFav: boolean;
  onToggleFav: (id: string, e: React.MouseEvent) => void;
  index: number;
  selectMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const t = useTranslations("trips");
  const locale = useLocale();
  const budget = trip.budget
    ? (typeof trip.budget === "number"
      ? new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 0 }).format(trip.budget) + " ₽"
      : trip.budget.toString().replace("₽", " ₽"))
    : null;

  return (
    <FadeIn delay={index * 40} className="h-full">
      <div className="relative h-full group">
        {/* Checkbox overlay */}
        {selectMode && (
          <button
            type="button"
            onClick={() => onToggleSelect(trip.id)}
            className="absolute top-2 left-2 z-20 flex h-7 w-7 items-center justify-center rounded-xl border-2 transition-all shadow-lg"
            style={{ backdropFilter: "blur(8px)" }}
          >
            <div className={cn(
              "flex h-full w-full items-center justify-center rounded-[9px] transition-all",
              isSelected ? "bg-red-500 border-red-500" : "bg-black/40 border-white/50"
            )}>
              {isSelected
                ? <CheckSquare className="h-4 w-4 text-white fill-white" />
                : <Square className="h-4 w-4 text-white" />
              }
            </div>
          </button>
        )}

        <Link
          href={selectMode ? "#" : `/trip/${trip.id}`}
          onClick={selectMode ? (e) => { e.preventDefault(); onToggleSelect(trip.id); } : undefined}
          className="block h-full"
        >
          {/* ── Mobile: горизонтальная полоска ── */}
          <div className={cn(
            "sm:hidden flex h-[140px] overflow-hidden rounded-2xl border shadow-md trip-glass hover:border-white/20 transition-all active:scale-[0.98]",
            selectMode && isSelected ? "border-red-500/60 ring-2 ring-red-500/30" : "border-white/10"
          )}>
            <div className="relative w-[130px] shrink-0 overflow-hidden">
              <TripImage
                src={trip.image}
                query={trip.destination || "travel"}
                alt={trip.title}
                className="absolute inset-0 w-full h-full"
                imgClassName="transition-transform duration-500 group-hover:scale-105"
              />
              {!selectMode && (
                <button
                  type="button"
                  onClick={(e) => onToggleFav(trip.id, e)}
                  className="absolute left-1.5 top-1.5 z-10 flex h-9 w-9 touch-manipulation items-center justify-center rounded-full bg-black/50 backdrop-blur-sm"
                >
                  <Heart className={cn("h-3 w-3", isFav ? "fill-rose-500 text-rose-500" : "text-white/80")} />
                </button>
              )}
              {trip.status === "completed" && (
                <div className="absolute bottom-1.5 left-1.5">
                  <span className="flex items-center gap-0.5 text-[8px] font-black uppercase bg-blue-500/90 text-white px-1.5 py-0.5 rounded-full">
                    <CheckCircle2 className="h-2 w-2" />
                    {t("completed")}
                  </span>
                </div>
              )}
            </div>
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
                <div className="flex items-center justify-between">
                  {budget && <span className="whitespace-nowrap text-[11px] font-black text-foreground">{budget}</span>}
                  {!selectMode && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all ml-auto" />}
                </div>
              </div>
            </div>
          </div>

          {/* ── Desktop card ── */}
          <div className={cn(
            "hidden sm:block relative overflow-hidden rounded-[2rem] h-full min-h-[260px] border shadow-md md:shadow-xl hover:-translate-y-1.5 transition-all duration-500 hover:shadow-2xl",
            selectMode && isSelected
              ? "border-red-500/60 ring-2 ring-red-500/30 hover:border-red-500/70"
              : "border-white/10 hover:border-white/30"
          )}>
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
              {!selectMode && (
                <button
                  type="button"
                  onClick={(e) => onToggleFav(trip.id, e)}
                  className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md transition-colors hover:bg-black/60 sm:h-8 sm:w-8"
                >
                  <Heart className={cn("h-3.5 w-3.5 transition-all", isFav ? "fill-rose-500 text-rose-500" : "text-white")} />
                </button>
              )}
            </div>

            {trip.status === "completed" && (
              <div className="absolute top-4 left-4 z-10">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!selectMode) window.location.href = `/trip/completed?tripId=${trip.id}`; }}
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
                {!selectMode && (
                  <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all">
                    <ArrowRight className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>
      </div>
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
          <Button asChild className="mx-auto flex h-12 w-full max-w-sm touch-manipulation rounded-full px-8 text-base font-bold shadow-lg transition-transform hover:scale-[1.02] sm:h-auto sm:w-auto sm:py-5 sm:hover:scale-105">
            <Link href="/plan" className="flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
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

  // ── Data Processing hooks ──
  const getDurationLabel = useCallback((r: any) => {
    if (Array.isArray(r.itinerary) && r.itinerary.length > 0) return `${r.itinerary.length} ${t("days")}`;
    if (!r.start_date || !r.end_date) return "";

    const start = new Date(r.start_date);
    const end = new Date(r.end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
    return `${days} ${t("days")}`;
  }, [t]);

  const normalize = useCallback((r: any) => ({
    ...r,
    image: r.cover_image || undefined,
    duration: getDurationLabel(r),
    safetyLevel: r.safety_info?.level || 10,
    budget: r.total_cost || r.budget || r.budget_range,
    tags: r.tags || [],
  }), [getDurationLabel]);

  const displayRoutes = useMemo(() =>
    (view === "my" ? userRoutes : favoriteRoutes).map(normalize),
    [view, userRoutes, favoriteRoutes, normalize]
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

  const filteredMyRoutes = useMemo(() =>
    view === "my" ? filteredRoutes : [],
    [filteredRoutes, view]
  );

  // ── Select mode ──
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleSelectMode = () => {
    setSelectMode(v => !v);
    setSelectedIds(new Set());
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const ownIds = filteredMyRoutes.map((r: any) => r.id);
    const allSelected = ownIds.length > 0 && ownIds.every((id: string) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ownIds));
    }
  }, [filteredMyRoutes, selectedIds]);

  // Fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [myRes, favRes] = await Promise.all([
          fetch(`/api/trips?view=my&from=0&limit=${PAGE_SIZE}`, { credentials: "same-origin" }),
          fetch("/api/trips?view=favorites", { credentials: "same-origin" }),
        ]);

        if (!myRes.ok) {
          toast.error(t("loadError"));
          return;
        }
        const myData = await myRes.json();
        const favData = favRes.ok ? await favRes.json() : { trips: [], favoriteIds: [] };

        setTotalRoutes(myData.total || 0);
        setHasMoreRoutes(Boolean(myData.hasMore));
        setUserRoutes(myData.trips || []);
        setFavoriteIds(new Set(favData.favoriteIds || []));
        setFavoriteRoutes(favData.trips || []);
      } catch (e) {
        console.warn("Error fetching trips:", e);
        toast.error(t("loadError"));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const loadMore = async () => {
    if (isLoadingMoreRef.current || !hasMoreRoutes || view !== "my") return;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const from = userRoutes.length;
      const res = await fetch(`/api/trips?view=my&from=${from}&limit=${PAGE_SIZE}`, { credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.trips?.length > 0) {
        setUserRoutes(prev => [...prev, ...data.trips]);
        setHasMoreRoutes(Boolean(data.hasMore));
      } else setHasMoreRoutes(false);
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
    await fetch("/api/favorites/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId }),
    })
  };

  // ── Delete handler ──
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch("/api/trips", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) {
        toast.error(t("deleteError"));
        return;
      }

      // Update local state
      setUserRoutes(prev => prev.filter(r => !selectedIds.has(r.id)));
      setFavoriteRoutes(prev => prev.filter(r => !selectedIds.has(r.id)));
      setFavoriteIds(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
      setTotalRoutes(prev => prev - ids.length);
      setSelectedIds(new Set());
      setSelectMode(false);
      setShowDeleteConfirm(false);
      toast.success(t("deleteSuccess"));
    } catch (e) {
      toast.error(t("deleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

  const allTags = useMemo(() =>
    Array.from(new Set(displayRoutes.flatMap(r => r.tags || []))).filter(Boolean) as string[],
    [displayRoutes]
  );

  const allOwnSelected = filteredMyRoutes.length > 0 &&
    filteredMyRoutes.every((r: any) => selectedIds.has(r.id));

  // Unique destination count
  const uniqueDests = useMemo(() =>
    new Set(userRoutes.map(r => r.destination).filter(Boolean)).size,
    [userRoutes]
  );

  const [featured, ...rest] = filteredRoutes;
  const hasMore = view === "my" ? hasMoreRoutes : false;

  return (
    <>
      {/* ── Delete confirm dialog ── */}
      {showDeleteConfirm && (
        <DeleteConfirmDialog
          count={selectedIds.size}
          onConfirm={handleDeleteSelected}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={isDeleting}
        />
      )}

      <AppLayout className="trip-bg">
        <div className="relative z-10 mx-auto min-w-0 max-w-7xl space-y-6 sm:space-y-8">

          {/* ─── Header ─── */}
          <div className="flex flex-col justify-between gap-4 pt-2 sm:flex-row sm:items-end">
            <div className="min-w-0">
              <h1 className="text-2xl font-black leading-none text-foreground sm:text-3xl md:text-4xl">
                {t("title")}
              </h1>
            </div>
            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="trip-glass flex items-center gap-1.5 rounded-2xl border border-white/20 px-3 py-2 text-xs sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm">
                <TrendingUp className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" />
                <span className="font-black text-foreground">{totalRoutes}</span>
                <span className="font-medium text-muted-foreground">{t("routesCount")}</span>
              </div>
              <div className="trip-glass flex items-center gap-1.5 rounded-2xl border border-white/20 px-3 py-2 text-xs sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm">
                <Globe className="h-3.5 w-3.5 shrink-0 text-emerald-400 sm:h-4 sm:w-4" />
                <span className="font-black text-foreground">{uniqueDests}</span>
                <span className="font-medium text-muted-foreground">{t("destinationsCount")}</span>
              </div>
              <Button asChild size="sm" className="h-10 touch-manipulation rounded-full px-4 py-2.5 text-sm font-bold shadow-lg transition-transform hover:scale-[1.02] sm:h-auto sm:px-5 sm:hover:scale-105">
                <Link href="/plan" className="flex items-center gap-1.5">
                  <Plus className="h-4 w-4" />
                  {t("newTrip")}
                </Link>
              </Button>
            </div>
          </div>

          {/* ─── Controls ─── */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              {/* View tabs */}
              <div className="flex w-full max-w-full gap-1 rounded-2xl border border-white/20 trip-glass p-1 sm:w-auto">
                {(["my", "favorites"] as const).map((v) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => { setView(v); setSelectedTag(null); setSearchQuery(""); if (selectMode) { setSelectMode(false); setSelectedIds(new Set()); } }}
                    className={cn(
                      "flex min-h-11 flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all sm:flex-none sm:min-h-0 sm:px-6",
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
              <div className="group relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary sm:left-4" />
                <input
                  type="text"
                  placeholder={t("search")}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-12 w-full min-w-0 rounded-2xl border border-white/20 bg-white/30 pl-10 pr-4 text-base text-foreground backdrop-blur-md placeholder:text-muted-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-white/5 sm:pl-11 sm:text-sm"
                />
              </div>

              {/* Select / Delete controls — only on "my" tab */}
              {view === "my" && !loading && userRoutes.length > 0 && (
                <div className="flex items-center gap-2">
                  {selectMode ? (
                    <>
                      {/* Cancel */}
                      <button
                        type="button"
                        onClick={toggleSelectMode}
                        className="flex h-12 sm:h-auto touch-manipulation items-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-muted-foreground hover:bg-white/20 transition-all"
                      >
                        <X className="h-4 w-4" />
                        <span className="hidden sm:inline">{tc("cancel")}</span>
                      </button>
                      {/* Select all */}
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className={cn(
                          "flex h-12 sm:h-auto touch-manipulation items-center gap-1.5 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all",
                          allOwnSelected
                            ? "bg-primary/20 border-primary/40 text-primary"
                            : "bg-white/10 border-white/20 text-foreground hover:bg-white/20"
                        )}
                      >
                        <CheckSquare className="h-4 w-4" />
                        <span className="hidden sm:inline">{t("selectAll")}</span>
                      </button>
                      {/* Delete selected */}
                      <button
                        type="button"
                        onClick={() => selectedIds.size > 0 && setShowDeleteConfirm(true)}
                        disabled={selectedIds.size === 0}
                        className={cn(
                          "flex h-12 sm:h-auto touch-manipulation items-center gap-1.5 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all",
                          selectedIds.size > 0
                            ? "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30"
                            : "bg-white/5 border-white/10 text-muted-foreground/50 cursor-not-allowed"
                        )}
                      >
                        <Trash2 className="h-4 w-4" />
                        {selectedIds.size > 0 && (
                          <span className="font-black">{selectedIds.size}</span>
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={toggleSelectMode}
                      className="flex h-12 sm:h-auto touch-manipulation items-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-foreground hover:bg-white/20 transition-all"
                    >
                      <CheckSquare className="h-4 w-4" />
                      <span className="hidden sm:inline">{t("select")}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Select mode status bar ── */}
            {selectMode && (
              <div className="flex items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 animate-in slide-in-from-top-2 duration-200">
                <span className="text-sm font-semibold text-red-400">
                  {selectedIds.size === 0
                    ? t("selectionHint")
                    : t("selectedCount", { count: selectedIds.size })}
                </span>
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    {tc("delete")} {selectedIds.size}
                  </button>
                )}
              </div>
            )}

            {/* Tag pills */}
            {allTags.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className={cn(
                    "shrink-0 touch-manipulation rounded-full border px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition-all sm:px-4 sm:py-1.5",
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
                      type="button"
                      key={tag}
                      onClick={() => setSelectedTag(active ? null : tag)}
                      className={cn(
                        "flex shrink-0 touch-manipulation items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition-all sm:px-4 sm:py-1.5",
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
              {featured && (
                <FadeIn delay={0}>
                  <FeaturedTripCard
                    trip={featured}
                    isFav={favoriteIds.has(featured.id)}
                    onToggleFav={handleToggleFav}
                    selectMode={selectMode && view === "my"}
                    isSelected={selectedIds.has(featured.id)}
                    onToggleSelect={toggleSelect}
                  />
                </FadeIn>
              )}

              {rest.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-5 auto-rows-fr">
                  {rest.map((trip, i) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      isFav={favoriteIds.has(trip.id)}
                      onToggleFav={handleToggleFav}
                      index={i}
                      selectMode={selectMode && view === "my"}
                      isSelected={selectedIds.has(trip.id)}
                      onToggleSelect={toggleSelect}
                    />
                  ))}
                </div>
              )}

              {/* Load more */}
              {hasMore && view === "my" && !selectMode && (
                <div className="flex justify-center px-2 pt-4">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="flex h-12 w-full max-w-md touch-manipulation items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold backdrop-blur-sm transition-all hover:scale-[1.02] hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60 sm:h-auto sm:w-auto sm:px-8 sm:hover:scale-105"
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
    </>
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
