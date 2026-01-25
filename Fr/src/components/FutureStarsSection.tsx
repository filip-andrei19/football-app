import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, Star, MapPin, Ruler, Weight, Calendar, Clock } from 'lucide-react';

// 1. INTERFAȚA ACTUALIZATĂ (Include toate detaliile noi)
interface Player {
  _id: string;
  name: string;
  position: string;
  age: number;
  nationality?: string;       // <--- NOU
  birth_date?: string;        // <--- NOU
  birth_place?: string;       // <--- NOU
  height?: string;            // <--- NOU
  weight?: string;            // <--- NOU
  image?: string;
  team_name?: string;
  statistics_summary?: {
    team_name?: string;
    total_goals: number;
    total_assists: number;
    total_appearances: number;
    minutes_played?: number;  // <--- NOU
    rating?: string;          // <--- NOU
  };
}

export function FutureStarsSection() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchYoungTalents = async () => {
      try {
        const response = await fetch('https://football-backend-m2a4.onrender.com/api/sport/players');
        const data = await response.json();
        
        // --- LOGICA DE FILTRARE ---
        // 1. Doar jucători U21 (<= 21 ani)
        // 2. Sortare: Întâi după Rating (dacă există), apoi după Goluri
        const youngGuns = data
            .filter((p: Player) => p.age && p.age <= 21)
            .sort((a: Player, b: Player) => {
                const ratingA = parseFloat(a.statistics_summary?.rating || "0");
                const ratingB = parseFloat(b.statistics_summary?.rating || "0");
                // Dacă au rating, sortăm după el, altfel după goluri
                if (ratingB !== ratingA) return ratingB - ratingA;
                return (b.statistics_summary?.total_goals || 0) - (a.statistics_summary?.total_goals || 0);
            });

        setPlayers(youngGuns);
      } catch (err) {
        console.error("Eroare la încărcarea tinerilor:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchYoungTalents();
  }, []);

  // Helper pentru formatarea datei
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-12 py-10 min-h-[60vh] bg-slate-50 dark:bg-black/20">
      
      {/* --- HEADER --- */}
      <section className="text-center space-y-6 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 text-amber-800 text-sm font-bold mb-2 border border-amber-200 shadow-sm">
          <Sparkles className="h-4 w-4" />
          Scouting Report 2024/2025
        </div>
        
        <h1 className="text-4xl font-black tracking-tighter lg:text-7xl uppercase">
          <span className="bg-clip-text text-transparent bg-gradient-to-b from-amber-500 to-yellow-600 drop-shadow-sm">
            Future Stars
          </span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-muted-foreground text-lg">
           Cei mai promițători jucători U21 din SuperLigă, analizați în detaliu.
        </p>
      </section>

      {/* --- GRILA DE JUCĂTORI --- */}
      <section className="px-4 container mx-auto">
        {loading ? (
            <div className="text-center py-20 text-muted-foreground animate-pulse">
                Căutăm diamantele neșlefuite...
            </div>
        ) : players.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed">
                <p className="text-xl font-semibold">Momentan nu există date.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {players.map((player) => {
                const stats = player.statistics_summary || { total_goals: 0, total_assists: 0, total_appearances: 0, minutes_played: 0, rating: "0" };
                const rating = stats.rating ? parseFloat(stats.rating).toFixed(2) : null;
                
                return (
                    <div key={player._id} className="group relative bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-amber-100/40 transition-all duration-300 hover:-translate-y-2 flex flex-col h-full">
                        
                        {/* 1. TOP CARD: Gradient + Imagine + Badge Rating */}
                        <div className="relative h-28 bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 overflow-visible">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                            
                            {/* Badge Vârstă */}
                            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-amber-800 text-xs font-bold px-2 py-1 rounded shadow-sm z-10">
                                U{player.age}
                            </div>

                            {/* Badge Rating (Dacă există) */}
                            {rating && (
                                <div className="absolute top-3 right-3 bg-black/80 backdrop-blur text-yellow-400 text-xs font-bold px-2 py-1 rounded shadow-sm z-10 flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-yellow-400" /> {rating}
                                </div>
                            )}

                            {/* Imagine Centrată (iese din container) */}
                            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
                                <img 
                                    src={player.image || "https://via.placeholder.com/150"} 
                                    alt={player.name}
                                    className="h-24 w-24 rounded-full object-cover border-[4px] border-white dark:border-slate-900 shadow-lg bg-white"
                                    onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/150?text=No+Img"; }}
                                />
                            </div>
                        </div>

                        {/* 2. MAIN INFO: Nume & Echipă */}
                        <div className="pt-14 pb-2 px-4 text-center">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight mb-1">
                                {player.name}
                            </h3>
                            <div className="flex justify-center items-center gap-2 text-xs text-gray-500 uppercase font-semibold">
                                <span>{player.team_name}</span>
                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                <span className="text-amber-600">{player.position}</span>
                            </div>
                        </div>

                        {/* 3. BIO GRID (Fișa Tehnică) - Aspect Unic */}
                        <div className="px-4 py-3">
                            <div className="grid grid-cols-2 gap-2 bg-amber-50/50 dark:bg-slate-800/50 rounded-lg p-3 border border-amber-100/50 dark:border-slate-700">
                                
                                {/* Data Nașterii */}
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase">
                                        <Calendar className="w-3 h-3" /> Născut
                                    </div>
                                    <span className="text-xs font-semibold truncate">{formatDate(player.birth_date)}</span>
                                </div>

                                {/* Locul Nașterii */}
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase">
                                        <MapPin className="w-3 h-3" /> Origine
                                    </div>
                                    <span className="text-xs font-semibold truncate" title={player.birth_place}>
                                        {player.birth_place || player.nationality || '-'}
                                    </span>
                                </div>

                                {/* Înălțime */}
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase">
                                        <Ruler className="w-3 h-3" /> Înălțime
                                    </div>
                                    <span className="text-xs font-semibold">{player.height || '-'}</span>
                                </div>

                                {/* Greutate */}
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase">
                                        <Weight className="w-3 h-3" /> Greutate
                                    </div>
                                    <span className="text-xs font-semibold">{player.weight || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* 4. STATS FOOTER (Spacer auto pentru a împinge footer-ul jos) */}
                        <div className="mt-auto border-t border-gray-100 dark:border-slate-800">
                            <div className="grid grid-cols-4 divide-x divide-gray-100 dark:divide-slate-800 text-center py-3 bg-white dark:bg-slate-900">
                                
                                <div>
                                    <span className="block text-lg font-bold text-gray-800 dark:text-gray-200">{stats.total_appearances}</span>
                                    <span className="block text-[9px] uppercase text-gray-400 font-bold">Meci</span>
                                </div>
                                
                                <div>
                                    <span className="block text-lg font-bold text-green-600">{stats.total_goals}</span>
                                    <span className="block text-[9px] uppercase text-green-700/70 font-bold">Gol</span>
                                </div>

                                <div>
                                    <span className="block text-lg font-bold text-blue-600">{stats.total_assists}</span>
                                    <span className="block text-[9px] uppercase text-blue-700/70 font-bold">Pasă</span>
                                </div>

                                <div>
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <div className="flex items-center gap-0.5 text-amber-700 font-bold text-xs">
                                            <Clock className="w-3 h-3" />
                                        </div>
                                        <span className="text-[10px] font-semibold text-gray-600">
                                            {stats.minutes_played || 0}'
                                        </span>
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