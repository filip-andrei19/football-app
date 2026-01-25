import React, { useEffect, useState } from 'react';
import { Globe, Plane, MapPin, AlertCircle, Shield, Star, Clock, Activity } from 'lucide-react';

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
    minutes_played?: number; // Adăugat
    rating?: string;         // Adăugat
  };
}

export function DiasporaSection() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDiaspora = async () => {
      try {
        const response = await fetch('https://football-backend-m2a4.onrender.com/api/sport/players');
        const data = await response.json();

        // --- FILTRARE ---
        const stranieri = data.filter((p: Player) => {
           if (p.nationality !== "Romania") return false;

           const cleanTeamName = normalizeText(p.team_name || "");
           const isNationalTeam = cleanTeamName.includes("nationala") || cleanTeamName === "romania";
           
           if (isNationalTeam) return true; 

           const isRomanianClub = BLOCKED_KEYWORDS.some(keyword => cleanTeamName.includes(keyword));
           return !isRomanianClub;
        });

        // Sortare: Naționala sus, apoi după Rating (dacă există), apoi Meciuri
        const sortedStranieri = stranieri.sort((a: Player, b: Player) => {
            const isNationalA = a.team_name.includes("Nationala");
            const isNationalB = b.team_name.includes("Nationala");
            
            if (isNationalA && !isNationalB) return -1;
            if (!isNationalA && isNationalB) return 1;

            // Sortare secundară după Rating
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

  return (
    <div className="space-y-12 py-10 min-h-[60vh] bg-slate-50 dark:bg-black/10">
      
      {/* HEADER */}
      <section className="text-center space-y-6 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-100 text-yellow-800 text-sm font-bold mb-2 border border-yellow-300 shadow-sm">
          <Globe className="w-4 h-4" />
          Tricolorii în Lume
        </div>
        
        <h1 className="text-4xl font-black tracking-tighter lg:text-7xl uppercase">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-yellow-500 to-red-600 drop-shadow-sm">
            Echipa Națională
          </span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-muted-foreground text-lg font-medium">
           Cifrele complete ale stranierilor noștri în sezonul curent.
        </p>
      </section>

      {/* GRID */}
      <section className="px-6 container mx-auto">
        {loading ? (
             <div className="text-center py-20 animate-pulse text-gray-500 flex flex-col items-center">
                <Plane className="w-10 h-10 mb-4 text-blue-500 animate-bounce" />
                <p>Analizăm statisticile...</p>
             </div>
        ) : players.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 text-center px-4">
                <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
                <h3 className="text-lg font-bold text-gray-800">Lot indisponibil</h3>
                <p className="text-gray-500 max-w-md">Nu s-au găsit jucători conform criteriilor.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {players.map((player) => {
                const stats = player.statistics_summary || { matches: 0, total_goals: 0, total_assists: 0, total_appearances: 0, minutes_played: 0, rating: "0" };
                
                const isNationalOnly = player.team_name.includes("Nationala") || player.team_name === "Romania";
                const badgeText = isNationalOnly ? "CONVOCAT" : (LEAGUE_MAP[player.team_name] || player.team_name);
                
                // Calculăm rating-ul (formatare cu 2 zecimale)
                const ratingValue = stats.rating ? parseFloat(stats.rating).toFixed(2) : "-";

                return (
                    <div key={player._id} className="relative rounded-2xl overflow-hidden group shadow-2xl shadow-yellow-500/10 border-2 border-yellow-400 transform hover:-translate-y-2 transition-all duration-300 bg-white dark:bg-slate-900 flex flex-col h-full">
                        
                        {/* 1. BADGE LIGA + RATING (Nou!) */}
                        <div className="absolute top-0 right-0 z-20 flex">
                             {/* Nota (Rating) - Stil FIFA */}
                             {ratingValue !== "-" && (
                                <div className="bg-black text-yellow-400 text-[10px] font-black px-2 py-1.5 flex items-center gap-1 border-b border-l border-white/20">
                                    <Star className="w-3 h-3 fill-yellow-400" />
                                    {ratingValue}
                                </div>
                             )}
                             {/* Liga */}
                             <div className="text-[10px] font-bold px-3 py-1.5 rounded-bl-xl bg-gradient-to-r from-blue-600 via-yellow-500 to-red-600 text-white shadow-lg flex items-center gap-1">
                                {badgeText} {isNationalOnly && "🇷🇴"}
                            </div>
                        </div>

                        {/* 2. POZA */}
                        <div className="h-48 relative overflow-hidden bg-gradient-to-br from-yellow-50 via-white to-gray-50 shrink-0">
                            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10"></div>
                            
                            <img 
                                src={player.image || GENERIC_USER_IMAGE} 
                                alt={player.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }}
                            />
                            
                            <div className="absolute bottom-3 left-4 z-20 text-white">
                                <h3 className="text-xl font-black leading-none drop-shadow-md uppercase italic truncate max-w-[180px]">
                                    {player.name}
                                </h3>
                                <div className="flex items-center gap-1 text-yellow-300 text-xs font-bold mt-1 tracking-wide uppercase">
                                    <Shield className="w-3 h-3" /> 
                                    {player.team_name}
                                </div>
                            </div>
                        </div>

                        {/* 3. STATISTICI COMPLETE (Grid pe 2 rânduri) */}
                        <div className="p-3 bg-yellow-50/50 dark:bg-slate-800 flex-1 flex flex-col justify-center">
                            
                            {/* Rândul 1: Principale */}
                            <div className="grid grid-cols-3 gap-2 text-center border-b border-yellow-200/50 dark:border-slate-700 pb-2 mb-2">
                                <div>
                                    <span className="block text-lg font-black text-blue-900 dark:text-blue-400">{stats.total_appearances}</span>
                                    <span className="text-[8px] uppercase text-gray-500 font-bold tracking-widest">Meci</span>
                                </div>
                                <div className="border-x border-yellow-200 dark:border-slate-700">
                                    <span className="block text-lg font-black text-green-600">{stats.total_goals}</span>
                                    <span className="text-[8px] uppercase text-gray-500 font-bold tracking-widest">Gol</span>
                                </div>
                                <div>
                                    <span className="block text-lg font-black text-blue-600">{stats.total_assists}</span>
                                    <span className="text-[8px] uppercase text-gray-500 font-bold tracking-widest">Pase</span>
                                </div>
                            </div>

                            {/* Rândul 2: Detalii (Minute & Formă) */}
                            <div className="grid grid-cols-2 gap-2 text-center">
                                <div className="flex flex-col items-center justify-center">
                                     <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300 font-bold text-sm">
                                        <Clock className="w-3 h-3 text-yellow-600" />
                                        {stats.minutes_played || 0}'
                                     </div>
                                     <span className="text-[8px] uppercase text-gray-400 font-bold">Minute Jucate</span>
                                </div>
                                <div className="flex flex-col items-center justify-center border-l border-yellow-200 dark:border-slate-700">
                                     <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300 font-bold text-sm">
                                        <Activity className="w-3 h-3 text-red-500" />
                                        {ratingValue}
                                     </div>
                                     <span className="text-[8px] uppercase text-gray-400 font-bold">Rating Mediu</span>
                                </div>
                            </div>

                        </div>

                        {/* 4. POZIȚIE */}
                        <div className="absolute top-3 left-3 z-20">
                            <span className="px-2 py-1 text-xs font-bold rounded-md shadow-sm border border-yellow-500 bg-yellow-400 text-blue-900 uppercase tracking-wider">
                                {player.position}
                            </span>
                        </div>
                        
                        {/* 5. FOOTER */}
                        <div className="bg-gradient-to-r from-blue-600 via-yellow-500 to-red-600 h-1.5 w-full mt-auto"></div>
                    </div>
                );
            })}
            </div>
        )}
      </section>
    </div>
  );
}