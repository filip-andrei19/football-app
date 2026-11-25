import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Globe, Shield, Star, Activity, X, Trophy, MapPin,
  User as UserIcon, SlidersHorizontal, Scale, Bookmark,
  TrendingUp, RotateCcw, Check, AlertTriangle, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm, useStore } from '@tanstack/react-form';

const GENERIC_USER_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
const API_URL = (import.meta as any).env?.VITE_API_URL || 'https://football-backend-m2a4.onrender.com';

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

interface HomeProps {
  user: { name: string; email: string };
  onNavigate: (section: any) => void;
}

const sanitizeTeamName = (
  playerOrName?: Player | string | null,
  fallback = "Club necunoscut"
): string => {
  const candidates: Array<string | undefined> =
    typeof playerOrName === "string"
      ? [playerOrName]
      : [
          playerOrName?.team_name,
          playerOrName?.team,
          playerOrName?.statistics_summary?.team_name,
        ];

  for (const raw of candidates) {
    const cleaned = String(raw || "").trim();
    if (cleaned && !/^\d+$/.test(cleaned)) {
      return cleaned;
    }
  }

  return fallback;
};

const hasValidImageUrl = (url?: string): boolean => {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
};

const parseHeightCm = (heightStr?: string): number => {
  if (!heightStr) return 0;
  const num = parseInt(heightStr.replace(/\D/g, ''), 10);
  return isNaN(num) ? 0 : num;
};

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
  const contributionsPer90 = Number((goalsPer90 + assistsPer90).toFixed(2));
  const minsPerContribution = (goals + assists) > 0 ? Math.round(minutes / (goals + assists)) : 0;

  let primaryScore = 20;
  let primaryLabel = "Finalizare";
  if (isDefensive) {
    primaryLabel = "Defensivă";
    primaryScore = Math.min(99, Math.max(20, Math.round(35 + (rating > 6.8 ? (rating - 6.8) * 40 : 0) + (Math.min(apps, 30) * 0.8))));
  } else {
    primaryScore = Math.min(99, Math.max(20, Math.round(25 + (goalsPer90 * 75) + (Math.min(goals, 20) * 1.5))));
  }

  const creativityScore = Math.min(99, Math.max(20, Math.round(25 + (assistsPer90 * 100) + (Math.min(assists, 15) * 1.5))));
  const consistencyScore = Math.min(99, Math.max(25, Math.round(20 + (Math.min(apps, 38) * 1.2) + (Math.min(minutes, 3000) / 75))));

  let formScore = 30;
  if (rating > 5.5) {
    formScore = Math.min(99, Math.max(30, Math.round(30 + ((rating - 6.0) * 35))));
  }

  const impactScore = Math.min(99, Math.max(25, Math.round((formScore * 0.4) + (contributionsPer90 * 55) + 15)));

  return {
    goals, assists, apps, minutes, rating, goalsPer90, assistsPer90, contributionsPer90, minsPerContribution,
    radar: [
      { label: primaryLabel, value: primaryScore },
      { label: "Creație", value: creativityScore },
      { label: "Constanță", value: consistencyScore },
      { label: "Formă", value: formScore },
      { label: "Impact", value: impactScore }
    ]
  };
};

