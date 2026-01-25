import React, { useEffect, useState } from 'react';
import { Globe, Plane, MapPin } from 'lucide-react';

// URL pentru imagine generică
const GENERIC_USER_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

// Lista echipelor din România (pentru a le exclude și a păstra doar stranierii)
const ROMANIAN_TEAMS = [
  "FCSB", "CFR 1907 Cluj", "Universitatea Craiova", "FC Rapid 1923", "Farul Constanta", 
  "Sepsi OSK", "Universitatea Cluj", "Petrolul 52", "FC Hermannstadt", "UTA Arad", 
  "Politehnica Iasi", "SC Otelul Galati", "FC Botosani", "Dinamo Bucuresti", 
  "Unirea Slobozia", "Gloria Buzau", "FC Voluntari", "SuperLiga"
];

// Dicționar mic pentru a ghici Liga (doar pentru aspect vizual)
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
  "Raków Częstochowa": "Ekstraklasa 🇵🇱"
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
        // 1. Luăm toți jucătorii din baza ta de date
        const response = await fetch('https://football-backend-m2a4.onrender.com/api/sport/players');
        const data = await response.json();

        // 2. FILTRARE: Vrem doar Români care NU joacă în SuperLigă
        const stranieri = data.filter((p: Player) => {
           const isRomanian = p.nationality === "Romania";
           // Verificăm dacă echipa NU este în lista celor din România
           const isAbroad = !ROMANIAN_TEAMS.includes(p.team_name || "");
           // Includem și cazul special dacă echipa a rămas "Romania (Nationala)"
           const isNationalTeam = p.team_name === "Romania (Nationala)";

           return isRomanian && (isAbroad || isNationalTeam);
        });

        // 3. Sortăm după valoare (meciuri jucate sau goluri) ca să apară vedetele primele
        const sortedStranieri = stranieri.sort((a: Player, b: Player) => 
            (b.statistics_summary?.total_appearances || 0) - (a.statistics_summary?.total_appearances || 0)
        );

        setPlayers(sortedStranieri);
      } catch (err) {
        console.error("Eroare la încărcare diaspora:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDiaspora();
  }, []);

  return (
    <div className="space-y-12 py-10 min-h-[60vh] bg-slate-50 dark:bg-black/10">
      
      {/* HEADER SECTION */}
      <section className="text-center space-y-6 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-100 text-yellow-800 text-sm font-semibold mb-2 border border-yellow-200">
          <Globe className="w-4 h-4" />
          🇷🇴 Tricolorii peste hotare
        </div>
        
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-yellow-500 to-red-600 drop-shadow-sm">
          Ambasadorii Fotbalului
        </h1>
        
        <div className="max-w-2xl mx-auto space-y-4 text-muted-foreground text-lg">
          <p>
            Ei sunt cei care duc faima României pe marile stadioane ale Europei. 
            Date actualizate în timp real.
          </p>
        </div>
      </section>

      {/* PLAYER GRID */}
      <section className="px-6 container mx-auto">
        {loading ? (
             <div className="text-center py-20 animate-pulse text-gray-500">
                <Plane className="w-8 h-8 mx-auto mb-2 animate-bounce text-blue-500" />
                Căutăm stranierii pe radar...
             </div>
        ) : players.length === 0 ? (
            <div className="text-center py-10 bg-white border border-dashed rounded-xl">
                Nu am găsit jucători în Diaspora momentan. Rulează scriptul de actualizare.
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {players.map((player) => {
                const stats = player.statistics_summary || { matches: 0, total_goals: 0, total_assists: 0, total_appearances: 0 };
                // Determinăm liga vizual
                const leagueBadge = LEAGUE_MAP[player.team_name] || "International 🌍";

                return (
                    <div 
                    key={player._id} 
                    className="border border-gray-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-lg hover:shadow-2xl hover:shadow-yellow-100/50 transition-all duration-300 hover:-translate-y-2 group overflow-hidden flex flex-col"
                    >
                    {/* Image Container */}
                    <div className="relative h-56 bg-gradient-to-b from-gray-50 to-white dark:from-slate-800 dark:to-slate-900 flex justify-center items-center pt-4 overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>
                        
                        <img 
                            src={player.image || GENERIC_USER_IMAGE} 
                            alt={player.name}
                            className="h-40 w-40 rounded-full object-cover border-4 border-white dark:border-slate-700 shadow-xl z-10 group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }}
                        />
                        
                        {/* League Badge */}
                        <div className="absolute top-3 right-3 bg-white/90 dark:bg-black/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-gray-100 dark:border-slate-700 flex items-center gap-1">
                            {leagueBadge}
                        </div>
                    </div>

                    {/* Player Details */}
                    <div className="p-5 text-center flex-1 flex flex-col">
                        <div className="mb-4 flex-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                            {player.name}
                        </h3>
                        <div className="flex items-center justify-center gap-1 mt-1 text-sm font-medium text-gray-500">
                            <MapPin className="w-3 h-3" />
                            {player.team_name}
                        </div>
                        <span className="inline-block mt-3 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-full font-semibold border border-blue-100 dark:border-blue-800">
                            {player.position}
                        </span>
                        </div>

                        {/* Stats Table */}
                        <div className="grid grid-cols-3 gap-2 border-t border-gray-100 dark:border-slate-800 pt-4 bg-gray-50/30 dark:bg-slate-800/30 -mx-5 -mb-5 pb-5 px-5">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Meciuri</span>
                            <span className="text-lg font-bold text-gray-800 dark:text-gray-200">{stats.total_appearances}</span>
                        </div>
                        <div className="flex flex-col border-l border-r border-gray-200 dark:border-slate-700">
                            <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Goluri</span>
                            <span className="text-lg font-bold text-green-600">{stats.total_goals}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Pase</span>
                            <span className="text-lg font-bold text-blue-600">{stats.total_assists}</span>
                        </div>
                        </div>
                    </div>
                    </div>
                );
            })}
            </div>
        )}
      </section>

      {/* Footer Message */}
      <section className="text-center pt-8 pb-4 opacity-70">
        <p className="text-sm font-medium text-gray-500">🇷🇴 Susținem românii, oriunde ar fi!</p>
      </section>
    </div>
  );
}