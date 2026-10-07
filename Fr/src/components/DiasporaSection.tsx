import React, { useEffect, useState } from 'react';
import { Globe, Plane, Shield, Star, Clock, Activity, Filter } from 'lucide-react';

const GENERIC_USER_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

const LEAGUE_ID_MAP: { [key: number]: string } = {
  39: "Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  140: "La Liga 🇪🇸",
  135: "Serie A 🇮🇹",
  78: "Bundesliga 🇩🇪",
  61: "Ligue 1 🇫🇷",
  88: "Eredivisie 🇳🇱",
  94: "Primeira Liga 🇵🇹",
  40: "Championship 🏴󠁧󠁢󠁥󠁮󠁧󠁿"
};

const normalizeText = (text: string) => {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "");
};

interface Player {
  _id: string;
  name: string;
  team_name: string;
  nationality: string;
  position: string;
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
    <div className="rounded-2xl overflow-hidden p-[2px] bg-gray-200 dark:bg-slate-800 animate-pulse h-[400px]">
        <div className="h-full w-full bg-white dark:bg-slate-900 rounded-[14px]">
            <div className="h-48 bg-gray-300 dark:bg-slate-700 w-full relative"></div>
            <div className="p-4 space-y-4">
                <div className="h-6 bg-gray-300 dark:bg-slate-700 rounded w-3/4 mx-auto"></div>
                <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-1/2 mx-auto"></div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="h-10 bg-gray-300 dark:bg-slate-700 rounded"></div>
                    <div className="h-10 bg-gray-300 dark:bg-slate-700 rounded"></div>
                    <div className="h-10 bg-gray-300 dark:bg-slate-700 rounded"></div>
                </div>
            </div>
        </div>
    </div>
);

const FILTERS = ["Toate", "Portari", "Fundași", "Mijlocași", "Atacanți"];

