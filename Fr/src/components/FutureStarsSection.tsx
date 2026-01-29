import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, Star, MapPin, Ruler, Weight, Calendar, Clock, Activity, Zap } from 'lucide-react';

// 1. INTERFAȚA ACTUALIZATĂ
interface Player {
  _id: string;
  name: string;
  position: string;
  age: number;
  nationality?: string;
  birth_date?: string;
  birth_place?: string;
  height?: string;
  weight?: string;
  image?: string;
  team_name?: string;
  statistics_summary?: {
    team_name?: string;
    total_goals: number;
    total_assists: number;
    total_appearances: number;
    minutes_played?: number;
    rating?: string;
  };
}

// --- COMPONENTA SKELETON (DESIGN ELEGANT) ---
const FutureStarSkeleton = () => (
  <div className="rounded-2xl overflow-hidden border border-amber-100/50 bg-white/60 shadow-sm animate-pulse h-[480px] flex flex-col">
    <div className="h-28 bg-gray-200 w-full relative"></div>
    <div className="pt-14 pb-2 px-4 flex flex-col items-center space-y-3 flex-1">
        <div className="h-16 w-16 bg-gray-300 rounded-full -mt-20 border-4 border-white"></div>
        <div className="h-6 bg-gray-300 rounded w-3/4"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        <div className="w-full grid grid-cols-2 gap-2 mt-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
        </div>
    </div>
    <div className="h-12 bg-gray-100 w-full mt-auto"></div>
  </div>
);

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
    <div className="relative min-h-[80vh] py-10 overflow-hidden bg-slate-50 dark:bg-slate-900">
      
      {/* ==========================================================================
          NOUL FUNDAL "GOLDEN MESH" (Specific pentru Future Stars)
      ========================================================================== */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none opacity-50">
          <div className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 w-[600px] h-[600px] rounded-full bg-amber-400/20 blur-[100px] animate-pulse-slow"></div>
          <div className="absolute bottom-0 left-0 -translate-x-1/4 translate-y-1/4 w-[500px] h-[500px] rounded-full bg-yellow-200/30 blur-[120px] animate-pulse-slow delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-orange-100/20 blur-[100px]"></div>
      </div>

      {/* --- HEADER --- */}
      <section className="text-center space-y-6 px-4 relative z-10 mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50/80 backdrop-blur text-amber-700 text-sm font-bold mb-2 border border-amber-200 shadow-sm">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Scouting Report 2024/2025
        </div>
        
        <h1 className="text-4xl font-black tracking-tighter lg:text-7xl uppercase text-slate-900 dark:text-white drop-shadow-sm">
          <span className="bg-clip-text text-transparent bg-gradient-to-b from-amber-500 to-yellow-600">
            Future Stars
          </span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-400 text-lg font-medium">
           Cele mai promițătoare talente U21 din fotbalul românesc.
        </p>
      </section>

      {/* --- GRILA DE JUCĂTORI --- */}
      <section className="px-4 container mx-auto relative z-10">
        {loading ? (
            // --- SKELETONS ---
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <FutureStarSkeleton key={i} />)}
            </div>
        ) : players.length === 0 ? (
            <div className="text-center py-20 bg-white/50 backdrop-blur rounded-3xl border border-dashed border-gray-300">
                <p className="text-xl font-semibold text-gray-500">Nu am găsit tineri jucători momentan.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in slide-in-from-bottom-8 duration-700">
            {players.map((player) => {
                const stats = player.statistics_summary || { total_goals: 0, total_assists: 0, total_appearances: 0, minutes_played: 0, rating: "0" };
                const rating = stats.rating ? parseFloat(stats.rating).toFixed(2) : null;
                
                return (
                    <div key={player._id} className="group relative bg-white/90 backdrop-blur-md dark:bg-slate-800/90 border border-amber-100 dark:border-slate-700 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-300 hover:-translate-y-2 flex flex-col h-full">
                        
                        {/* 1. TOP CARD: Gradient + Imagine */}
                        <div className="relative h-28 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 overflow-visible">
                            {/* Textură fină */}
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]"></div>
                            
                            {/* Badge Vârstă */}
                            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-amber-800 text-xs font-bold px-2 py-1 rounded-lg shadow-sm z-10 flex items-center gap-1">
                                <Zap className="w-3 h-3 fill-amber-500 text-amber-500" /> U{player.age}
                            </div>

                            {/* Badge Rating */}
                            {rating && (
                                <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur text-yellow-400 text-xs font-bold px-2 py-1 rounded-lg shadow-sm z-10 flex items-center gap-1 border border-yellow-500/30">
                                    <Star className="w-3 h-3 fill-yellow-400" /> {rating}
                                </div>
                            )}

                            {/* Imagine Centrată (iese din container) */}
                            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 group-hover:scale-110 transition-transform duration-300">
                                <img 
                                    src={player.image || "https://via.placeholder.com/150"} 
                                    alt={player.name}
                                    className="h-24 w-24 rounded-full object-cover border-[4px] border-white dark:border-slate-800 shadow-xl bg-white"
                                    onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/150?text=No+Img"; }}
                                />
                            </div>
                        </div>

                        {/* 2. MAIN INFO */}
                        <div className="pt-14 pb-2 px-4 text-center">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight mb-1 truncate">
                                {player.name}
                            </h3>
                            <div className="flex justify-center items-center gap-2 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                                <span className="truncate max-w-[100px]">{player.team_name}</span>
                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{player.position}</span>
                            </div>
                        </div>

                        {/* 3. BIO GRID */}
                        <div className="px-4 py-3 flex-1">
                            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-bold"><Calendar className="w-3 h-3" /> Născut</div>
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{formatDate(player.birth_date)}</span>
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-bold"><MapPin className="w-3 h-3" /> Origine</div>
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate" title={player.birth_place}>{player.birth_place || player.nationality || '-'}</span>
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-bold"><Ruler className="w-3 h-3" /> Înălțime</div>
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{player.height || '-'}</span>
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-bold"><Weight className="w-3 h-3" /> Greutate</div>
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{player.weight || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* 4. STATS FOOTER (NOU!) */}
                        <div className="mt-auto border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                            <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-slate-700 py-3 text-center">
                                <div>
                                    <span className="block text-lg font-black text-gray-800 dark:text-white">{stats.total_appearances}</span>
                                    <span className="text-[9px] uppercase text-gray-400 font-bold">Meciuri</span>
                                </div>
                                <div>
                                    <div className="flex items-center justify-center gap-1">
                                        <span className="text-lg font-black text-green-600">{stats.total_goals}</span>
                                        <span className="text-gray-300">/</span>
                                        <span className="text-lg font-black text-blue-600">{stats.total_assists}</span>
                                    </div>
                                    <span className="text-[9px] uppercase text-gray-400 font-bold">Gol / Pasă</span>
                                </div>
                                <div>
                                    <div className="flex items-center justify-center gap-1 text-amber-600 font-bold">
                                        <Clock className="w-3 h-3" /> {stats.minutes_played || 0}'
                                    </div>
                                    <span className="text-[9px] uppercase text-gray-400 font-bold">Minute</span>
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