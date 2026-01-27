import React, { useEffect, useState } from 'react';

// 1. ACTUALIZARE INTERFAȚĂ (Tipuri de date complete conform initialLoad)
interface Player {
  _id: string;
  name: string;
  position: string;
  age?: number;
  nationality?: string;
  birth_date?: string;
  birth_place?: string;      // <--- AM ADĂUGAT ȘI ASTA
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
    rating?: string;         // Nota medie (string din API, ex: "7.24000")
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

  // Funcție formatare dată
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    // Formatăm data în stil românesc (ex: 24 ianuarie 1990)
    return new Date(dateString).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-12 py-10 min-h-[60vh]">
      
      {/* HEADER */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl text-gray-900">
          Caută Jucători
        </h1>
        <p className="text-muted-foreground text-gray-500">
          Profil complet: Biografie, Fizic & Statistici Detaliate.
        </p>
        
        <div className="max-w-xl mx-auto mt-8 relative z-10">
            <div className="relative group">
                {/* Efect de glow albastru în spatele search-ului */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Caută (ex: Olaru, Mitrita)..."
                      className="w-full pl-12 pr-4 py-4 text-lg border border-gray-200 rounded-full shadow-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
        </div>
      </section>

      {/* GRID REZULTATE */}
      <section className="px-4 max-w-7xl mx-auto">
        {loading && <div className="text-center text-sm text-gray-500 py-10">Se încarcă baza de date...</div>}
        {error && <div className="text-center text-red-500 py-10">{error}</div>}
        
        {/* Mesaj când nu cauți nimic */}
        {!showResults && !loading && (
             <div className="text-center py-20 opacity-50">
                 <div className="text-6xl mb-4">⚽</div>
                 <p className="text-xl font-medium text-gray-400">Începe să scrii un nume pentru a vedea rezultatele.</p>
             </div>
        )}

        {showResults && filteredPlayers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            {filteredPlayers.map((player) => {
               // Extragem statistici sigure (dacă lipsesc, punem 0)
               const stats = player.statistics_summary || { total_goals: 0, total_assists: 0, total_appearances: 0, minutes_played: 0, rating: "0" };
               
               return (
                <div key={player._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group">
                  
                  {/* HEADER CARD: FUNDAL + POZĂ + INFO ECHIPĂ */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 flex items-center gap-4">
                    <div className="relative h-20 w-20 flex-shrink-0">
                        <img 
                            src={player.image || "https://via.placeholder.com/150"} 
                            alt={player.name}
                            className="h-full w-full rounded-full object-cover border-4 border-white shadow-md bg-white"
                            onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/150?text=No+Img"; }}
                        />
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-bold text-xl text-gray-900 truncate">
                            {player.name}
                        </h4>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1 truncate">
                            {player.team_name || "Fără Echipă"}
                        </div>
                        <div className="flex flex-wrap gap-2">
                             <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-600 text-white shadow-sm">
                                {player.position}
                             </span>
                             {player.nationality && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-white border border-gray-200 text-gray-700">
                                    {player.nationality}
                                </span>
                             )}
                        </div>
                    </div>
                  </div>

                  {/* INFO BIO (Grid 2 coloane) */}
                  <div className="p-4 grid grid-cols-2 gap-y-3 gap-x-2 text-sm border-b border-gray-100 bg-gray-50/30">
                      <div>
                          <span className="text-gray-400 block text-[10px] uppercase tracking-wider">Vârstă</span>
                          <span className="font-semibold text-gray-700">{player.age ? `${player.age} ani` : '-'}</span>
                      </div>
                      <div>
                          <span className="text-gray-400 block text-[10px] uppercase tracking-wider">Data Nașterii</span>
                          <span className="font-semibold text-gray-700">{formatDate(player.birth_date)}</span>
                      </div>
                      
                      {/* --- CÂMP NOU: Locul Nașterii --- */}
                      <div className="col-span-2">
                          <span className="text-gray-400 block text-[10px] uppercase tracking-wider">Locul Nașterii</span>
                          <span className="font-semibold text-gray-700 truncate">{player.birth_place || '-'}</span>
                      </div>

                      <div>
                          <span className="text-gray-400 block text-[10px] uppercase tracking-wider">Înălțime</span>
                          <span className="font-semibold text-gray-700">{player.height || '-'}</span>
                      </div>
                      <div>
                          <span className="text-gray-400 block text-[10px] uppercase tracking-wider">Greutate</span>
                          <span className="font-semibold text-gray-700">{player.weight || '-'}</span>
                      </div>
                  </div>

                  {/* STATISTICI MAJORE */}
                  <div className="p-4">
                      <div className="grid grid-cols-3 gap-2 text-center mb-3">
                        <div className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <span className="block text-xl font-bold text-gray-800">{stats.total_appearances}</span>
                            <span className="text-[10px] text-gray-500 uppercase font-bold">Meciuri</span>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg border border-green-100 hover:bg-green-100 transition-colors">
                            <span className="block text-xl font-bold text-green-600">{stats.total_goals}</span>
                            <span className="text-[10px] text-green-700 uppercase font-bold">Goluri</span>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors">
                            <span className="block text-xl font-bold text-blue-600">{stats.total_assists}</span>
                            <span className="text-[10px] text-blue-700 uppercase font-bold">Pase</span>
                        </div>
                      </div>
                      
                      {/* STATISTICI EXTRA (Rating + Minute) */}
                      <div className="flex justify-between items-center text-xs text-gray-500 px-1 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1">
                              <span>⏱️</span>
                              <span className="font-medium">{stats.minutes_played || 0} minute</span>
                          </div>
                          {stats.rating && (
                              <div className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                  <span>⭐ {parseFloat(stats.rating).toFixed(2)}</span>
                              </div>
                          )}
                      </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
        
        {/* Mesaj dacă nu există rezultate la căutare */}
        {showResults && filteredPlayers.length === 0 && (
             <div className="text-center py-10">
                 <p className="text-gray-500">Nu am găsit jucători cu acest nume.</p>
             </div>
        )}
      </section>
    </div>
  );
}