export function DiasporaSection() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("Toate");

  useEffect(() => {
    const fetchDiaspora = async () => {
      try {
        const API_URL = window.location.hostname === "localhost" 
            ? "http://localhost:3000" 
            : "https://football-backend-m2a4.onrender.com";

        const response = await fetch(`${API_URL}/api/sport/players?diaspora=true`);
        const data = await response.json();

        const sortedStranieri = data.sort((a: Player, b: Player) => {
            const isNationalA = a.team_name.includes("Nationala");
            const isNationalB = b.team_name.includes("Nationala");
            
            if (isNationalA && !isNationalB) return -1;
            if (!isNationalA && isNationalB) return 1;

            const ratingA = parseFloat(a.statistics_summary?.rating || "0");
            const ratingB = parseFloat(b.statistics_summary?.rating || "0");
            if (ratingB !== ratingA) return ratingB - ratingA;

            return (b.statistics_summary?.total_appearances || 0) - (a.statistics_summary?.total_appearances || 0);
        });

        setPlayers(sortedStranieri);
      } catch (err) {
        console.error("Eroare:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDiaspora();
  }, []);

  const getFilteredPlayers = () => {
      if (activeFilter === "Toate") return players;

      return players.filter(player => {
          const pos = (player.position || "").toLowerCase();
          
          if (activeFilter === "Portari") return pos.includes("goalkeeper") || pos.includes("portar");
          if (activeFilter === "Fundași") return pos.includes("defender") || pos.includes("back") || pos.includes("funda");
          if (activeFilter === "Mijlocași") return pos.includes("midfield") || pos.includes("mijloca");
          if (activeFilter === "Atacanți") return pos.includes("forward") || pos.includes("striker") || pos.includes("wing") || pos.includes("ataca") || pos.includes("attack");
          
          return false;
      });
  };

  const filteredPlayers = getFilteredPlayers();

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
        {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                 {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <DiasporaSkeleton key={i} />)}
             </div>
        ) : filteredPlayers.length === 0 ? (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in slide-in-from-bottom-8 duration-700">
            {filteredPlayers.map((player) => {
                const stats = player.statistics_summary || { matches: 0, total_goals: 0, total_assists: 0, total_appearances: 0, minutes_played: 0, rating: "0" };
                
                const isNationalOnly = player.team_name.includes("Nationala") || player.team_name === "Romania";
                const ratingValue = stats.rating ? parseFloat(stats.rating).toFixed(2) : "-";

                const leagueBadge = player.league_id ? LEAGUE_ID_MAP[player.league_id] : null;
                const badgeText = isNationalOnly ? "CONVOCAT" : (leagueBadge || player.team_name);

                return (
                    <div key={player._id} className="relative group rounded-2xl bg-gradient-to-br from-blue-700 via-yellow-400 to-red-600 p-[3px] shadow-lg hover:shadow-2xl hover:shadow-yellow-500/40 transition-all duration-300 transform hover:-translate-y-2 flex flex-col h-full">
                        
                        <div className="relative h-full bg-white dark:bg-slate-900 rounded-[13px] overflow-hidden flex flex-col">
                            
                            <div className="absolute top-0 right-0 z-20 flex flex-col items-end">
                                <div className="bg-gradient-to-l from-blue-700 via-yellow-500 to-red-600 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl shadow-lg flex items-center gap-1 uppercase tracking-wider border-b border-l border-white/20">
                                    {badgeText} {isNationalOnly && "🇷🇴"}
                                </div>
                                {ratingValue !== "-" && (
                                    <div className="bg-slate-900/90 backdrop-blur-sm text-yellow-400 text-[10px] font-black px-3 py-1 flex items-center justify-center gap-1 shadow-md rounded-bl-lg border-b border-l border-white/10 mt-1 mr-1">
                                        <Star className="w-3 h-3 fill-yellow-400" /> {ratingValue}
                                    </div>
                                )}
                            </div>

                            <div className="absolute top-3 left-3 z-20">
                                <span className="px-2 py-1 text-[10px] font-black rounded border border-white/40 shadow-lg bg-black/60 backdrop-blur-md text-white uppercase tracking-widest">
                                    {player.position}
                                </span>
                            </div>

                            <div className="h-56 relative overflow-hidden bg-gradient-to-b from-gray-200 to-white dark:from-slate-800 dark:to-slate-900 shrink-0">
                                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fbbf24_1px,transparent_1px)] [background-size:16px_16px]"></div>
                                
                                <img 
                                    src={player.image || GENERIC_USER_IMAGE} 
                                    alt={player.name}
                                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                                    onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }}
                                />
                                
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-10"></div>
                                
                                <div className="absolute bottom-4 left-4 z-20 text-white w-full pr-4">
                                    <h3 className="text-2xl font-black leading-none uppercase italic truncate tracking-tight drop-shadow-md text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-300">
                                        {player.name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-yellow-400 text-xs font-bold mt-1.5 tracking-wide uppercase drop-shadow-md">
                                        <Shield className="w-3.5 h-3.5" /> 
                                        <span className="truncate">{player.team_name}</span>
                                    </div>
                                </div>

                                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-yellow-400 to-red-600 z-20"></div>
                            </div>

                            <div className="p-5 flex-1 flex flex-col justify-center bg-white dark:bg-slate-900">
                                
                                <div className="grid grid-cols-3 gap-2 text-center border-b border-gray-100 dark:border-slate-800 pb-4 mb-4">
                                    <div className="group/stat">
                                        <span className="block text-2xl font-black text-slate-800 dark:text-white transition-colors">{stats.total_appearances}</span>
                                        <span className="text-[9px] uppercase text-gray-400 font-bold tracking-widest">Meciuri</span>
                                    </div>
                                    <div className="border-x border-gray-100 dark:border-slate-800 group/stat">
                                        <span className="block text-2xl font-black text-blue-600 dark:text-blue-400">{stats.total_goals}</span>
                                        <span className="text-[9px] uppercase text-gray-400 font-bold tracking-widest">Goluri</span>
                                    </div>
                                    <div className="group/stat">
                                        <span className="block text-2xl font-black text-red-600 dark:text-red-400">{stats.total_assists}</span>
                                        <span className="text-[9px] uppercase text-gray-400 font-bold tracking-widest">Pase</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-center">
                                    <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-transparent group-hover:border-blue-100 dark:group-hover:border-slate-700 transition-colors">
                                         <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-black text-sm">
                                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                                            {stats.minutes_played || 0}'
                                         </div>
                                         <span className="text-[8px] uppercase text-gray-400 font-bold mt-0.5">Minute Jucate</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-transparent group-hover:border-red-100 dark:group-hover:border-slate-700 transition-colors">
                                         <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-black text-sm">
                                            <Activity className="w-3.5 h-3.5 text-red-500" />
                                            {ratingValue}
                                         </div>
                                         <span className="text-[8px] uppercase text-gray-400 font-bold mt-0.5">Media Rating</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                );
            })}
            </div>
        )}
      </section>
    </div>
  );
}