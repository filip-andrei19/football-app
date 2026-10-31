import React, { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Globe, Plane, Shield, Star, Clock, Activity, Filter, Loader2 } from 'lucide-react';

const GENERIC_USER_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

const LEAGUE_ID_MAP: { [key: number]: string } = {
  39: "Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  40: "Championship 🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  140: "La Liga 🇪🇸",
  141: "La Liga 2 🇪🇸",
  135: "Serie A 🇮🇹",
  136: "Serie B 🇮🇹",
  78: "Bundesliga 🇩🇪",
  79: "2. Bundesliga 🇩🇪",
  61: "Ligue 1 🇫🇷",
  88: "Eredivisie 🇳🇱",
  94: "Primeira Liga 🇵🇹",
  203: "Süper Lig 🇹🇷",
  283: "SuperLiga 🇷🇴",
  284: "Liga 2 🇷🇴",
  307: "Pro League 🇸🇦",
  179: "Premiership 🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  106: "Ekstraklasa 🇵🇱",
  318: "1. Division 🇨🇾",
  169: "Super League 🇨🇳",
  253: "MLS 🇺🇸"
};

interface Player {
  _id: string;
  name: string;
  team_name?: string;
  team?: string;
  nationality?: string;
  position?: string;
  image?: string;
  league_id?: number; 
  statistics_summary?: {
    total_goals: number;
    total_assists: number;
    total_appearances: number;
    minutes_played?: number; 
    rating?: string;        
  };
}

const DiasporaSkeleton = () => (
    <div className="rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 animate-pulse h-[420px] border-4 border-slate-300 dark:border-slate-700">
        <div className="h-full w-full bg-white dark:bg-slate-900 rounded-xl flex flex-col">
            <div className="h-48 bg-slate-300 dark:bg-slate-800 w-full relative"></div>
            <div className="h-16 bg-slate-400 dark:bg-slate-700 w-full mt-2"></div>
            <div className="p-4 flex-1 space-y-4">
                <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="h-14 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                    <div className="h-14 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                    <div className="h-14 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                </div>
            </div>
        </div>
    </div>
);

const FILTERS = ["Toate", "Portari", "Fundași", "Mijlocași", "Atacanți"];