const PlayerRadarChart = ({ primaryPlayer, secondaryPlayer }: { primaryPlayer: Player; secondaryPlayer?: Player | null; }) => {
  const m1 = computeScoutingMetrics(primaryPlayer);
  const m2 = secondaryPlayer ? computeScoutingMetrics(secondaryPlayer) : null;

  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 640 : false;
  const size = isMobile ? 190 : 230;
  const center = size / 2;
  const radius = isMobile ? 60 : 78;
  const axes = m1.radar.map(r => r.label);

  const getCoordinates = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
    const r = (value / 100) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  const buildPolygonPoints = (radarData: { label: string; value: number }[]) =>
    radarData.map((item, idx) => {
      const { x, y } = getCoordinates(idx, item.value);
      return `${x},${y}`;
    }).join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {[25, 50, 75, 100].map((level) => {
          const pts = axes.map((_, idx) => {
            const { x, y } = getCoordinates(idx, level);
            return `${x},${y}`;
          }).join(" ");
          return (
            <polygon key={level} points={pts} fill="none" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="1" strokeDasharray={level < 100 ? "3 3" : undefined} />
          );
        })}

        {axes.map((_, idx) => {
          const end = getCoordinates(idx, 100);
          return (
            <line key={idx} x1={center} y1={center} x2={end.x} y2={end.y} stroke="rgba(148, 163, 184, 0.2)" strokeWidth="1" />
          );
        })}

        {m2 && <polygon points={buildPolygonPoints(m2.radar)} fill="rgba(59, 130, 246, 0.22)" stroke="#3b82f6" strokeWidth="2" />}
        <polygon points={buildPolygonPoints(m1.radar)} fill="rgba(16, 185, 129, 0.22)" stroke="#10b981" strokeWidth="2" />

        {m1.radar.map((item, idx) => {
          const pt1 = getCoordinates(idx, item.value);
          const labelPos = getCoordinates(idx, 124);
          return (
            <g key={idx}>
              <circle cx={pt1.x} cy={pt1.y} r={isMobile ? "3" : "3.5"} fill="#10b981" stroke="#0B0F14" strokeWidth="1.5" />
              <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="middle" className="text-[9px] sm:text-[10px] font-medium fill-slate-500 dark:fill-slate-400">
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

  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamResult[]>([]);

  const [selectedTeam, setSelectedTeam] = useState<SquadData | null>(null);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const [showProFilters, setShowProFilters] = useState(false);

  const filterForm = useForm({
    defaultValues: {
      searchTerm: "",
      searchMode: 'players' as 'players' | 'teams',
      positionFilter: "Toate",
      maxAgeFilter: "",
      minHeightFilter: "0",
      minMinutesFilter: "0",
      minGoalsFilter: "0",
      minRatingFilter: "0",
      nationalityFilter: "Toate",
      leagueFilter: "Toate",
      sortBy: 'rating' as 'rating' | 'per90' | 'goals' | 'assists' | 'minutes',
      onlyWatchlist: false
    }
  });

  const formValues = useStore(filterForm.store, (state) => state.values);

  const [watchlistIds, setWatchlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('scout_watchlist_ids');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [watchedPlayersData, setWatchedPlayersData] = useState<Player[]>([]);
  const [compareList, setCompareList] = useState<Player[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [greeting, setGreeting] = useState("Salut");

  useEffect(() => {
    const shouldHide = Boolean(selectedPlayer);
    window.dispatchEvent(new CustomEvent('toggle-floating-bars', { detail: shouldHide }));
    return () => {
      window.dispatchEvent(new CustomEvent('toggle-floating-bars', { detail: false }));
    };
  }, [selectedPlayer]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("Bună dimineața");
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
      }).catch(() => {});
  }, [user?.email]);

  const hasActiveProFilters =
    formValues.positionFilter !== "Toate" ||
    formValues.maxAgeFilter !== "" ||
    parseInt(formValues.minHeightFilter) > 0 ||
    parseInt(formValues.minMinutesFilter) > 0 ||
    parseInt(formValues.minGoalsFilter) > 0 ||
    formValues.nationalityFilter !== "Toate" ||
    formValues.leagueFilter !== "Toate" ||
    parseFloat(formValues.minRatingFilter) > 0;

  useEffect(() => {
    const fetchResults = async () => {
      if (formValues.onlyWatchlist && formValues.searchMode === 'players') {
        if (user?.email) {
          setLoading(true);
          try {
            const res = await fetch(`${API_URL}/api/users/watchlist/${encodeURIComponent(user.email)}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.watchedPlayers)) {
              setPlayers(data.watchedPlayers);
            }
          } catch (e) { console.error(e); }
          finally { setLoading(false); }
        }
        return;
      }

      if (!formValues.searchTerm.trim() && !hasActiveProFilters && !showProFilters) {
        setPlayers([]);
        setTeams([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        if (formValues.searchMode === 'teams') {
          if (!formValues.searchTerm.trim()) {
            setTeams([]);
            setLoading(false);
            return;
          }
          const response = await fetch(`${API_URL}/api/sport/teams/search?q=${encodeURIComponent(formValues.searchTerm)}`);
          if (!response.ok) throw new Error(`Eroare server: ${response.status}`);
          const data = await response.json();
          setTeams(data);
          setPlayers([]);
        } else {
          const params = new URLSearchParams();
          if (formValues.searchTerm.trim()) params.append('search', formValues.searchTerm.trim());
          if (formValues.positionFilter !== 'Toate') params.append('position', formValues.positionFilter);
          if (formValues.maxAgeFilter) params.append('maxAge', formValues.maxAgeFilter);

          if (parseInt(formValues.minMinutesFilter) > 0) params.append('minMinutes', formValues.minMinutesFilter);
          if (parseInt(formValues.minGoalsFilter) > 0) params.append('minGoals', formValues.minGoalsFilter);
          if (parseFloat(formValues.minRatingFilter) > 0) params.append('minRating', formValues.minRatingFilter);

          if (formValues.nationalityFilter !== 'Toate') params.append('nationality', formValues.nationalityFilter);
          if (formValues.leagueFilter !== 'Toate') params.append('league_id', formValues.leagueFilter);
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
  }, [formValues, showProFilters, hasActiveProFilters, user?.email]);

  const displayedPlayers = useMemo(() => {
    return players
      .filter((p) => {
        if (formValues.onlyWatchlist && !watchlistIds.includes(p._id)) return false;

        if (formValues.positionFilter !== "Toate") {
          const pos = (p.position || "").toLowerCase();
          if (formValues.positionFilter === "Portari" && !(pos.includes("goalkeeper") || pos.includes("portar"))) return false;
          if (formValues.positionFilter === "Fundași" && !(pos.includes("defender") || pos.includes("back") || pos.includes("funda"))) return false;
          if (formValues.positionFilter === "Mijlocași" && !(pos.includes("midfield") || pos.includes("mijloca"))) return false;
          if (formValues.positionFilter === "Atacanți" && !(pos.includes("forward") || pos.includes("striker") || pos.includes("wing") || pos.includes("ataca") || pos.includes("attack"))) return false;
        }

        if (formValues.nationalityFilter !== "Toate") {
          const nat = (p.nationality || "").toLowerCase();
          if (!nat.includes(formValues.nationalityFilter.toLowerCase())) return false;
        }

        if (formValues.leagueFilter !== "Toate") {
          const lId = p.league_id ? p.league_id.toString() : "";
          if (lId !== formValues.leagueFilter) return false;
        }

        if (formValues.maxAgeFilter && p.age && p.age > Number(formValues.maxAgeFilter)) return false;
        if (parseInt(formValues.minHeightFilter) > 0 && parseHeightCm(p.height) < parseInt(formValues.minHeightFilter)) return false;
        if (parseInt(formValues.minMinutesFilter) > 0 && (p.statistics_summary?.minutes_played || 0) < parseInt(formValues.minMinutesFilter)) return false;
        if (parseInt(formValues.minGoalsFilter) > 0 && (p.statistics_summary?.total_goals || 0) < parseInt(formValues.minGoalsFilter)) return false;
        if (parseFloat(formValues.minRatingFilter) > 0 && parseFloat(p.statistics_summary?.rating || "0") < parseFloat(formValues.minRatingFilter)) return false;
        return true;
      })
      .sort((a, b) => {
        const mA = computeScoutingMetrics(a);
        const mB = computeScoutingMetrics(b);
        if (formValues.sortBy === 'per90') return mB.contributionsPer90 - mA.contributionsPer90 || mB.goals - mA.goals;
        if (formValues.sortBy === 'goals') return mB.goals - mA.goals || mB.rating - mA.rating;
        if (formValues.sortBy === 'assists') return mB.assists - mA.assists || mB.rating - mA.rating;
        if (formValues.sortBy === 'minutes') return mB.minutes - mA.minutes;
        return mB.rating - mA.rating || mB.goals - mA.goals;
      });
  }, [players, watchlistIds, formValues]);

  const toggleWatchlist = async (e: React.MouseEvent, player: Player) => {
    e.stopPropagation();
    const playerId = player._id;
    const exists = watchlistIds.includes(playerId);
    const updated = exists ? watchlistIds.filter(id => id !== playerId) : [...watchlistIds, playerId];
    setWatchlistIds(updated);
    localStorage.setItem('scout_watchlist_ids', JSON.stringify(updated));

    if (!exists) setWatchedPlayersData(prev => [...prev.filter(p => p._id !== playerId), player]);
    else setWatchedPlayersData(prev => prev.filter(p => p._id !== playerId));

    if (user?.email) {
      try {
        await fetch(`${API_URL}/api/users/watchlist/toggle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, playerId }) });
      } catch (err) { console.error(err); }
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
    filterForm.setFieldValue('positionFilter', 'Toate');
    filterForm.setFieldValue('maxAgeFilter', '');
    filterForm.setFieldValue('minHeightFilter', "0");
    filterForm.setFieldValue('minMinutesFilter', "0");
    filterForm.setFieldValue('minGoalsFilter', "0");
    filterForm.setFieldValue('minRatingFilter', '0');
    filterForm.setFieldValue('nationalityFilter', 'Toate');
    filterForm.setFieldValue('leagueFilter', 'Toate');
    filterForm.setFieldValue('sortBy', 'rating');
    filterForm.setFieldValue('onlyWatchlist', false);
  };

  const handleTeamClick = async (teamName: string) => {
    const cleanTeam = sanitizeTeamName(teamName, "");
    if (!cleanTeam) {
      toast.error("Numele echipei nu este disponibil pentru acest rezultat.");
      return;
    }
    setLoadingRoster(true);
    setSelectedTeam(null);
    try {
      const res = await fetch(`${API_URL}/api/sport/teams/${encodeURIComponent(cleanTeam)}/roster`);
      if (!res.ok) throw new Error("Eroare preluare lot");
      const data = await res.json();
      setSelectedTeam(data);
    } catch (err) {
      console.error(err);
      toast.error("Nu am putut încărca lotul echipei.");
    } finally {
      setLoadingRoster(false);
    }
  };

  const showResults = formValues.searchTerm.trim().length > 0 || hasActiveProFilters || showProFilters || formValues.onlyWatchlist;
  const firstName = user?.name ? user.name.split(' ')[0] : 'Scouter';

  return (
    <div className="min-h-[75vh] pb-16">
      {/* Modal Lot Echipă */}
      {selectedTeam && createPortal(
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4" onClick={() => setSelectedTeam(null)}>
          <div className="bg-white dark:bg-[#0B0F14] rounded-xl w-full max-w-3xl max-h-[88vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-white/[0.08]" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-50 dark:bg-[#11161D] px-4 py-4 flex items-center justify-between shrink-0 border-b border-slate-200 dark:border-white/[0.07]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] p-1.5 rounded-lg shrink-0 flex items-center justify-center">
                  {hasValidImageUrl(selectedTeam.teamInfo.logo) ? (
                    <img src={selectedTeam.teamInfo.logo} alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <Shield className="w-5 h-5 text-emerald-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white truncate">
                    {sanitizeTeamName(selectedTeam.teamInfo.name, "Echipă")}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Lot oficial • {selectedTeam.teamInfo.totalPlayers} jucători
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeam(null)}
                aria-label="Închide lotul echipei"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-3 sm:p-5 space-y-4 flex-1">
              {([
                { title: "Portari", data: selectedTeam.squad.Goalkeepers, accent: "text-amber-500" },
                { title: "Fundași", data: selectedTeam.squad.Defenders, accent: "text-blue-500" },
                { title: "Mijlocași", data: selectedTeam.squad.Midfielders, accent: "text-emerald-500" },
                { title: "Atacanți", data: selectedTeam.squad.Attackers, accent: "text-rose-500" }
              ]).map((section, idx) => section.data.length > 0 && (
                <div key={idx} className="bg-white dark:bg-[#11161D] rounded-xl border border-slate-200 dark:border-white/[0.07] overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]">
                    <h3 className={`font-semibold text-xs ${section.accent}`}>{section.title}</h3>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                    {section.data.map(p => {
                      const isSelectedForCompare = compareList.some(item => item._id === p._id);
                      return (
                        <div key={p._id} onClick={() => setSelectedPlayer(p)} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors gap-2 cursor-pointer">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <img src={p.image || GENERIC_USER_IMAGE} alt={p.name} className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-white/[0.1] shrink-0 bg-white" onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }} />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate" title={p.name}>{p.name}</p>
                              <div className="flex gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                {p.age && <span className="shrink-0 tabular-nums">{p.age} ani</span>}
                                {p.nationality && <span className="truncate">• {p.nationality}</span>}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => toggleComparePlayer(e, p)}
                            title="Compară jucătorul"
                            className={`p-1.5 rounded-lg border transition-colors shrink-0 cursor-pointer ${
                              isSelectedForCompare
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white dark:bg-white/[0.04] text-slate-400 border-slate-200 dark:border-white/[0.08] hover:border-emerald-500/50 hover:text-emerald-500'
                            }`}
                          >
                            {isSelectedForCompare ? <Check className="w-3.5 h-3.5" /> : <Scale className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Header & Căutare */}
      <div className="space-y-6">
        <section className="max-w-3xl mx-auto text-center space-y-4 pt-2 sm:pt-4">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {greeting}, <span className="text-emerald-600 dark:text-emerald-400">{firstName}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Caută jucători sau echipe în baza de date de scouting.
            </p>
          </div>

          <div className="w-full max-w-2xl mx-auto space-y-3">
            {/* Switch Jucători / Echipe */}
            <div className="flex justify-center">
              <div className="bg-slate-200/70 dark:bg-white/[0.04] p-1 rounded-lg inline-flex border border-slate-200 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => { filterForm.setFieldValue('searchMode', 'players'); filterForm.setFieldValue('searchTerm', ''); }}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    formValues.searchMode === 'players'
                      ? 'bg-white dark:bg-[#1A222C] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Jucători
                </button>
                <button
                  type="button"
                  onClick={() => { filterForm.setFieldValue('searchMode', 'teams'); filterForm.setFieldValue('searchTerm', ''); filterForm.setFieldValue('onlyWatchlist', false); setShowProFilters(false); }}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    formValues.searchMode === 'teams'
                      ? 'bg-white dark:bg-[#1A222C] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Echipe
                </button>
              </div>
            </div>

            {/* Bară de căutare */}
            <div className="relative bg-white dark:bg-[#11161D] border border-slate-200 dark:border-white/[0.08] focus-within:border-emerald-500/60 rounded-xl flex items-center transition-colors shadow-sm">
              <Search className="w-4 h-4 text-slate-400 ml-3.5 shrink-0" />

              <filterForm.Field name="searchTerm">
                {(field) => (
                  <input
                    type="text"
                    placeholder={formValues.searchMode === 'players' ? "Caută după nume (ex: Olaru, Drăgușin, Baena)..." : "Caută echipă (ex: FCSB, CFR Cluj, Rapid)..."}
                    className="w-full py-3 px-3 text-sm bg-transparent border-0 focus:ring-0 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              </filterForm.Field>

              {formValues.searchTerm && (
                <button
                  type="button"
                  onClick={() => filterForm.setFieldValue('searchTerm', '')}
                  className="p-1.5 mr-2 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Acțiuni Filtre & Watchlist */}
            {formValues.searchMode === 'players' && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowProFilters(!showProFilters);
                    if (formValues.onlyWatchlist) filterForm.setFieldValue('onlyWatchlist', false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border flex items-center gap-1.5 cursor-pointer ${
                    showProFilters || hasActiveProFilters
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-white dark:bg-[#11161D] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.07] hover:border-slate-300 dark:hover:border-white/[0.15]'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filtre avansate
                </button>

                <button
                  type="button"
                  onClick={() => {
                    filterForm.setFieldValue('onlyWatchlist', !formValues.onlyWatchlist);
                    filterForm.setFieldValue('searchMode', 'players');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border flex items-center gap-1.5 cursor-pointer ${
                    formValues.onlyWatchlist
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'bg-white dark:bg-[#11161D] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.07] hover:border-slate-300 dark:hover:border-white/[0.15]'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${formValues.onlyWatchlist ? 'fill-current' : ''}`} />
                  Listă scouting ({watchlistIds.length})
                </button>
              </div>
            )}
          </div>

          {/* Panou Filtre Avansate */}
          {formValues.searchMode === 'players' && showProFilters && (
            <div className="mt-4 max-w-4xl mx-auto bg-white dark:bg-[#11161D] border border-slate-200 dark:border-white/[0.07] rounded-xl p-4 sm:p-5 text-left">
              <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-200 dark:border-white/[0.07]">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-semibold text-xs text-slate-900 dark:text-white">
                    Filtre scouting
                  </span>
                </div>
                <button
                  type="button"
                  onClick={resetProFilters}
                  className="text-xs font-medium text-rose-500 hover:text-rose-400 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Resetează
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { name: "positionFilter", label: "Poziție", opts: [["Toate", "Toate"], ["Portari", "Portari"], ["Fundași", "Fundași"], ["Mijlocași", "Mijlocași"], ["Atacanți", "Atacanți"]] },
                  { name: "nationalityFilter", label: "Naționalitate", opts: [["Toate", "Oricare"], ["Romania", "România"], ["England", "Anglia"], ["Spain", "Spania"], ["Italy", "Italia"], ["Germany", "Germania"], ["France", "Franța"], ["Brazil", "Brazilia"], ["Argentina", "Argentina"]] },
                  { name: "leagueFilter", label: "Campionat", opts: [["Toate", "Oricare"], ["283", "Superliga RO"], ["39", "Premier League"], ["140", "La Liga"], ["135", "Serie A"], ["78", "Bundesliga"], ["61", "Ligue 1"]] },
                  { name: "maxAgeFilter", label: "Vârstă max", opts: [["", "Oricare"], ["19", "Sub 19 ani"], ["21", "Sub 21 ani"], ["23", "Sub 23 ani"], ["26", "Sub 26 ani"], ["30", "Sub 30 ani"]] },
                  { name: "minMinutesFilter", label: "Minute min", opts: [["0", "Oricare"], ["180", "180'"], ["450", "450'"], ["900", "900'"], ["1500", "1500'"]] },
                  { name: "minRatingFilter", label: "Rating min", opts: [["0", "Oricare"], ["6.5", "> 6.50"], ["6.8", "> 6.80"], ["7.0", "> 7.00"], ["7.3", "> 7.30"]] },
                  { name: "minHeightFilter", label: "Înălțime min", opts: [["0", "Oricare"], ["175", "175 cm"], ["180", "180 cm"], ["185", "185 cm"], ["190", "190 cm"]] },
                  { name: "sortBy", label: "Ordonează după", opts: [["rating", "Rating"], ["per90", "G+A / 90'"], ["goals", "Goluri"], ["assists", "Pase decisive"], ["minutes", "Minute"]] }
                ].map((field, i) => (
                  <filterForm.Field key={i} name={field.name as any}>
                    {(api) => (
                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{field.label}</label>
                        <select
                          value={String(api.state.value)}
                          onChange={(e) => api.handleChange(e.target.value as any)}
                          className="w-full bg-slate-50 dark:bg-[#0B0F14] rounded-lg px-2.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 outline-none cursor-pointer border border-slate-200 dark:border-white/[0.08] focus:border-emerald-500/60"
                        >
                          {field.opts.map(([val, text]) => (
                            <option key={String(val)} value={String(val)}>{text}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </filterForm.Field>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Rezultate */}
        <section className="pb-10">
          {loading && formValues.searchMode === 'players' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-[#11161D] border border-slate-200 dark:border-white/[0.07] rounded-xl p-4 flex flex-col items-center animate-pulse h-[210px]">
                  <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-white/[0.06] mb-3 mt-2" />
                  <div className="w-3/4 h-3.5 bg-slate-200 dark:bg-white/[0.06] rounded mb-2" />
                  <div className="w-1/2 h-3 bg-slate-100 dark:bg-white/[0.04] rounded mb-auto" />
                  <div className="w-full h-7 bg-slate-100 dark:bg-white/[0.04] rounded-md mt-3" />
                </div>
              ))}
            </div>
          )}

          {loading && formValues.searchMode === 'teams' && (
            <div className="flex justify-center items-center py-16">
              <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {loadingRoster && createPortal(
            <div className="fixed inset-0 z-[100000] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium text-slate-300">Se încarcă lotul echipei...</span>
            </div>,
            document.body
          )}

          {error && (
            <div className="text-center text-rose-500 font-medium border border-rose-500/25 bg-rose-500/10 py-3 px-5 rounded-xl max-w-md mx-auto text-xs">
              {error}
            </div>
          )}

          {!showResults && !loading && (
            <div className="text-center py-14 max-w-md mx-auto">
              <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.07] flex items-center justify-center mx-auto mb-3">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Începe căutarea
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Introdu numele {formValues.searchMode === 'players' ? 'unui jucător' : 'unei echipe'} sau folosește filtrele avansate.
              </p>
            </div>
          )}

          {/* Grid Jucători */}
          {showResults && !loading && formValues.searchMode === 'players' && displayedPlayers.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {displayedPlayers.map((player) => {
                const teamNameStr = sanitizeTeamName(player, "Club necunoscut");
                const metrics = computeScoutingMetrics(player);
                const isWatched = watchlistIds.includes(player._id);
                const isSelectedForCompare = compareList.some(item => item._id === player._id);

                return (
                  <div
                    key={player._id}
                    onClick={() => setSelectedPlayer(player)}
                    className="group bg-white dark:bg-[#11161D] border border-slate-200 dark:border-white/[0.07] hover:border-emerald-500/40 rounded-xl p-3.5 flex flex-col cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <button
                        type="button"
                        onClick={(e) => toggleWatchlist(e, player)}
                        className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                          isWatched
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                            : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.07] text-slate-400 hover:text-amber-500'
                        }`}
                        title="Listă scouting"
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isWatched ? 'fill-current' : ''}`} />
                      </button>

                      {metrics.rating > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-semibold tabular-nums">
                          <Star className="w-2.5 h-2.5 fill-current" /> {metrics.rating.toFixed(1)}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => toggleComparePlayer(e, player)}
                        className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                          isSelectedForCompare
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.07] text-slate-400 hover:text-emerald-500'
                        }`}
                        title="Compară"
                      >
                        {isSelectedForCompare ? <Check className="w-3.5 h-3.5" /> : <Scale className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="flex flex-col items-center text-center flex-1">
                      <img
                        src={player.image || GENERIC_USER_IMAGE}
                        alt={player.name}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border border-slate-200 dark:border-white/[0.1] bg-white mb-2.5"
                        onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }}
                      />

                      <h3 className="text-xs sm:text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate w-full group-hover:text-emerald-500 transition-colors" title={player.name}>
                        {player.name}
                      </h3>

                      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate w-full mt-1">
                        {hasValidImageUrl(player.team_logo) ? (
                          <img src={player.team_logo} alt={teamNameStr} className="w-3.5 h-3.5 object-contain shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        ) : (
                          <Shield className="w-3 h-3 shrink-0" />
                        )}
                        <span className="truncate">{teamNameStr}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between gap-1 text-[11px]">
                      <span className="font-medium text-emerald-600 dark:text-emerald-400 truncate">
                        {player.position || "N/A"}
                      </span>
                      <div className="flex items-center gap-1.5 font-semibold tabular-nums shrink-0">
                        <span className="text-emerald-600 dark:text-emerald-400" title="Goluri">{metrics.goals}G</span>
                        <span className="text-slate-300 dark:text-slate-600">/</span>
                        <span className="text-blue-500" title="Pase decisive">{metrics.assists}A</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Grid Echipe */}
          {showResults && !loading && formValues.searchMode === 'teams' && teams.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {teams.map((team, idx) => {
                const displayTeamName = sanitizeTeamName(team.team_name, "Echipă");
                const showLogo = hasValidImageUrl(team.team_logo);
                return (
                  <div
                    key={idx}
                    onClick={() => handleTeamClick(displayTeamName)}
                    className="bg-white dark:bg-[#11161D] p-4 rounded-xl border border-slate-200 dark:border-white/[0.07] hover:border-emerald-500/40 transition-colors cursor-pointer group flex flex-col items-center text-center"
                  >
                    <div className="w-14 h-14 mb-3 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-xl p-2.5 flex items-center justify-center">
                      {showLogo ? (
                        <img
                          src={team.team_logo}
                          alt={displayTeamName}
                          className="w-full h-full object-contain"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <Shield className="w-6 h-6 text-emerald-500" />
                      )}
                    </div>
                    <h4 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-emerald-500 transition-colors line-clamp-2">
                      {displayTeamName}
                    </h4>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {showResults && !loading && ((formValues.searchMode === 'players' && displayedPlayers.length === 0) || (formValues.searchMode === 'teams' && teams.length === 0)) && (
            <div className="text-center py-14 bg-white dark:bg-[#11161D] rounded-xl border border-slate-200 dark:border-white/[0.07] max-w-md mx-auto p-6">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-5 h-5 text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                {formValues.searchMode === 'players' ? 'Niciun jucător găsit' : 'Nicio echipă găsită'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Resetează filtrele sau verifică ortografia numelui.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Bară plutitoare Comparare */}
      {compareList.length > 0 && (
        <div className="fixed bottom-[72px] sm:bottom-6 left-1/2 -translate-x-1/2 z-[99998] bg-white dark:bg-[#11161D] px-3 py-2.5 rounded-xl shadow-xl border border-slate-200 dark:border-white/[0.1] flex items-center gap-3 max-w-lg w-[94%] justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <Scale className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="flex items-center gap-1.5 overflow-hidden">
              {compareList.map((p) => (
                <div key={p._id} className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] pl-1 pr-1.5 py-1 rounded-lg text-xs font-medium text-slate-900 dark:text-white truncate">
                  <img src={p.image || GENERIC_USER_IMAGE} alt={p.name} className="w-5 h-5 rounded object-cover shrink-0" />
                  <span className="truncate max-w-[75px] sm:max-w-[110px]">{p.name}</span>
                  <button
                    type="button"
                    onClick={(e) => toggleComparePlayer(e, p)}
                    className="text-slate-400 hover:text-rose-500 p-0.5 rounded shrink-0 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {compareList.length === 1 && (
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  Alege încă un jucător
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={compareList.length < 2}
            onClick={() => setShowCompareModal(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              compareList.length === 2
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                : 'bg-slate-100 dark:bg-white/[0.05] text-slate-400 cursor-not-allowed'
            }`}
          >
            Compară ({compareList.length}/2)
          </button>
        </div>
      )}

      {/* Modal Fișă Jucător */}
      {selectedPlayer && createPortal(
        <div
          className="fixed inset-0 z-[9999999] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedPlayer(null)}
        >
          <div
            className="bg-white dark:bg-[#0B0F14] w-full h-[94dvh] sm:h-auto sm:max-w-2xl sm:max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-white/[0.08]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-50 dark:bg-[#11161D] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/[0.07] shrink-0 relative">
              <button
                type="button"
                onClick={() => setSelectedPlayer(null)}
                aria-label="Închide fișa jucătorului"
                className="absolute top-3 right-3 sm:static p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors shrink-0 order-3 sm:order-none cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3.5 min-w-0 pr-8 sm:pr-0">
                <img
                  src={selectedPlayer.image || GENERIC_USER_IMAGE}
                  alt={selectedPlayer.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-200 dark:border-white/[0.1] bg-white shrink-0"
                  onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }}
                />

                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block">
                    Fișă Scouting
                  </span>
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white leading-tight truncate">
                    {selectedPlayer.name}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {hasValidImageUrl(selectedPlayer.team_logo) && (
                      <img src={selectedPlayer.team_logo} alt="logo" className="w-4 h-4 object-contain shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    )}
                    <span className="truncate">{sanitizeTeamName(selectedPlayer, "Club necunoscut")}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => toggleWatchlist(e, selectedPlayer)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    watchlistIds.includes(selectedPlayer._id)
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/[0.08] hover:border-emerald-500/50'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${watchlistIds.includes(selectedPlayer._id) ? 'fill-current' : ''}`} />
                  {watchlistIds.includes(selectedPlayer._id) ? 'Salvat' : 'Listă'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    toggleComparePlayer(e, selectedPlayer);
                    setSelectedPlayer(null);
                  }}
                  className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-200 hover:border-emerald-500/50 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Scale className="w-3.5 h-3.5" /> Compară
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.07] text-xs text-slate-700 dark:text-slate-300">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  {selectedPlayer.nationality || "N/A"}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.07] text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                  {selectedPlayer.age ? `${selectedPlayer.age} ani` : "N/A"}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.07] text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                  {selectedPlayer.height || "—"} / {selectedPlayer.weight || "—"}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {selectedPlayer.position || "N/A"}
                </span>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-emerald-500" /> Cifrele sezonului
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div className="bg-slate-50 dark:bg-[#11161D] p-3 rounded-lg border border-slate-200 dark:border-white/[0.07] text-center">
                    <span className="block text-lg font-semibold text-slate-900 dark:text-white tabular-nums">{selectedPlayer.statistics_summary?.total_appearances || 0}</span>
                    <span className="text-[11px] text-slate-500">Meciuri</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#11161D] p-3 rounded-lg border border-slate-200 dark:border-white/[0.07] text-center">
                    <span className="block text-lg font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{selectedPlayer.statistics_summary?.total_goals || 0}</span>
                    <span className="text-[11px] text-slate-500">Goluri</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#11161D] p-3 rounded-lg border border-slate-200 dark:border-white/[0.07] text-center">
                    <span className="block text-lg font-semibold text-blue-500 tabular-nums">{selectedPlayer.statistics_summary?.total_assists || 0}</span>
                    <span className="text-[11px] text-slate-500">Pase decisive</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#11161D] p-3 rounded-lg border border-slate-200 dark:border-white/[0.07] text-center">
                    <span className="block text-lg font-semibold text-slate-900 dark:text-white tabular-nums">{selectedPlayer.statistics_summary?.minutes_played || 0}'</span>
                    <span className="text-[11px] text-slate-500">Minute</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 bg-slate-50 dark:bg-[#11161D] p-3 rounded-lg border border-slate-200 dark:border-white/[0.07] text-center">
                    <span className="block text-lg font-semibold text-amber-500 tabular-nums">
                      {selectedPlayer.statistics_summary?.rating ? parseFloat(selectedPlayer.statistics_summary.rating).toFixed(2) : "—"}
                    </span>
                    <span className="text-[11px] text-slate-500">Rating</span>
                  </div>
                </div>
              </div>

              {(() => {
                const m = computeScoutingMetrics(selectedPlayer);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 dark:bg-[#11161D] p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-white/[0.07] items-center">
                    <div className="flex flex-col items-center">
                      <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-500" /> Profil radar
                      </h4>
                      <PlayerRadarChart primaryPlayer={selectedPlayer} />
                    </div>

                    <div className="space-y-2.5">
                      <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Randament / 90 min
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white dark:bg-[#0B0F14] p-3 rounded-lg border border-slate-200 dark:border-white/[0.06]">
                          <span className="text-[11px] text-slate-500 block">Goluri / 90'</span>
                          <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{m.goalsPer90}</p>
                        </div>
                        <div className="bg-white dark:bg-[#0B0F14] p-3 rounded-lg border border-slate-200 dark:border-white/[0.06]">
                          <span className="text-[11px] text-slate-500 block">Assist / 90'</span>
                          <p className="text-base font-semibold text-blue-500 tabular-nums">{m.assistsPer90}</p>
                        </div>
                        <div className="bg-white dark:bg-[#0B0F14] p-3 rounded-lg border border-slate-200 dark:border-white/[0.06]">
                          <span className="text-[11px] text-slate-500 block">Contribuții / 90'</span>
                          <p className="text-base font-semibold text-amber-500 tabular-nums">{m.contributionsPer90}</p>
                        </div>
                        <div className="bg-white dark:bg-[#0B0F14] p-3 rounded-lg border border-slate-200 dark:border-white/[0.06]">
                          <span className="text-[11px] text-slate-500 block">Min / Contribuție</span>
                          <p className="text-base font-semibold text-slate-900 dark:text-white tabular-nums">
                            {m.minsPerContribution > 0 ? `${m.minsPerContribution}'` : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Situație competițională
                </h3>

                {(!selectedPlayer.detailed_stats || selectedPlayer.detailed_stats.length === 0) ? (
                  <div className="text-center p-6 bg-slate-50 dark:bg-[#11161D] rounded-xl border border-slate-200 dark:border-white/[0.07] text-slate-500 text-xs">
                    Date competiționale indisponibile.
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#11161D] rounded-xl border border-slate-200 dark:border-white/[0.07] overflow-hidden">
                    <div className="overflow-x-auto scrollbar-hide">
                      <table className="w-full text-xs text-left min-w-[300px]">
                        <thead className="text-[11px] text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]">
                          <tr>
                            <th className="px-3 py-2.5 font-medium">Competiție</th>
                            <th className="px-2 py-2.5 font-medium text-center">MJ</th>
                            <th className="px-2 py-2.5 font-medium text-center">Goluri</th>
                            <th className="px-2 py-2.5 font-medium text-center">Pase</th>
                            <th className="px-2 py-2.5 font-medium text-center hidden sm:table-cell">Minute</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05] tabular-nums">
                          {selectedPlayer.detailed_stats.map((stat, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                              <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                                <span className="truncate block max-w-[140px] sm:max-w-none">{stat.competition}</span>
                              </td>
                              <td className="px-2 py-2.5 text-center text-slate-600 dark:text-slate-300">{stat.appearances}</td>
                              <td className="px-2 py-2.5 text-center font-semibold text-emerald-600 dark:text-emerald-400">{stat.goals}</td>
                              <td className="px-2 py-2.5 text-center font-semibold text-blue-500">{stat.assists}</td>
                              <td className="px-2 py-2.5 text-center text-slate-500 hidden sm:table-cell">{stat.minutes}'</td>
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
        </div>,
        document.body
      )}

      {/* Modal Comparare */}
      {showCompareModal && compareList.length === 2 && createPortal(
        <div
          className="fixed inset-0 z-[9999999] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowCompareModal(false)}
        >
          <div
            className="bg-white dark:bg-[#0B0F14] w-full h-[94dvh] sm:h-auto sm:max-w-3xl sm:max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-white/[0.08]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-50 dark:bg-[#11161D] px-4 py-3.5 flex items-center justify-between border-b border-slate-200 dark:border-white/[0.07] shrink-0">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Comparare jucători
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                aria-label="Închide comparația"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const p1 = compareList[0];
              const p2 = compareList[1];
              const m1 = computeScoutingMetrics(p1);
              const m2 = computeScoutingMetrics(p2);

              const rows = [
                { label: "Rating", v1: m1.rating, v2: m2.rating, format: (v: number) => (v > 0 ? v.toFixed(2) : "—") },
                { label: "Meciuri", v1: m1.apps, v2: m2.apps, format: (v: number) => String(v) },
                { label: "Minute", v1: m1.minutes, v2: m2.minutes, format: (v: number) => `${v}'` },
                { label: "Goluri", v1: m1.goals, v2: m2.goals, format: (v: number) => String(v) },
                { label: "Pase decisive", v1: m1.assists, v2: m2.assists, format: (v: number) => String(v) },
                { label: "Goluri / 90'", v1: m1.goalsPer90, v2: m2.goalsPer90, format: (v: number) => String(v) },
                { label: "G+A / 90'", v1: m1.contributionsPer90, v2: m2.contributionsPer90, format: (v: number) => String(v) }
              ];

              return (
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center bg-slate-50 dark:bg-[#11161D] p-4 rounded-xl border border-slate-200 dark:border-white/[0.07]">
                    <div className="flex flex-col items-center text-center min-w-0">
                      <img src={p1.image || GENERIC_USER_IMAGE} alt={p1.name} className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border-2 border-emerald-500 mb-2 bg-white" />
                      <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-full">{p1.name}</h3>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate max-w-full">{sanitizeTeamName(p1, "Club necunoscut")}</span>
                    </div>

                    <span className="text-xs font-semibold text-slate-400 px-2">vs</span>

                    <div className="flex flex-col items-center text-center min-w-0">
                      <img src={p2.image || GENERIC_USER_IMAGE} alt={p2.name} className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border-2 border-blue-500 mb-2 bg-white" />
                      <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-full">{p2.name}</h3>
                      <span className="text-[11px] text-blue-500 truncate max-w-full">{sanitizeTeamName(p2, "Club necunoscut")}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#11161D] p-4 rounded-xl border border-slate-200 dark:border-white/[0.07] flex flex-col items-center">
                    <div className="flex items-center justify-center gap-4 text-xs font-medium mb-3 flex-wrap">
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> {p1.name}
                      </span>
                      <span className="flex items-center gap-1.5 text-blue-500">
                        <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> {p2.name}
                      </span>
                    </div>
                    <PlayerRadarChart primaryPlayer={p1} secondaryPlayer={p2} />
                  </div>

                  <div className="bg-slate-50 dark:bg-[#11161D] p-4 rounded-xl border border-slate-200 dark:border-white/[0.07] space-y-3">
                    {rows.map((r, idx) => {
                      const total = r.v1 + r.v2;
                      const p1Pct = total > 0 ? Math.round((r.v1 / total) * 100) : 50;
                      const p2Pct = 100 - p1Pct;
                      const p1Wins = r.v1 > r.v2;
                      const p2Wins = r.v2 > r.v1;

                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center text-xs tabular-nums">
                            <span className={`w-12 text-left font-semibold ${p1Wins ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}>
                              {r.format(r.v1)}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 text-center flex-1 font-medium">
                              {r.label}
                            </span>
                            <span className={`w-12 text-right font-semibold ${p2Wins ? "text-blue-500" : "text-slate-500"}`}>
                              {r.format(r.v2)}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-white/[0.06] rounded-full overflow-hidden flex">
                            <div style={{ width: `${p1Pct}%` }} className="bg-emerald-500 h-full transition-all" />
                            <div style={{ width: `${p2Pct}%` }} className="bg-blue-500 h-full transition-all" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}