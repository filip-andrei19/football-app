import React, { useEffect, useState } from 'react';
import { Globe, Plane, MapPin, AlertCircle, Shield, Star } from 'lucide-react';

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
           const isNationalTeam = cleanTeamName.includes("nationala") || cleanTeamName === "romania";
           
           if (isNationalTeam) return true; 

           const isRomanianClub = BLOCKED_KEYWORDS.some(keyword => cleanTeamName.includes(keyword));
           return !isRomanianClub;
        });

        // Sortare: Naționala sus, apoi restul după meciuri
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
           Cei mai buni fotbaliști români care ne reprezintă peste hotare.
        </p>
      </section>

      {/* GRID */}
      <section className="px-6 container mx-auto">
        {loading ? (
             <div className="text-center py-20 animate-pulse text-gray-500 flex flex-col items-center">
                <Plane className="w-10 h-10 mb-4 text-blue-500 animate-bounce" />
                <p>Convocăm jucătorii...</p>
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
                const stats = player.statistics_summary || { matches: 0, total_goals: 0, total_assists: 0, total_appearances: 0 };
                
                // Verificăm dacă e "doar" la națională sau are club
                const isNationalOnly = player.team_name.includes("Nationala") || player.team_name === "Romania";
                
                // Textul din badge: Numele Ligii (dacă există) sau "CONVOCAT"
                const badgeText = isNationalOnly ? "CONVOCAT" : (LEAGUE_MAP[player.team_name] || player.team_name);

                return (
                    <div key={player._id} className="relative rounded-2xl overflow-hidden group shadow-2xl shadow-yellow-500/10 border-2 border-yellow-400 transform hover:-translate-y-2 transition-all duration-300 bg-white dark:bg-slate-900">
                        
                        {/* 1. BADGE TRICOLOR (Pt toți) */}
                        <div className="absolute top-0 right-0 z-20 text-[10px] font-bold px-4 py-1.5 rounded-bl-xl bg-gradient-to-r from-blue-600 via-yellow-500 to-red-600 text-white shadow-lg flex items-center gap-1">
                            {badgeText} {isNationalOnly && "🇷🇴"}
                        </div>

                        {/* 2. POZA + GRADIENT AURIU */}
                        <div className="h-52 relative overflow-hidden bg-gradient-to-br from-yellow-50 via-white to-gray-50">
                            {/* Textură subtilă */}
                            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                            
                            {/* Gradient închis jos pentru lizibilitate text */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10"></div>
                            
                            <img 
                                src={player.image || GENERIC_USER_IMAGE} 
                                alt={player.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }}
                            />
                            
                            {/* NUME ȘI CLUB */}
                            <div className="absolute bottom-3 left-4 z-20 text-white">
                                <h3 className="text-2xl font-black leading-none drop-shadow-md uppercase italic">
                                    {player.name}
                                </h3>
                                <div className="flex items-center gap-1 text-yellow-300 text-xs font-bold mt-1 tracking-wide uppercase">
                                    <Shield className="w-3 h-3" /> 
                                    {player.team_name}
                                </div>
                            </div>
                        </div>

                        {/* 3. STATISTICI (Background gălbui subtil) */}
                        <div className="p-4 grid grid-cols-3 gap-2 text-center relative z-20 bg-yellow-50/50 dark:bg-slate-800">
                            <div>
                                <span className="block text-xl font-black text-blue-900 dark:text-blue-400">{stats.total_appearances}</span>
                                <span className="text-[9px] uppercase text-gray-500 font-bold tracking-widest">Meciuri</span>
                            </div>
                            <div className="border-x border-yellow-200 dark:border-slate-700">
                                <span className="block text-xl font-black text-red-600">{stats.total_goals}</span>
                                <span className="text-[9px] uppercase text-gray-500 font-bold tracking-widest">Goluri</span>
                            </div>
                            <div>
                                <span className="block text-xl font-black text-yellow-600">{stats.total_assists}</span>
                                <span className="text-[9px] uppercase text-gray-500 font-bold tracking-widest">Pase</span>
                            </div>
                        </div>

                        {/* 4. POZIȚIE (Badge Galben) */}
                        <div className="absolute top-3 left-3 z-20">
                            <span className="px-2 py-1 text-xs font-bold rounded-md shadow-sm border border-yellow-500 bg-yellow-400 text-blue-900 uppercase tracking-wider">
                                {player.position}
                            </span>
                        </div>
                        
                        {/* 5. FOOTER TRICOLOR */}
                        <div className="bg-gradient-to-r from-blue-600 via-yellow-500 to-red-600 h-1.5 w-full"></div>
                    </div>
                );
            })}
            </div>
        )}
      </section>
    </div>
  );
}