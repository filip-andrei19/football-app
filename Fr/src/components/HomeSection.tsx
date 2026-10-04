import React, { useEffect, useState } from 'react';

// 1. INTERFAȚA PLAYER (Actualizată cu noile câmpuri din DB)
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
  team?: string; 
  team_logo?: string; 
  statistics_summary?: {
    team_name?: string;
    total_goals: number;
    total_assists: number;
    total_appearances: number;
    minutes_played?: number;
    rating?: string;
  };
}

// 2. INTERFAȚE NOI PENTRU ECHIPE ȘI LOT
interface TeamResult {
    team_name: string;
    team_logo: string;
    league_id: number;
}

interface SquadData {
    teamInfo: { name: string; logo: string; totalPlayers: number };
    squad: {
        Goalkeepers: Player[];
        Defenders: Player[];
        Midfielders: Player[];
        Attackers: Player[];
        Unknown: Player[];
    }
}

// 3. INTERFAȚA PROPS
interface HomeProps {
    user: { name: string; email: string };
    onNavigate: (section: any) => void;
}

export function HomeSection({ user, onNavigate }: HomeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState<'players' | 'teams'>('players'); // Comutator Jucători/Echipe
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamResult[]>([]);
  
  const [selectedTeam, setSelectedTeam] = useState<SquadData | null>(null);
  const [loadingRoster, setLoadingRoster] = useState(false);
  
  // State pentru salutul dinamic
  const [greeting, setGreeting] = useState("Salut");

  useEffect(() => {
    // Logica pentru salut în funcție de oră
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("Neața");
    else if (hour >= 12 && hour < 18) setGreeting("Salut");
    else setGreeting("Bună seara");
  }, []);

  // Efect pentru căutare dinamică pe server (Jucători sau Echipe)
  useEffect(() => {
    const fetchResults = async () => {
      if (!searchTerm.trim()) {
          setPlayers([]);
          setTeams([]);
          return;
      }

      setLoading(true);
      setError(null);
      try {
        const query = `?${searchMode === 'players' ? 'search' : 'q'}=${encodeURIComponent(searchTerm)}`;
        const endpoint = searchMode === 'players' ? '/api/sport/players' : '/api/sport/teams/search';
        
        const response = await fetch(`https://football-backend-m2a4.onrender.com${endpoint}${query}`);
        if (!response.ok) throw new Error(`Eroare server: ${response.status}`);
        
        const data = await response.json();
        
        if (searchMode === 'players') {
            setPlayers(data);
            setTeams([]);
        } else {
            setTeams(data);
            setPlayers([]);
        }
      } catch (err: any) {
        console.error("Eroare fetch:", err);
        setError("Nu am putut încărca datele de pe server.");
      } finally {
        setLoading(false);
      }
    };

    // Debounce simplu
    const timeoutId = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchMode]);

  // Funcție pentru deschiderea lotului echipei
  const handleTeamClick = async (teamName: string) => {
      setLoadingRoster(true);
      setSelectedTeam(null);
      try {
          const res = await fetch(`https://football-backend-m2a4.onrender.com/api/sport/teams/${encodeURIComponent(teamName)}/roster`);
          if (!res.ok) throw new Error("Eroare preluare lot");
          const data = await res.json();
          setSelectedTeam(data);
      } catch (err) {
          console.error(err);
          alert("Nu am putut încărca lotul echipei.");
      } finally {
          setLoadingRoster(false);
      }
  };

  const showResults = searchTerm.trim().length > 0;

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Extragem doar prenumele
  const firstName = user?.name ? user.name.split(' ')[0] : 'Scouter';

  return (
    <div className="relative min-h-[80vh] py-10 overflow-hidden">

      {/* MODAL LOT ECHIPĂ (Când se apasă pe o echipă) */}
      {selectedTeam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
              <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-300">
                  <div className="bg-slate-900 text-white p-6 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-white p-2 rounded-xl">
                              <img src={selectedTeam.teamInfo.logo} alt="Logo" className="w-full h-full object-contain" />
                          </div>
                          <div>
                              <h2 className="text-3xl font-black">{selectedTeam.teamInfo.name}</h2>
                              <p className="text-slate-400 font-medium">{selectedTeam.teamInfo.totalPlayers} Jucători în Lot</p>
                          </div>
                      </div>
                      <button onClick={() => setSelectedTeam(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition text-xl">
                          ✕
                      </button>
                  </div>
                  <div className="overflow-y-auto p-6 bg-slate-50 space-y-8 flex-1">
                      {([ 
                          { title: "Portari", data: selectedTeam.squad.Goalkeepers, color: "text-amber-600" },
                          { title: "Fundași", data: selectedTeam.squad.Defenders, color: "text-blue-600" },
                          { title: "Mijlocași", data: selectedTeam.squad.Midfielders, color: "text-emerald-600" },
                          { title: "Atacanți", data: selectedTeam.squad.Attackers, color: "text-rose-600" }
                      ]).map((section, idx) => section.data.length > 0 && (
                          <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                              <div className="bg-slate-100/50 px-4 py-3 border-b border-slate-100">
                                  <h3 className={`font-black uppercase tracking-wider ${section.color}`}>{section.title}</h3>
                              </div>
                              <div className="divide-y divide-slate-50">
                                  {section.data.map(p => (
                                      <div key={p._id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition">
                                          <div className="flex items-center gap-3">
                                              <img src={p.image || "https://via.placeholder.com/40"} alt={p.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                                              <div>
                                                  <p className="font-bold text-slate-800">{p.name}</p>
                                                  <div className="flex gap-2 text-xs text-slate-500 font-medium mt-0.5">
                                                      {p.age && <span>{p.age} ani</span>}
                                                      {p.nationality && <span>• {p.nationality}</span>}
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="flex gap-4 text-center">
                                              <div className="min-w-[50px]"><p className="text-[10px] text-slate-400 font-bold uppercase">Meciuri</p><p className="font-black text-slate-700">{p.statistics_summary?.total_appearances || 0}</p></div>
                                              <div className="min-w-[50px]"><p className="text-[10px] text-slate-400 font-bold uppercase">Goluri</p><p className="font-black text-slate-700">{p.statistics_summary?.total_goals || 0}</p></div>
                                              <div className="min-w-[50px]"><p className="text-[10px] text-slate-400 font-bold uppercase">Rating</p><p className="font-black text-amber-600">{p.statistics_summary?.rating ? parseFloat(p.statistics_summary.rating).toFixed(2) : "-"}</p></div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* FUNDAL ANIMAT */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none">
          <div className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/30 blur-[100px]"></div>
          <div className="absolute top-[30%] right-0 translate-x-1/4 w-[400px] h-[400px] rounded-full bg-yellow-400/30 blur-[100px]"></div>
          <div className="absolute bottom-0 left-[20%] translate-y-1/4 w-[600px] h-[600px] rounded-full bg-red-600/20 blur-[120px]"></div>
      </div>

      <div className="relative z-10 space-y-12">
        
        {/* HEADER PERSONALIZAT */}
        <section className="text-center space-y-4 px-4">
            <div className="inline-block">
                <h1 className="text-4xl font-black tracking-tight lg:text-6xl text-slate-900 drop-shadow-sm">
                    {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-yellow-500 to-red-600">{firstName}</span>!
                </h1>
            </div>
            
            <p className="text-lg text-slate-700 font-medium max-w-2xl mx-auto">
                Baza de date este pregătită. Pe cine analizăm astăzi?
            </p>
            
            <div className="max-w-xl mx-auto mt-10 relative z-10">
                {/* COMUTATOR CĂUTARE */}
                <div className="flex justify-center mb-6">
                    <div className="bg-white/60 backdrop-blur-md p-1.5 rounded-full inline-flex shadow-sm border border-white/50">
                        <button 
                            onClick={() => {setSearchMode('players'); setSearchTerm('');}}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${searchMode === 'players' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                        >👤 Caută Jucători</button>
                        <button 
                            onClick={() => {setSearchMode('teams'); setSearchTerm('');}}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${searchMode === 'teams' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                        >🛡️ Caută Echipe</button>
                    </div>
                </div>

                <div className="relative group">
                    <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 via-yellow-500 to-red-600 rounded-full blur-md opacity-40 group-hover:opacity-70 transition duration-500"></div>
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-5 top-1/2 transform -translate-y-1/2 h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                        type="text"
                        placeholder={searchMode === 'players' ? "Caută un jucător (ex: Saka, Hagi, Mutu)..." : "Caută un club (ex: Liverpool, FCSB)..."}
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

            {loadingRoster && (
                <div className="fixed inset-0 z-[60] bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
                    <h3 className="text-xl font-black text-slate-800 animate-pulse">Încărcăm Lotul...</h3>
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
                    <p className="text-slate-600">Tastează în bară pentru a căuta {searchMode === 'players' ? 'un jucător' : 'o echipă'}.</p>
                </div>
            )}

            {/* AFISARE JUCATORI (Design original păstrat 100%) */}
            {showResults && !loading && searchMode === 'players' && players.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {players.map((player) => {
                const stats = player.statistics_summary || { total_goals: 0, total_assists: 0, total_appearances: 0 };
                const hasBioData = player.age || player.birth_date || player.birth_place || player.height || player.weight;
                
                return (
                    <div key={player._id} className="bg-white/95 backdrop-blur-sm border border-white/40 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2 group flex flex-col">
                    
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
                            <h4 className="font-black text-2xl text-slate-900 truncate mb-1 tracking-tight" title={player.name}>
                                {player.name}
                            </h4>
                            
                            {(player.team || player.team_name) && (
                                <div className="flex items-center gap-2 text-sm font-bold text-blue-600 uppercase mb-2 truncate">
                                    {player.team_logo && (
                                        <img src={player.team_logo} alt="Logo" className="w-5 h-5 object-contain" />
                                    )}
                                    <span className="truncate">{player.team || player.team_name}</span>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 rounded-full text-[11px] font-black bg-slate-900 text-white shadow-sm uppercase tracking-wider">
                                    {player.position}
                                </span>
                            </div>
                        </div>
                    </div>

                    {hasBioData && (
                        <div className="p-5 grid grid-cols-2 gap-y-4 gap-x-4 text-sm border-b border-slate-100 bg-slate-50/40">
                            {player.age && (
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase tracking-widest font-bold mb-0.5">Vârstă</span>
                                    <span className="font-bold text-slate-800 text-base">{player.age} ani</span>
                                </div>
                            )}
                            {player.birth_date && (
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase tracking-widest font-bold mb-0.5">Data Nașterii</span>
                                    <span className="font-bold text-slate-800 text-base">{formatDate(player.birth_date)}</span>
                                </div>
                            )}
                            
                            {player.birth_place && (
                                <div className="col-span-2">
                                    <span className="text-slate-400 block text-[10px] uppercase tracking-widest font-bold mb-0.5">Locul Nașterii</span>
                                    <span className="font-bold text-slate-800 text-base truncate">{player.birth_place}</span>
                                </div>
                            )}

                            {player.height && (
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase tracking-widest font-bold mb-0.5">Înălțime</span>
                                    <span className="font-bold text-slate-800 text-base">{player.height}</span>
                                </div>
                            )}
                            {player.weight && (
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase tracking-widest font-bold mb-0.5">Greutate</span>
                                    <span className="font-bold text-slate-800 text-base">{player.weight}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="p-5 mt-auto">
                        <div className="grid grid-cols-3 gap-3 text-center mb-5">
                            <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center">
                                <span className="block text-3xl font-black text-slate-800">{stats.total_appearances}</span>
                                <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider mt-1">Meciuri</span>
                            </div>
                            <div className="p-3 bg-green-50/50 rounded-xl shadow-sm border border-green-100/50 flex flex-col justify-center">
                                <span className="block text-3xl font-black text-green-600">{stats.total_goals}</span>
                                <span className="text-[10px] text-green-700 uppercase font-extrabold tracking-wider mt-1">Goluri</span>
                            </div>
                            <div className="p-3 bg-indigo-50/50 rounded-xl shadow-sm border border-indigo-100/50 flex flex-col justify-center">
                                <span className="block text-3xl font-black text-indigo-600">{stats.total_assists}</span>
                                <span className="text-[10px] text-indigo-700 uppercase font-extrabold tracking-wider mt-1">Pase</span>
                            </div>
                        </div>
                        
                        {(stats.minutes_played !== undefined || stats.rating) && (
                            <div className="flex justify-between items-center text-sm text-slate-600 px-2 pt-3 border-t border-slate-100">
                                {stats.minutes_played !== undefined ? (
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <span className="text-lg">⏱️</span>
                                        <span>{stats.minutes_played} <span className="text-xs font-normal text-slate-500">min. jucate</span></span>
                                    </div>
                                ) : <div />}
                                
                                {stats.rating && (
                                    <div className="flex items-center gap-1.5 font-black text-amber-600 bg-amber-50/80 px-3 py-1 rounded-full border border-amber-100 shadow-sm ml-auto">
                                        <span className="text-lg">⭐</span>
                                        <span>{parseFloat(stats.rating).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    </div>
                );
                })}
            </div>
            )}

            {/* AFISARE ECHIPE (Mod Nou) */}
            {showResults && !loading && searchMode === 'teams' && teams.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {teams.map((team, idx) => (
                    <div key={idx} onClick={() => handleTeamClick(team.team_name)} className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-lg hover:shadow-2xl border border-white hover:border-blue-200 transition-all cursor-pointer group flex flex-col items-center text-center">
                        <div className="w-24 h-24 mb-4 bg-slate-50 rounded-2xl p-3 shadow-inner group-hover:scale-110 transition-transform">
                            <img src={team.team_logo} alt={team.team_name} className="w-full h-full object-contain" />
                        </div>
                        <h4 className="font-black text-lg text-slate-800 leading-tight">{team.team_name}</h4>
                        <p className="text-xs font-bold text-blue-600 mt-2 uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">Vezi Lotul →</p>
                    </div>
                ))}
            </div>
            )}

            {/* FĂRĂ REZULTATE */}
            {showResults && !loading && ((searchMode === 'players' && players.length === 0) || (searchMode === 'teams' && teams.length === 0)) && (
                <div className="text-center py-16 bg-white/85 backdrop-blur-md rounded-3xl shadow-xl max-w-2xl mx-auto mt-10 border border-white/50">
                    <div className="text-6xl mb-4 opacity-80">🤷‍♂️</div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Niciun rezultat găsit.</h3>
                    <p className="text-slate-600 font-medium">Asigură-te că {searchMode === 'players' ? 'jucătorul' : 'echipa'} se află în baza de date sau verifică ortografia.</p>
                </div>
            )}
        </section>
      </div>
    </div>
  );
}