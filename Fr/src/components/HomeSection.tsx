import React, { useEffect, useState, useMemo } from 'react';
import {
  Globe,
  Shield,
  Star,
  Activity,
  X,
  Trophy,
  MapPin,
  User as UserIcon,
  SlidersHorizontal,
  Scale,
  Bookmark,
  TrendingUp,
  RotateCcw,
  Check,
  Sparkles,
  Ruler,
  Weight
} from 'lucide-react';

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

// 2. INTERFAȚE PENTRU ECHIPE ȘI LOT
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
  };
}

// 3. INTERFAȚA PROPS
interface HomeProps {
  user: { name: string; email: string };
  onNavigate: (section: any) => void;
}

const parseHeightCm = (heightStr?: string): number => {
  if (!heightStr) return 0;
  const num = parseInt(heightStr.replace(/\D/g, ''), 10);
  return isNaN(num) ? 0 : num;
};

// Calcul metrici avansate de Scouting (Per 90' & Radar)
const computeScoutingMetrics = (player: Player) => {
  const stats = player.statistics_summary || {
    total_goals: 0,
    total_assists: 0,
    total_appearances: 0,
    minutes_played: 0,
    rating: "0"
  };

  const goals = stats.total_goals || 0;
  const assists = stats.total_assists || 0;
  const apps = stats.total_appearances || 0;
  const minutes = stats.minutes_played || 0;
  const rating = parseFloat(stats.rating || "0") || 0;

  const goalsPer90 = minutes >= 90 ? Number(((goals / minutes) * 90).toFixed(2)) : 0;
  const assistsPer90 = minutes >= 90 ? Number(((assists / minutes) * 90).toFixed(2)) : 0;
  const contributionsPer90 = minutes >= 90 ? Number((((goals + assists) / minutes) * 90).toFixed(2)) : 0;
  const minsPerContribution = (goals + assists) > 0 ? Math.round(minutes / (goals + assists)) : 0;

  const finishingScore = Math.min(99, Math.max(25, Math.round(goals * 8 + goalsPer90 * 65 + 20)));
  const creativityScore = Math.min(99, Math.max(25, Math.round(assists * 10 + assistsPer90 * 75 + 20)));
  const consistencyScore = Math.min(99, Math.max(25, Math.round(Math.min(minutes / 18, 60) + Math.min(apps * 1.5, 39))));
  const formScore = rating > 0 ? Math.min(99, Math.max(30, Math.round((rating - 5.5) * 32))) : 55;
  const impactScore = Math.min(99, Math.max(25, Math.round((goals + assists) * 6 + contributionsPer90 * 50 + (rating >= 7 ? 20 : 10))));

  return {
    goals,
    assists,
    apps,
    minutes,
    rating,
    goalsPer90,
    assistsPer90,
    contributionsPer90,
    minsPerContribution,
    radar: [
      { label: "Finalizare", value: finishingScore },
      { label: "Creație", value: creativityScore },
      { label: "Constanță", value: consistencyScore },
      { label: "Formă", value: formScore },
      { label: "Impact", value: impactScore }
    ]
  };
};

