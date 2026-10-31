import React, { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Sparkles, Star, MapPin, Ruler, Weight, Calendar, Clock, Zap, Filter, Loader2, Shield } from 'lucide-react';

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
  <div className="rounded-2xl overflow-hidden border-4 border-amber-200/50 dark:border-amber-900/30 bg-white dark:bg-slate-900 shadow-xl animate-pulse h-[480px] flex flex-col">
    <div className="h-28 bg-amber-100 dark:bg-amber-900/20 w-full relative"></div>
    <div className="pt-14 pb-2 px-4 flex flex-col items-center space-y-3 flex-1">
        <div className="h-20 w-20 bg-amber-200 dark:bg-amber-800 rounded-full -mt-20 border-4 border-white dark:border-slate-900 shadow-md"></div>
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mt-4"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
        <div className="w-full grid grid-cols-2 gap-3 mt-6">
            <div className="h-16 bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
            <div className="h-16 bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
        </div>
    </div>
    <div className="h-16 bg-slate-50 dark:bg-slate-950 w-full mt-auto border-t-2 border-slate-100 dark:border-slate-800"></div>
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
  const { ref, inView } = useInView();

  const API_URL = window.location.hostname === "localhost" 
      ? "http://localhost:3000" 
      : "https://football-backend-m2a4.onrender.com";

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

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (status === 'error') {
    return <div className="text-center py-20 text-rose-500 font-black uppercase tracking-widest text-xl">Meci Întrerupt: {(error as Error).message}</div>;
  }

  return (
    <div className="relative min-h-[80vh] py-10 overflow-hidden bg-transparent z-0">
      
      {/* FUNDAL ANIMAT - STADION / LUMINILE ARENEI (Varianta Aurie/Stele) */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none">
          <div className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 w-[50vw] h-[50vw] rounded-full bg-amber-400/10 dark:bg-amber-500/15 blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-0 left-0 -translate-x-1/4 translate-y-1/4 w-[40vw] h-[40vw] rounded-full bg-yellow-300/10 dark:bg-yellow-400/15 blur-[120px] animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full bg-orange-400/5 dark:bg-orange-500/10 blur-[150px] animate-pulse delay-2000"></div>
      </div>

      {/* --- HEADER TACTIC (SCOUTING BOARD) --- */}
      <section className="text-center space-y-4 px-4 relative z-10 mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-slate-900 border-2 border-amber-400 shadow-md">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="text-amber-400 font-black uppercase tracking-widest text-xs sm:text-sm">Scouting Report / Next Gen</span> 
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter text-slate-900 dark:text-white drop-shadow-sm flex items-center justify-center gap-3">
          Future <span className="text-amber-500">Stars</span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-300 text-sm sm:text-base font-bold uppercase tracking-widest border-b-2 border-amber-500/20 pb-4 inline-block">
            Cele mai promițătoare talente U21 din fotbalul intern și internațional.
        </p>
      </section>

      {/* --- FILTRE (STIL TABELĂ MARCAJ) --- */}
      <section className="px-4 container mx-auto relative z-10 mb-10 flex justify-center">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md p-2 rounded-xl border-2 border-slate-300/50 dark:border-slate-700/50">
              {FILTERS.map((filter) => {
                  const isActive = activeFilter === filter;
                  return (
                      <button
                          key={filter}
                          onClick={() => setActiveFilter(filter)}
                          className={`px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 border-b-4 ${
                              isActive 
                              ? 'bg-amber-500 text-slate-950 border-amber-700 shadow-[0_4px_15px_rgba(245,158,11,0.3)] translate-y-[-2px]' 
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-amber-500/50 hover:text-amber-500'
                          }`}
                      >
                          {isActive && <Filter className="w-3.5 h-3.5" />}
                          {filter}
                      </button>
                  );
              })}
          </div>
      </section>

      {/* --- GRILA DE JUCĂTORI --- */}
      <section className="px-4 sm:px-6 container mx-auto relative z-10">
        {status === 'pending' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <FutureStarSkeleton key={i} />)}
            </div>
        ) : filteredPlayers.length === 0 && !isFetching ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-center px-4 max-w-2xl mx-auto shadow-xl">
                <div className="bg-amber-400 p-5 rounded-full mb-4 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                    <span className="text-4xl leading-none block">🧤⚽</span>
                </div>
                <h3 className="text-2xl font-black uppercase tracking-widest text-slate-900 dark:text-white">Fără Talente</h3>
                <p className="text-slate-500 font-bold mt-2 uppercase tracking-wide">Nu am găsit tineri jucători pentru "{activeFilter}".</p>
                <button onClick={() => setActiveFilter("Toate")} className="mt-6 text-amber-600 dark:text-amber-500 font-black uppercase tracking-widest border-b-2 border-amber-600 hover:text-amber-500 transition-colors pb-1">
                    Arată tot lotul tinerilor
                </button>
            </div>
        ) : (
            <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 animate-in slide-in-from-bottom-8 duration-700">
                {filteredPlayers.map((player) => {
                    const stats = player.statistics_summary || { total_goals: 0, total_assists: 0, total_appearances: 0, minutes_played: 0, rating: "0" };
                    const rating = stats.rating ? parseFloat(stats.rating).toFixed(2) : null;
                    const hasBioData = player.birth_date || player.birth_place || player.height || player.weight || player.nationality;
                    const displayAge = getPlayerAge(player) || player.age || 21;
                    const teamNameStr = player.team || player.team_name || "Club";
                    
                    return (
                        <div key={player._id} className="group relative bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-amber-500/20 hover:border-amber-400 dark:hover:border-amber-500 transition-all duration-300 hover:-translate-y-2 flex flex-col h-full">
                            
                            {/* 1. TOP CARD (Gazon Tactic & Aur) */}
                            <div className="relative h-32 bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 overflow-visible border-b-4 border-slate-900">
                                <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_12px)]"></div>
                                
                                {/* Badge Vârstă */}
                                <div className="absolute top-3 left-3 bg-slate-900 text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-md z-10 flex items-center gap-1.5 uppercase tracking-widest border border-slate-700">
                                    <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> U{displayAge}
                                </div>

                                {/* Badge Rating */}
                                {rating && (
                                    <div className="absolute top-3 right-3 bg-slate-900 text-yellow-400 text-xs font-black px-3 py-1.5 rounded-lg shadow-md z-10 flex items-center gap-1.5 uppercase tracking-widest border border-slate-700">
                                        <Star className="w-3.5 h-3.5 fill-yellow-400" /> {rating}
                                    </div>
                                )}

                                {/* Imagine (Cu Ramă Sportivă) */}
                                <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 group-hover:scale-110 group-hover:-translate-y-2 transition-transform duration-500 z-20">
                                    <img 
                                        src={player.image || "https://via.placeholder.com/150"} 
                                        alt={player.name}
                                        className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover border-[6px] border-white dark:border-slate-900 shadow-[0_10px_20px_rgba(0,0,0,0.5)] bg-slate-100 dark:bg-slate-800"
                                        onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/150?text=No+Img"; }}
                                    />
                                </div>
                            </div>

                            {/* 2. MAIN INFO */}
                            <div className="pt-14 pb-4 px-4 text-center border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-1 flex flex-col">
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-none mb-2 uppercase tracking-tighter truncate" title={player.name}>
                                        {player.name}
                                    </h3>
                                    <div className="flex justify-center items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-3">
                                        <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                        <span className="truncate max-w-[120px]">{teamNameStr}</span>
                                    </div>
                                </div>

                                <div className="mt-auto flex justify-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 bg-amber-400 px-3 py-1 rounded shadow-sm border-b-2 border-amber-600">
                                        {player.position || "JUCĂTOR"}
                                    </span>
                                </div>
                            </div>

                            {/* 3. BIO GRID (afișat condiționat) */}
                            {hasBioData && (
                                <div className="px-4 py-3 bg-white dark:bg-slate-900">
                                    <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/80 rounded-xl p-3 border-2 border-slate-200 dark:border-slate-700">
                                        {player.birth_date && (
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-black uppercase tracking-widest"><Calendar className="w-3 h-3 text-emerald-500" /> Născut</div>
                                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">{formatDate(player.birth_date)}</span>
                                            </div>
                                        )}
                                        {(player.birth_place || player.nationality) && (
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-black uppercase tracking-widest"><MapPin className="w-3 h-3 text-rose-500" /> Origine</div>
                                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5" title={player.birth_place || player.nationality}>
                                                    {player.birth_place || player.nationality}
                                                </span>
                                            </div>
                                        )}
                                        {player.height && (
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-black uppercase tracking-widest"><Ruler className="w-3 h-3 text-blue-500" /> Înălțime</div>
                                                <span className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{player.height}</span>
                                            </div>
                                        )}
                                        {player.weight && (
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-black uppercase tracking-widest"><Weight className="w-3 h-3 text-amber-500" /> Greutate</div>
                                                <span className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{player.weight}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 4. STATS FOOTER (Stil Tabelă) */}
                            <div className="border-t-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
                                <div className="grid grid-cols-3 divide-x-2 divide-slate-100 dark:divide-slate-800 text-center">
                                    <div className="flex flex-col justify-center">
                                        <span className="block text-xl font-black text-slate-900 dark:text-white leading-none">{stats.total_appearances}</span>
                                        <span className="text-[9px] uppercase tracking-widest text-slate-500 font-black mt-1">Meciuri</span>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <div className="flex items-center justify-center gap-1 leading-none">
                                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.total_goals}</span>
                                            <span className="text-slate-300 dark:text-slate-600 font-bold">/</span>
                                            <span className="text-xl font-black text-blue-600 dark:text-blue-400">{stats.total_assists}</span>
                                        </div>
                                        <span className="text-[9px] uppercase tracking-widest text-slate-500 font-black mt-1">G / A</span>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        {stats.minutes_played !== undefined ? (
                                            <>
                                                <div className="flex items-center justify-center gap-1 text-amber-600 font-black text-sm leading-none">
                                                    <Clock className="w-3.5 h-3.5" /> {stats.minutes_played}'
                                                </div>
                                                <span className="text-[9px] uppercase tracking-widest text-slate-500 font-black mt-1.5">Minute</span>
                                            </>
                                        ) : (
                                            <span className="text-slate-400 font-bold">-</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    );
                })}
                </div>

                {/* --- ELEMENTUL INVIZIBIL PENTRU DECLANȘAREA SCROLL-ULUI --- */}
                <div ref={ref} className="w-full flex justify-center py-10 mt-6">
                    {isFetchingNextPage ? (
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-6 py-3 rounded-xl shadow-lg border-2 border-amber-500 text-amber-600 font-black uppercase tracking-widest text-xs sm:text-sm">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Căutăm noi talente...
                        </div>
                    ) : hasNextPage ? (
                        <div className="h-10"></div>
                    ) : (
                        <div className="bg-slate-900 text-white px-6 py-3 rounded-xl shadow-lg font-black uppercase tracking-widest text-xs sm:text-sm border-2 border-slate-700">
                            Fluier Final. Aceștia sunt toți jucătorii U21.
                        </div>
                    )}
                </div>
            </>
        )}
      </section>
    </div>
  );
}