export function DiasporaSection() {
  const [activeFilter, setActiveFilter] = useState("Toate");
  const { ref, inView } = useInView();

  const API_URL = window.location.hostname === "localhost" 
      ? "http://localhost:3000" 
      : "https://football-backend-m2a4.onrender.com";

  const fetchDiaspora = async ({ pageParam = 1 }) => {
    try {
      const response = await fetch(`${API_URL}/api/sport/players?diaspora=true&page=${pageParam}&limit=12&t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error("Eroare FETCH Diaspora:", err);
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
    queryKey: ['diasporaPlayers'],
    queryFn: fetchDiaspora,
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

  const sortedPlayers = [...uniquePlayers].sort((a: Player, b: Player) => {
      const teamA = (a.team_name || a.team || "").toLowerCase();
      const teamB = (b.team_name || b.team || "").toLowerCase();
      
      const isNationalA = teamA.includes("nationala") || teamA === "romania";
      const isNationalB = teamB.includes("nationala") || teamB === "romania";
      
      if (isNationalA && !isNationalB) return -1;
      if (!isNationalA && isNationalB) return 1;

      const ratingA = parseFloat(a.statistics_summary?.rating || "0");
      const ratingB = parseFloat(b.statistics_summary?.rating || "0");
      if (ratingB !== ratingA) return ratingB - ratingA;

      return (b.statistics_summary?.total_appearances || 0) - (a.statistics_summary?.total_appearances || 0);
  });

  const getFilteredPlayers = () => {
      if (activeFilter === "Toate") return sortedPlayers;

      return sortedPlayers.filter(player => {
          const pos = (player.position || "").toLowerCase();
          
          if (activeFilter === "Portari") return pos.includes("goalkeeper") || pos.includes("portar");
          if (activeFilter === "Fundași") return pos.includes("defender") || pos.includes("back") || pos.includes("funda");
          if (activeFilter === "Mijlocași") return pos.includes("midfield") || pos.includes("mijloca");
          if (activeFilter === "Atacanți") return pos.includes("forward") || pos.includes("striker") || pos.includes("wing") || pos.includes("ataca") || pos.includes("attack");
          
          return false;
      });
  };

  const filteredPlayers = getFilteredPlayers();

  if (status === 'error') {
    return <div className="text-center py-20 text-rose-500 font-black uppercase tracking-widest text-xl">Meci Întrerupt: {(error as Error).message}</div>;
  }

  return (
    <div className="relative min-h-[80vh] py-10 overflow-hidden bg-transparent z-0">
      
      {/* FUNDAL ANIMAT - STADION / LUMINILE ARENEI */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none">
          <div className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4 w-[50vw] h-[50vw] rounded-full bg-blue-600/10 dark:bg-blue-600/15 blur-[120px] animate-pulse"></div>
          <div className="absolute top-[40%] right-0 translate-x-1/4 w-[40vw] h-[40vw] rounded-full bg-yellow-400/10 dark:bg-yellow-500/15 blur-[120px] animate-pulse delay-1000"></div>
          <div className="absolute bottom-0 left-[20%] translate-y-1/4 w-[60vw] h-[60vw] rounded-full bg-red-600/10 dark:bg-red-600/15 blur-[120px] animate-pulse delay-2000"></div>
      </div>

      <section className="text-center space-y-4 px-4 relative z-10 mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-slate-900 border-2 border-yellow-400 shadow-md">
          <Globe className="w-5 h-5 text-blue-400" />
          <span className="text-blue-400 font-black uppercase tracking-widest text-xs sm:text-sm">Tricolorii</span> 
          <span className="text-yellow-400 font-black uppercase tracking-widest text-xs sm:text-sm">în</span> 
          <span className="text-red-400 font-black uppercase tracking-widest text-xs sm:text-sm">Lume</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter text-slate-900 dark:text-white drop-shadow-sm">
           Echipa Națională
        </h1>
        
        <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-300 text-sm sm:text-base font-bold uppercase tracking-widest border-b-2 border-emerald-500/20 pb-4 inline-block">
           Monitorizăm performanțele stranierilor noștri în timp real.
        </p>
      </section>

      {/* FILTRE (STIL TABELĂ MARCAJ) */}
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
                              ? 'bg-blue-600 text-white border-blue-800 shadow-[0_4px_15px_rgba(37,99,235,0.3)] translate-y-[-2px]' 
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-blue-500/50 hover:text-blue-500'
                          }`}
                      >
                          {isActive && <Filter className="w-3.5 h-3.5" />}
                          {filter}
                      </button>
                  );
              })}
          </div>
      </section>

      <section className="px-4 sm:px-6 container mx-auto relative z-10">
        {status === 'pending' ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                 {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <DiasporaSkeleton key={i} />)}
             </div>
        ) : filteredPlayers.length === 0 && !isFetching ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-center px-4 max-w-2xl mx-auto shadow-xl">
                <div className="bg-yellow-400 p-5 rounded-full mb-4 shadow-[0_0_20px_rgba(250,204,21,0.4)]">
                    <Plane className="w-10 h-10 text-slate-900" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-widest text-slate-900 dark:text-white">Fără Convocări</h3>
                <p className="text-slate-500 font-bold mt-2 uppercase tracking-wide">Nu am găsit stranieri pentru filtrul "{activeFilter}".</p>
                <button onClick={() => setActiveFilter("Toate")} className="mt-6 text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest border-b-2 border-blue-600 hover:text-blue-500 transition-colors pb-1">
                    Vezi tot lotul
                </button>
            </div>
        ) : (
            <>
                {/* GRID JUCATORI (CARDURI STIL BROADCAST / MATCHDAY) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 animate-in slide-in-from-bottom-8 duration-700">
                {filteredPlayers.map((player) => {
                    const stats = player.statistics_summary || { total_goals: 0, total_assists: 0, total_appearances: 0, minutes_played: 0, rating: "0" };
                    const teamNameStr = player.team_name || player.team || "Club";
                    
                    const isNationalOnly = teamNameStr.toLowerCase().includes("nationala") || teamNameStr.toLowerCase() === "romania";
                    const ratingValue = stats.rating ? parseFloat(stats.rating).toFixed(2) : "-";

                    const leagueBadge = player.league_id ? LEAGUE_ID_MAP[player.league_id] : null;
                    const badgeText = isNationalOnly ? "CONVOCAT 🇷🇴" : (leagueBadge || "TRICOLOR 🇷🇴");

                    return (
                        <div 
                            key={player._id} 
                            className="relative group rounded-2xl bg-white dark:bg-slate-900 shadow-xl hover:shadow-[0_20px_40px_rgba(37,99,235,0.2)] transition-all duration-300 transform hover:-translate-y-2 flex flex-col h-full overflow-hidden border-4 border-slate-200 dark:border-slate-800 hover:border-blue-500"
                        >
                            {/* ETICHETE DREAPTA SUS (LIGA & RATING) */}
                            <div className="absolute top-0 right-0 z-20 flex flex-col items-end">
                                <div className="bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-bl-xl shadow-md uppercase tracking-widest border-b-2 border-l-2 border-red-800">
                                    {badgeText}
                                </div>
                                {ratingValue !== "-" && (
                                    <div className="bg-slate-900 text-yellow-400 text-[11px] font-black px-3 py-1.5 flex items-center justify-center gap-1.5 shadow-md rounded-bl-xl border-l-2 border-b-2 border-slate-700 mt-1 mr-[-2px]">
                                        <Star className="w-3.5 h-3.5 fill-yellow-400" /> {ratingValue}
                                    </div>
                                )}
                            </div>

                            {/* POZIȚIE (STÂNGA SUS) */}
                            <div className="absolute top-3 left-3 z-20">
                                <span className="px-3 py-1.5 text-[9px] font-black tracking-widest text-slate-900 bg-yellow-400 rounded-lg shadow-md uppercase border-b-2 border-yellow-600">
                                    {player.position || "JUCĂTOR"}
                                </span>
                            </div>

                            {/* SECȚIUNE FOTO JUCĂTOR (Gazon Tactic Background) */}
                            <div className="h-56 relative overflow-hidden bg-slate-800 shrink-0 flex items-end justify-center pt-8 border-b-4 border-yellow-400">
                                {/* Teren fotbal background */}
                                <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_20px,#fff_20px,#fff_22px)]"></div>
                                <div className="absolute bottom-0 w-40 h-40 bg-blue-500/30 rounded-full blur-[40px] pointer-events-none"></div>
                                
                                <img 
                                    src={player.image || GENERIC_USER_IMAGE} 
                                    alt={player.name} 
                                    className="h-[110%] w-auto max-w-full object-contain object-bottom transition-transform duration-500 group-hover:scale-110 relative z-10 drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
                                    onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }}
                                />
                            </div>

                            {/* BANDĂ NUME ȘI ECHIPĂ */}
                            <div className="relative bg-slate-950 px-4 py-4 text-white shrink-0 text-center border-b-4 border-blue-600">
                                <h3 className="text-xl sm:text-2xl font-black leading-none uppercase tracking-tighter text-white truncate">
                                    {player.name}
                                </h3>
                                <div className="flex items-center justify-center gap-2 text-blue-400 text-xs font-bold mt-2 tracking-widest uppercase">
                                    <Shield className="w-4 h-4 shrink-0" /> 
                                    <span className="truncate">{teamNameStr}</span>
                                </div>
                            </div>

                            {/* STATISTICI PRINCIPALE (Stil Tabelă / Panou) */}
                            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between bg-slate-50 dark:bg-slate-900">
                                
                                <div className="grid grid-cols-3 gap-2 text-center bg-white dark:bg-slate-800 rounded-xl p-3 border-2 border-slate-200 dark:border-slate-700 shadow-sm mb-4">
                                    <div className="flex flex-col justify-center">
                                        <span className="block text-2xl font-black text-slate-900 dark:text-white leading-none">
                                            {stats.total_appearances || 0}
                                        </span>
                                        <span className="text-[9px] uppercase text-slate-500 font-black tracking-widest mt-1">
                                            Meciuri
                                        </span>
                                    </div>
                                    <div className="flex flex-col justify-center border-x-2 border-slate-100 dark:border-slate-700">
                                        <span className="block text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
                                            {stats.total_goals || 0}
                                        </span>
                                        <span className="text-[9px] uppercase text-slate-500 font-black tracking-widest mt-1">
                                            Goluri
                                        </span>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <span className="block text-2xl font-black text-blue-600 dark:text-blue-400 leading-none">
                                            {stats.total_assists || 0}
                                        </span>
                                        <span className="text-[9px] uppercase text-slate-500 font-black tracking-widest mt-1">
                                            Pase Dec.
                                        </span>
                                    </div>
                                </div>

                                {/* MINUTE JUCATE & MEDIA RATING */}
                                <div className="grid grid-cols-2 gap-3 text-center">
                                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-200 dark:bg-slate-800 border-2 border-transparent group-hover:border-blue-500 transition-colors">
                                         <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-black text-sm sm:text-base leading-none">
                                            <Clock className="w-4 h-4 text-blue-600" />
                                            {stats.minutes_played || 0}'
                                         </div>
                                         <span className="text-[9px] uppercase text-slate-500 font-black tracking-widest mt-1.5">
                                            Minute
                                         </span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-200 dark:bg-slate-800 border-2 border-transparent group-hover:border-amber-500 transition-colors">
                                         <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-black text-sm sm:text-base leading-none">
                                            <Activity className="w-4 h-4 text-amber-500" />
                                            {ratingValue}
                                         </div>
                                         <span className="text-[9px] uppercase text-slate-500 font-black tracking-widest mt-1.5">
                                            Media Sofascore
                                         </span>
                                    </div>
                                </div>

                            </div>
                        </div>
                    );
                })}
                </div>
                
                {/* Elementul invizibil de Intersection Observer care declanșează paginația */}
                <div ref={ref} className="w-full flex justify-center py-10 mt-6">
                    {isFetchingNextPage ? (
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-6 py-3 rounded-xl shadow-lg border-2 border-blue-500 text-blue-600 font-black uppercase tracking-widest text-xs sm:text-sm">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Actualizăm Lotul...
                        </div>
                    ) : hasNextPage ? (
                        <div className="h-10"></div>
                    ) : (
                        <div className="bg-slate-900 text-white px-6 py-3 rounded-xl shadow-lg font-black uppercase tracking-widest text-xs sm:text-sm border-2 border-slate-700">
                            Fluier Final. Acesta este tot lotul.
                        </div>
                    )}
                </div>
            </>
        )}
      </section>
    </div>
  );
}