// Componentă SVG Radar Chart (Stil SofaScore)
const PlayerRadarChart = ({
  primaryPlayer,
  secondaryPlayer
}: {
  primaryPlayer: Player;
  secondaryPlayer?: Player | null;
}) => {
  const m1 = computeScoutingMetrics(primaryPlayer);
  const m2 = secondaryPlayer ? computeScoutingMetrics(secondaryPlayer) : null;

  const size = 230;
  const center = size / 2;
  const radius = 78;
  const axes = m1.radar.map(r => r.label);

  const getCoordinates = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  const buildPolygonPoints = (radarData: { label: string; value: number }[]) =>
    radarData
      .map((item, idx) => {
        const { x, y } = getCoordinates(idx, item.value);
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {[25, 50, 75, 100].map((level) => {
          const pts = axes
            .map((_, idx) => {
              const { x, y } = getCoordinates(idx, level);
              return `${x},${y}`;
            })
            .join(" ");
          return (
            <polygon
              key={level}
              points={pts}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray={level < 100 ? "3 3" : undefined}
            />
          );
        })}

        {axes.map((_, idx) => {
          const end = getCoordinates(idx, 100);
          return (
            <line
              key={idx}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke="#cbd5e1"
              strokeWidth="1"
            />
          );
        })}

        {m2 && (
          <polygon
            points={buildPolygonPoints(m2.radar)}
            fill="rgba(59, 130, 246, 0.25)"
            stroke="#2563eb"
            strokeWidth="2.5"
          />
        )}

        <polygon
          points={buildPolygonPoints(m1.radar)}
          fill="rgba(16, 185, 129, 0.30)"
          stroke="#059669"
          strokeWidth="2.5"
        />

        {m1.radar.map((item, idx) => {
          const pt1 = getCoordinates(idx, item.value);
          const labelPos = getCoordinates(idx, 120);
          return (
            <g key={idx}>
              <circle cx={pt1.x} cy={pt1.y} r="4" fill="#059669" />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] font-black fill-slate-700 dark:fill-slate-300 uppercase tracking-wider"
              >
                {item.label} ({item.value})
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export function HomeSection({ user, onNavigate }: HomeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState<'players' | 'teams'>('players');

  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamResult[]>([]);

  const [selectedTeam, setSelectedTeam] = useState<SquadData | null>(null);
  const [loadingRoster, setLoadingRoster] = useState(false);

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // --- STATE PENTRU SCOUTING PRO, WATCHLIST ȘI COMPARATOR ---
  const [showProFilters, setShowProFilters] = useState(false);
  const [positionFilter, setPositionFilter] = useState("Toate");
  const [maxAgeFilter, setMaxAgeFilter] = useState<string>("");
  const [minHeightFilter, setMinHeightFilter] = useState<number>(0);
  const [minMinutesFilter, setMinMinutesFilter] = useState<number>(0);
  const [minGoalsFilter, setMinGoalsFilter] = useState<number>(0);
  const [minRatingFilter, setMinRatingFilter] = useState<string>("0");
  const [sortBy, setSortBy] = useState<'rating' | 'per90' | 'goals' | 'assists' | 'minutes'>('rating');

  const [onlyWatchlist, setOnlyWatchlist] = useState(false);
  const [watchlistIds, setWatchlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('scout_watchlist_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [watchedPlayersData, setWatchedPlayersData] = useState<Player[]>([]);

  const [compareList, setCompareList] = useState<Player[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const [greeting, setGreeting] = useState("Salut");

  const API_URL = "https://football-backend-m2a4.onrender.com";

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("Neața");
    else if (hour >= 12 && hour < 18) setGreeting("Salut");
    else setGreeting("Bună seara");
  }, []);

  // Încărcăm Watchlist-ul utilizatorului
  useEffect(() => {
    if (!user?.email) return;
    fetch(`${API_URL}/api/users/watchlist/${encodeURIComponent(user.email)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (Array.isArray(data.scoutWatchlist)) {
            setWatchlistIds(data.scoutWatchlist);
            localStorage.setItem('scout_watchlist_ids', JSON.stringify(data.scoutWatchlist));
          }
          if (Array.isArray(data.watchedPlayers)) {
            setWatchedPlayersData(data.watchedPlayers);
          }
        }
      })
      .catch(() => {});
  }, [user?.email]);

  const hasActiveProFilters =
    positionFilter !== "Toate" ||
    maxAgeFilter !== "" ||
    minHeightFilter > 0 ||
    minMinutesFilter > 0 ||
    minGoalsFilter > 0 ||
    parseFloat(minRatingFilter) > 0;

  // Efect pentru căutare dinamică pe server (Jucători sau Echipe) + Filtre Scouting Pro
  useEffect(() => {
    const fetchResults = async () => {
      if (onlyWatchlist && searchMode === 'players') {
        if (user?.email) {
          setLoading(true);
          try {
            const res = await fetch(`${API_URL}/api/users/watchlist/${encodeURIComponent(user.email)}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.watchedPlayers)) {
              setPlayers(data.watchedPlayers);
            }
          } catch (e) {
            console.error(e);
          } finally {
            setLoading(false);
          }
        }
        return;
      }

      if (!searchTerm.trim() && !hasActiveProFilters && !showProFilters) {
        setPlayers([]);
        setTeams([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        if (searchMode === 'teams') {
          if (!searchTerm.trim()) {
            setTeams([]);
            setLoading(false);
            return;
          }
          const response = await fetch(`${API_URL}/api/sport/teams/search?q=${encodeURIComponent(searchTerm)}`);
          if (!response.ok) throw new Error(`Eroare server: ${response.status}`);
          const data = await response.json();
          setTeams(data);
          setPlayers([]);
        } else {
          const params = new URLSearchParams();
          if (searchTerm.trim()) params.append('search', searchTerm.trim());
          if (positionFilter !== 'Toate') params.append('position', positionFilter);
          if (maxAgeFilter) params.append('maxAge', maxAgeFilter);
          if (minMinutesFilter > 0) params.append('minMinutes', String(minMinutesFilter));
          if (minGoalsFilter > 0) params.append('minGoals', String(minGoalsFilter));
          if (parseFloat(minRatingFilter) > 0) params.append('minRating', minRatingFilter);
          params.append('limit', '250');

          const response = await fetch(`${API_URL}/api/sport/players?${params.toString()}`);
          if (!response.ok) throw new Error(`Eroare server: ${response.status}`);
          const data = await response.json();
          setPlayers(Array.isArray(data) ? data : []);
          setTeams([]);
        }
      } catch (err: any) {
        console.error("Eroare fetch:", err);
        setError("Nu am putut încărca datele de pe server.");
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [
    searchTerm,
    searchMode,
    positionFilter,
    maxAgeFilter,
    minMinutesFilter,
    minGoalsFilter,
    minRatingFilter,
    showProFilters,
    hasActiveProFilters,
    onlyWatchlist,
    user?.email
  ]);

  // Filtrare suplimentară client-side (înălțime, watchlist, sortare pro)
  const displayedPlayers = useMemo(() => {
    return players
      .filter((p) => {
        if (onlyWatchlist && !watchlistIds.includes(p._id)) return false;
        if (positionFilter !== "Toate") {
          const pos = (p.position || "").toLowerCase();
          if (positionFilter === "Portari" && !(pos.includes("goalkeeper") || pos.includes("portar"))) return false;
          if (positionFilter === "Fundași" && !(pos.includes("defender") || pos.includes("back") || pos.includes("funda"))) return false;
          if (positionFilter === "Mijlocași" && !(pos.includes("midfield") || pos.includes("mijloca"))) return false;
          if (positionFilter === "Atacanți" && !(pos.includes("forward") || pos.includes("striker") || pos.includes("wing") || pos.includes("ataca") || pos.includes("attack"))) return false;
        }
        if (maxAgeFilter && p.age && p.age > Number(maxAgeFilter)) return false;
        if (minHeightFilter > 0 && parseHeightCm(p.height) < minHeightFilter) return false;
        if (minMinutesFilter > 0 && (p.statistics_summary?.minutes_played || 0) < minMinutesFilter) return false;
        if (minGoalsFilter > 0 && (p.statistics_summary?.total_goals || 0) < minGoalsFilter) return false;
        if (parseFloat(minRatingFilter) > 0 && parseFloat(p.statistics_summary?.rating || "0") < parseFloat(minRatingFilter)) return false;
        return true;
      })
      .sort((a, b) => {
        const mA = computeScoutingMetrics(a);
        const mB = computeScoutingMetrics(b);
        if (sortBy === 'per90') return mB.contributionsPer90 - mA.contributionsPer90 || mB.goals - mA.goals;
        if (sortBy === 'goals') return mB.goals - mA.goals || mB.rating - mA.rating;
        if (sortBy === 'assists') return mB.assists - mA.assists || mB.rating - mA.rating;
        if (sortBy === 'minutes') return mB.minutes - mA.minutes;
        return mB.rating - mA.rating || mB.goals - mA.goals;
      });
  }, [
    players,
    onlyWatchlist,
    watchlistIds,
    positionFilter,
    maxAgeFilter,
    minHeightFilter,
    minMinutesFilter,
    minGoalsFilter,
    minRatingFilter,
    sortBy
  ]);

  const toggleWatchlist = async (e: React.MouseEvent, player: Player) => {
    e.stopPropagation();
    const playerId = player._id;
    const exists = watchlistIds.includes(playerId);
    const updated = exists
      ? watchlistIds.filter(id => id !== playerId)
      : [...watchlistIds, playerId];

    setWatchlistIds(updated);
    localStorage.setItem('scout_watchlist_ids', JSON.stringify(updated));

    if (!exists) {
      setWatchedPlayersData(prev => [...prev.filter(p => p._id !== playerId), player]);
    } else {
      setWatchedPlayersData(prev => prev.filter(p => p._id !== playerId));
    }

    if (user?.email) {
      try {
        await fetch(`${API_URL}/api/users/watchlist/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, playerId })
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleComparePlayer = (e: React.MouseEvent, player: Player) => {
    e.stopPropagation();
    setCompareList(prev => {
      const exists = prev.some(p => p._id === player._id);
      if (exists) return prev.filter(p => p._id !== player._id);
      if (prev.length >= 2) return [prev[1], player];
      return [...prev, player];
    });
  };

  const resetProFilters = () => {
    setPositionFilter("Toate");
    setMaxAgeFilter("");
    setMinHeightFilter(0);
    setMinMinutesFilter(0);
    setMinGoalsFilter(0);
    setMinRatingFilter("0");
    setSortBy("rating");
    setOnlyWatchlist(false);
  };

  // Funcție pentru deschiderea lotului echipei
  const handleTeamClick = async (teamName: string) => {
    setLoadingRoster(true);
    setSelectedTeam(null);
    try {
      const res = await fetch(`${API_URL}/api/sport/teams/${encodeURIComponent(teamName)}/roster`);
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

  const showResults =
    searchTerm.trim().length > 0 ||
    hasActiveProFilters ||
    showProFilters ||
    onlyWatchlist;

  const firstName = user?.name ? user.name.split(' ')[0] : 'Scouter';

  return (
    <div className="relative min-h-[80vh] py-10 overflow-hidden">

      {/* MODAL LOT ECHIPĂ */}
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
                    {section.data.map(p => {
                      const isSelectedForCompare = compareList.some(item => item._id === p._id);
                      return (
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
                          <div className="flex items-center gap-2 sm:gap-4 text-center shrink-0">
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
                            <button
                              onClick={(e) => toggleComparePlayer(e, p)}
                              title="Compară jucătorul"
                              className={`p-2 rounded-xl border transition ${
                                isSelectedForCompare
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                              }`}
                            >
                              <Scale className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
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

      <div className="relative z-10 space-y-10">
        
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
          
          <div className="max-w-3xl mx-auto mt-8 relative z-10">
            {/* COMUTATOR CĂUTARE + BUTOANE SCOUTING PRO & WATCHLIST */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
              <div className="bg-white/70 backdrop-blur-md p-1.5 rounded-full inline-flex shadow-sm border border-white/60">
                <button
                  onClick={() => { setSearchMode('players'); setSearchTerm(''); }}
                  className={`px-4 sm:px-6 py-2 rounded-full text-sm font-bold transition-all ${searchMode === 'players' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  👤 Caută Jucători
                </button>
                <button
                  onClick={() => { setSearchMode('teams'); setSearchTerm(''); setOnlyWatchlist(false); setShowProFilters(false); }}
                  className={`px-4 sm:px-6 py-2 rounded-full text-sm font-bold transition-all ${searchMode === 'teams' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  🛡️ Caută Echipe
                </button>
              </div>

              {searchMode === 'players' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowProFilters(!showProFilters);
                      if (onlyWatchlist) setOnlyWatchlist(false);
                    }}
                    className={`px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shadow-sm border ${
                      showProFilters || hasActiveProFilters
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20'
                        : 'bg-white/80 text-slate-700 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    Filtre Scouting Pro
                  </button>

                  <button
                    onClick={() => {
                      setOnlyWatchlist(!onlyWatchlist);
                      setSearchMode('players');
                    }}
                    className={`px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shadow-sm border ${
                      onlyWatchlist
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-amber-500/20'
                        : 'bg-white/80 text-slate-700 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${onlyWatchlist ? 'fill-slate-950' : 'text-amber-500'}`} />
                    Watchlist ({watchlistIds.length})
                  </button>
                </div>
              )}
            </div>

            {/* BARA DE CĂUTARE */}
            <div className="relative group max-w-xl mx-auto">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-600 via-blue-500 to-yellow-500 rounded-full blur-md opacity-40 group-hover:opacity-70 transition duration-500"></div>
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-5 top-1/2 transform -translate-y-1/2 h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder={searchMode === 'players' ? "Caută un jucător (ex: Saka, Hagi, Coman)..." : "Caută un club (ex: Liverpool, FCSB)..."}
                  className="w-full pl-14 pr-12 py-5 text-lg font-medium border-0 rounded-full shadow-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white/90 backdrop-blur-xl placeholder:text-slate-400 text-slate-900"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* PANOUL EXTINS DE FILTRE SCOUTING PRO */}
            {searchMode === 'players' && showProFilters && (
              <div className="mt-6 bg-white/95 backdrop-blur-xl border border-emerald-200 rounded-3xl p-5 shadow-2xl text-left animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800">
                      Motor Avansat de Scouting ({displayedPlayers.length} jucători afișați)
                    </span>
                  </div>
                  <button
                    onClick={resetProFilters}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Resetează filtrele
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Poziție în Teren</label>
                    <select
                      value={positionFilter}
                      onChange={(e) => setPositionFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                    >
                      <option value="Toate">Toate pozițiile</option>
                      <option value="Portari">Portari (GK)</option>
                      <option value="Fundași">Fundași (DEF)</option>
                      <option value="Mijlocași">Mijlocași (MID)</option>
                      <option value="Atacanți">Atacanți (FWD)</option>
                    </select>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Vârstă Maximă</label>
                    <select
                      value={maxAgeFilter}
                      onChange={(e) => setMaxAgeFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                    >
                      <option value="">Orice vârstă</option>
                      <option value="19">Sub 19 ani (U19)</option>
                      <option value="21">Sub 21 ani (U21)</option>
                      <option value="23">Sub 23 ani (U23)</option>
                      <option value="26">Sub 26 ani</option>
                      <option value="30">Sub 30 ani</option>
                    </select>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Minutaj Minim Sezon</label>
                    <select
                      value={minMinutesFilter}
                      onChange={(e) => setMinMinutesFilter(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                    >
                      <option value={0}>Orice minutaj</option>
                      <option value={180}>Minim 180' (2+ meciuri)</option>
                      <option value={450}>Minim 450' (5+ meciuri)</option>
                      <option value={900}>Minim 900' (Titular)</option>
                      <option value={1500}>Minim 1500' (Om de bază)</option>
                    </select>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Rating Minim SofaScore</label>
                    <select
                      value={minRatingFilter}
                      onChange={(e) => setMinRatingFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                    >
                      <option value="0">Orice notă</option>
                      <option value="6.5">Peste 6.50</option>
                      <option value="6.8">Peste 6.80</option>
                      <option value="7.0">Peste 7.00 (Formă bună)</option>
                      <option value="7.3">Peste 7.30 (Elită)</option>
                    </select>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Înălțime Minimă</label>
                    <select
                      value={minHeightFilter}
                      onChange={(e) => setMinHeightFilter(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                    >
                      <option value={0}>Orice înălțime</option>
                      <option value={175}>Minim 175 cm</option>
                      <option value={180}>Minim 180 cm</option>
                      <option value={185}>Minim 185 cm</option>
                      <option value={190}>Minim 190 cm</option>
                    </select>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Ordonează Rezultatele</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                    >
                      <option value="rating">⭐ Rating Mediu</option>
                      <option value="per90">⚡ Contribuții (G+A) / 90'</option>
                      <option value="goals">⚽ Total Goluri</option>
                      <option value="assists">🎯 Total Pase Decisive</option>
                      <option value="minutes">⏱️ Minute Jucate</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
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
              <p className="text-slate-600">
                Tastează în bară pentru a căuta {searchMode === 'players' ? 'un jucător' : 'o echipă'} sau deschide <strong>Filtrele Scouting Pro</strong>.
              </p>
            </div>
          )}

          {/* AFISARE JUCATORI (Carduri îmbogățite cu Rating, Per 90', Watchlist & Comparator) */}
          {showResults && !loading && searchMode === 'players' && displayedPlayers.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-in slide-in-from-bottom-8 duration-700">
              {displayedPlayers.map((player) => {
                const teamNameStr = player.team_name || player.team || "Club Necunoscut";
                const isNationalOnly = teamNameStr.toLowerCase().includes("nationala") || teamNameStr.toLowerCase() === "romania";
                const metrics = computeScoutingMetrics(player);
                const isWatched = watchlistIds.includes(player._id);
                const isSelectedForCompare = compareList.some(item => item._id === player._id);

                return (
                  <div
                    key={player._id}
                    onClick={() => setSelectedPlayer(player)}
                    className="relative group bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col items-center text-center cursor-pointer hover:shadow-xl hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300 hover:-translate-y-1"
                  >
                    {/* Butoane flotante sus: Watchlist (stânga) și Compară (dreapta) */}
                    <button
                      onClick={(e) => toggleWatchlist(e, player)}
                      title={isWatched ? "Elimină din Watchlist" : "Salvează în Watchlist"}
                      className={`absolute top-2.5 left-2.5 p-1.5 rounded-lg border transition z-10 ${
                        isWatched
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-slate-50 text-slate-400 border-slate-200/80 hover:text-amber-500'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isWatched ? 'fill-slate-950' : ''}`} />
                    </button>

                    <button
                      onClick={(e) => toggleComparePlayer(e, player)}
                      title="Compară jucătorul (Head-to-Head)"
                      className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg border transition z-10 ${
                        isSelectedForCompare
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-400 border-slate-200/80 hover:text-emerald-600'
                      }`}
                    >
                      {isSelectedForCompare ? <Check className="w-3.5 h-3.5" /> : <Scale className="w-3.5 h-3.5" />}
                    </button>

                    <div className="relative mb-3 mt-3">
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
                      {metrics.rating > 0 && (
                        <div className="absolute -bottom-1 -left-1 bg-slate-900 text-amber-400 text-[10px] font-black px-1.5 py-0.5 rounded-md shadow border border-white flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-amber-400" /> {metrics.rating.toFixed(1)}
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
                    
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                        {player.position || "Jucător"}
                      </span>
                      {player.age && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                          {player.age}a
                        </span>
                      )}
                    </div>

                    {/* Mini rezumat G/A pe card */}
                    <div className="w-full mt-3 pt-2 border-t border-slate-100 flex items-center justify-around text-[11px] font-bold text-slate-600">
                      <span>{metrics.apps}M</span>
                      <span className="text-emerald-600">{metrics.goals}G</span>
                      <span className="text-blue-600">{metrics.assists}A</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* AFISARE ECHIPE */}
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
          {showResults && !loading && ((searchMode === 'players' && displayedPlayers.length === 0) || (searchMode === 'teams' && teams.length === 0)) && (
            <div className="text-center py-16 bg-white/85 backdrop-blur-md rounded-3xl shadow-xl max-w-2xl mx-auto mt-10 border border-white/50">
              <div className="text-6xl mb-4 opacity-80">🤷‍♂️</div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Niciun rezultat găsit.</h3>
              <p className="text-slate-600 font-medium">
                Asigură-te că {searchMode === 'players' ? 'jucătorul' : 'echipa'} se află în baza de date sau relaxează filtrele active.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* ========================================================= */}
      {/* BARĂ PLUTITOARE PENTRU COMPARATORUL HEAD-TO-HEAD */}
      {/* ========================================================= */}
      {compareList.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[55] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-4 max-w-xl w-[92%] justify-between animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3 overflow-hidden">
            <Scale className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="flex items-center gap-2 overflow-hidden">
              {compareList.map((p) => (
                <div key={p._id} className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl text-xs font-bold truncate">
                  <img src={p.image || GENERIC_USER_IMAGE} alt={p.name} className="w-5 h-5 rounded-full object-cover" />
                  <span className="truncate max-w-[95px]">{p.name}</span>
                  <button
                    onClick={(e) => toggleComparePlayer(e, p)}
                    className="text-slate-400 hover:text-white ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {compareList.length === 1 && (
                <span className="text-xs text-slate-400 italic hidden sm:inline">
                  + Selectează încă 1 jucător
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              disabled={compareList.length < 2}
              onClick={() => setShowCompareModal(true)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                compareList.length === 2
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              Compară ({compareList.length}/2)
            </button>
            <button
              onClick={() => setCompareList([])}
              className="p-2 text-slate-400 hover:text-white rounded-lg"
              title="Golește comparatorul"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DETALII JUCĂTOR (CU RADAR CHART & METRICI PER 90') */}
      {/* ========================================================= */}
      {selectedPlayer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedPlayer(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="relative bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-800 shrink-0 px-6 py-8">
              <button
                onClick={() => setSelectedPlayer(null)}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur rounded-full p-2 text-white transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 relative z-0">
                <img
                  src={selectedPlayer.image || GENERIC_USER_IMAGE}
                  alt={selectedPlayer.name}
                  className="w-28 h-28 md:w-36 md:h-36 rounded-2xl object-cover border-4 border-white dark:border-slate-900 shadow-xl bg-white dark:bg-slate-800 shrink-0"
                  onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }}
                />
                
                <div className="text-white drop-shadow-md text-center sm:text-left flex-1 min-w-0">
                  <h2 className="text-3xl md:text-4xl font-black truncate">{selectedPlayer.name}</h2>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 opacity-90">
                    {selectedPlayer.team_logo && (
                      <img src={selectedPlayer.team_logo} alt="logo" className="w-6 h-6 bg-white rounded-full p-0.5 object-contain" />
                    )}
                    <span className="font-bold text-lg truncate">{selectedPlayer.team_name || selectedPlayer.team}</span>
                  </div>
                </div>

                {/* Butoane acțiuni scouter în Header */}
                <div className="flex sm:flex-col gap-2 shrink-0">
                  <button
                    onClick={(e) => toggleWatchlist(e, selectedPlayer)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow-md transition ${
                      watchlistIds.includes(selectedPlayer._id)
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-white text-slate-900 hover:bg-emerald-50'
                    }`}
                  >
                    <Bookmark className="w-4 h-4 fill-current" />
                    {watchlistIds.includes(selectedPlayer._id) ? 'În Watchlist' : 'Watchlist'}
                  </button>
                  <button
                    onClick={(e) => {
                      toggleComparePlayer(e, selectedPlayer);
                      setSelectedPlayer(null);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-black uppercase bg-slate-900/80 hover:bg-slate-900 text-white flex items-center gap-1.5 shadow-md transition"
                  >
                    <Scale className="w-4 h-4" /> Compară
                  </button>
                </div>
              </div>
            </div>

            {/* Conținut Derulabil */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
              
              {/* Info Bar */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-3 mb-8">
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

              {/* ANALIZĂ SCOUTING PRO: GRAFIC RADAR & METRICI PER 90' */}
              {(() => {
                const m = computeScoutingMetrics(selectedPlayer);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-500" /> Profil Radar (Atribute Scouter)
                      </h4>
                      <PlayerRadarChart primaryPlayer={selectedPlayer} />
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-emerald-500" /> Randament Raportat la 90 Minute
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-50/70 dark:bg-emerald-900/20 p-3.5 rounded-xl border border-emerald-200/60">
                          <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">Goluri / 90'</span>
                          <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{m.goalsPer90}</p>
                        </div>
                        <div className="bg-blue-50/70 dark:bg-blue-900/20 p-3.5 rounded-xl border border-blue-200/60">
                          <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-400">Pase Decisive / 90'</span>
                          <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{m.assistsPer90}</p>
                        </div>
                        <div className="bg-amber-50/70 dark:bg-amber-900/20 p-3.5 rounded-xl border border-amber-200/60">
                          <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400">Contribuții (G+A) / 90'</span>
                          <p className="text-2xl font-black text-amber-600 mt-0.5">{m.contributionsPer90}</p>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700 p-3.5 rounded-xl border border-slate-200 dark:border-slate-600">
                          <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-300">Minute / Contribuție</span>
                          <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                            {m.minsPerContribution > 0 ? `${m.minsPerContribution}'` : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

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

      {/* ========================================================= */}
      {/* MODAL COMPARATOR HEAD-TO-HEAD (2 JUCĂTORI FAȚĂ ÎN FAȚĂ) */}
      {/* ========================================================= */}
      {showCompareModal && compareList.length === 2 && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowCompareModal(false)}
        >
          <div
            className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white p-4 sm:p-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Scale className="w-6 h-6 text-emerald-400" />
                <h2 className="text-lg sm:text-2xl font-black uppercase tracking-wide">
                  Comparator Head-to-Head Scouter
                </h2>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const p1 = compareList[0];
              const p2 = compareList[1];
              const m1 = computeScoutingMetrics(p1);
              const m2 = computeScoutingMetrics(p2);

              const rows = [
                { label: "Rating Mediu", v1: m1.rating, v2: m2.rating, format: (v: number) => (v > 0 ? v.toFixed(2) : "-") },
                { label: "Meciuri Jucate", v1: m1.apps, v2: m2.apps, format: (v: number) => String(v) },
                { label: "Minute Jucate", v1: m1.minutes, v2: m2.minutes, format: (v: number) => `${v}'` },
                { label: "Goluri Marcate", v1: m1.goals, v2: m2.goals, format: (v: number) => String(v) },
                { label: "Pase Decisive", v1: m1.assists, v2: m2.assists, format: (v: number) => String(v) },
                { label: "Goluri / 90'", v1: m1.goalsPer90, v2: m2.goalsPer90, format: (v: number) => String(v) },
                { label: "Contribuții (G+A) / 90'", v1: m1.contributionsPer90, v2: m2.contributionsPer90, format: (v: number) => String(v) }
              ];

              return (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-6">
                  <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-200">
                    <div className="flex flex-col items-center text-center border-r border-slate-100 pr-2">
                      <img src={p1.image || GENERIC_USER_IMAGE} alt={p1.name} className="w-20 h-20 rounded-full object-cover border-4 border-emerald-500 shadow-md mb-2" />
                      <h3 className="font-black text-base sm:text-lg text-slate-900">{p1.name}</h3>
                      <span className="text-xs font-bold text-emerald-600">{p1.team || p1.team_name} • {p1.position}</span>
                    </div>
                    <div className="flex flex-col items-center text-center pl-2">
                      <img src={p2.image || GENERIC_USER_IMAGE} alt={p2.name} className="w-20 h-20 rounded-full object-cover border-4 border-blue-600 shadow-md mb-2" />
                      <h3 className="font-black text-base sm:text-lg text-slate-900">{p2.name}</h3>
                      <span className="text-xs font-bold text-blue-600">{p2.team || p2.team_name} • {p2.position}</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col items-center">
                    <div className="flex items-center gap-6 text-xs font-black uppercase mb-2">
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> {p1.name}
                      </span>
                      <span className="flex items-center gap-1.5 text-blue-600">
                        <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span> {p2.name}
                      </span>
                    </div>
                    <PlayerRadarChart primaryPlayer={p1} secondaryPlayer={p2} />
                  </div>

                  <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 space-y-4">
                    {rows.map((r, idx) => {
                      const total = r.v1 + r.v2;
                      const p1Pct = total > 0 ? Math.round((r.v1 / total) * 100) : 50;
                      const p2Pct = 100 - p1Pct;
                      const p1Wins = r.v1 > r.v2;
                      const p2Wins = r.v2 > r.v1;

                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-xs sm:text-sm font-bold">
                            <span className={p1Wins ? "text-emerald-600 font-black" : "text-slate-600"}>
                              {r.format(r.v1)}
                            </span>
                            <span className="text-slate-400 uppercase text-[11px] font-black tracking-wider">
                              {r.label}
                            </span>
                            <span className={p2Wins ? "text-blue-600 font-black" : "text-slate-600"}>
                              {r.format(r.v2)}
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                            <div style={{ width: `${p1Pct}%` }} className="bg-emerald-500 h-full transition-all" />
                            <div style={{ width: `${p2Pct}%` }} className="bg-blue-600 h-full transition-all" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}