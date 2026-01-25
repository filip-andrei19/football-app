import React, { useEffect, useState } from 'react';
import { Globe, Plane, MapPin, AlertCircle } from 'lucide-react';

const GENERIC_USER_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

// 🚫 LISTA NEAGRĂ (Cuvinte cheie care indică o echipă românească)
// Scriem totul fără diacritice, cu litere mici.
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
  "resita", "csm", "scm", "fc", "acs" // Termeni generici românești
];

// Dicționar ligi (pentru aspect)
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

// Funcție pentru eliminarea diacriticelor (Ex: "Buzău" -> "buzau")
const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Scoate accentele
    .replace(/[^a-z0-9 ]/g, "");     // Păstrează doar litere și cifre
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

        // --- FILTRARE STRICTĂ ---
        const stranieri = data.filter((p: Player) => {
           // 1. Trebuie să fie Român
           if (p.nationality !== "Romania") return false;

           // 2. Normalizăm numele echipei (fără diacritice, litere mici)
           const cleanTeamName = normalizeText(p.team_name || "");
           
           // 3. Verificăm dacă conține cuvinte interzise
           // Ex: "scm gloria buzău" -> "scm gloria buzau". Conține "buzau" -> BLOCKED.
           const isRomanianClub = BLOCKED_KEYWORDS.some(keyword => {
              // Verificăm cuvânt cu cuvânt pentru precizie
              return cleanTeamName.includes(keyword);
           });
           
           // 4. Excludem și cazul generic "Romania (Nationala)" dacă nu i-am găsit clubul
           const isNationalGeneric = cleanTeamName.includes("nationala");

           // Păstrăm doar ce NU e românesc și NU e generic
           return !isRomanianClub && !isNationalGeneric;
        });

        // Sortare
        const sortedStranieri = stranieri.sort((a: Player, b: Player) => 
            (b.statistics_summary?.total_appearances || 0) - (a.statistics_summary?.total_appearances || 0)
        );

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
          Diaspora Tricoloră
        </div>
        
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-400">
          Stranierii Noștri
        </h1>
        
        <p className="max-w-2xl mx-auto text-muted-foreground text-lg">
           Jucătorii echipei naționale care evoluează în campionatele din străinătate.
        </p>
      </section>

      {/* GRID */}
      <section className="px-6 container mx-auto">
        {loading ? (
             <div className="text-center py-20 animate-pulse text-gray-500 flex flex-col items-center">
                <Plane className="w-10 h-10 mb-4 text-blue-500 animate-bounce" />
                <p>Căutăm stranierii...</p>
             </div>
        ) : players.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 text-center px-4">
                <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
                <h3 className="text-lg font-bold text-gray-800">Lista e goală?</h3>
                <p className="text-gray-500 max-w-md">
                   Se pare că filtrul strict a eliminat toți jucătorii. Verifică dacă scriptul de backend a reușit să găsească cluburile străine (ex: Tottenham, Parma). Dacă toți au rămas cu "Romania (Nationala)" sau echipe de SuperLigă, nu vor apărea aici.
                </p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {players.map((player) => {
                const stats = player.statistics_summary || { matches: 0, total_goals: 0, total_assists: 0, total_appearances: 0 };
                const leagueBadge = LEAGUE_MAP[player.team_name] || "International 🌍";

                return (
                    <div 
                    key={player._id} 
                    className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-lg hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden group border border-gray-100 dark:border-slate-800"
                    >
                        {/* Steag Liga */}
                        <div className="absolute top-0 right-0 z-20 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-md">
                            {leagueBadge}
                        </div>

                        {/* Imagine + Gradient */}
                        <div className="h-48 relative overflow-hidden bg-gray-100">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                            <img 
                                src={player.image || GENERIC_USER_IMAGE} 
                                alt={player.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }}
                            />
                            {/* Nume Peste Imagine */}
                            <div className="absolute bottom-3 left-4 z-20 text-white">
                                <h3 className="text-xl font-bold leading-tight">{player.name}</h3>
                                <div className="flex items-center gap-1 text-blue-200 text-sm font-medium">
                                    <MapPin className="w-3 h-3" /> {player.team_name}
                                </div>
                            </div>
                        </div>

                        {/* Statistici */}
                        <div className="p-4 grid grid-cols-3 gap-2 text-center bg-white dark:bg-slate-900 relative z-20">
                            <div>
                                <span className="block text-xl font-bold text-gray-800 dark:text-gray-200">{stats.total_appearances}</span>
                                <span className="text-[10px] uppercase text-gray-400 font-bold">Meciuri</span>
                            </div>
                            <div className="border-x border-gray-100 dark:border-slate-800">
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
                            <span className="px-2 py-1 bg-white/90 backdrop-blur text-gray-800 text-xs font-bold rounded-md shadow-sm border border-gray-200">
                                {player.position}
                            </span>
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