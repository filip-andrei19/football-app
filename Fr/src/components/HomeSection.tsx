import React, { useEffect, useState } from 'react';

// 1. Actualizăm interfața să fim siguri că TypeScript știe de poză și pase
interface Player {
  _id: string;
  name: string;
  position: string;
  age?: number;
  image?: string;          // <--- URL-ul pozei
  team_name?: string;
  statistics_summary?: {
    team_name?: string;
    total_goals: number;
    total_assists: number;     // <--- Pase de gol
    total_appearances: number; // <--- Număr meciuri
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

  return (
    <div className="space-y-12 py-10 min-h-[60vh]">
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
          Caută Jucători
        </h1>
        <p className="text-muted-foreground">
          Statistici complete: Goluri, Pase, Meciuri.
        </p>
        
        {/* BARA DE CĂUTARE */}
        <div className="max-w-xl mx-auto mt-8 relative z-10">
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Caută un jucător (ex: Dragusin, Coman)..."
                      className="w-full pl-12 pr-4 py-4 text-lg border rounded-full shadow-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-background"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
        </div>
      </section>

      <section className="px-4">
        {loading && <div className="text-center text-sm text-muted-foreground">Se încarcă datele...</div>}
        {error && <div className="text-center text-red-500">{error}</div>}

        {!loading && !showResults && !error && (
          <div className="text-center mt-10 opacity-50">
             <p className="text-xl font-medium">Începe să tastezi pentru a vedea profilul jucătorilor</p>
          </div>
        )}

        {showResults && filteredPlayers.length === 0 && (
          <div className="text-center p-8">
            <p className="text-xl text-muted-foreground">Nu am găsit niciun jucător cu numele "{searchTerm}".</p>
          </div>
        )}

        {/* --- GRIDUL DE REZULTATE --- */}
        {showResults && filteredPlayers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            {filteredPlayers.map((player) => {
               const actualTeamName = player.statistics_summary?.team_name || player.team_name || 'Fără Echipă';
               const stats = player.statistics_summary || { total_goals: 0, total_assists: 0, total_appearances: 0 };

               return (
                <div key={player._id} className="border rounded-xl p-5 bg-card shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 group overflow-hidden relative">
                  
                  {/* --- HEADER CARD: POZĂ + NUME --- */}
                  <div className="flex items-center gap-4 mb-4">
                    {/* Poza Jucătorului */}
                    <div className="relative h-16 w-16 flex-shrink-0">
                        <img 
                            src={player.image || "https://via.placeholder.com/150?text=No+Img"} 
                            alt={player.name}
                            className="h-full w-full rounded-full object-cover border-2 border-gray-100 shadow-sm"
                            onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/150?text=No+Img"; }}
                        />
                    </div>
                    
                    {/* Detalii Text */}
                    <div className="min-w-0">
                        <h4 className="font-bold text-lg truncate group-hover:text-blue-600 transition-colors">
                            {player.name}
                        </h4>
                        <div className="text-sm text-muted-foreground truncate font-medium">
                            {actualTeamName}
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                          {player.position}
                        </span>
                    </div>
                  </div>

                  {/* --- TABEL STATISTICI (Grid 3 Coloane) --- */}
                  <div className="grid grid-cols-3 gap-2 border-t pt-4 text-center">
                    
                    {/* 1. Meciuri */}
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Meciuri</span>
                        <span className="font-bold text-lg">{stats.total_appearances ?? 0}</span>
                    </div>

                    {/* 2. Goluri */}
                    <div className="flex flex-col border-l border-r border-gray-100 dark:border-gray-800">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Goluri</span>
                        <span className="font-bold text-lg text-green-600">{stats.total_goals ?? 0}</span>
                    </div>

                    {/* 3. Pase de Gol */}
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Pase</span>
                        <span className="font-bold text-lg text-blue-600">{stats.total_assists ?? 0}</span>
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