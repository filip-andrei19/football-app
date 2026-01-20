import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, Star } from 'lucide-react';

interface Player {
  _id: string;
  name: string;
  position: string;
  age: number;
  image?: string;
  team_name?: string;
  statistics_summary?: {
    team_name?: string;
    total_goals: number;
    total_assists: number;
    total_appearances: number;
  };
}

export function FutureStarsSection() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchYoungTalents = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/sport/players');
        const data = await response.json();
        
        // --- LOGICA DE FILTRARE ---
        // 1. Vrem doar jucătorii de maxim 21 de ani.
        // 2. Îi sortăm după goluri, ca să apară cei mai buni primii.
        const youngGuns = data
            .filter((p: Player) => p.age && p.age <= 21)
            .sort((a: Player, b: Player) => (b.statistics_summary?.total_goals || 0) - (a.statistics_summary?.total_goals || 0));

        setPlayers(youngGuns);
      } catch (err) {
        console.error("Eroare la încărcarea tinerilor:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchYoungTalents();
  }, []);

  return (
    <div className="space-y-12 py-10 min-h-[60vh]">
      
      {/* --- HEADER CU MESAJE INSPIRATIONALE --- */}
      <section className="text-center space-y-6 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-800 text-sm font-bold mb-2 border border-amber-200 shadow-sm">
          <Sparkles className="h-4 w-4" />
          Scouting Report U21
        </div>
        
        <h1 className="text-4xl font-black tracking-tighter lg:text-7xl uppercase">
          <span className="bg-clip-text text-transparent bg-gradient-to-b from-yellow-400 to-yellow-700 drop-shadow-sm">
            Future Stars
          </span>
        </h1>
        
        <div className="max-w-3xl mx-auto space-y-4 text-muted-foreground text-lg">
          <p className="font-medium text-gray-700 dark:text-gray-300">
            Ei sunt arhitecții fotbalului de mâine.
          </p>
          <div className="flex justify-center gap-2 opacity-80 text-sm">
             <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500" /> Talent Pur</span>
             <span className="text-gray-300">•</span>
             <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-green-500" /> Potențial Uriaș</span>
          </div>
        </div>
      </section>

      {/* --- GRILA DE JUCĂTORI --- */}
      <section className="px-4 container mx-auto">
        {loading ? (
            <div className="text-center py-20 text-muted-foreground animate-pulse">
                Căutăm diamantele neșlefuite...
            </div>
        ) : players.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed">
                <p className="text-xl font-semibold">Momentan nu există jucători U21 în baza de date.</p>
                <p className="text-sm text-gray-500">Rulează scriptul de actualizare pentru a adăuga tinere talente.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {players.map((player) => {
                const stats = player.statistics_summary || { total_goals: 0, total_assists: 0, total_appearances: 0 };
                
                return (
                    <div key={player._id} className="group relative bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-amber-100/50 transition-all duration-300 hover:-translate-y-1">
                        
                        {/* Header Card: Gradient Auriu */}
                        <div className="h-24 bg-gradient-to-r from-amber-400 to-yellow-300 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
                            {/* Vârsta în colț */}
                            <div className="absolute top-2 right-2 bg-black/20 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-lg border border-white/20">
                                {player.age} ANI
                            </div>
                        </div>

                        {/* Imaginea Jucătorului (Centrată, suprapusă) */}
                        <div className="flex justify-center -mt-12 relative z-10">
                            <img 
                                src={player.image || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} 
                                alt={player.name}
                                className="h-24 w-24 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-lg group-hover:scale-110 transition-transform duration-300 bg-white"
                                onError={(e) => { e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"; }}
                            />
                        </div>

                        {/* Detalii */}
                        <div className="p-5 text-center space-y-2">
                            <h3 className="font-bold text-lg truncate text-gray-900 dark:text-white group-hover:text-amber-600 transition-colors">
                                {player.name}
                            </h3>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                {player.team_name || "Fără Echipă"}
                            </p>
                            
                            {/* Badge Poziție */}
                            <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-slate-800 text-xs font-medium rounded-full text-gray-600 dark:text-gray-300">
                                {player.position}
                            </span>
                        </div>

                        {/* Statistici Compacte */}
                        <div className="grid grid-cols-3 border-t border-gray-100 dark:border-slate-800 py-3 bg-gray-50/50 dark:bg-slate-900/50 text-center text-sm">
                            <div>
                                <div className="font-bold text-gray-900 dark:text-white">{stats.total_appearances}</div>
                                <div className="text-[10px] text-gray-400 uppercase">Meciuri</div>
                            </div>
                            <div className="border-x border-gray-100 dark:border-slate-800">
                                <div className="font-bold text-amber-600">{stats.total_goals}</div>
                                <div className="text-[10px] text-gray-400 uppercase">Goluri</div>
                            </div>
                            <div>
                                <div className="font-bold text-blue-600">{stats.total_assists}</div>
                                <div className="text-[10px] text-gray-400 uppercase">Pase</div>
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