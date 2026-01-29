import React, { useEffect, useState } from 'react';

// 1. INTERFAȚA PLAYER
interface Player {
  _id: string;
  name: string;
  position: string;
  age?: number;
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

// 2. INTERFAȚA PROPS (Adăugăm 'user')
interface HomeProps {
    user: { name: string; email: string };
    onNavigate: (section: any) => void;
}

export function HomeSection({ user, onNavigate }: HomeProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // State pentru salutul dinamic
  const [greeting, setGreeting] = useState("Salut");

  useEffect(() => {
    // Logica pentru salut în funcție de oră
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("Neața");
    else if (hour >= 12 && hour < 18) setGreeting("Salut");
    else setGreeting("Bună seara");

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

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Extragem doar prenumele pentru a fi mai prietenos (ex: "Salut, Andrei" în loc de "Andrei Popescu")
  const firstName = user?.name ? user.name.split(' ')[0] : 'Scouter';

  return (
    <div className="relative min-h-[80vh] py-10 overflow-hidden">

      {/* FUNDAL ANIMAT */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none">
          <div className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/30 blur-[100px] animate-pulse-slow"></div>
          <div className="absolute top-[30%] right-0 translate-x-1/4 w-[400px] h-[400px] rounded-full bg-yellow-400/30 blur-[100px] animate-pulse-slow delay-700"></div>
          <div className="absolute bottom-0 left-[20%] translate-y-1/4 w-[600px] h-[600px] rounded-full bg-red-600/20 blur-[120px] animate-pulse-slow delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-white/40 blur-[100px] mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 space-y-12">
        
        {/* HEADER PERSONALIZAT */}
        <section className="text-center space-y-4 px-4">
            <div className="inline-block animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h1 className="text-4xl font-black tracking-tight lg:text-6xl text-slate-900 drop-shadow-sm">
                    {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-yellow-500 to-red-600">{firstName}</span>!
                </h1>
            </div>
            
            <p className="text-lg text-slate-700 font-medium max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-150">
                Baza de date este pregătită. Pe cine analizăm astăzi?
            </p>
            
            <div className="max-w-xl mx-auto mt-10 relative z-10 animate-in fade-in zoom-in-95 duration-700 delay-300">
                <div className="relative group">
                    <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 via-yellow-500 to-red-600 rounded-full blur-md opacity-40 group-hover:opacity-70 transition duration-500 animate-gradient-xy"></div>
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-5 top-1/2 transform -translate-y-1/2 h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                        type="text"
                        placeholder="Caută un jucător (ex: Hagi, Mutu)..."
                        className="w-full pl-14 pr-6 py-5 text-lg font-medium border-0 rounded-full shadow-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white/90 backdrop-blur-xl placeholder:text-slate-400 text-slate-900"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </section>

        {/* GRID REZULTATE */}
        <section className="px-4 max-w-7xl mx-auto pb-20">
            {loading && (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            )}
            {error && <div className="text-center text-red-600 font-bold py-10 bg-red-50/50 rounded-xl">{error}</div>}
            
            {!showResults && !loading && (
                <div className="text-center py-20 opacity-60">
                    <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto opacity-20 mb-6">
                        <div className="h-32 bg-slate-300 rounded-2xl rotate-[-6deg]"></div>
                        <div className="h-32 bg-slate-300 rounded-2xl translate-y-[-10px]"></div>
                        <div className="h-32 bg-slate-300 rounded-2xl rotate-[6deg]"></div>
                    </div>
                    <p className="text-xl font-bold text-slate-800">Totul e calm momentan.</p>
                    <p className="text-slate-600">Tastează pentru a explora mii de profiluri.</p>
                </div>
            )}

            {showResults && filteredPlayers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-8 duration-700">
                {filteredPlayers.map((player) => {
                const stats = player.statistics_summary || { total_goals: 0, total_assists: 0, total_appearances: 0, minutes_played: 0, rating: "0" };
                
                return (
                    <div key={player._id} className="bg-white/95 backdrop-blur-sm border border-white/40 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2 group">
                    
                    {/* HEADER CARD */}
                    <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 p-6 flex items-center gap-5 border-b border-slate-100">
                        <div className="relative h-24 w-24 flex-shrink-0 filter drop-shadow-md transition-transform group-hover:scale-105">
                            <img 
                                src={player.image || "https://via.placeholder.com/150"} 
                                alt={player.name}
                                className="h-full w-full rounded-full object-cover border-[5px] border-white shadow-sm bg-white"
                                onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/150?text=No+Img"; }}
                            />
                            {player.nationality === 'Romania' && (
                                <span className="absolute bottom-0 right-0 text-xl drop-shadow-md" title="România">🇷🇴</span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="font-black text-2xl text-slate-900 truncate mb-1 tracking-tight">
                                {player.name}
                            </h4>
                            <div className="text-sm font-bold text-blue-600 uppercase mb-2 truncate">
                                {player.team_name || "Fără Echipă"}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 rounded-full text-[11px] font-black bg-slate-900 text-white shadow-sm uppercase tracking-wider">
                                    {player.position}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* INFO BIO */}
                    <div className="p-5 grid grid-cols-2 gap-y-4 gap-x-4 text-sm border-b border-slate-100 bg-slate-50/40">
                        <div>
                            <span className="text-slate-400 block text-[10px] uppercase tracking-widest font-bold mb-0.5">Vârstă</span>
                            <span className="font-bold text-slate-800 text-base">{player.age ? `${player.age} ani` : '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block text-[10px] uppercase tracking-widest font-bold mb-0.5">Data Nașterii</span>
                            <span className="font-bold text-slate-800 text-base">{formatDate(player.birth_date)}</span>
                        </div>
                        
                        <div className="col-span-2">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-widest font-bold mb-0.5">Locul Nașterii</span>
                            <span className="font-bold text-slate-800 text-base truncate">{player.birth_place || '-'}</span>
                        </div>

                        <div>
                            <span className="text-slate-400 block text-[10px] uppercase tracking-widest font-bold mb-0.5">Înălțime</span>
                            <span className="font-bold text-slate-800 text-base">{player.height || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block text-[10px] uppercase tracking-widest font-bold mb-0.5">Greutate</span>
                            <span className="font-bold text-slate-800 text-base">{player.weight || '-'}</span>
                        </div>
                    </div>

                    {/* STATISTICI MAJORE */}
                    <div className="p-5">
                        <div className="grid grid-cols-3 gap-3 text-center mb-5">
                            <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:border-blue-200 transition-colors">
                                <span className="block text-3xl font-black text-slate-800">{stats.total_appearances}</span>
                                <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">Meciuri</span>
                            </div>
                            <div className="p-3 bg-green-50/50 rounded-xl shadow-sm border border-green-100/50 group-hover:border-green-200 transition-colors">
                                <span className="block text-3xl font-black text-green-600 drop-shadow-sm">{stats.total_goals}</span>
                                <span className="text-[10px] text-green-700 uppercase font-extrabold tracking-wider">Goluri</span>
                            </div>
                            <div className="p-3 bg-indigo-50/50 rounded-xl shadow-sm border border-indigo-100/50 group-hover:border-indigo-200 transition-colors">
                                <span className="block text-3xl font-black text-indigo-600 drop-shadow-sm">{stats.total_assists}</span>
                                <span className="text-[10px] text-indigo-700 uppercase font-extrabold tracking-wider">Pase</span>
                            </div>
                        </div>
                        
                        {/* STATISTICI EXTRA */}
                        <div className="flex justify-between items-center text-sm text-slate-600 px-2 pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-1.5 font-bold">
                                <span className="text-lg">⏱️</span>
                                <span>{stats.minutes_played || 0} <span className="text-xs font-normal text-slate-500">min. jucate</span></span>
                            </div>
                            {stats.rating && (
                                <div className="flex items-center gap-1.5 font-black text-amber-600 bg-amber-50/80 px-3 py-1 rounded-full border border-amber-100 shadow-sm">
                                    <span className="text-lg drop-shadow-sm">⭐</span>
                                    <span>{parseFloat(stats.rating).toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    </div>
                );
                })}
            </div>
            )}
            
            {showResults && filteredPlayers.length === 0 && (
                <div className="text-center py-16 bg-white/80 backdrop-blur-md rounded-3xl shadow-xl max-w-2xl mx-auto mt-10 border border-white/50">
                    <div className="text-6xl mb-4 opacity-80">🤷‍♂️</div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Niciun rezultat găsit.</h3>
                    <p className="text-slate-600 font-medium">Încearcă alt nume sau verifică ortografia.</p>
                </div>
            )}
        </section>
      </div>
    </div>
  );
}