import React, { useEffect, useState } from 'react';
import { Globe, Plane, AlertCircle, Shield, Star, Clock, Activity, Filter } from 'lucide-react';

const GENERIC_USER_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

// 🚫 LISTA NEAGRĂ (Cluburi din România)
const BLOCKED_KEYWORDS = [
  "fcsb", "steaua", "becali", 
  "cfr", "cluj", "universitatea cluj", "u cluj",
  "craiova", "universitatea craiova", "fc u", 
  "rapid", "giulesti",
  "farul", "constanta", "viitorul",
  "sepsi", "sfantu", "gheorghe",
  "petrolul", "ploiesti",
  "hermannstadt", "sibiu",
  "uta", "arad",
  "poli", "iasi", "politehnica",
  "otelul", "galati", "sc otelul",
  "botosani", "fc botosani",
  "dinamo", "bucuresti",
  "slobozia", "unirea",
  "buzau", "gloria", "scm gloria",
  "voluntari", "fc voluntari",
  "chiajna", "concordia",
  "mioveni", "arges",
  "chindia", "targoviste",
  "metaloglobus", "csikszereda", "miercurea", "ciuc",
  "corvinul", "hunedoara",
  "resita", "csm", "scm", "fc", "acs"
];

const LEAGUE_MAP: { [key: string]: string } = {
  "Tottenham Hotspur": "Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Parma": "Serie A 🇮🇹",
  "Cagliari": "Serie A 🇮🇹",
  "Empoli": "Serie A 🇮🇹",
  "Rayo Vallecano": "La Liga 🇪🇸",
  "Trabzonspor": "Süper Lig 🇹🇷",
  "Gaziantep": "Süper Lig 🇹🇷",
  "Damac FC": "Saudi Pro League 🇸🇦",
  "Rangers": "Premiership 🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "PAOK": "Super League 🇬🇷",
  "Pisa": "Serie B 🇮🇹",
  "Palermo": "Serie B 🇮🇹",
  "Raków Częstochowa": "Ekstraklasa 🇵🇱",
  "Wuhan Three Towns": "Super League 🇨🇳"
};

const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "");
};

interface Player {
  _id: string;
  name: string;
  team_name: string;
  nationality: string;
  position: string;
  image?: string;
  statistics_summary?: {
    total_goals: number;
    total_assists: number;
    total_appearances: number;
    minutes_played?: number; 
    rating?: string;        
  };
}

// --- SKELETON ---
const DiasporaSkeleton = () => (
    <div className="rounded-2xl overflow-hidden border border-white/50 bg-white/40 shadow-sm animate-pulse h-[400px]">
        <div className="h-48 bg-gray-200 w-full relative"></div>
        <div className="p-4 space-y-4">
            <div className="h-6 bg-gray-300 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2 mx-auto"></div>
            <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
            </div>
        </div>
    </div>
);

// FILTRELE
const FILTERS = ["Toate", "Portari", "Fundași", "Mijlocași", "Atacanți"];

