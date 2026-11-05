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
  AlertTriangle 
} from 'lucide-react';

const GENERIC_USER_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

// 1. INTERFAȚA PLAYER
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

// Calcul metrici avansate de Scouting (Per 90' & Radar - Percentile Style)
const computeScoutingMetrics = (player: Player) => {
  const stats = player.statistics_summary || {
    total_goals: 0,
    total_assists: 0,
    total_appearances: 0,
    minutes_played: 0,
    rating: "0"
  };

  const posLower = (player.position || "").toLowerCase();
  const isDefensive = posLower.includes('defender') || posLower.includes('back') || posLower.includes('goalkeeper') || posLower.includes('portar');

  const goals = stats.total_goals || 0;
  const assists = stats.total_assists || 0;
  const apps = stats.total_appearances || 0;
  const minutes = stats.minutes_played || 0;
  const rating = parseFloat(stats.rating || "0") || 0;

  const goalsPer90 = minutes >= 90 ? Number(((goals / minutes) * 90).toFixed(2)) : 0;
  const assistsPer90 = minutes >= 90 ? Number(((assists / minutes) * 90).toFixed(2)) : 0;
  const contributionsPer90 = goalsPer90 + assistsPer90;
  const minsPerContribution = (goals + assists) > 0 ? Math.round(minutes / (goals + assists)) : 0;

  // 1. FINALIZARE SAU APĂRARE (în funcție de poziție)
  let primaryScore = 20;
  let primaryLabel = "Finalizare";
  if (isDefensive) {
      primaryLabel = "Defensivă";
      // Fundașii capătă punctaj mare din nota de bază dacă au jucat meciuri fără gol primit (dedus din rating și minute)
      primaryScore = Math.min(99, Math.max(20, Math.round(35 + (rating > 6.8 ? (rating - 6.8) * 40 : 0) + (Math.min(apps, 30) * 0.8))));
  } else {
      // 0.8+ Goluri/90' = elită (scor 90+)
      primaryScore = Math.min(99, Math.max(20, Math.round(25 + (goalsPer90 * 75) + (Math.min(goals, 20) * 1.5))));
  }

  // 2. CREAȚIE: Un prag de 0.5+ Assisturi/90' reprezintă elita.
  const creativityScore = Math.min(99, Math.max(20, Math.round(25 + (assistsPer90 * 100) + (Math.min(assists, 15) * 1.5))));

  // 3. CONSTANȚĂ: Combinație între procentajul de meciuri jucate (din 38) și minute. (3000 de minute = constanță max)
  const consistencyScore = Math.min(99, Math.max(25, Math.round(20 + (Math.min(apps, 38) * 1.2) + (Math.min(minutes, 3000) / 75))));

  // 4. FORMĂ: Normalizată strict pe curba notelor SofaScore (6.0 este mediocru, 8.0+ este istoric)
  let formScore = 30;
  if (rating > 5.5) {
      formScore = Math.min(99, Math.max(30, Math.round(30 + ((rating - 6.0) * 35))));
  }

  // 5. IMPACT: O medie hibridă între formă (evaluarea AI/algoritmică) și contribuțiile generale.
  const impactScore = Math.min(99, Math.max(25, Math.round((formScore * 0.4) + (contributionsPer90 * 55) + 15)));

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
      { label: primaryLabel, value: primaryScore },
      { label: "Creație", value: creativityScore },
      { label: "Constanță", value: consistencyScore },
      { label: "Formă", value: formScore },
      { label: "Impact", value: impactScore }
    ]
  };
};

