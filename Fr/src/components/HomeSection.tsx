import React, { useEffect, useState } from 'react';

// 1. ACTUALIZARE INTERFAȚĂ (Tipuri de date)
interface Player {
  _id: string;
  name: string;
  position: string;
  age?: number;
  nationality?: string;      // <--- NOU
  birth_date?: string;       // <--- NOU
  height?: string;           // <--- NOU
  weight?: string;           // <--- NOU
  image?: string;
  team_name?: string;
  statistics_summary?: {
    team_name?: string;
    total_goals: number;
    total_assists: number;
    total_appearances: number;
    minutes_played?: number; // <--- NOU
    rating?: string;         // <--- NOU (Nota medie)
  };
}

export function HomeSection({ onNavigate }: { onNavigate: (section: any) => void }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch('https://football-backend-m2a4.onrender.com/api/sport/players');
        if (!response.ok) throw new Error(`Eroare server: ${response.status}`);
        const data = await response.json();
        setPlayers(data);
      } catch (err: any) {
        console.error("Eroare fetch:", err);
        setError("Nu am putut încărca baza de date.");
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, []);

  const filteredPlayers = players.filter((player) =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showResults = searchTerm.length > 0;

  // Funcție simplă pentru formatarea datei (din 1998-05-22 în 22 Mai 1998)
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-12 py-10 min-h-[60vh]">
      
      {/* HEADER */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
          Caută Jucători
        </h1>
        <p className="text-muted-foreground">
          Profil complet: Biografie, Fizic & Statistici.
        </p>
        
        <div className="max-w-xl mx-auto mt-8 relative z-10">
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Caută (ex: Olaru, Mitrita)..."
                      className="w-full pl-12 pr-4 py-4 text-lg border rounded-full shadow-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-background"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
        </div>
      </section>

      {/* GRID REZULTATE */}
      <section className="px-4 max-w-7xl mx-auto">
        {loading && <div className="text-center text-sm text-muted-foreground py-10">Se încarcă baza de date...</div>}
        
        {showResults && filteredPlayers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            {filteredPlayers.map((player) => {
               const stats = player.statistics_summary || { total_goals: 0, total_assists: 0, total_appearances: 0, minutes_played: 0, rating: "0" };
               
               return (
                <div key={player._id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group">
                  
                  {/* HEADER CARD: FUNDAL + POZĂ */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 p-5 flex items-center gap-4">
                    <div className="relative h-20 w-20 flex-shrink-0">
                        <img 
                            src={player.image || "https://via.placeholder.com/150"} 
                            alt={player.name}
                            className="h-full w-full rounded-full object-cover border-4 border-white shadow-md bg-white"
                        />
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-bold text-xl text-gray-900 dark:text-white truncate">
                            {player.name}
                        </h4>
                        <div className="flex flex-wrap gap-2 mt-1">
                             <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-600 text-white">
                                {player.position}
                             </span>
                             {player.nationality && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                                    {player.nationality}
                                </span>
                             )}
                        </div>
                    </div>
                  </div>

                  {/* INFO BIO (Vârstă, Dată, Fizic) */}
                  <div className="p-4 grid grid-cols-2 gap-y-2 text-sm border-b border-gray-100 bg-gray-50/50">
                      <div>
                          <span className="text-gray-400 block text-xs uppercase">Vârstă</span>
                          <span className="font-semibold">{player.age ? `${player.age} ani` : '-'}</span>
                      </div>
                      <div>
                          <span className="text-gray-400 block text-xs uppercase">Data Nașterii</span>
                          <span className="font-semibold">{formatDate(player.birth_date)}</span>
                      </div>
                      <div>
                          <span className="text-gray-400 block text-xs uppercase">Înălțime</span>
                          <span className="font-semibold">{player.height || '-'}</span>
                      </div>
                      <div>
                          <span className="text-gray-400 block text-xs uppercase">Greutate</span>
                          <span className="font-semibold">{player.weight || '-'}</span>
                      </div>
                  </div>

                  {/* STATISTICI MAJORE */}
                  <div className="p-4">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-gray-50 rounded-lg">
                            <span className="block text-xl font-bold text-gray-800">{stats.total_appearances}</span>
                            <span className="text-[10px] text-gray-500 uppercase">Meciuri</span>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg border border-green-100">
                            <span className="block text-xl font-bold text-green-600">{stats.total_goals}</span>
                            <span className="text-[10px] text-green-600 uppercase">Goluri</span>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                            <span className="block text-xl font-bold text-blue-600">{stats.total_assists}</span>
                            <span className="text-[10px] text-blue-600 uppercase">Pase</span>
                        </div>
                      </div>
                      
                      {/* STATISTICI EXTRA (Rating + Minute) */}
                      <div className="mt-4 flex justify-between items-center text-xs text-gray-500 px-1">
                          <span>⏱️ {stats.minutes_played || 0} minute jucate</span>
                          {stats.rating && (
                              <span className="flex items-center gap-1 font-bold text-amber-600">
                                  ⭐ Nota: {parseFloat(stats.rating).toFixed(1)}
                              </span>
                          )}
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