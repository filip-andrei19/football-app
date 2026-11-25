import React, { useState, useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Sparkles, Star, MapPin, Ruler, Weight, Calendar, Clock, Loader2, Shield } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

const GENERIC_USER_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

interface Player {
  _id: string;
  name: string;
  position: string;
  age: number;
  nationality?: string;
  birth_date?: string;
  birth_place?: string;
  height?: string;
  weight?: string;
  image?: string;
  team_name?: string;
  team?: string;
  team_logo?: string;
  statistics_summary?: {
    team_name?: string;
    total_goals: number;
    total_assists: number;
    total_appearances: number;
    minutes_played?: number;
    rating?: string;
  };
}

const FutureStarSkeleton = () => (
  <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#11161D] p-4 animate-pulse h-[370px] flex flex-col">
    <div className="flex items-center justify-between mb-4">
      <div className="h-5 w-12 bg-slate-200 dark:bg-white/[0.06] rounded-md" />
      <div className="h-5 w-14 bg-slate-200 dark:bg-white/[0.06] rounded-md" />
    </div>
    <div className="flex flex-col items-center space-y-2.5 flex-1">
      <div className="h-16 w-16 bg-slate-200 dark:bg-white/[0.06] rounded-full" />
      <div className="h-4 bg-slate-200 dark:bg-white/[0.06] rounded w-3/4 mt-2" />
      <div className="h-3 bg-slate-100 dark:bg-white/[0.04] rounded w-1/2" />
      <div className="w-full grid grid-cols-2 gap-2 mt-4">
        <div className="h-12 bg-slate-100 dark:bg-white/[0.04] rounded-lg" />
        <div className="h-12 bg-slate-100 dark:bg-white/[0.04] rounded-lg" />
      </div>
    </div>
    <div className="h-11 bg-slate-100 dark:bg-white/[0.04] rounded-lg w-full mt-auto" />
  </div>
);

const FILTERS = ["Toate", "Portari", "Fundași", "Mijlocași", "Atacanți"];

const getPlayerAge = (player: Player): number | null => {
  if (player.age && player.age > 0) return player.age;
  if (player.birth_date) {
    const birthYear = new Date(player.birth_date).getFullYear();
    const currentYear = new Date().getFullYear();
    if (!isNaN(birthYear)) {
      return currentYear - birthYear;
    }
  }
  return null;
};