// Componentă SVG Radar Chart
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
      <svg width={size} height={size} className="overflow-visible drop-shadow-md">
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
              stroke="rgba(16, 185, 129, 0.3)" 
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
              stroke="rgba(16, 185, 129, 0.4)"
              strokeWidth="1"
            />
          );
        })}

        {m2 && (
          <polygon
            points={buildPolygonPoints(m2.radar)}
            fill="rgba(59, 130, 246, 0.4)" 
            stroke="#2563eb"
            strokeWidth="3"
          />
        )}

        <polygon
          points={buildPolygonPoints(m1.radar)}
          fill="rgba(250, 204, 21, 0.4)" 
          stroke="#facc15"
          strokeWidth="3"
        />

        {m1.radar.map((item, idx) => {
          const pt1 = getCoordinates(idx, item.value);
          const labelPos = getCoordinates(idx, 120);
          return (
            <g key={idx}>
              <circle cx={pt1.x} cy={pt1.y} r="4" fill="#facc15" stroke="#fff" strokeWidth="1.5" />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] font-black fill-slate-700 dark:fill-slate-200 uppercase tracking-wider"
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

  const [showProFilters, setShowProFilters] = useState(false);
  const [positionFilter, setPositionFilter] = useState("Toate");
  const [maxAgeFilter, setMaxAgeFilter] = useState<string>("");
  const [minHeightFilter, setMinHeightFilter] = useState<number>(0);
  const [minMinutesFilter, setMinMinutesFilter] = useState<number>(0);
  const [minGoalsFilter, setMinGoalsFilter] = useState<number>(0);
  const [minRatingFilter, setMinRatingFilter] = useState<string>("0");
  
  // Noile filtre adăugate:
  const [nationalityFilter, setNationalityFilter] = useState("Toate");
  const [leagueFilter, setLeagueFilter] = useState("Toate");

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

  const API_URL = window.location.hostname === "localhost" 
      ? "http://localhost:3000" 
      : "https://football-backend-m2a4.onrender.com";

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("Neața");
    else if (hour >= 12 && hour < 18) setGreeting("Salut");
    else setGreeting("Bună seara");
  }, []);

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
  }, [user?.email, API_URL]);

  const hasActiveProFilters =
    positionFilter !== "Toate" ||
    maxAgeFilter !== "" ||
    minHeightFilter > 0 ||
    minMinutesFilter > 0 ||
    minGoalsFilter > 0 ||
    nationalityFilter !== "Toate" ||
    leagueFilter !== "Toate" ||
    parseFloat(minRatingFilter) > 0;

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
          
          // Pentru filtrele noi, trimitem id-ul ligii sau nationalitatea strictă
          if (nationalityFilter !== 'Toate') params.append('nationality', nationalityFilter);
          if (leagueFilter !== 'Toate') params.append('league_id', leagueFilter);

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
    searchTerm, searchMode, positionFilter, maxAgeFilter,
    minMinutesFilter, minGoalsFilter, minRatingFilter,
    nationalityFilter, leagueFilter,
    showProFilters, hasActiveProFilters, onlyWatchlist,
    user?.email, API_URL
  ]);

  const displayedPlayers = useMemo(() => {
    return players
      .filter((p) => {
        if (onlyWatchlist && !watchlistIds.includes(p._id)) return false;
        
        // Căutarea în frontend se face doar dacă backend-ul n-a filtrat-o deja complet (fallback layer)
        if (positionFilter !== "Toate") {
          const pos = (p.position || "").toLowerCase();
          if (positionFilter === "Portari" && !(pos.includes("goalkeeper") || pos.includes("portar"))) return false;
          if (positionFilter === "Fundași" && !(pos.includes("defender") || pos.includes("back") || pos.includes("funda"))) return false;
          if (positionFilter === "Mijlocași" && !(pos.includes("midfield") || pos.includes("mijloca"))) return false;
          if (positionFilter === "Atacanți" && !(pos.includes("forward") || pos.includes("striker") || pos.includes("wing") || pos.includes("ataca") || pos.includes("attack"))) return false;
        }
        
        if (nationalityFilter !== "Toate") {
          const nat = (p.nationality || "").toLowerCase();
          if (!nat.includes(nationalityFilter.toLowerCase())) return false;
        }

        if (leagueFilter !== "Toate") {
            const lId = p.league_id ? p.league_id.toString() : "";
            if (lId !== leagueFilter) return false;
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
  }, [players, onlyWatchlist, watchlistIds, positionFilter, nationalityFilter, leagueFilter, maxAgeFilter, minHeightFilter, minMinutesFilter, minGoalsFilter, minRatingFilter, sortBy]);

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
    setNationalityFilter("Toate");
    setLeagueFilter("Toate");
    setSortBy("rating");
    setOnlyWatchlist(false);
  };

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

  const showResults = searchTerm.trim().length > 0 || hasActiveProFilters || showProFilters || onlyWatchlist;
  const firstName = user?.name ? user.name.split(' ')[0] : 'Scouter';

  return (
    <div className="relative min-h-[80vh] py-10 overflow-hidden rounded-3xl">

      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none">
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] bg-[repeating-linear-gradient(0deg,transparent,transparent_60px,#fff_60px,#fff_62px),repeating-linear-gradient(90deg,transparent,transparent_60px,#fff_60px,#fff_62px)]"></div>
        <div className="absolute top-0 left-1/4 w-[40vw] h-[40vw] rounded-full bg-emerald-500/20 blur-[150px] animate-pulse"></div>
        <div className="absolute top-[20%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-blue-500/10 blur-[120px]"></div>
      </div>

      {selectedTeam && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm transition-opacity">
          <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-4 border-emerald-600/30 animate-in fade-in zoom-in duration-300">
            
            <div className="bg-slate-950 text-white p-4 sm:p-6 flex items-start sm:items-center justify-between shrink-0 border-b-4 border-slate-700 relative">
                <div className="flex items-center gap-3 sm:gap-6 min-w-0 pr-16 sm:pr-0">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white p-1.5 sm:p-2 rounded-2xl shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                        <img src={selectedTeam.teamInfo.logo} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="min-w-0">
                            <h2 className="text-xl sm:text-4xl font-black uppercase tracking-tighter truncate drop-shadow-md">{selectedTeam.teamInfo.name}</h2>
                            <p className="text-[10px] sm:text-base text-emerald-400 font-bold uppercase tracking-widest mt-0.5 truncate">
                                ⚽ LOTUL OFICIAL • {selectedTeam.teamInfo.totalPlayers} Jucători
                            </p>
                        </div>
                    </div>
                </div>
                <div className="absolute top-4 right-4 sm:static flex items-center gap-2">
                    <button onClick={() => setSelectedTeam(null)} className="p-2 sm:p-3 bg-white/10 hover:bg-rose-500 rounded-xl sm:rounded-full border border-white/20 hover:border-rose-600 transition-colors text-white shrink-0">
                        <X className="w-4 h-4 sm:w-6 sm:h-6" />
                    </button>
                </div>
            </div>

            <div className="overflow-y-auto p-3 sm:p-6 bg-slate-100 dark:bg-slate-950 space-y-6 flex-1">
              {([
                { title: "Portari", data: selectedTeam.squad.Goalkeepers, color: "text-amber-500 border-amber-500", bg: "bg-amber-500/10" },
                { title: "Fundași", data: selectedTeam.squad.Defenders, color: "text-blue-500 border-blue-500", bg: "bg-blue-500/10" },
                { title: "Mijlocași", data: selectedTeam.squad.Midfielders, color: "text-emerald-500 border-emerald-500", bg: "bg-emerald-500/10" },
                { title: "Atacanți", data: selectedTeam.squad.Attackers, color: "text-rose-500 border-rose-500", bg: "bg-rose-500/10" }
              ]).map((section, idx) => section.data.length > 0 && (
                <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border-2 border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className={`px-4 py-3 border-l-4 ${section.color} ${section.bg} border-b border-b-slate-100 dark:border-b-slate-800`}>
                    <h3 className={`font-black uppercase tracking-wider text-sm sm:text-base ${section.color.split(' ')[0]}`}>{section.title}</h3>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {section.data.map(p => {
                      const isSelectedForCompare = compareList.some(item => item._id === p._id);
                      return (
                        <div key={p._id} onClick={() => setSelectedPlayer(p)} className="flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition gap-3 cursor-pointer">
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                <img src={p.image || GENERIC_USER_IMAGE} alt={p.name} className="w-10 h-10 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shrink-0 bg-white" onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }} />
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate uppercase tracking-tight" title={p.name}>{p.name}</p>
                                    <div className="flex gap-2 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate uppercase tracking-wider">
                                        {p.age && <span className="shrink-0">{p.age} ani</span>}
                                        {p.nationality && <span className="truncate">• {p.nationality}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <button
                                    onClick={(e) => toggleComparePlayer(e, p)}
                                    title="Compară jucătorul"
                                    className={`p-2.5 sm:p-3 rounded-xl border-2 transition ${
                                        isSelectedForCompare
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600'
                                    }`}
                                >
                                    {isSelectedForCompare ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <Scale className="w-4 h-4 sm:w-5 sm:h-5" />}
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

      <div className="relative z-10 space-y-10">
        
        {/* ================================================== */}
        {/* VARIANT 2: INTERACTIVĂ & CENTRALĂ */}
        {/* ================================================== */}
        <section className="text-center space-y-5 px-4 max-w-4xl mx-auto">
          
          {/* BADGE SUPERIOR */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mx-auto">
            <UserIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
              Sectorul de Scouting
            </span>
          </div>

          {/* SALUTUL PRINCIPAL */}
          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter text-slate-900 dark:text-white drop-shadow-sm flex items-center justify-center gap-3">
            Salut, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">{firstName}</span>!
            <span className="text-3xl sm:text-5xl animate-wave origin-bottom-right">👋</span>
          </h1>
          
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest mb-8">
            Baza de date este pregătită pentru analiză. Pe cine căutăm astăzi?
          </p>

          {/* BARĂ DE CĂUTARE & TOGGLE */}
          <div className="relative z-10 w-full max-w-2xl mx-auto">
            
            {/* Butoanele Jucători / Echipe lipite deasupra barei */}
            <div className="flex justify-center mb-3">
               <div className="bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-xl inline-flex border border-slate-300/50 dark:border-slate-700/50 backdrop-blur shadow-sm">
                  <button
                    onClick={() => { setSearchMode('players'); setSearchTerm(''); }}
                    className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                      searchMode === 'players' 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    Jucători
                  </button>
                  <button
                    onClick={() => { setSearchMode('teams'); setSearchTerm(''); setOnlyWatchlist(false); setShowProFilters(false); }}
                    className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                      searchMode === 'teams' 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    Echipe
                  </button>
                </div>
            </div>

            {/* Inputul Propriu-zis */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-emerald-500/20 rounded-full blur group-hover:bg-emerald-500/30 transition duration-500"></div>
              <div className="relative bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-full shadow-lg flex items-center overflow-hidden">
                
                <div className="pl-5 pr-3 text-emerald-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                <input
                  type="text"
                  placeholder={searchMode === 'players' ? "Ex: Florinel Coman, Dennis Man..." : "Ex: FCSB, Rapid București..."}
                  className="w-full py-4 text-base sm:text-lg font-bold tracking-wide border-0 bg-transparent focus:ring-0 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="p-2 mr-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-500 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4 font-bold" />
                  </button>
                )}
              </div>
            </div>

            {/* Filtre Rapide & Watchlist sub bara de cautare */}
            {searchMode === 'players' && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <button
                    onClick={() => {
                      setShowProFilters(!showProFilters);
                      if (onlyWatchlist) setOnlyWatchlist(false);
                    }}
                    className={`px-4 py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border ${
                      showProFilters || hasActiveProFilters
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-500'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                    }`}
                  >
                    + Filtre Tactică
                  </button>

                  <button
                    onClick={() => {
                      setOnlyWatchlist(!onlyWatchlist);
                      setSearchMode('players');
                    }}
                    className={`px-4 py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-1.5 ${
                      onlyWatchlist
                        ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 border-amber-500'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-500'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${onlyWatchlist ? 'fill-amber-600' : ''}`} />
                    Listă Scurtă ({watchlistIds.length})
                  </button>
              </div>
            )}
          </div>
          
          {/* Panoul Detaliat de Filtre */}
          {searchMode === 'players' && showProFilters && (
            <div className="mt-8 max-w-4xl mx-auto bg-slate-900 border-2 border-emerald-600/30 rounded-3xl p-5 sm:p-6 shadow-2xl text-left animate-in fade-in duration-300 relative overflow-hidden">
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                  <span className="font-black text-xs sm:text-sm uppercase tracking-widest text-white">
                    Setări Căutare Avansată
                  </span>
                </div>
                <button
                  onClick={resetProFilters}
                  className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-rose-500/10 px-3 py-1.5 rounded border border-rose-500/20 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>

              {/* GRILA FILTRELOR ACTUALIZATĂ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                {[
                  { label: "Poziție în Teren", value: positionFilter, set: setPositionFilter, opts: [["Toate", "Toate pozițiile"], ["Portari", "Portari (GK)"], ["Fundași", "Fundași (DEF)"], ["Mijlocași", "Mijlocași (MID)"], ["Atacanți", "Atacanți (FWD)"]] },
                  { label: "Naționalitate", value: nationalityFilter, set: setNationalityFilter, opts: [["Toate", "Orice Naționalitate"], ["Romania", "România 🇷🇴"], ["England", "Anglia 🏴󠁧󠁢󠁥󠁮󠁧󠁿"], ["Spain", "Spania 🇪🇸"], ["Italy", "Italia 🇮🇹"], ["Germany", "Germania 🇩🇪"], ["France", "Franța 🇫🇷"], ["Brazil", "Brazilia 🇧🇷"], ["Argentina", "Argentina 🇦🇷"]] },
                  { label: "Campionat (Ligă)", value: leagueFilter, set: setLeagueFilter, opts: [["Toate", "Orice Competiție"], ["283", "Superliga (RO) 🇷🇴"], ["39", "Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿"], ["140", "La Liga 🇪🇸"], ["135", "Serie A 🇮🇹"], ["78", "Bundesliga 🇩🇪"], ["61", "Ligue 1 🇫🇷"]] },
                  { label: "Vârstă Maximă", value: maxAgeFilter, set: setMaxAgeFilter, opts: [["", "Orice vârstă"], ["19", "Sub 19 ani (U19)"], ["21", "Sub 21 ani (U21)"], ["23", "Sub 23 ani (U23)"], ["26", "Sub 26 ani"], ["30", "Sub 30 ani"]] },
                  { label: "Minutaj Minim", value: minMinutesFilter, set: (v:any)=>setMinMinutesFilter(Number(v)), opts: [[0, "Orice minutaj"], [180, "Minim 180'"], [450, "Minim 450'"], [900, "Minim 900'"], [1500, "Minim 1500'"]] },
                  { label: "Rating SofaScore", value: minRatingFilter, set: setMinRatingFilter, opts: [["0", "Orice notă"], ["6.5", "Peste 6.50"], ["6.8", "Peste 6.80"], ["7.0", "Peste 7.00"], ["7.3", "Peste 7.30 (Elită)"]] },
                  { label: "Înălțime Minimă", value: minHeightFilter, set: (v:any)=>setMinHeightFilter(Number(v)), opts: [[0, "Orice înălțime"], [175, "Minim 175 cm"], [180, "Minim 180 cm"], [185, "Minim 185 cm"], [190, "Minim 190 cm"]] },
                  { label: "Ordonează După", value: sortBy, set: setSortBy, opts: [["rating", "⭐ Rating Mediu"], ["per90", "⚡ G+A / 90'"], ["goals", "⚽ Total Goluri"], ["assists", "🎯 Total Pase Decisive"], ["minutes", "⏱️ Minute Jucate"]] }
                ].map((field, i) => (
                  <div key={i} className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 focus-within:border-emerald-500 transition-colors">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 pl-1">{field.label}</label>
                    <select
                      value={field.value as string|number}
                      onChange={(e) => field.set(e.target.value)}
                      className="w-full bg-slate-900 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none cursor-pointer border border-transparent focus:border-slate-600"
                    >
                      {field.opts.map(([val, text]) => (
                        <option key={String(val)} value={val}>{text}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        {/* ================================================== */}

        <section className="px-4 container mx-auto pb-24 relative z-10">
          
          {loading && searchMode === 'players' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col items-center animate-pulse h-[260px]">
                  <div className="w-full h-12 bg-slate-200 dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-700"></div>
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-300 dark:bg-slate-700 -mt-8 mb-4 border-4 border-white dark:border-slate-900"></div>
                  <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-800 rounded mb-2"></div>
                  <div className="w-1/2 h-3 bg-slate-200 dark:bg-slate-800 rounded mb-auto"></div>
                  <div className="w-full h-10 bg-slate-100 dark:bg-slate-800 mt-4 flex justify-between p-2">
                    <div className="w-1/3 h-full bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="w-1/3 h-full bg-slate-200 dark:bg-slate-700 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {loading && searchMode === 'teams' && (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-500"></div>
            </div>
          )}

          {loadingRoster && (
            <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="w-20 h-20 border-8 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_20px_rgba(16,185,129,0.5)]"></div>
              <h3 className="text-2xl font-black uppercase tracking-widest text-emerald-400 animate-pulse">Analizăm Lotul...</h3>
            </div>
          )}
          
          {error && <div className="text-center text-rose-500 font-black border-4 border-rose-500 bg-rose-950/50 py-6 px-10 rounded-2xl uppercase tracking-widest max-w-lg mx-auto">{error}</div>}
          
          {!showResults && !loading && (
            <div className="text-center py-20">
              <div className="w-24 h-24 mx-auto mb-6 opacity-30 text-emerald-600 dark:text-emerald-500">
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C14.07 4 15.95 4.8 17.38 6.13L15.22 8.3C14.33 7.84 13.26 7.56 12 7.56C10.74 7.56 9.67 7.84 8.78 8.3L6.62 6.13C8.05 4.8 9.93 4 12 4ZM5.6 7.42L7.75 9.58C6.9 10.71 6.36 12.1 6.36 13.62C6.36 14.54 6.54 15.42 6.86 16.23L4.61 17.9C4.22 16.7 4 15.39 4 14C4 11.59 4.61 9.32 5.6 7.42ZM7.92 18.52L10.15 16.85C10.66 17.15 11.23 17.36 11.83 17.47V20C10.37 19.78 9.04 19.26 7.92 18.52ZM12.17 20V17.47C12.77 17.36 13.34 17.15 13.85 16.85L16.08 18.52C14.96 19.26 13.63 19.78 12.17 20ZM17.14 16.23C17.46 15.42 17.64 14.54 17.64 13.62C17.64 12.1 17.1 10.71 16.25 9.58L18.4 7.42C19.39 9.32 20 11.59 20 14C20 15.39 19.78 16.7 19.39 17.9L17.14 16.23ZM15.22 10.13L16.75 8.6C17.53 9.77 18 11.16 18 12.62C18 13.78 17.7 14.86 17.18 15.82L15.65 14.3C15.88 13.78 16 13.22 16 12.62C16 11.71 15.71 10.87 15.22 10.13Z" />
                </svg>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-2">Așteptăm Fluierul de Start...</h3>
              <p className="text-slate-500 font-bold uppercase text-sm">
                Caută {searchMode === 'players' ? 'un jucător' : 'o echipă'} sau setează o tactică din Filtrele Pro.
              </p>
            </div>
          )}

          {showResults && !loading && searchMode === 'players' && displayedPlayers.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 animate-in slide-in-from-bottom-8 duration-700">
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
                    className="relative group bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col items-center cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
                  >
                    <div className="w-full h-12 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex justify-between px-2 pt-2 border-b-2 border-emerald-500">
                       <button
                        onClick={(e) => toggleWatchlist(e, player)}
                        className={`p-1.5 rounded-lg border-2 h-fit transition z-10 bg-white dark:bg-slate-900 ${
                          isWatched
                            ? 'border-amber-500 text-amber-500'
                            : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500 hover:border-amber-500'
                        }`}
                      >
                        <Bookmark className={`w-4 h-4 ${isWatched ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={(e) => toggleComparePlayer(e, player)}
                        className={`p-1.5 rounded-lg border-2 h-fit transition z-10 bg-white dark:bg-slate-900 ${
                          isSelectedForCompare
                            ? 'border-emerald-600 text-emerald-600'
                            : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-emerald-600 hover:border-emerald-600'
                        }`}
                      >
                        {isSelectedForCompare ? <Check className="w-4 h-4" /> : <Scale className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="relative -mt-8 mb-2 z-10">
                      <img
                        src={player.image || GENERIC_USER_IMAGE}
                        alt={player.name}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-md bg-white dark:bg-slate-800"
                        onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }}
                      />
                      {isNationalOnly && (
                        <div className="absolute bottom-0 right-0 bg-yellow-400 text-xs rounded-full w-7 h-7 flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900">
                          🇷🇴
                        </div>
                      )}
                      {metrics.rating > 0 && (
                        <div className="absolute -bottom-1 -left-2 bg-slate-900 text-amber-400 text-[11px] font-black px-2 py-0.5 rounded-lg shadow-md border-2 border-white dark:border-slate-900 flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400" /> {metrics.rating.toFixed(1)}
                        </div>
                      )}
                    </div>
                    
                    <div className="px-3 pb-3 w-full text-center flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1 truncate w-full" title={player.name}>
                          {player.name}
                        </h3>
                        
                        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold truncate w-full uppercase mb-2">
                          {player.team_logo ? (
                            <img src={player.team_logo} alt={teamNameStr} className="w-4 h-4 object-contain" />
                          ) : (
                            <Shield className="w-3.5 h-3.5" />
                          )}
                          <span className="truncate">{teamNameStr}</span>
                        </div>
                      </div>
                      
                      <div className="mt-auto pt-3 border-t-2 border-slate-100 dark:border-slate-800 w-full flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-md border border-emerald-100 dark:border-emerald-800">
                          {player.position || "N/A"}
                        </span>
                        
                        <div className="flex text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 divide-x-2 divide-slate-200 dark:divide-slate-700">
                           <div className="px-2 py-1 text-emerald-600 dark:text-emerald-400" title="Goluri">{metrics.goals}G</div>
                           <div className="px-2 py-1 text-blue-600 dark:text-blue-400" title="Pase Decisive">{metrics.assists}A</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showResults && !loading && searchMode === 'teams' && teams.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {teams.map((team, idx) => (
                <div key={idx} onClick={() => handleTeamClick(team.team_name)} className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-lg hover:shadow-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition-all cursor-pointer group flex flex-col items-center text-center">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 mb-4 bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 shadow-inner group-hover:scale-110 transition-transform">
                    <img src={team.team_logo} alt={team.team_name} className="w-full h-full object-contain drop-shadow-md" />
                  </div>
                  <h4 className="font-black text-sm sm:text-lg text-slate-900 dark:text-white uppercase tracking-tight">{team.team_name}</h4>
                  <div className="mt-2 w-8 h-1 bg-emerald-500 rounded-full group-hover:w-16 transition-all"></div>
                </div>
              ))}
            </div>
          )}

          {/* EMPTY STATE ILUSTRAT CĂUTARE */}
          {showResults && !loading && ((searchMode === 'players' && displayedPlayers.length === 0) || (searchMode === 'teams' && teams.length === 0)) && (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border-2 border-dashed border-slate-300 dark:border-slate-800 max-w-2xl mx-auto relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.05),transparent_50%)]"></div>
              
              <div className="relative z-10 flex justify-center items-center mb-6">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center relative shadow-inner border-4 border-white dark:border-slate-900 z-10">
                  {searchMode === 'players' ? <UserIcon className="w-10 h-10 text-slate-400" /> : <Shield className="w-10 h-10 text-slate-400" />}
                </div>
                <div className="absolute w-32 h-32 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-full animate-[spin_10s_linear_infinite]"></div>
                <div className="absolute w-10 h-10 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center -right-2 top-0 z-20">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                </div>
              </div>
              
              <h3 className="text-2xl font-black uppercase tracking-widest text-slate-800 dark:text-white mb-2 relative z-10">
                {searchMode === 'players' ? 'Niciun Jucător Găsit' : 'Nicio Echipă Găsită'}
              </h3>
              <p className="text-slate-500 font-bold max-w-sm mx-auto relative z-10">
                Lărgește aria de selecție. Resetează filtrele din tabla tactică sau verifică dacă numele este scris corect.
              </p>
            </div>
          )}
        </section>
      </div>

      {compareList.length > 0 && (
      <div className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-[99998] bg-slate-950 px-4 py-3 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-2 border-emerald-500 flex items-center gap-4 max-w-xl w-[95%] justify-between animate-in slide-in-from-bottom-5">          
          <div className="flex items-center gap-3 overflow-hidden">
            <Scale className="w-6 h-6 text-emerald-400 shrink-0 animate-pulse" />
            <div className="flex items-center gap-2 overflow-hidden">
              {compareList.map((p) => (
                <div key={p._id} className="flex items-center gap-2 bg-slate-800 border border-slate-600 pl-1 pr-2 py-1 rounded-xl text-xs font-black uppercase tracking-wider text-white truncate">
                  <img src={p.image || GENERIC_USER_IMAGE} alt={p.name} className="w-6 h-6 rounded-md object-cover" />
                  <span className="truncate max-w-[80px] sm:max-w-[120px]">{p.name}</span>
                  <button
                    onClick={(e) => toggleComparePlayer(e, p)}
                    className="text-slate-400 hover:text-rose-400 ml-1 bg-slate-900 p-0.5 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {compareList.length === 1 && (
                <span className="text-[10px] sm:text-xs text-emerald-400 font-bold uppercase tracking-widest hidden sm:inline border border-dashed border-emerald-500/50 px-2 py-1 rounded-lg">
                  + Selectează Adversar
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              disabled={compareList.length < 2}
              onClick={() => setShowCompareModal(true)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition border-b-4 ${
                compareList.length === 2
                  ? 'bg-emerald-500 border-emerald-700 text-slate-950 hover:bg-emerald-400 hover:translate-y-[2px] hover:border-b-2'
                  : 'bg-slate-800 border-slate-900 text-slate-500 cursor-not-allowed'
              }`}
            >
              VS ({compareList.length}/2)
            </button>
          </div>
        </div>
      )}

      {selectedPlayer && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setSelectedPlayer(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[92vh] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border-4 border-emerald-600/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-slate-900 shrink-0 px-4 sm:px-8 py-6 sm:py-8 border-b-4 border-emerald-500 overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_20px,#10b981_20px,#10b981_22px),repeating-linear-gradient(90deg,transparent,transparent_20px,#10b981_20px,#10b981_22px)]"></div>
              
              <button
                onClick={() => setSelectedPlayer(null)}
                className="absolute top-4 right-4 bg-slate-950/50 border border-white/20 hover:bg-rose-500 hover:border-rose-500 rounded-full p-2 text-white transition-colors z-20"
              >
                <X className="w-5 h-5 font-bold" />
              </button>
              
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-6 relative z-10">
                <img
                  src={selectedPlayer.image || GENERIC_USER_IMAGE}
                  alt={selectedPlayer.name}
                  className="w-32 h-32 md:w-40 md:h-40 rounded-2xl object-cover border-4 border-white shadow-2xl bg-slate-800 shrink-0"
                  onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }}
                />
                
                <div className="text-white text-center sm:text-left flex-1 min-w-0">
                  <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter break-words whitespace-normal leading-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{selectedPlayer.name}</h2>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                    {selectedPlayer.team_logo && (
                      <img src={selectedPlayer.team_logo} alt="logo" className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-md p-1 object-contain" />
                    )}
                    <span className="font-bold text-lg sm:text-xl text-emerald-400 uppercase tracking-widest truncate">{selectedPlayer.team_name || selectedPlayer.team}</span>
                  </div>
                </div>

                <div className="flex sm:flex-col gap-2 shrink-0 mt-4 sm:mt-0">
                  <button
                    onClick={(e) => toggleWatchlist(e, selectedPlayer)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 border-b-4 transition ${
                      watchlistIds.includes(selectedPlayer._id)
                        ? 'bg-amber-500 border-amber-700 text-slate-950'
                        : 'bg-white border-slate-300 text-slate-900 hover:bg-emerald-50'
                    }`}
                  >
                    <Bookmark className="w-4 h-4 fill-current" />
                    {watchlistIds.includes(selectedPlayer._id) ? 'În Listă' : 'Listă'}
                  </button>
                  <button
                    onClick={(e) => {
                      toggleComparePlayer(e, selectedPlayer);
                      setSelectedPlayer(null);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-800 border-b-4 border-slate-950 hover:bg-slate-700 text-white flex items-center gap-2 transition"
                  >
                    <Scale className="w-4 h-4" /> Compară
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 dark:bg-slate-950">
              
              <div className="flex flex-wrap justify-center sm:justify-start gap-3 mb-8">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  <Globe className="w-4 h-4 text-emerald-500" />
                  {selectedPlayer.nationality || "N/A"}
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  <UserIcon className="w-4 h-4 text-emerald-500" />
                  {selectedPlayer.age ? `${selectedPlayer.age} ANI` : "N/A"}
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  {selectedPlayer.height || "-"} / {selectedPlayer.weight || "-"}
                </div>
                <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/40 px-4 py-2 rounded-xl border-2 border-emerald-300 dark:border-emerald-700 text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  {selectedPlayer.position || "N/A"}
                </div>
              </div>

              <h3 className="text-lg font-black uppercase tracking-widest text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b-2 border-emerald-500/20 pb-2">
                <Trophy className="w-6 h-6 text-amber-500" /> Cifrele Sezonului
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-10">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-center flex flex-col justify-center">
                  <span className="block text-3xl font-black text-slate-900 dark:text-white">{selectedPlayer.statistics_summary?.total_appearances || 0}</span>
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">Meciuri</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-center flex flex-col justify-center border-b-4 border-b-emerald-500">
                  <span className="block text-3xl font-black text-emerald-600 dark:text-emerald-400">{selectedPlayer.statistics_summary?.total_goals || 0}</span>
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">Goluri</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-center flex flex-col justify-center border-b-4 border-b-blue-500">
                  <span className="block text-3xl font-black text-blue-600 dark:text-blue-400">{selectedPlayer.statistics_summary?.total_assists || 0}</span>
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">Pase Decisive</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-center flex flex-col justify-center">
                  <span className="block text-3xl font-black text-slate-900 dark:text-white">{selectedPlayer.statistics_summary?.minutes_played || 0}'</span>
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">Minute</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-amber-300 dark:border-amber-700 text-center flex flex-col justify-center bg-amber-50/50 dark:bg-amber-900/10">
                  <span className="block text-3xl font-black text-amber-500 flex items-center justify-center gap-1">
                    {selectedPlayer.statistics_summary?.rating ? parseFloat(selectedPlayer.statistics_summary.rating).toFixed(2) : "-"}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-amber-600/80 font-bold mt-1">Rating SofaScore</span>
                </div>
              </div>

              {(() => {
                const m = computeScoutingMetrics(selectedPlayer);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900 p-6 rounded-3xl shadow-xl mb-10 border-4 border-emerald-600/30">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Analiza Scouter (Radar)
                      </h4>
                      <PlayerRadarChart primaryPlayer={selectedPlayer} />
                    </div>

                    <div className="space-y-4 flex flex-col justify-center">
                      <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Randament Raportat la 90 Minute
                      </h4>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-slate-800 p-4 rounded-2xl border-2 border-emerald-500/30 text-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Goluri / 90'</span>
                          <p className="text-3xl font-black text-white mt-1">{m.goalsPer90}</p>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-2xl border-2 border-blue-500/30 text-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Assist / 90'</span>
                          <p className="text-3xl font-black text-white mt-1">{m.assistsPer90}</p>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-2xl border-2 border-amber-500/30 text-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Contribuții (G+A)/90'</span>
                          <p className="text-3xl font-black text-amber-400 mt-1">{m.contributionsPer90}</p>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-2xl border-2 border-slate-700 text-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Min/Contribuție</span>
                          <p className="text-3xl font-black text-white mt-1">
                            {m.minsPerContribution > 0 ? `${m.minsPerContribution}'` : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <h3 className="text-lg font-black uppercase tracking-widest text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b-2 border-emerald-500/20 pb-2">
                <MapPin className="w-6 h-6 text-emerald-500" /> Situație Competițională
              </h3>
              
              {(!selectedPlayer.detailed_stats || selectedPlayer.detailed_stats.length === 0) ? (
                <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-sm">
                  DATE COMPETIȚIONALE INDISPONIBILE 🚫
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800/80 border-b-2 border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-4 font-black">Competiție</th>
                          <th className="px-4 py-4 font-black text-center">Meciuri</th>
                          <th className="px-4 py-4 font-black text-center">Goluri</th>
                          <th className="px-4 py-4 font-black text-center">Pase</th>
                          <th className="px-4 py-4 font-black text-center hidden sm:table-cell">Minute</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedPlayer.detailed_stats.map((stat, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-4 font-bold text-slate-900 dark:text-white flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 uppercase">
                              {stat.competition}
                              <span className="text-[9px] font-black px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded tracking-widest w-fit">
                                {stat.type}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center font-black text-slate-800 dark:text-slate-200">{stat.appearances}</td>
                            <td className="px-4 py-4 text-center font-black text-emerald-600 dark:text-emerald-400">{stat.goals}</td>
                            <td className="px-4 py-4 text-center font-black text-blue-600 dark:text-blue-400">{stat.assists}</td>
                            <td className="px-4 py-4 text-center font-bold text-slate-500 hidden sm:table-cell">{stat.minutes}'</td>
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

      {showCompareModal && compareList.length === 2 && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setShowCompareModal(false)}
        >
          <div
            className="bg-slate-900 w-full max-w-4xl max-h-[95vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border-4 border-emerald-600/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-950 text-white p-4 sm:p-6 flex items-center justify-between border-b-2 border-emerald-600/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                </div>
                <h2 className="text-base sm:text-2xl font-black uppercase tracking-widest">
                  MECI DIRECT: <span className="text-emerald-400">Analiză</span>
                </h2>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="p-2.5 bg-slate-800 hover:bg-rose-500 hover:border-rose-500 border border-slate-700 rounded-full transition text-white"
              >
                <X className="w-5 h-5 font-bold" />
              </button>
            </div>

            {(() => {
              const p1 = compareList[0];
              const p2 = compareList[1];
              const m1 = computeScoutingMetrics(p1);
              const m2 = computeScoutingMetrics(p2);

              const rows = [
                { label: "Rating SofaScore", v1: m1.rating, v2: m2.rating, format: (v: number) => (v > 0 ? v.toFixed(2) : "-") },
                { label: "Meciuri Jucate", v1: m1.apps, v2: m2.apps, format: (v: number) => String(v) },
                { label: "Minute Jucate", v1: m1.minutes, v2: m2.minutes, format: (v: number) => `${v}'` },
                { label: "Total Goluri", v1: m1.goals, v2: m2.goals, format: (v: number) => String(v) },
                { label: "Pase Decisive", v1: m1.assists, v2: m2.assists, format: (v: number) => String(v) },
                { label: "Goluri / 90'", v1: m1.goalsPer90, v2: m2.goalsPer90, format: (v: number) => String(v) },
                { label: "Contribuții / 90'", v1: m1.contributionsPer90, v2: m2.contributionsPer90, format: (v: number) => String(v) }
              ];

              return (
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-900 space-y-6">
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-4 items-center bg-slate-800 p-4 sm:p-6 rounded-3xl border-2 border-slate-700 relative overflow-hidden">
                     <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-slate-700/50 skew-x-[-15deg]"></div>

                    <div className="flex flex-col items-center text-center relative z-10">
                      <img src={p1.image || GENERIC_USER_IMAGE} alt={p1.name} className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)] mb-3 bg-white" />
                      <h3 className="font-black text-sm sm:text-xl text-white uppercase tracking-tight">{p1.name}</h3>
                      <span className="text-[10px] sm:text-xs font-black tracking-widest text-emerald-400 mt-1 uppercase bg-emerald-900/40 px-2 py-1 rounded">{p1.team || p1.team_name}</span>
                    </div>
                    
                    <div className="relative z-10 flex flex-col items-center justify-center">
                       <span className="text-3xl sm:text-5xl font-black italic text-slate-700 tracking-tighter">VS</span>
                    </div>

                    <div className="flex flex-col items-center text-center relative z-10">
                      <img src={p2.image || GENERIC_USER_IMAGE} alt={p2.name} className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] mb-3 bg-white" />
                      <h3 className="font-black text-sm sm:text-xl text-white uppercase tracking-tight">{p2.name}</h3>
                      <span className="text-[10px] sm:text-xs font-black tracking-widest text-blue-400 mt-1 uppercase bg-blue-900/40 px-2 py-1 rounded">{p2.team || p2.team_name}</span>
                    </div>
                  </div>

                  <div className="bg-slate-800 p-4 sm:p-6 rounded-3xl border-2 border-slate-700 flex flex-col items-center">
                    <div className="flex items-center gap-6 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-4">
                      <span className="flex items-center gap-2 text-yellow-400">
                        <span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block shadow-[0_0_10px_#facc15]"></span> {p1.name}
                      </span>
                      <span className="flex items-center gap-2 text-blue-400">
                        <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block shadow-[0_0_10px_#3b82f6]"></span> {p2.name}
                      </span>
                    </div>
                    <PlayerRadarChart primaryPlayer={p1} secondaryPlayer={p2} />
                  </div>

                  <div className="bg-slate-800 p-4 sm:p-8 rounded-3xl border-2 border-slate-700 space-y-5">
                    {rows.map((r, idx) => {
                      const total = r.v1 + r.v2;
                      const p1Pct = total > 0 ? Math.round((r.v1 / total) * 100) : 50;
                      const p2Pct = 100 - p1Pct;
                      const p1Wins = r.v1 > r.v2;
                      const p2Wins = r.v2 > r.v1;
                      const isTie = r.v1 === r.v2;

                      return (
                        <div key={idx} className="space-y-2">
                          <div className="flex justify-between text-xs sm:text-sm font-black uppercase tracking-widest">
                            <span className={p1Wins ? "text-yellow-400" : (isTie ? "text-slate-400" : "text-slate-500")}>
                              {r.format(r.v1)}
                            </span>
                            <span className="text-slate-300">
                              {r.label}
                            </span>
                            <span className={p2Wins ? "text-blue-400" : (isTie ? "text-slate-400" : "text-slate-500")}>
                              {r.format(r.v2)}
                            </span>
                          </div>
                          
                          <div className="w-full h-3 sm:h-4 bg-slate-900 rounded-sm overflow-hidden flex border border-slate-700">
                            <div style={{ width: `${p1Pct}%` }} className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-full transition-all relative">
                               {p1Wins && <div className="absolute right-0 top-0 bottom-0 w-1 bg-white"></div>}
                            </div>
                            <div style={{ width: `${p2Pct}%` }} className="bg-gradient-to-l from-blue-700 to-blue-500 h-full transition-all relative">
                               {p2Wins && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white"></div>}
                            </div>
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