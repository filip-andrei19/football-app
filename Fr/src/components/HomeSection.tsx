import React, { useEffect, useState } from 'react';
import { Globe, Plane, Shield, Star, Clock, Activity, Filter, X, Trophy, MapPin, User as UserIcon, Home as HomeIcon } from 'lucide-react';

const GENERIC_USER_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

// 1. INTERFAȚA PLAYER (Actualizată cu noile câmpuri din DB)
interface DetailedStat {
    competition: string;
    type: string;
    appearances: number;
    goals: number;
    assists: number;
    minutes: number;
}

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
  league_id?: number; 
  detailed_stats?: DetailedStat[];
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
  
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null); // NOU: Starea pentru fereastra detaliată

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

      {/* MODAL LOT ECHIPĂ (Când se apasă pe o echipă) - MODIFICAT PENTRU MOBIL */}
      {selectedTeam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
              <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-300">
                  <div className="bg-slate-900 text-white p-4 sm:p-6 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white p-1.5 sm:p-2 rounded-xl shrink-0">
                              <img src={selectedTeam.teamInfo.logo} alt="Logo" className="w-full h-full object-contain" />
                          </div>
                          <div className="min-w-0">
                              <h2 className="text-xl sm:text-3xl font-black truncate">{selectedTeam.teamInfo.name}</h2>
                              <p className="text-xs sm:text-sm text-slate-400 font-medium truncate">{selectedTeam.teamInfo.totalPlayers} Jucători în Lot</p>
                          </div>
                      </div>
                      <button onClick={() => setSelectedTeam(null)} className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-full transition text-lg sm:text-xl shrink-0 ml-2">
                          ✕
                      </button>
                  </div>
                  <div className="overflow-y-auto p-3 sm:p-6 bg-slate-50 space-y-6 flex-1">
                      {([ 
                          { title: "Portari", data: selectedTeam.squad.Goalkeepers, color: "text-amber-600" },
                          { title: "Fundași", data: selectedTeam.squad.Defenders, color: "text-blue-600" },
                          { title: "Mijlocași", data: selectedTeam.squad.Midfielders, color: "text-emerald-600" },
                          { title: "Atacanți", data: selectedTeam.squad.Attackers, color: "text-rose-600" }
                      ]).map((section, idx) => section.data.length > 0 && (
                          <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                              <div className="bg-slate-100/50 px-3 sm:px-4 py-2 sm:py-3 border-b border-slate-100">
                                  <h3 className={`font-black uppercase tracking-wider text-sm sm:text-base ${section.color}`}>{section.title}</h3>
                              </div>
                              <div className="divide-y divide-slate-50">
                                  {section.data.map(p => (
                                      <div key={p._id} onClick={() => setSelectedPlayer(p)} className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-slate-50 transition gap-2 cursor-pointer">
                                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                              <img src={p.image || GENERIC_USER_IMAGE} alt={p.name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-slate-200 shrink-0" onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }} />
                                              <div className="min-w-0 flex-1">
                                                  <p className="font-bold text-slate-800 text-sm sm:text-base truncate" title={p.name}>{p.name}</p>
                                                  <div className="flex gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5 truncate">
                                                      {p.age && <span className="shrink-0">{p.age} ani</span>}
                                                      {p.nationality && <span className="truncate">{p.nationality}</span>}
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="flex gap-2 sm:gap-4 text-center shrink-0">
                                              <div className="w-[38px] sm:w-[50px]">
                                                  <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase">Meciuri</p>
                                                  <p className="font-black text-slate-700 text-sm sm:text-base">{p.statistics_summary?.total_appearances || 0}</p>
                                              </div>
                                              <div className="w-[38px] sm:w-[50px]">
                                                  <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase">Goluri</p>
                                                  <p className="font-black text-slate-700 text-sm sm:text-base">{p.statistics_summary?.total_goals || 0}</p>
                                              </div>
                                              <div className="w-[38px] sm:w-[50px]">
                                                  <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase">Rating</p>
                                                  <p className="font-black text-amber-600 text-sm sm:text-base">{p.statistics_summary?.rating ? parseFloat(p.statistics_summary.rating).toFixed(2) : "-"}</p>
                                              </div>
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
          <div className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4 w-[500px] h-[500px] rounded-full bg-emerald-600/20 blur-[100px] animate-pulse-slow"></div>
          <div className="absolute top-[30%] right-0 translate-x-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/20 blur-[100px] animate-pulse-slow delay-1000"></div>
          <div className="absolute bottom-0 left-[20%] translate-y-1/4 w-[600px] h-[600px] rounded-full bg-yellow-500/15 blur-[120px] animate-pulse-slow delay-2000"></div>
      </div>

      <div className="relative z-10 space-y-12">
        
        {/* HEADER PERSONALIZAT */}
        <section className="text-center space-y-4 px-4">
            <div className="inline-block">
                <h1 className="text-4xl font-black tracking-tight lg:text-6xl text-slate-900 drop-shadow-sm">
                    {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-blue-500 to-yellow-500">{firstName}</span>!
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
                            className={`px-4 sm:px-6 py-2 rounded-full text-sm font-bold transition-all ${searchMode === 'players' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                        >👤 Caută Jucători</button>
                        <button 
                            onClick={() => {setSearchMode('teams'); setSearchTerm('');}}
                            className={`px-4 sm:px-6 py-2 rounded-full text-sm font-bold transition-all ${searchMode === 'teams' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                        >🛡️ Caută Echipe</button>
                    </div>
                </div>

                <div className="relative group">
                    <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-600 via-blue-500 to-yellow-500 rounded-full blur-md opacity-40 group-hover:opacity-70 transition duration-500"></div>
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-5 top-1/2 transform -translate-y-1/2 h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                        type="text"
                        placeholder={searchMode === 'players' ? "Caută un jucător (ex: Saka, Hagi)..." : "Caută un club (ex: Liverpool, FCSB)..."}
                        className="w-full pl-14 pr-6 py-5 text-lg font-medium border-0 rounded-full shadow-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white/90 backdrop-blur-xl placeholder:text-slate-400 text-slate-900"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </section>

        {/* GRID REZULTATE */}
        <section className="px-6 container mx-auto pb-20 relative z-10">
            {loading && (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                </div>
            )}

            {loadingRoster && (
                <div className="fixed inset-0 z-[60] bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mb-4"></div>
                    <h3 className="text-xl font-black text-slate-800 animate-pulse">Încărcăm Lotul...</h3>
                </div>
            )}
            
            {error && <div className="text-center text-red-600 font-bold py-10 bg-red-50/50 rounded-xl">{error}</div>}
            
            {!showResults && !loading && (
                <div className="text-center py-20 opacity-60">
                    <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto opacity-20 mb-6 hidden sm:grid">
                        <div className="h-32 bg-slate-300 rounded-2xl rotate-[-6deg]"></div>
                        <div className="h-32 bg-slate-300 rounded-2xl translate-y-[-10px]"></div>
                        <div className="h-32 bg-slate-300 rounded-2xl rotate-[6deg]"></div>
                    </div>
                    <p className="text-xl font-bold text-slate-800">Totul e calm momentan.</p>
                    <p className="text-slate-600">Tastează în bară pentru a căuta {searchMode === 'players' ? 'un jucător' : 'o echipă'}.</p>
                </div>
            )}

            {/* AFISARE JUCATORI (Lista Compactă Flashscore Style) */}
            {showResults && !loading && searchMode === 'players' && players.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-in slide-in-from-bottom-8 duration-700">
                {players.map((player) => {
                    const teamNameStr = player.team_name || player.team || "Club Necunoscut";
                    const isNationalOnly = teamNameStr.toLowerCase().includes("nationala") || teamNameStr.toLowerCase() === "romania";

                    return (
                        <div 
                            key={player._id} 
                            onClick={() => setSelectedPlayer(player)}
                            className="group bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col items-center text-center cursor-pointer hover:shadow-xl hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className="relative mb-3">
                                <img 
                                    src={player.image || GENERIC_USER_IMAGE} 
                                    alt={player.name} 
                                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-100 dark:border-slate-700 shadow-sm bg-gray-50 dark:bg-slate-900 group-hover:border-emerald-500 transition-colors"
                                    onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }}
                                />
                                {isNationalOnly && (
                                    <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-xs rounded-full w-6 h-6 flex items-center justify-center shadow border border-white dark:border-slate-800">
                                        🇷🇴
                                    </div>
                                )}
                            </div>
                            
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight mb-1 truncate w-full">
                                {player.name}
                            </h3>
                            
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium truncate w-full justify-center">
                                {player.team_logo ? (
                                    <img src={player.team_logo} alt={teamNameStr} className="w-4 h-4 object-contain" />
                                ) : (
                                    <Shield className="w-3.5 h-3.5" />
                                )}
                                <span className="truncate">{teamNameStr}</span>
                            </div>
                            
                            <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                                {player.position || "Jucător"}
                            </span>
                        </div>
                    );
                })}
            </div>
            )}

            {/* AFISARE ECHIPE (Mod Nou) */}
            {showResults && !loading && searchMode === 'teams' && teams.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {teams.map((team, idx) => (
                    <div key={idx} onClick={() => handleTeamClick(team.team_name)} className="bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-3xl shadow-lg hover:shadow-2xl border border-white hover:border-emerald-200 transition-all cursor-pointer group flex flex-col items-center text-center">
                        <div className="w-16 h-16 sm:w-24 sm:h-24 mb-3 sm:mb-4 bg-slate-50 rounded-2xl p-2 sm:p-3 shadow-inner group-hover:scale-110 transition-transform">
                            <img src={team.team_logo} alt={team.team_name} className="w-full h-full object-contain" />
                        </div>
                        <h4 className="font-black text-sm sm:text-lg text-slate-800 leading-tight">{team.team_name}</h4>
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

      {/* MODAL DETALII JUCĂTOR (Același ca în DiasporaSection) */}
      {selectedPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div 
                  className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-slate-700"
                  onClick={(e) => e.stopPropagation()} 
              >
                  {/* Header Modal */}
                  <div className="relative h-32 md:h-40 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-800 shrink-0">
                      <button 
                          onClick={() => setSelectedPlayer(null)}
                          className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur rounded-full p-2 text-white transition-colors z-10"
                      >
                          <X className="w-5 h-5" />
                      </button>
                      <div className="absolute -bottom-12 left-6 flex items-end gap-4">
                          <img 
                              src={selectedPlayer.image || GENERIC_USER_IMAGE} 
                              alt={selectedPlayer.name}
                              className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border-4 border-white dark:border-slate-900 shadow-lg bg-white dark:bg-slate-800"
                              onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }}
                          />
                          <div className="pb-2 text-white drop-shadow-md hidden sm:block">
                              <h2 className="text-3xl font-black">{selectedPlayer.name}</h2>
                              <div className="flex items-center gap-2 mt-1 opacity-90">
                                  {selectedPlayer.team_logo && <img src={selectedPlayer.team_logo} alt="logo" className="w-5 h-5 bg-white rounded-full p-0.5" />}
                                  <span className="font-bold">{selectedPlayer.team_name || selectedPlayer.team}</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Conținut Derulabil */}
                  <div className="flex-1 overflow-y-auto p-6 pt-16 md:pt-6 bg-slate-50 dark:bg-slate-900">
                      
                      {/* Numele vizibil pe mobil */}
                      <div className="sm:hidden mb-6 text-center">
                          <h2 className="text-2xl font-black text-slate-800 dark:text-white">{selectedPlayer.name}</h2>
                          <div className="flex items-center justify-center gap-2 mt-1 text-slate-600 dark:text-slate-400 font-bold">
                              {selectedPlayer.team_logo && <img src={selectedPlayer.team_logo} alt="logo" className="w-5 h-5" />}
                              <span>{selectedPlayer.team_name || selectedPlayer.team}</span>
                          </div>
                      </div>

                      {/* Info Bar */}
                      <div className="flex flex-wrap gap-3 mb-8">
                          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm">
                              <Globe className="w-4 h-4 text-emerald-500" /> 
                              {selectedPlayer.nationality || "Necunoscut"}
                          </div>
                          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm">
                              <UserIcon className="w-4 h-4 text-emerald-500" /> 
                              {selectedPlayer.age ? `${selectedPlayer.age} ani` : "-"}
                          </div>
                          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm">
                              <Activity className="w-4 h-4 text-emerald-500" /> 
                              {selectedPlayer.height || "-"} / {selectedPlayer.weight || "-"}
                          </div>
                          <div className="flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-sm font-bold text-emerald-700 dark:text-emerald-400 shadow-sm">
                              {selectedPlayer.position || "Necunoscut"}
                          </div>
                      </div>

                      {/* Statistici Cumulate */}
                      <h3 className="text-lg font-black text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-yellow-500" /> Rezumat Sezon
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 text-center shadow-sm">
                              <span className="block text-2xl font-black text-slate-800 dark:text-white">{selectedPlayer.statistics_summary?.total_appearances || 0}</span>
                              <span className="text-[10px] uppercase text-gray-400 font-bold">Meciuri</span>
                          </div>
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 text-center shadow-sm border-b-4 border-b-emerald-500">
                              <span className="block text-2xl font-black text-emerald-600 dark:text-emerald-400">{selectedPlayer.statistics_summary?.total_goals || 0}</span>
                              <span className="text-[10px] uppercase text-gray-400 font-bold">Goluri</span>
                          </div>
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 text-center shadow-sm border-b-4 border-b-red-500">
                              <span className="block text-2xl font-black text-red-600 dark:text-red-400">{selectedPlayer.statistics_summary?.total_assists || 0}</span>
                              <span className="text-[10px] uppercase text-gray-400 font-bold">Pase Decisive</span>
                          </div>
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 text-center shadow-sm">
                              <span className="block text-2xl font-black text-slate-800 dark:text-white">{selectedPlayer.statistics_summary?.minutes_played || 0}'</span>
                              <span className="text-[10px] uppercase text-gray-400 font-bold">Minute</span>
                          </div>
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 text-center shadow-sm">
                              <span className="block text-2xl font-black text-yellow-500 flex items-center justify-center gap-1">
                                  <Star className="w-4 h-4 fill-yellow-500" />
                                  {selectedPlayer.statistics_summary?.rating ? parseFloat(selectedPlayer.statistics_summary.rating).toFixed(2) : "-"}
                              </span>
                              <span className="text-[10px] uppercase text-gray-400 font-bold">Rating Mediu</span>
                          </div>
                      </div>

                      {/* TABEL DETALIAT PE COMPETIȚII */}
                      <h3 className="text-lg font-black text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-emerald-500" /> Detalii pe Competiții
                      </h3>
                      
                      {(!selectedPlayer.detailed_stats || selectedPlayer.detailed_stats.length === 0) ? (
                          <div className="text-center p-6 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 text-gray-500 dark:text-gray-400">
                              Nu sunt date disponibile pe competiții pentru acest jucător momentan.
                          </div>
                      ) : (
                          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
                              <div className="overflow-x-auto">
                                  <table className="w-full text-sm text-left">
                                      <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-slate-900/50">
                                          <tr>
                                              <th className="px-4 py-3 font-bold">Competiție</th>
                                              <th className="px-4 py-3 font-bold text-center">Meciuri</th>
                                              <th className="px-4 py-3 font-bold text-center">Goluri</th>
                                              <th className="px-4 py-3 font-bold text-center">Pase</th>
                                              <th className="px-4 py-3 font-bold text-center hidden sm:table-cell">Minute</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {selectedPlayer.detailed_stats.map((stat, idx) => (
                                              <tr key={idx} className="border-b dark:border-slate-700 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                                  <td className="px-4 py-3 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                      {stat.competition}
                                                      <span className="text-[9px] font-normal px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 rounded uppercase tracking-wider">
                                                          {stat.type}
                                                      </span>
                                                  </td>
                                                  <td className="px-4 py-3 text-center font-medium text-slate-700 dark:text-slate-300">{stat.appearances}</td>
                                                  <td className="px-4 py-3 text-center font-black text-emerald-600 dark:text-emerald-400">{stat.goals}</td>
                                                  <td className="px-4 py-3 text-center font-black text-red-600 dark:text-red-400">{stat.assists}</td>
                                                  <td className="px-4 py-3 text-center text-slate-500 hidden sm:table-cell">{stat.minutes}'</td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      )}

                  </div>
              </div>
          </div>
      )}
    </div>
  );
}