export function FutureStarsSection() {
  const [activeFilter, setActiveFilter] = useState("Toate");
  const { ref: loadMoreRef, inView } = useInView();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const API_URL =
    (import.meta as any).env?.VITE_API_URL ||
    (window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : "https://football-backend-m2a4.onrender.com");

  const fetchYoungTalents = async ({ pageParam = 1 }) => {
    try {
      const response = await fetch(`${API_URL}/api/sport/players?u21=true&page=${pageParam}&limit=12&t=${Date.now()}`);
      if (!response.ok) throw new Error("Eroare la preluarea datelor");
      return await response.json();
    } catch (err) {
      console.error("Eroare FETCH Future Stars:", err);
      throw err;
    }
  };

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status
  } = useInfiniteQuery({
    queryKey: ['futureStars'],
    queryFn: fetchYoungTalents,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 12 ? allPages.length + 1 : undefined;
    },
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPlayers = data ? data.pages.flatMap(page => page) : [];
  const uniquePlayers = Array.from(new Map(allPlayers.map(p => [p.name, p])).values());

  const processedPlayers = uniquePlayers
    .filter((p: Player) => {
      const playerAge = getPlayerAge(p);
      return playerAge !== null && playerAge <= 21;
    })
    .sort((a: Player, b: Player) => {
      const ratingA = parseFloat(a.statistics_summary?.rating || "0");
      const ratingB = parseFloat(b.statistics_summary?.rating || "0");
      if (ratingB !== ratingA) return ratingB - ratingA;
      return (b.statistics_summary?.total_goals || 0) - (a.statistics_summary?.total_goals || 0);
    });

  const getFilteredPlayers = () => {
    if (activeFilter === "Toate") return processedPlayers;

    return processedPlayers.filter(player => {
      const pos = (player.position || "").toLowerCase();

      if (activeFilter === "Portari") return pos.includes("goalkeeper") || pos.includes("portar");
      if (activeFilter === "Fundași") return pos.includes("defender") || pos.includes("back") || pos.includes("funda");
      if (activeFilter === "Mijlocași") return pos.includes("midfield") || pos.includes("mijloca");
      if (activeFilter === "Atacanți") return pos.includes("forward") || pos.includes("striker") || pos.includes("wing") || pos.includes("ataca") || pos.includes("attack");

      return false;
    });
  };

  const filteredPlayers = getFilteredPlayers();

  const getColumnsCount = () => {
    if (typeof window === 'undefined') return 1;
    if (window.innerWidth >= 1280) return 4;
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 640) return 2;
    return 1;
  };

  const [columns, setColumns] = useState(getColumnsCount());

  useEffect(() => {
    const handleResize = () => setColumns(getColumnsCount());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const numRows = Math.ceil(filteredPlayers.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: numRows,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => (window.innerWidth < 640 ? 395 : 410),
    overscan: 2,
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (status === 'error') {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white dark:bg-[#11161D] border border-rose-500/25 rounded-xl text-center">
        <p className="text-sm font-medium text-rose-500">
          Eroare la încărcarea datelor: {(error as Error).message}
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="relative h-[80vh] overflow-y-auto pb-16 scrollbar-hide">
      {/* Header */}
      <section className="text-center space-y-1.5 pt-2 sm:pt-4 mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-medium mb-1">
          <Sparkles className="w-3.5 h-3.5" /> Scouting U21
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Future Stars
        </h1>
        <p className="max-w-md mx-auto text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
          Cei mai promițători jucători sub 21 de ani din baza de date.
        </p>
      </section>

      {/* Filtre */}
      <section className="mb-6 flex justify-center">
        <div className="inline-flex gap-1 overflow-x-auto scrollbar-hide bg-slate-200/70 dark:bg-white/[0.04] p-1 rounded-lg border border-slate-200 dark:border-white/[0.06] max-w-full">
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => {
                  setActiveFilter(filter);
                  scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`shrink-0 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-[#1A222C] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </section>

      {/* Grila de jucători */}
      <section>
        {status === 'pending' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <FutureStarSkeleton key={i} />)}
          </div>
        ) : filteredPlayers.length === 0 && !isFetching ? (
          <div className="flex flex-col items-center justify-center py-14 bg-white dark:bg-[#11161D] rounded-xl border border-slate-200 dark:border-white/[0.07] text-center px-6 max-w-md mx-auto">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Niciun jucător găsit</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs">
              Nu există jucători U21 disponibili pentru filtrul „{activeFilter}”.
            </p>
            <button
              onClick={() => setActiveFilter("Toate")}
              className="mt-4 text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline cursor-pointer"
            >
              Arată toți jucătorii U21
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const startIndex = virtualRow.index * columns;
                const itemsInRow = filteredPlayers.slice(startIndex, startIndex + columns);

                return (
                  <div
                    key={virtualRow.index}
                    className="absolute top-0 left-0 w-full"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full pb-4">
                      {itemsInRow.map((player) => {
                        const stats = player.statistics_summary || {
                          total_goals: 0,
                          total_assists: 0,
                          total_appearances: 0,
                          minutes_played: 0,
                          rating: "0",
                        };
                        const rating = stats.rating && parseFloat(stats.rating) > 0 ? parseFloat(stats.rating).toFixed(2) : null;
                        const hasBioData = player.birth_date || player.birth_place || player.height || player.weight || player.nationality;
                        const displayAge = getPlayerAge(player) || player.age || 21;
                        const teamNameStr = player.team || player.team_name || "Club";

                        return (
                          <div
                            key={player._id}
                            className="bg-white dark:bg-[#11161D] border border-slate-200 dark:border-white/[0.07] hover:border-amber-500/40 rounded-xl overflow-hidden transition-colors flex flex-col h-full"
                          >
                            {/* Top meta + Avatar */}
                            <div className="p-4 pb-3 flex flex-col items-center text-center relative">
                              <div className="w-full flex items-center justify-between mb-2">
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-semibold tabular-nums">
                                  U{displayAge}
                                </span>
                                {rating ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-white/[0.05] text-amber-500 text-[11px] font-semibold tabular-nums">
                                    <Star className="w-3 h-3 fill-current" /> {rating}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-400">—</span>
                                )}
                              </div>

                              <img
                                src={player.image || GENERIC_USER_IMAGE}
                                alt={player.name}
                                className="h-16 w-16 rounded-full object-cover border border-slate-200 dark:border-white/[0.1] bg-white mb-2.5"
                                onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }}
                              />

                              <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight truncate w-full" title={player.name}>
                                {player.name}
                              </h3>

                              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1 w-full">
                                <Shield className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[160px]">{teamNameStr}</span>
                              </div>

                              <span className="mt-2 inline-flex px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                {player.position || "Jucător"}
                              </span>
                            </div>

                            {/* Bio Grid */}
                            {hasBioData && (
                              <div className="px-4 pb-3 flex-1">
                                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-[#0B0F14] rounded-lg p-2.5 border border-slate-200/80 dark:border-white/[0.05] text-xs">
                                  {player.birth_date && (
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                        <Calendar className="w-2.5 h-2.5 shrink-0" /> Născut
                                      </div>
                                      <span className="font-medium text-slate-700 dark:text-slate-200 truncate block tabular-nums">
                                        {formatDate(player.birth_date)}
                                      </span>
                                    </div>
                                  )}
                                  {(player.birth_place || player.nationality) && (
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                        <MapPin className="w-2.5 h-2.5 shrink-0" /> Origine
                                      </div>
                                      <span className="font-medium text-slate-700 dark:text-slate-200 truncate block" title={player.birth_place || player.nationality}>
                                        {player.birth_place || player.nationality}
                                      </span>
                                    </div>
                                  )}
                                  {player.height && (
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                        <Ruler className="w-2.5 h-2.5 shrink-0" /> Înălțime
                                      </div>
                                      <span className="font-medium text-slate-700 dark:text-slate-200 tabular-nums">
                                        {player.height}
                                      </span>
                                    </div>
                                  )}
                                  {player.weight && (
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                        <Weight className="w-2.5 h-2.5 shrink-0" /> Greutate
                                      </div>
                                      <span className="font-medium text-slate-700 dark:text-slate-200 tabular-nums">
                                        {player.weight}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Stats Footer */}
                            <div className="mt-auto border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] px-3 py-2.5">
                              <div className="grid grid-cols-3 divide-x divide-slate-200/70 dark:divide-white/[0.06] text-center tabular-nums">
                                <div>
                                  <span className="block text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                                    {stats.total_appearances}
                                  </span>
                                  <span className="text-[10px] text-slate-500">Meciuri</span>
                                </div>
                                <div>
                                  <div className="flex items-center justify-center gap-1 text-sm font-semibold leading-tight">
                                    <span className="text-emerald-600 dark:text-emerald-400">{stats.total_goals}</span>
                                    <span className="text-slate-300 dark:text-slate-600 font-normal">/</span>
                                    <span className="text-blue-500">{stats.total_assists}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-500">G / A</span>
                                </div>
                                <div>
                                  {stats.minutes_played !== undefined ? (
                                    <>
                                      <div className="flex items-center justify-center gap-1 text-slate-700 dark:text-slate-200 font-semibold text-xs leading-tight pt-0.5">
                                        <Clock className="w-3 h-3 text-slate-400" /> {stats.minutes_played}'
                                      </div>
                                      <span className="text-[10px] text-slate-500">Minute</span>
                                    </>
                                  ) : (
                                    <span className="text-slate-400 text-xs">—</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trigger Infinite Scroll */}
            <div ref={loadMoreRef} className="w-full flex justify-center py-6 mt-2">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 bg-white dark:bg-[#11161D] px-4 py-2 rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 font-medium text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                  Se încarcă mai mulți jucători...
                </div>
              ) : hasNextPage ? (
                <div className="h-6" />
              ) : (
                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                  Aceștia sunt toți jucătorii U21 disponibili.
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}