export function DiasporaSection() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("Toate"); // <--- STATE NOU

  useEffect(() => {
    const fetchDiaspora = async () => {
      try {
        const response = await fetch('https://football-backend-m2a4.onrender.com/api/sport/players');
        const data = await response.json();

        // --- FILTRARE DATE BRUTE ---
        const stranieri = data.filter((p: Player) => {
           if (p.nationality !== "Romania") return false;
           const cleanTeamName = normalizeText(p.team_name || "");
           const isNationalTeam = cleanTeamName.includes("nationala") || cleanTeamName === "romania";
           if (isNationalTeam) return true; 
           const isRomanianClub = BLOCKED_KEYWORDS.some(keyword => cleanTeamName.includes(keyword));
           return !isRomanianClub;
        });

        // SORTARE
        const sortedStranieri = stranieri.sort((a: Player, b: Player) => {
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

  // --- LOGICA DE FILTRARE (Include și "ATTACKER") ---
  const getFilteredPlayers = () => {
      if (activeFilter === "Toate") return players;

      return players.filter(player => {
          const pos = (player.position || "").toLowerCase();
          
          if (activeFilter === "Portari") return pos.includes("goalkeeper") || pos.includes("portar");
          if (activeFilter === "Fundași") return pos.includes("defender") || pos.includes("back") || pos.includes("funda");
          if (activeFilter === "Mijlocași") return pos.includes("midfield") || pos.includes("mijloca");
          
          // Adăugat check pentru "attacker"
          if (activeFilter === "Atacanți") return pos.includes("forward") || pos.includes("striker") || pos.includes("wing") || pos.includes("ataca") || pos.includes("attack");
          
          return false;
      });
  };

  const filteredPlayers = getFilteredPlayers();

  return (
    <div className="relative min-h-[80vh] py-10 overflow-hidden bg-slate-50 dark:bg-slate-900">
      
      {/* FUNDAL TRICOLOR ANIMAT */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none opacity-60">
          <div className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4 w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[120px] animate-pulse-slow"></div>
          <div className="absolute top-[40%] right-0 translate-x-1/4 w-[500px] h-[500px] rounded-full bg-yellow-400/20 blur-[120px] animate-pulse-slow delay-1000"></div>
          <div className="absolute bottom-0 left-[20%] translate-y-1/4 w-[700px] h-[700px] rounded-full bg-red-600/15 blur-[120px] animate-pulse-slow delay-2000"></div>
      </div>

      {/* HEADER */}
      <section className="text-center space-y-6 px-4 relative z-10 mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur border border-yellow-200 text-yellow-800 text-sm font-bold mb-2 shadow-sm">
          <Globe className="w-4 h-4 text-blue-600" />
          <span className="text-blue-900">Tricolorii</span> <span className="text-yellow-600">în</span> <span className="text-red-600">Lume</span>
        </div>
        
        <h1 className="text-4xl font-black tracking-tighter lg:text-7xl uppercase text-slate-900 dark:text-white drop-shadow-sm">
           Echipa Națională
        </h1>
        
        <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-400 text-lg font-medium">
           Monitorizăm performanțele stranierilor noștri în timp real.
        </p>
      </section>

      {/* --- ZONA DE BUTOANE (NOU) --- */}
      <section className="px-4 container mx-auto relative z-10 mb-10 flex justify-center">
          <div className="flex flex-wrap justify-center gap-2 bg-white/60 backdrop-blur-md p-2 rounded-2xl border border-blue-100 shadow-lg">
              {FILTERS.map((filter) => (
                  <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                          activeFilter === filter 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 transform scale-105' 
                          : 'bg-transparent text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                  >
                      {activeFilter === filter && <Filter className="w-3 h-3" />}
                      {filter}
                  </button>
              ))}
          </div>
      </section>

      {/* GRID */}
      <section className="px-6 container mx-auto relative z-10">
        {loading ? (
             // --- SKELETONS ---
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                 {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <DiasporaSkeleton key={i} />)}
             </div>
        ) : filteredPlayers.length === 0 ? (
            // --- MESAJ LISTĂ GOALĂ (ADAPTAT PENTRU FILTRE) ---
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur rounded-3xl border border-dashed border-gray-300 text-center px-4 max-w-2xl mx-auto">
                <div className="bg-yellow-100 p-4 rounded-full mb-4">
                    <Plane className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Nu am găsit jucători</h3>
                <p className="text-gray-500 mt-1">Niciun rezultat pentru filtrul "{activeFilter}".</p>
                <button onClick={() => setActiveFilter("Toate")} className="mt-4 text-blue-600 font-bold hover:underline">
                    Vezi toți stranierii
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in slide-in-from-bottom-8 duration-700">
            {filteredPlayers.map((player) => {
                const stats = player.statistics_summary || { matches: 0, total_goals: 0, total_assists: 0, total_appearances: 0, minutes_played: 0, rating: "0" };
                
                const isNationalOnly = player.team_name.includes("Nationala") || player.team_name === "Romania";
                const badgeText = isNationalOnly ? "CONVOCAT" : (LEAGUE_MAP[player.team_name] || player.team_name);
                const ratingValue = stats.rating ? parseFloat(stats.rating).toFixed(2) : "-";

                return (
                    <div key={player._id} className="relative rounded-2xl overflow-hidden group shadow-xl hover:shadow-2xl hover:shadow-yellow-500/20 border border-white/60 bg-white/80 backdrop-blur-sm dark:bg-slate-800/80 dark:border-slate-700 transform hover:-translate-y-2 transition-all duration-300 flex flex-col h-full">
                        
                        {/* 1. BADGE LIGA + RATING */}
                        <div className="absolute top-0 right-0 z-20 flex">
                             {ratingValue !== "-" && (
                                <div className="bg-slate-900 text-yellow-400 text-[10px] font-black px-2 py-1.5 flex items-center gap-1 border-b border-l border-white/10 shadow-md">
                                    <Star className="w-3 h-3 fill-yellow-400" />
                                    {ratingValue}
                                </div>
                             )}
                             <div className="text-[10px] font-bold px-3 py-1.5 rounded-bl-xl bg-gradient-to-r from-blue-700 via-yellow-500 to-red-600 text-white shadow-lg flex items-center gap-1">
                                {badgeText} {isNationalOnly && "🇷🇴"}
                            </div>
                        </div>

                        {/* 2. POZA */}
                        <div className="h-56 relative overflow-hidden bg-gradient-to-b from-gray-100 to-white shrink-0">
                            {/* Efect fundal texturat */}
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fbbf24_1px,transparent_1px)] [background-size:16px_16px]"></div>
                            
                            <img 
                                src={player.image || GENERIC_USER_IMAGE} 
                                alt={player.name}
                                className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                                onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }}
                            />
                            
                            {/* Gradient peste poza pentru lizibilitate text */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10"></div>
                            
                            <div className="absolute bottom-4 left-4 z-20 text-white">
                                <h3 className="text-xl font-black leading-none drop-shadow-lg uppercase italic truncate max-w-[200px] tracking-tight">
                                    {player.name}
                                </h3>
                                <div className="flex items-center gap-1 text-yellow-300 text-xs font-bold mt-1 tracking-wide uppercase opacity-90">
                                    <Shield className="w-3 h-3" /> 
                                    {player.team_name}
                                </div>
                            </div>
                        </div>

                        {/* 3. STATISTICI */}
                        <div className="p-4 flex-1 flex flex-col justify-center">
                            
                            {/* Rândul 1: Principale */}
                            <div className="grid grid-cols-3 gap-2 text-center border-b border-gray-100 dark:border-slate-700 pb-3 mb-3">
                                <div>
                                    <span className="block text-xl font-black text-slate-800 dark:text-white">{stats.total_appearances}</span>
                                    <span className="text-[9px] uppercase text-gray-400 font-bold tracking-widest">Meciuri</span>
                                </div>
                                <div className="border-x border-gray-100 dark:border-slate-700">
                                    <span className="block text-xl font-black text-green-600">{stats.total_goals}</span>
                                    <span className="text-[9px] uppercase text-gray-400 font-bold tracking-widest">Goluri</span>
                                </div>
                                <div>
                                    <span className="block text-xl font-black text-blue-600">{stats.total_assists}</span>
                                    <span className="text-[9px] uppercase text-gray-400 font-bold tracking-widest">Pase</span>
                                </div>
                            </div>

                            {/* Rândul 2: Detalii */}
                            <div className="grid grid-cols-2 gap-2 text-center">
                                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                                     <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-bold text-sm">
                                        <Clock className="w-3 h-3 text-yellow-600" />
                                        {stats.minutes_played || 0}'
                                     </div>
                                     <span className="text-[8px] uppercase text-gray-400 font-bold">Minute</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                                     <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-bold text-sm">
                                        <Activity className="w-3 h-3 text-red-500" />
                                        {ratingValue}
                                     </div>
                                     <span className="text-[8px] uppercase text-gray-400 font-bold">Rating</span>
                                </div>
                            </div>
                        </div>

                        {/* 4. POZIȚIE */}
                        <div className="absolute top-3 left-3 z-20">
                            <span className="px-2 py-1 text-[10px] font-black rounded shadow-md bg-white/90 text-slate-900 uppercase tracking-widest border border-gray-200">
                                {player.position}
                            </span>
                        </div>
                        
                        {/* 5. BARĂ JOS TRICOLOR */}
                        <div className="bg-gradient-to-r from-blue-600 via-yellow-500 to-red-600 h-1 w-full mt-auto opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                );
            })}
            </div>
        )}
      </section>
    </div>
  );
}