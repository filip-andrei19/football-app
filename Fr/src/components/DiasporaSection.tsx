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
    <div className="rounded-2xl overflow-hidden p-[1.5px] bg-gray-200 dark:bg-slate-800 animate-pulse h-[420px]">
        <div className="h-full w-full bg-white dark:bg-slate-900 rounded-xl">
            <div className="h-56 bg-gray-300 dark:bg-slate-800 w-full relative"></div>
            <div className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="h-12 bg-gray-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-12 bg-gray-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-12 bg-gray-200 dark:bg-slate-800 rounded"></div>
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <div className="h-12 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
                    <div className="h-12 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
                </div>
            </div>
        </div>
    </div>
);

const FILTERS = ["Toate", "Portari", "Fundași", "Mijlocași", "Atacanți"];

export function DiasporaSection() {
  const [activeFilter, setActiveFilter] = useState("Toate");
  const { ref, inView } = useInView();

  // Setăm backend-ul pe portul 5000 când suntem local, altfel folosim linkul de Render
  const API_URL = window.location.hostname === "localhost" 
      ? "http://localhost:5000" 
      : "https://football-backend-m2a4.onrender.com";

  // Funcția de fetch adaptată pentru Infinite Query
  const fetchDiaspora = async ({ pageParam = 1 }) => {
    try {
      // Adăugăm un timestamp fals (?t=...) pentru a preveni cache-ul agresiv de la React Query / Browser
      const response = await fetch(`${API_URL}/api/sport/players?diaspora=true&page=${pageParam}&limit=12&t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error("Eroare FETCH Diaspora:", err);
      throw err;
    }
  };

  // Setup React Query pentru Infinite Scroll
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
      // Dacă primim mai puțin de 12 elemente, înseamnă că e ultima pagină
      return lastPage.length === 12 ? allPages.length + 1 : undefined;
    },
  });

  // Declanșează următoarea pagină când elementul invizibil intră în vizor
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Transformă array-urile din fiecare pagină într-o singură listă
  const allPlayers = data ? data.pages.flatMap(page => page) : [];

  // FILTRU ANTI-DUPLICATE: Elimină jucătorii cu același nume returnați de MongoDB
  const uniquePlayers = Array.from(new Map(allPlayers.map(p => [p.name, p])).values());

  // Folosește uniquePlayers în loc de allPlayers pentru sortarea originală
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

  // Funcția de filtrare pe poziții
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
    return <div className="text-center py-20 text-red-500 font-bold">Eroare: {(error as Error).message}</div>;
  }

  return (
    <div className="relative min-h-[80vh] py-10 overflow-hidden bg-slate-50 dark:bg-slate-900 z-0">
      
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none opacity-60">
          <div className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4 w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[120px] animate-pulse-slow"></div>
          <div className="absolute top-[40%] right-0 translate-x-1/4 w-[500px] h-[500px] rounded-full bg-yellow-400/20 blur-[120px] animate-pulse-slow delay-1000"></div>
          <div className="absolute bottom-0 left-[20%] translate-y-1/4 w-[700px] h-[700px] rounded-full bg-red-600/15 blur-[120px] animate-pulse-slow delay-2000"></div>
      </div>

      <section className="text-center space-y-6 px-4 relative z-10 mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-yellow-200 dark:border-yellow-900/50 text-sm font-bold mb-2 shadow-sm">
          <Globe className="w-4 h-4 text-blue-600" />
          <span className="text-blue-700 dark:text-blue-400">Tricolorii</span> 
          <span className="text-yellow-600 dark:text-yellow-400">în</span> 
          <span className="text-red-600 dark:text-red-400">Lume</span>
        </div>
        
        <h1 className="text-4xl font-black tracking-tighter lg:text-7xl uppercase text-slate-900 dark:text-white drop-shadow-sm">
           Echipa Națională
        </h1>
        
        <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-400 text-lg font-medium">
           Monitorizăm performanțele stranierilor noștri în timp real.
        </p>
      </section>

      <section className="px-4 container mx-auto relative z-10 mb-10 flex justify-center">
          <div className="flex flex-wrap justify-center gap-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-2 rounded-2xl border border-blue-100 dark:border-slate-700 shadow-lg">
              {FILTERS.map((filter) => (
                  <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                          activeFilter === filter 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 transform scale-105' 
                          : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-400'
                      }`}
                  >
                      {activeFilter === filter && <Filter className="w-3 h-3" />}
                      {filter}
                  </button>
              ))}
          </div>
      </section>

      <section className="px-6 container mx-auto relative z-10">
        {status === 'pending' ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                 {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <DiasporaSkeleton key={i} />)}
             </div>
        ) : filteredPlayers.length === 0 && !isFetching ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-800/50 backdrop-blur rounded-3xl border border-dashed border-gray-300 dark:border-slate-600 text-center px-4 max-w-2xl mx-auto">
                <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-full mb-4">
                    <Plane className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Nu am găsit jucători</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Niciun rezultat pentru filtrul "{activeFilter}".</p>
                <button onClick={() => setActiveFilter("Toate")} className="mt-4 text-blue-600 dark:text-blue-400 font-bold hover:underline">
                    Vezi toți stranierii
                </button>
            </div>
        ) : (
            <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in slide-in-from-bottom-8 duration-700">
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
                            className="relative group rounded-2xl bg-gradient-to-br from-blue-600/80 via-yellow-500/80 to-red-600/80 p-[2px] shadow-[0_10px_30px_rgba(15,23,42,0.12)] hover:shadow-[0_20px_40px_rgba(234,179,8,0.2)] transition-all duration-300 transform hover:-translate-y-2 flex flex-col h-full overflow-hidden"
                        >
                            <div className="relative h-full bg-white dark:bg-slate-900 rounded-[14px] overflow-hidden flex flex-col z-10">
                                
                                {/* ETICHETE DREAPTA SUS (LIGA & RATING) */}
                                <div className="absolute top-0 right-0 z-20 flex flex-col items-end">
                                    <div className="bg-gradient-to-r from-red-600 to-red-500 text-white text-[10px] font-black px-3.5 py-1.5 rounded-bl-xl shadow-md flex items-center gap-1 uppercase tracking-wider border-b border-l border-white/15">
                                        {badgeText}
                                    </div>
                                    {ratingValue !== "-" && (
                                        <div className="bg-slate-900/90 backdrop-blur-md text-yellow-400 text-[11px] font-black px-2.5 py-1 flex items-center justify-center gap-1 shadow-md rounded-bl-lg border-l border-b border-white/10 mt-1 mr-0.5">
                                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {ratingValue}
                                        </div>
                                    )}
                                </div>

                                {/* POZIȚIE (STÂNGA SUS - CU CHENAR AURIU DISCRET) */}
                                <div className="absolute top-3 left-3 z-20">
                                    <span className="px-2.5 py-1 text-[9px] font-black tracking-widest text-white bg-slate-950/85 backdrop-blur-md rounded-md border border-yellow-500/50 shadow-md uppercase">
                                        {player.position || "JUCĂTOR"}
                                    </span>
                                </div>

                                {/* SECȚIUNE FOTO JUCĂTOR */}
                                <div className="h-48 relative overflow-hidden bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 shrink-0 flex items-end justify-center pt-5">
                                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#60a5fa_1px,transparent_1px)] [background-size:12px_12px]"></div>
                                    <div className="absolute bottom-0 w-36 h-36 bg-blue-500/20 rounded-full blur-2xl pointer-events-none"></div>
                                    
                                    <img 
                                        src={player.image || GENERIC_USER_IMAGE} 
                                        alt={player.name} 
                                        className="h-full w-auto max-w-full object-contain object-bottom transition-transform duration-500 group-hover:scale-105 relative z-10 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                                        onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }}
                                    />
                                </div>

                                {/* BANDĂ NUME ȘI ECHIPĂ */}
                                <div className="relative bg-slate-950 px-4 py-3 text-white shrink-0">
                                    <h3 className="text-lg sm:text-xl font-black leading-tight uppercase italic truncate tracking-tight text-white">
                                        {player.name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-yellow-400 text-[11px] font-bold mt-0.5 tracking-wide uppercase">
                                        <Shield className="w-3.5 h-3.5 text-yellow-400 shrink-0" /> 
                                        <span className="truncate">{teamNameStr}</span>
                                    </div>
                                    <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-600 via-yellow-400 to-red-600"></div>
                                </div>

                                {/* STATISTICI PRINCIPALE */}
                                <div className="p-5 flex-1 flex flex-col justify-between bg-white dark:bg-slate-900">
                                    
                                    <div className="grid grid-cols-3 gap-1 text-center border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                                        <div>
                                            <span className="block text-2xl font-black text-slate-900 dark:text-white">
                                                {stats.total_appearances || 0}
                                            </span>
                                            <span className="text-[9px] uppercase text-slate-400 dark:text-slate-500 font-bold tracking-wider">
                                                Meciuri
                                            </span>
                                        </div>
                                        <div className="border-x border-slate-100 dark:border-slate-800">
                                            <span className="block text-2xl font-black text-amber-500 dark:text-yellow-400">
                                                {stats.total_goals || 0}
                                            </span>
                                            <span className="text-[9px] uppercase text-slate-400 dark:text-slate-500 font-bold tracking-wider">
                                                Goluri
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-2xl font-black text-red-600 dark:text-red-500">
                                                {stats.total_assists || 0}
                                            </span>
                                            <span className="text-[9px] uppercase text-slate-400 dark:text-slate-500 font-bold tracking-wider">
                                                Pase Decisive
                                            </span>
                                        </div>
                                    </div>

                                    {/* MINUTE JUCATE & MEDIA RATING */}
                                    <div className="grid grid-cols-2 gap-3 text-center">
                                        <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/25 border border-blue-100/80 dark:border-blue-900/30 group-hover:border-blue-300 dark:group-hover:border-blue-700/50 transition-colors">
                                             <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-black text-sm">
                                                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                {stats.minutes_played || 0}'
                                             </div>
                                             <span className="text-[8px] uppercase text-slate-400 dark:text-slate-400 font-bold mt-0.5 tracking-wider">
                                                Minute Jucate
                                             </span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-red-50/70 dark:bg-red-950/25 border border-red-100/80 dark:border-red-900/30 group-hover:border-red-300 dark:group-hover:border-red-700/50 transition-colors">
                                             <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-black text-sm">
                                                <Activity className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                                                {ratingValue}
                                             </div>
                                             <span className="text-[8px] uppercase text-slate-400 dark:text-slate-400 font-bold mt-0.5 tracking-wider">
                                                Media Rating
                                             </span>
                                        </div>
                                    </div>

                                </div>

                            </div>
                        </div>
                    );
                })}
                </div>
                
                {/* Elementul invizibil de Intersection Observer care declanșează paginația */}
                <div ref={ref} className="w-full flex justify-center py-10 mt-4">
                    {isFetchingNextPage ? (
                        <div className="flex items-center gap-2 text-blue-600 font-bold">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Încărcăm mai mulți stranieri...
                        </div>
                    ) : hasNextPage ? (
                        <div className="h-10"></div>
                    ) : (
                        <div className="text-slate-400 font-medium text-sm">Ai ajuns la finalul listei de stranieri.</div>
                    )}
                </div>
            </>
        )}
      </section>
    </div>
  );
}