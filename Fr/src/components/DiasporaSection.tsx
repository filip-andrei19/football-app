import React, { useEffect, useState } from 'react';
import { Globe, Plane, MapPin, AlertCircle, Shield, Award } from 'lucide-react';

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
           
           // 1. Verificăm dacă e Naționala (SPECIAL CASE)
           // Permitem orice include "nationala" sau e fix "romania"
           const isNationalTeam = cleanTeamName.includes("nationala") || cleanTeamName === "romania";
           if (isNationalTeam) return true; // Îi păstrăm!

           // 2. Pentru restul, verificăm să nu fie club românesc
           const isRomanianClub = BLOCKED_KEYWORDS.some(keyword => cleanTeamName.includes(keyword));
           
           return !isRomanianClub;
        });

        // Sortare: Îi punem pe cei de la Națională la început, apoi după meciuri
        const sortedStranieri = stranieri.sort((a: Player, b: Player) => {
            const isNationalA = a.team_name.includes("Nationala");
            const isNationalB = b.team_name.includes("Nationala");
            if (isNationalA && !isNationalB) return -1;
            if (!isNationalA && isNationalB) return 1;
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
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold mb-2 border border-blue-200">
          <Globe className="w-4 h-4" />
          Diaspora & Echipa Națională
        </div>
        
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-400">
          Tricolorii Noștri
        </h1>
        
        <p className="max-w-2xl mx-auto text-muted-foreground text-lg">
           Jucătorii care reprezintă România în campionatele externe sau direct sub steagul naționalei.
        </p>
      </section>

      {/* GRID */}
      <section className="px-6 container mx-auto">
        {loading ? (
             <div className="text-center py-20 animate-pulse text-gray-500 flex flex-col items-center">
                <Plane className="w-10 h-10 mb-4 text-blue-500 animate-bounce" />
                <p>Scanăm mapamondul...</p>
             </div>
        ) : players.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 text-center px-4">
                <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
                <h3 className="text-lg font-bold text-gray-800">Niciun rezultat</h3>
                <p className="text-gray-500 max-w-md">Nu am găsit jucători care să corespundă criteriilor.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {players.map((player) => {
                const stats = player.statistics_summary || { matches: 0, total_goals: 0, total_assists: 0, total_appearances: 0 };
                
                // --- DESIGN LOGIC ---
                // Verificăm dacă e jucător de "Națională" (fără club)
                const isNationalTeam = player.team_name.includes("Nationala") || player.team_name === "Romania";
                
                // Setări specifice pentru Națională
                const leagueBadge = isNationalTeam ? "CONVOCAT 🇷🇴" : (LEAGUE_MAP[player.team_name] || "International 🌍");
                
                // Stiluri Condiționale
                const cardClasses = isNationalTeam 
                    ? "relative rounded-2xl overflow-hidden group shadow-2xl shadow-yellow-500/20 border-2 border-yellow-400 transform hover:-translate-y-2 transition-all duration-300"
                    : "relative bg-white dark:bg-slate-900 rounded-2xl shadow-lg hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden group border border-gray-100 dark:border-slate-800";

                const bgGradient = isNationalTeam
                    ? "bg-gradient-to-br from-yellow-300 via-yellow-100 to-white"
                    : "bg-gray-100";
                    
                const badgeColor = isNationalTeam
                    ? "bg-gradient-to-r from-blue-600 via-yellow-500 to-red-600 text-white shadow-lg"
                    : "bg-blue-600 text-white";

                return (
                    <div key={player._id} className={cardClasses}>
                        
                        {/* Steag / Badge Dreapta Sus */}
                        <div className={`absolute top-0 right-0 z-20 text-[10px] font-bold px-4 py-1.5 rounded-bl-xl ${badgeColor}`}>
                            {leagueBadge}
                        </div>

                        {/* Imagine + Gradient */}
                        <div className={`h-48 relative overflow-hidden ${bgGradient}`}>
                            {/* Pattern special pt Națională */}
                            {isNationalTeam && (
                                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                            )}
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10"></div>
                            
                            <img 
                                src={player.image || GENERIC_USER_IMAGE} 
                                alt={player.name}
                                className={`w-full h-full object-cover transition-transform duration-500 ${isNationalTeam ? 'group-hover:scale-110 sepia-[.10]' : 'group-hover:scale-105'}`}
                                onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }}
                            />
                            
                            {/* Nume Peste Imagine */}
                            <div className="absolute bottom-3 left-4 z-20 text-white">
                                <h3 className="text-xl font-bold leading-tight drop-shadow-md">
                                    {player.name}
                                </h3>
                                <div className="flex items-center gap-1 text-gray-200 text-sm font-medium">
                                    {isNationalTeam ? <Shield className="w-3 h-3 text-yellow-400" /> : <MapPin className="w-3 h-3" />} 
                                    {isNationalTeam ? "Echipa Națională" : player.team_name}
                                </div>
                            </div>
                        </div>

                        {/* Statistici */}
                        <div className={`p-4 grid grid-cols-3 gap-2 text-center relative z-20 ${isNationalTeam ? 'bg-yellow-50/80' : 'bg-white dark:bg-slate-900'}`}>
                            <div>
                                <span className={`block text-xl font-bold ${isNationalTeam ? 'text-blue-900' : 'text-gray-800 dark:text-gray-200'}`}>{stats.total_appearances}</span>
                                <span className="text-[10px] uppercase text-gray-400 font-bold">Meciuri</span>
                            </div>
                            <div className={`border-x ${isNationalTeam ? 'border-yellow-200' : 'border-gray-100'}`}>
                                <span className="block text-xl font-bold text-green-600">{stats.total_goals}</span>
                                <span className="text-[10px] uppercase text-gray-400 font-bold">Goluri</span>
                            </div>
                            <div>
                                <span className="block text-xl font-bold text-blue-600">{stats.total_assists}</span>
                                <span className="text-[10px] uppercase text-gray-400 font-bold">Pase</span>
                            </div>
                        </div>

                        {/* Poziție Badge */}
                        <div className="absolute top-3 left-3 z-20">
                            <span className={`px-2 py-1 text-xs font-bold rounded-md shadow-sm border ${isNationalTeam ? 'bg-yellow-400 text-blue-900 border-yellow-500' : 'bg-white/90 backdrop-blur text-gray-800 border-gray-200'}`}>
                                {player.position}
                            </span>
                        </div>
                        
                        {/* Footer Special Națională */}
                        {isNationalTeam && (
                            <div className="bg-gradient-to-r from-blue-600 via-yellow-500 to-red-600 h-1.5 w-full"></div>
                        )}
                    </div>
                );
            })}
            </div>
        )}
      </section>
    </div>
  );
}