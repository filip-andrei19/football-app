import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { io } from 'socket.io-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Calendar, Trophy, Activity, X, Globe, User as UserIcon, Star,
    MapPin, Users, BarChart2, ListOrdered, Clock, Scale, Bookmark,
    Check, TrendingUp, Swords, History, ArrowUp, ArrowDown, Minus,
    Heart, Bell, Settings
} from 'lucide-react';

const GENERIC_USER_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
const socket = io("https://football-backend-m2a4.onrender.com");
const PRIORITY_LEAGUES = [283, 284, 2, 3, 848, 39, 140, 135, 78, 61];

interface Match {
    fixture_id: number;
    date: string;
    timestamp: number;
    league_id: number;
    league_name: string;
    league_logo: string;
    league_round?: string;
    venue_name?: string;
    venue_city?: string;
    referee?: string;
    home_team_id: number;
    home_team_name: string;
    home_team_logo: string;
    away_team_id: number;
    away_team_name: string;
    away_team_logo: string;
    home_goals: number | null;
    away_goals: number | null;
    ht_home_goals?: number | null;
    ht_away_goals?: number | null;
    status_short: string;
    elapsed: number | null;
    events?: any[];
    lineups?: any[];
    statistics?: any[];
    momentum?: { minute: number; value: number }[];
    h2h?: any[];
    predictions?: { home: number; draw: number; away: number };
    form?: { home: string[]; away: string[] };
}

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
    height?: string;
    weight?: string;
    image?: string;
    team_name?: string;
    team?: string;
    team_logo?: string;
    league_id?: number;
    detailed_stats?: DetailedStat[];
    statistics_summary?: {
        total_goals: number;
        total_assists: number;
        total_appearances: number;
        minutes_played?: number;
        rating?: string;
    };
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

interface NotificationPrefs {
    goals: boolean;
    matchStart: boolean;
    halfTime: boolean;
    fullTime: boolean;
    redCards: boolean;
}

const urlB64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

const computeScoutingMetrics = (player: Player) => {
  const stats = player.statistics_summary || {
    total_goals: 0, total_assists: 0, total_appearances: 0, minutes_played: 0, rating: "0"
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

  const BASE_SCORE = 19;
  let primaryScore = BASE_SCORE;
  let primaryLabel = "Finalizare";
  
  if (isDefensive) {
      primaryLabel = "Defensivă";
      const defRatingScore = rating > 6.4 ? Math.min(50, (rating - 6.4) * (50 / 1.4)) : 0; 
      const defAppsScore = Math.min(30, (apps / 38) * 30);
      primaryScore = Math.min(99, Math.round(BASE_SCORE + defRatingScore + defAppsScore));
  } else {
      const rateScore = Math.min(60, (goalsPer90 / 1.2) * 60);
      const volScore = Math.min(20, (goals / 35) * 20);
      primaryScore = Math.min(99, Math.round(BASE_SCORE + rateScore + volScore));
  }

  const assistRateScore = Math.min(60, (assistsPer90 / 0.7) * 60);
  const assistVolScore = Math.min(20, (assists / 20) * 20);
  const creativityScore = Math.min(99, Math.round(BASE_SCORE + assistRateScore + assistVolScore));

  const appsScore = Math.min(40, (apps / 38) * 40);
  const minsScore = Math.min(40, (minutes / 3420) * 40);
  const consistencyScore = Math.min(99, Math.round(BASE_SCORE + appsScore + minsScore));

  let formScore = BASE_SCORE;
  if (rating > 6.0) {
      formScore = Math.min(99, Math.round(BASE_SCORE + ((rating - 6.0) * 40)));
  } else if (rating > 0 && rating <= 6.0) {
      formScore = Math.max(1, Math.round(rating * 3));
  }

  const impactRateScore = Math.min(60, (contributionsPer90 / 1.4) * 60);
  const impactFormScore = Math.min(20, (formScore / 100) * 20);
  const impactScore = Math.min(99, Math.round(BASE_SCORE + impactRateScore + impactFormScore));

  return {
    goals, assists, apps, minutes, rating, goalsPer90, assistsPer90, contributionsPer90, minsPerContribution,
    radar: [
      { label: primaryLabel, value: primaryScore || 0 },
      { label: "Creație", value: creativityScore || 0 },
      { label: "Constanță", value: consistencyScore || 0 },
      { label: "Formă", value: formScore || 0 },
      { label: "Impact", value: impactScore || 0 }
    ]
  };
};

const PlayerRadarChart = ({ primaryPlayer }: { primaryPlayer: Player }) => {
    const m1 = computeScoutingMetrics(primaryPlayer);
    const isMobile = window.innerWidth < 640;
    const size = isMobile ? 180 : 230;
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
            <svg width={size} height={size} className="overflow-visible drop-shadow-md">
                {[25, 50, 75, 100].map((level) => {
                    const pts = axes.map((_, idx) => {
                        const { x, y } = getCoordinates(idx, level);
                        return `${x},${y}`;
                    }).join(" ");
                    return <polygon key={level} points={pts} fill="none" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1" strokeDasharray={level < 100 ? "3 3" : undefined} />;
                })}
                {axes.map((_, idx) => {
                    const end = getCoordinates(idx, 100);
                    return <line key={idx} x1={center} y1={center} x2={end.x} y2={end.y} stroke="rgba(16, 185, 129, 0.4)" strokeWidth="1" />;
                })}
                <polygon points={buildPolygonPoints(m1.radar)} fill="rgba(250, 204, 21, 0.4)" stroke="#facc15" strokeWidth="3" />
                {m1.radar.map((item, idx) => {
                    const pt1 = getCoordinates(idx, item.value);
                    const labelPos = getCoordinates(idx, 120);
                    return (
                        <g key={idx}>
                            <circle cx={pt1.x} cy={pt1.y} r={isMobile ? "3" : "4"} fill="#facc15" stroke="#fff" strokeWidth="1.5" />
                            <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="middle" className="text-[8px] sm:text-[10px] font-black fill-slate-700 dark:fill-slate-200 uppercase tracking-wider">
                                {item.label} ({item.value})
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export function MatchesSection({ userEmail }: { userEmail?: string }) {
    const queryClient = useQueryClient();

    const [dates, setDates] = useState<{ date: Date; label: string; isToday: boolean }[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [subFilter, setSubFilter] = useState<'all' | 'live' | 'finished' | 'favorites'>('all');
    
    const [favoriteMatches, setFavoriteMatches] = useState<number[]>([]);
    const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]); 
    
    const [showNotifSettings, setShowNotifSettings] = useState(false);
    const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(() => {
        try {
            const saved = localStorage.getItem('scout_notif_prefs');
            return saved ? JSON.parse(saved) : { goals: true, matchStart: true, halfTime: false, fullTime: true, redCards: true };
        } catch { return { goals: true, matchStart: true, halfTime: false, fullTime: true, redCards: true }; }
    });
    
    const notifPrefsRef = useRef(notifPrefs);
    useEffect(() => {
        notifPrefsRef.current = notifPrefs;
        localStorage.setItem('scout_notif_prefs', JSON.stringify(notifPrefs));
    }, [notifPrefs]);

    const [selectedTeam, setSelectedTeam] = useState<SquadData | null>(null);
    const [loadingRoster, setLoadingRoster] = useState(false);
    
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [compareList, setCompareList] = useState<Player[]>([]);
    const [showCompareModal, setShowCompareModal] = useState(false);
    const [watchlistIds, setWatchlistIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('scout_watchlist_ids');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const [selectedMatchDetails, setSelectedMatchDetails] = useState<Match | null>(null);
    const [loadingMatchDetails, setLoadingMatchDetails] = useState(false);
    const [activeMatchTab, setActiveMatchTab] = useState<'events' | 'lineups' | 'stats' | 'standings' | 'h2h'>('events');
    const [standingsData, setStandingsData] = useState<any[]>([]);
    const [loadingStandings, setLoadingStandings] = useState(false);

    const [lineupViewMode, setLineupViewMode] = useState<'both' | 'home' | 'away'>('both');

    const subscribeToPushNotifications = async (email: string) => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        try {
            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();
            
            if (!subscription) {
                const publicVapidKey = (import.meta as any).env.VITE_VAPID_PUBLIC_KEY; 
                if (!publicVapidKey) return;
                const applicationServerKey = urlB64ToUint8Array(publicVapidKey);
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: applicationServerKey
                });
            }

            await fetch('https://football-backend-m2a4.onrender.com/api/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, subscription: subscription })
            });
        } catch (error) { console.error('Eroare la abonarea Push:', error); }
    };

    useEffect(() => {
        if ("Notification" in window) {
            if (Notification.permission === "default") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted" && userEmail) subscribeToPushNotifications(userEmail);
                });
            } else if (Notification.permission === "granted" && userEmail) {
                subscribeToPushNotifications(userEmail);
            }
        }
    }, [userEmail]);

    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const generatedDates = [];
        for (let i = -3; i <= 3; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            let label = d.toLocaleDateString('ro-RO', { weekday: 'short', day: '2-digit', month: '2-digit' });
            if (i === 0) label = "AZI";
            if (i === -1) label = "IERI";
            if (i === 1) label = "MÂINE";
            generatedDates.push({ date: d, label: label, isToday: i === 0 });
        }
        setDates(generatedDates);
        setSelectedDate(today);

        if (userEmail) {
            fetch(`https://football-backend-m2a4.onrender.com/api/users/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail })
            }).then(res => res.json()).then(data => {
                if (data.success && data.user) {
                    if (data.user.favoriteMatches) setFavoriteMatches(data.user.favoriteMatches);
                    if (data.user.favoriteTeams) setFavoriteTeams(data.user.favoriteTeams);
                    if (data.user.scoutWatchlist) {
                        setWatchlistIds(data.user.scoutWatchlist);
                        localStorage.setItem('scout_watchlist_ids', JSON.stringify(data.user.scoutWatchlist));
                    }
                }
            }).catch(() => {});
        }
    }, [userEmail]);

    const localDateStr = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    const { data: matches = [], isLoading: loading } = useQuery({
        queryKey: ['matches', localDateStr],
        queryFn: async () => {
            const res = await fetch(`https://football-backend-m2a4.onrender.com/api/sport/matches?date=${localDateStr}`);
            if (!res.ok) throw new Error("Eroare preluare meciuri");
            return res.json();
        },
        staleTime: 60 * 1000,       
        refetchInterval: 60 * 1000, 
    });

    useEffect(() => {
        socket.on("live_match_update", (updatedMatch: Match) => {
            queryClient.setQueriesData<Match[]>({ queryKey: ['matches'] }, (oldMatches) => {
                if (!oldMatches) return oldMatches;
                const index = oldMatches.findIndex(m => m.fixture_id === updatedMatch.fixture_id);
                
                if (index !== -1) {
                    const oldMatch = oldMatches[index];
                    const isFavMatch = favoriteMatches.includes(updatedMatch.fixture_id);
                    const isFavTeam = favoriteTeams.includes(updatedMatch.home_team_name) || favoriteTeams.includes(updatedMatch.away_team_name);

                    if (isFavMatch || isFavTeam) {
                        const prefs = notifPrefsRef.current;
                        const homeGoal = updatedMatch.home_goals !== oldMatch.home_goals && updatedMatch.home_goals !== null;
                        const awayGoal = updatedMatch.away_goals !== oldMatch.away_goals && updatedMatch.away_goals !== null;
                        const justStarted = updatedMatch.status_short === "1H" && oldMatch.status_short === "NS";
                        const justHalfTime = updatedMatch.status_short === "HT" && oldMatch.status_short !== "HT";
                        const justFinished = ["FT", "AET", "PEN"].includes(updatedMatch.status_short) && !["FT", "AET", "PEN"].includes(oldMatch.status_short);
                        const getRedCardsCount = (events?: any[]) => events?.filter(e => e.type === 'Card' && e.detail?.includes('Red')).length || 0;
                        const newRedCard = getRedCardsCount(updatedMatch.events) > getRedCardsCount(oldMatch.events);

                        const matchTitleStr = `${updatedMatch.home_team_name} ${updatedMatch.home_goals ?? 0} - ${updatedMatch.away_goals ?? 0} ${updatedMatch.away_team_name}`;

                        const triggerNotification = (title: string, body: string) => {
                            if (!("Notification" in window) || Notification.permission !== "granted") return;
                            const options = {
                                body, icon: updatedMatch.league_logo || '/icon-192.png', badge: '/icon-192.png',
                                vibrate: [200, 100, 200, 100, 200], data: { fixtureId: updatedMatch.fixture_id }
                            };
                            if (navigator.serviceWorker) {
                                navigator.serviceWorker.ready.then(reg => { reg.showNotification(title, options); }).catch(() => { new Notification(title, options as any); });
                            } else {
                                new Notification(title, options as any);
                            }
                        };

                        if ((homeGoal || awayGoal) && prefs.goals) triggerNotification("⚽ GOL!", matchTitleStr);
                        else if (justStarted && prefs.matchStart) triggerNotification("▶️ A început meciul", matchTitleStr);
                        else if (justHalfTime && prefs.halfTime) triggerNotification("⏸️ Pauză", matchTitleStr);
                        else if (justFinished && prefs.fullTime) triggerNotification("🏁 Final de meci", matchTitleStr);
                        else if (newRedCard && prefs.redCards) triggerNotification("🟥 Cartonaș Roșu!", matchTitleStr);
                    }

                    const newMatches = [...oldMatches];
                    newMatches[index] = { ...newMatches[index], ...updatedMatch };
                    return newMatches;
                }
                return oldMatches;
            });

            setSelectedMatchDetails(prev => prev && prev.fixture_id === updatedMatch.fixture_id ? { ...prev, ...updatedMatch } : prev);
        });
        return () => { socket.off("live_match_update"); };
    }, [favoriteMatches, favoriteTeams, queryClient]);

    const toggleNotifPref = (key: keyof NotificationPrefs) => { setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] })); };

    const toggleFavoriteTeam = async (e: React.MouseEvent, teamName: string) => {
        e.stopPropagation();
        if (!userEmail) { alert("Trebuie să ai legitimație (cont) pentru a salva echipe la favorite!"); return; }
        const isFav = favoriteTeams.includes(teamName);
        const newFavTeams = isFav ? favoriteTeams.filter(t => t !== teamName) : [...favoriteTeams, teamName];
        setFavoriteTeams(newFavTeams);
        try {
            await fetch(`https://football-backend-m2a4.onrender.com/api/users/favorite-teams/toggle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmail, teamName }) });
        } catch (err) { setFavoriteTeams(favoriteTeams); }
    };

    const toggleFavoriteMatch = async (e: React.MouseEvent, fixtureId: number) => {
        e.stopPropagation();
        if (!userEmail) { alert("Trebuie să ai legitimație (cont) pentru a salva meciuri la favorite!"); return; }
        try {
            const res = await fetch(`https://football-backend-m2a4.onrender.com/api/users/favorite-matches/toggle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmail, fixtureId }) });
            const data = await res.json();
            if (data.success) { setFavoriteMatches(data.favoriteMatches); }
        } catch (err) { console.error(err); }
    };

    const toggleWatchlist = async (e: React.MouseEvent, player: Player) => {
        e.stopPropagation();
        if (!userEmail) { alert("Conectează-te pentru a adăuga jucători în lista scurtă."); return; }
        const playerId = player._id;
        const exists = watchlistIds.includes(playerId);
        const updated = exists ? watchlistIds.filter(id => id !== playerId) : [...watchlistIds, playerId];
        setWatchlistIds(updated);
        localStorage.setItem('scout_watchlist_ids', JSON.stringify(updated));

        try {
            await fetch(`https://football-backend-m2a4.onrender.com/api/users/watchlist/toggle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmail, playerId }) });
        } catch (err) { console.error(err); }
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

    const handleTeamClick = async (e: React.MouseEvent, teamName: string) => {
        e.stopPropagation();
        const cachedRoster = queryClient.getQueryData(['teamRoster', teamName]);
        if (!cachedRoster) { setLoadingRoster(true); setSelectedTeam(null); }
        try {
            const data: any = await queryClient.fetchQuery({
                queryKey: ['teamRoster', teamName],
                queryFn: async () => {
                    const res = await fetch(`https://football-backend-m2a4.onrender.com/api/sport/teams/${encodeURIComponent(teamName)}/roster`);
                    if (!res.ok) throw new Error("Nu am putut prelua lotul.");
                    return res.json();
                },
                staleTime: 60 * 60 * 1000, 
            });
            setSelectedTeam(data);
        } catch (err: any) { alert(err.message); } finally { setLoadingRoster(false); }
    };

    const handleMatchClick = async (match: Match) => {
        const cachedDetails = queryClient.getQueryData(['matchDetails', match.fixture_id]);
        if (!cachedDetails) setLoadingMatchDetails(true);

        setSelectedMatchDetails(match);
        setLineupViewMode('both');
        setActiveMatchTab(match.status_short === "NS" ? 'h2h' : 'events'); 

        fetchStandings(match.league_id);

        try {
            const fullData: any = await queryClient.fetchQuery({
                queryKey: ['matchDetails', match.fixture_id],
                queryFn: async () => {
                    const res = await fetch(`https://football-backend-m2a4.onrender.com/api/sport/matches/${match.fixture_id}/details`);
                    if (!res.ok) throw new Error("Eroare preluare foi de joc");
                    return res.json();
                },
                staleTime: 60 * 1000, 
            });

            setSelectedMatchDetails(fullData);
            queryClient.setQueriesData<Match[]>({ queryKey: ['matches'] }, (oldMatches) => {
                if (!oldMatches) return oldMatches;
                return oldMatches.map(m => (m.fixture_id === fullData.fixture_id ? { ...m, ...fullData } : m));
            });
        } catch (err) { console.error("Eroare detalii meci:", err); } finally { setLoadingMatchDetails(false); }
    };

    const fetchStandings = async (leagueId: number) => {
        const cachedStandings = queryClient.getQueryData(['standings', leagueId]);
        if (!cachedStandings) setLoadingStandings(true);
        try {
            const data: any = await queryClient.fetchQuery({
                queryKey: ['standings', leagueId],
                queryFn: async () => {
                    const res = await fetch(`https://football-backend-m2a4.onrender.com/api/sport/standings/${leagueId}`);
                    if (!res.ok) throw new Error("Eroare clasament");
                    return res.json();
                },
                staleTime: 15 * 60 * 1000, 
            });
            setStandingsData(data.table || []);
        } catch (err) { console.error("Eroare clasament:", err); } finally { setLoadingStandings(false); }
    };

    const handleLineupPlayerClick = async (playerName?: string) => {
        if (!playerName) return;
        try {
            const res = await fetch(`https://football-backend-m2a4.onrender.com/api/sport/players?search=${encodeURIComponent(playerName)}`);
            if (res.ok) {
                const players = await res.json();
                if (players && players.length > 0) { setSelectedPlayer(players[0]); } 
                else { alert(`Dosarul pentru jucătorul ${playerName} nu se află încă în arhivă.`); }
            }
        } catch (err) { console.error(err); }
    };

    const filteredMatches = matches.filter((match: Match) => {
        const isLive = ["1H", "HT", "2H", "ET", "P", "BT", "LIVE"].includes(match.status_short);
        const isFinished = ["FT", "AET", "PEN"].includes(match.status_short);
        const isFav = favoriteMatches.includes(match.fixture_id) || favoriteTeams.includes(match.home_team_name) || favoriteTeams.includes(match.away_team_name);
        
        if (subFilter === 'live') return isLive;
        if (subFilter === 'finished') return isFinished;
        if (subFilter === 'favorites') return isFav;
        return true;
    });

    const groupedMatches = filteredMatches.reduce((acc: Record<string, { league_id: number; logo: string; items: Match[] }>, match: Match) => {
        if (!acc[match.league_name]) { acc[match.league_name] = { league_id: match.league_id, logo: match.league_logo, items: [] }; }
        acc[match.league_name].items.push(match);
        return acc;
    }, {} as Record<string, { league_id: number; logo: string; items: Match[] }>);

    const sortedLeagueNames = Object.keys(groupedMatches).sort((a, b) => {
        const idA = groupedMatches[a].league_id;
        const idB = groupedMatches[b].league_id;
        const indexA = PRIORITY_LEAGUES.indexOf(idA);
        const indexB = PRIORITY_LEAGUES.indexOf(idB);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    const liveCount = matches.filter((m: Match) => ["1H", "HT", "2H", "ET", "P", "BT", "LIVE"].includes(m.status_short)).length;

    const renderStatus = (match: Match) => {
        const status = match.status_short;
        const liveStatuses = ["1H", "2H", "HT", "ET", "P", "BT", "LIVE"];
        if (status === "NS") return null; 
        if (liveStatuses.includes(status)) return <span className="text-rose-600 font-black animate-pulse text-[10px] sm:text-xs tracking-widest uppercase">{match.elapsed ? `${match.elapsed}'` : status}</span>;
        if (status === "FT" || status === "AET" || status === "PEN") return <span className="text-slate-400 font-black text-[9px] sm:text-xs uppercase tracking-widest">Final</span>;
        return <span className="text-amber-500 font-black text-[9px] sm:text-xs uppercase tracking-widest">{status}</span>;
    };

    const translateStatLabel = (type: string) => {
        const map: Record<string, string> = {
            "Shots on Goal": "Șuturi pe poartă", "Shots off Goal": "Șuturi pe lângă", "Total Shots": "Total șuturi",
            "Blocked Shots": "Șuturi blocate", "Shots insidebox": "Din careu", "Shots outsidebox": "Din afara careului",
            "Fouls": "Faulturi", "Corner Kicks": "Cornere", "Offsides": "Ofsaiduri", "Ball Possession": "Posesie %",
            "Yellow Cards": "Cartonașe galbene", "Red Cards": "Cartonașe roșii", "Goalkeeper Saves": "Parade portar",
            "Total passes": "Total pase", "Passes accurate": "Pase reușite", "Passes %": "Acuratețe pase", "expected_goals": "xG (Expected Goals)"
        };
        return map[type] || type;
    };

    const buildExactCoachRows = (startXI: any[], formationStr?: string, isTopDown: boolean = true): any[][] => {
        if (!startXI || startXI.length === 0) return [];
        const hasGridData = startXI.some((item: any) => item?.player?.grid && String(item.player.grid).includes(':'));
        if (hasGridData) {
            const rowsMap = new Map<number, { col: number; item: any }[]>();
            startXI.forEach((item: any, idx: number) => {
                const gridStr = item?.player?.grid;
                let row = 1; let col = idx + 1;
                if (gridStr && String(gridStr).includes(':')) {
                    const parts = String(gridStr).split(':');
                    row = parseInt(parts[0], 10) || 1; col = parseInt(parts[1], 10) || idx + 1;
                } else if (item?.player?.pos === 'G') { row = 1; col = 1;
                } else if (item?.player?.pos === 'D') { row = 2;
                } else if (item?.player?.pos === 'M') { row = 3;
                } else { row = 4; }
                if (!rowsMap.has(row)) rowsMap.set(row, []);
                rowsMap.get(row)!.push({ col, item });
            });
            const sortedRowNumbers = Array.from(rowsMap.keys()).sort((a, b) => a - b);
            const orderedRows = sortedRowNumbers.map(rNum => {
                const rowPlayers = rowsMap.get(rNum)!;
                rowPlayers.sort((a, b) => (isTopDown ? b.col - a.col : a.col - b.col));
                return rowPlayers.map(rp => rp.item);
            });
            return isTopDown ? orderedRows : [...orderedRows].reverse();
        }

        const gk = startXI.filter((p: any) => p.player?.pos === 'G');
        const outfield = startXI.filter((p: any) => p.player?.pos !== 'G');
        const resultRows: any[][] = [];
        if (gk.length > 0) resultRows.push(gk);

        if (formationStr && /^\d+(-\d+)+\$/.test(formationStr.trim())) {
            const counts = formationStr.trim().split('-').map(Number);
            let cursor = 0;
            counts.forEach(count => {
                const slice = outfield.slice(cursor, cursor + count);
                if (slice.length > 0) { resultRows.push(isTopDown ? [...slice].reverse() : slice); }
                cursor += count;
            });
            if (cursor < outfield.length) { resultRows.push(outfield.slice(cursor)); }
        } else {
            const def = outfield.filter((p: any) => p.player?.pos === 'D');
            const mid = outfield.filter((p: any) => p.player?.pos === 'M');
            const fwd = outfield.filter((p: any) => p.player?.pos === 'F' || p.player?.pos === 'A');
            if (def.length > 0) resultRows.push(def);
            if (mid.length > 0) resultRows.push(mid);
            if (fwd.length > 0) resultRows.push(fwd);
        }
        return isTopDown ? resultRows : [...resultRows].reverse();
    };

    const getPlayerMatchBadges = (playerName?: string, playerId?: number) => {
        const events = selectedMatchDetails?.events || [];
        let goals = 0; let yellow = false; let red = false; let subOut = false;
        events.forEach((ev: any) => {
            const isSamePlayer = (playerId && ev.player?.id === playerId) || (playerName && ev.player?.name && ev.player.name.toLowerCase() === playerName.toLowerCase());
            const isSubbedOut = ev.type === 'subst' && ((playerId && ev.assist?.id === playerId) || (playerName && ev.assist?.name && ev.assist.name.toLowerCase() === playerName.toLowerCase()));
            if (isSamePlayer) {
                if (ev.type === 'Goal' && ev.detail !== 'Missed Penalty') goals += 1;
                if (ev.type === 'Card' && ev.detail === 'Yellow Card') yellow = true;
                if (ev.type === 'Card' && ev.detail?.includes('Red')) red = true;
                if (ev.type === 'subst') subOut = true;
            }
            if (isSubbedOut) { subOut = true; }
        });
        return { goals, yellow, red, subOut };
    };

    const renderPitchPlayerNode = (item: any, isAwayTeam: boolean, idx: number) => {
        const pName: string = item?.player?.name || "Jucător";
        const pNum = item?.player?.number ?? "-";
        const pPos = item?.player?.pos || "";
        const pRating = item?.player?.rating;
        const isGK = pPos === 'G';
        const badges = getPlayerMatchBadges(pName, item?.player?.id);
        const shortName = pName.includes(' ') ? `${pName.split(' ')[0].charAt(0)}. ${pName.split(' ').slice(-1)[0]}` : pName;
        
        let shirtStyle = isAwayTeam ? "bg-slate-900 text-white border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-white text-slate-900 border-slate-300 shadow-[0_0_10px_rgba(255,255,255,0.5)]";
        if (isGK) { shirtStyle = isAwayTeam ? "bg-amber-500 text-slate-950 border-amber-300" : "bg-yellow-400 text-slate-950 border-white"; }
        
        const ratingNum = pRating ? parseFloat(pRating) : 0;
        const ratingBg = ratingNum >= 7.5 ? "bg-emerald-500" : ratingNum >= 6.8 ? "bg-emerald-600" : ratingNum > 0 ? "bg-amber-500" : "bg-slate-700";

        return (
            <div key={item?.player?.id || `${pName}-${idx}`} onClick={() => handleLineupPlayerClick(pName)} className="cursor-pointer group flex flex-col items-center select-none w-auto sm:w-[85px] z-10 mx-0.5 sm:mx-1" title={`${pName} (#${pNum}) - Poziție: ${pPos || 'Titular'}`}>
                <div className="relative">
                    <div className={`w-7 h-7 sm:w-12 sm:h-12 rounded-full ${shirtStyle} font-black text-[9px] sm:text-base flex items-center justify-center border-2 sm:border-4 group-hover:scale-110 transition-transform`}>{pNum}</div>
                    {ratingNum > 0 && <span className={`absolute -top-1.5 -right-1 sm:-right-3 ${ratingBg} text-white text-[6px] sm:text-[9px] font-black px-1 sm:px-1.5 py-0.5 rounded shadow-sm border border-white/30`}>{ratingNum.toFixed(1)}</span>}
                    {badges.goals > 0 && <span className="absolute -bottom-1 -right-1 sm:-bottom-1.5 sm:-right-2 bg-white text-[7px] sm:text-[10px] rounded-full px-0.5 sm:px-1 shadow border border-slate-200 font-black text-slate-900">⚽{badges.goals > 1 ? badges.goals : ''}</span>}
                    {(badges.yellow || badges.red) && <span className={`absolute -top-1 -left-1 w-2 h-2.5 sm:w-3 sm:h-4 rounded-[1px] sm:rounded-sm shadow border border-white/50 ${badges.red ? 'bg-red-600' : 'bg-yellow-400'}`} />}
                    {badges.subOut && <span className="absolute -bottom-1 -left-1 sm:-bottom-1.5 sm:-left-2 bg-slate-900 text-white text-[6px] sm:text-[8px] rounded-full w-2.5 h-2.5 sm:w-4 sm:h-4 flex items-center justify-center shadow border border-white/50">🔄</span>}
                </div>
                <div className="mt-0.5 sm:mt-1 bg-slate-950/90 text-white text-[6px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded shadow-md max-w-full text-center border border-white/10 tracking-tight sm:tracking-wide leading-tight w-full break-words truncate">{shortName}</div>
            </div>
        );
    };

    const renderH2HSection = () => {
        let rawHomeForm = selectedMatchDetails?.form?.home;
        let rawAwayForm = selectedMatchDetails?.form?.away;

        if ((!rawHomeForm || !rawAwayForm) && standingsData.length > 0) {
            standingsData.forEach(groupTable => {
                groupTable.forEach((row: any) => {
                    if (row.team?.id === selectedMatchDetails?.home_team_id && row.form) {
                        rawHomeForm = row.form;
                    }
                    if (row.team?.id === selectedMatchDetails?.away_team_id && row.form) {
                        rawAwayForm = row.form;
                    }
                });
            });
        }

        const parseForm = (formObj: any): string[] => {
            let formArr: string[] = [];
            if (Array.isArray(formObj)) formArr = formObj;
            else if (typeof formObj === 'string') formArr = formObj.split('');
            const result = formArr.slice(0, 5);
            while (result.length < 5) { result.push('?'); }
            return result;
        };

        const realFormHome = parseForm(rawHomeForm);
        const realFormAway = parseForm(rawAwayForm);
        
        let matchPredictions = selectedMatchDetails?.predictions;

        if (!matchPredictions) {
            const getTeamPrestige = (teamName: string) => {
                if (!teamName) return 60;
                const t = teamName.toLowerCase();
                if (t.match(/real madrid|manchester city|bayern|barcelona|liverpool|arsenal|psg|inter|bayer leverkusen/)) return 95;
                if (t.match(/juventus|milan|atletico|dortmund|chelsea|tottenham|manchester utd|manchester united|napoli|aston villa/)) return 85;
                if (t.match(/newcastle|leipzig|lazio|roma|atalanta|porto|benfica|sporting|fcsb|cfr cluj|craiova|rapid|dinamo|galatasaray|fenerbahce|besiktas|ajax|psv/)) return 75;
                return 60;
            };

            const calculateFormPoints = (formArray: string[]) => {
                return formArray.reduce((total, result) => {
                    if (result === 'W') return total + 3;
                    if (result === 'D') return total + 1;
                    return total;
                }, 0);
            };

            const homePrestige = getTeamPrestige(selectedMatchDetails?.home_team_name || "");
            const awayPrestige = getTeamPrestige(selectedMatchDetails?.away_team_name || "");
            const homeFormPts = calculateFormPoints(realFormHome);
            const awayFormPts = calculateFormPoints(realFormAway);

            const homeAdvantage = 5; 
            const homeTotal = homePrestige + homeFormPts + homeAdvantage;
            const awayTotal = awayPrestige + awayFormPts;
            const matchTotal = homeTotal + awayTotal;

            const diff = Math.abs(homeTotal - awayTotal);
            let drawChance = Math.max(12, 30 - Math.floor(diff / 2));
            const remainingChance = 100 - drawChance;
            let homeChance = Math.round((homeTotal / matchTotal) * remainingChance);
            let awayChance = remainingChance - homeChance;

            matchPredictions = { home: homeChance, draw: drawChance, away: awayChance };
        }

        const formColor = (res: string) => {
            if (res === 'W') return 'bg-emerald-500';
            if (res === 'D') return 'bg-slate-500';
            if (res === 'L') return 'bg-rose-500';
            return 'bg-slate-700';
        };

        return (
            <div className="space-y-4 sm:space-y-6">
                <div className="bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border-2 border-slate-800 shadow-sm">
                    <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-400 mb-4 sm:mb-6 flex items-center gap-1.5 sm:gap-2 border-b-2 border-slate-800 pb-2 sm:pb-3">
                        <Swords className="w-3 h-3 sm:w-4 sm:h-4" /> Predicție Câștigător
                    </h4>
                    <div className="flex items-center gap-2 sm:gap-4 text-[9px] sm:text-xs font-black uppercase tracking-widest mb-1.5 sm:mb-2">
                        <span className="flex-1 text-emerald-500 text-left truncate">{matchPredictions.home}% <span className="hidden sm:inline">{selectedMatchDetails?.home_team_name}</span></span>
                        <span className="flex-1 text-slate-500 text-center">{matchPredictions.draw}% <span className="hidden sm:inline">Egal</span></span>
                        <span className="flex-1 text-blue-500 text-right truncate">{matchPredictions.away}% <span className="hidden sm:inline">{selectedMatchDetails?.away_team_name}</span></span>
                    </div>
                    <div className="w-full h-2 sm:h-3 bg-slate-800 rounded-full overflow-hidden flex border border-slate-700">
                        <div style={{ width: `${matchPredictions.home}%` }} className="bg-emerald-500 h-full transition-all"></div>
                        <div style={{ width: `${matchPredictions.draw}%` }} className="bg-slate-500 h-full transition-all"></div>
                        <div style={{ width: `${matchPredictions.away}%` }} className="bg-blue-500 h-full transition-all"></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="bg-white dark:bg-slate-950 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border-2 border-slate-200 dark:border-slate-800">
                        <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 sm:mb-4 flex items-center justify-center text-center">
                            Formă {selectedMatchDetails?.home_team_name}
                        </h4>
                        <div className="flex justify-center gap-1.5 sm:gap-2">
                            {realFormHome.map((res, i) => (
                                <div key={i} className={`w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center text-white font-black text-[10px] sm:text-xs ${formColor(res)} shadow-sm`}>{res}</div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-950 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border-2 border-slate-200 dark:border-slate-800">
                        <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 sm:mb-4 flex items-center justify-center text-center">
                            Formă {selectedMatchDetails?.away_team_name}
                        </h4>
                        <div className="flex justify-center gap-1.5 sm:gap-2">
                            {realFormAway.map((res, i) => (
                                <div key={i} className={`w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center text-white font-black text-[10px] sm:text-xs ${formColor(res)} shadow-sm`}>{res}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const homeTeamLineup = selectedMatchDetails?.lineups?.[0] || null;
    const awayTeamLineup = selectedMatchDetails?.lineups?.[1] || null;
    const homeRowsTopDown = buildExactCoachRows(homeTeamLineup?.startXI || [], homeTeamLineup?.formation, true);
    const awayRowsBottomUp = buildExactCoachRows(awayTeamLineup?.startXI || [], awayTeamLineup?.formation, false);
    const singleTeamLineup = lineupViewMode === 'home' ? homeTeamLineup : awayTeamLineup;
    const singleTeamRows = buildExactCoachRows(singleTeamLineup?.startXI || [], singleTeamLineup?.formation, false);

    // === ALGORITM CLASAMENT LIVE ===
    const liveStandings = useMemo(() => {
        if (!standingsData || standingsData.length === 0) return [];
        
        return standingsData.map(groupTable => {
            let liveTable = groupTable.map((row: any) => ({
                ...row,
                livePoints: row.points,
                livePlayed: row.all?.played || 0,
                liveGoalsFor: row.all?.goals?.for || 0,
                liveGoalsAgainst: row.all?.goals?.against || 0,
                isLivePlaying: false,
                originalRank: row.rank
            }));

            const liveLeagueMatches = matches.filter((m: Match) => 
                m.league_id === selectedMatchDetails?.league_id && 
                ["1H", "2H", "HT", "ET", "P", "BT", "LIVE"].includes(m.status_short)
            );

            liveLeagueMatches.forEach((m: Match) => {
                const homeRow = liveTable.find((r: any) => r.team?.id === m.home_team_id);
                const awayRow = liveTable.find((r: any) => r.team?.id === m.away_team_id);

                if (homeRow && awayRow) {
                    homeRow.isLivePlaying = true;
                    awayRow.isLivePlaying = true;
                    homeRow.livePlayed += 1;
                    awayRow.livePlayed += 1;

                    const hGoals = m.home_goals || 0;
                    const aGoals = m.away_goals || 0;

                    homeRow.liveGoalsFor += hGoals;
                    homeRow.liveGoalsAgainst += aGoals;
                    awayRow.liveGoalsFor += aGoals;
                    awayRow.liveGoalsAgainst += hGoals;

                    if (hGoals > aGoals) {
                        homeRow.livePoints += 3;
                    } else if (hGoals < aGoals) {
                        awayRow.livePoints += 3;
                    } else {
                        homeRow.livePoints += 1;
                        awayRow.livePoints += 1;
                    }
                }
            });

            liveTable.sort((a: any, b: any) => {
                if (b.livePoints !== a.livePoints) return b.livePoints - a.livePoints;
                const aGD = a.liveGoalsFor - a.liveGoalsAgainst;
                const bGD = b.liveGoalsFor - b.liveGoalsAgainst;
                if (bGD !== aGD) return bGD - aGD;
                return b.liveGoalsFor - a.liveGoalsFor;
            });

            return liveTable.map((row: any, idx: number) => ({
                ...row,
                liveRank: idx + 1,
                trend: (idx + 1) < row.originalRank ? 'up' : (idx + 1) > row.originalRank ? 'down' : 'same'
            }));
        });
    }, [standingsData, matches, selectedMatchDetails]);

    return (
        <div className="w-full max-w-5xl mx-auto py-6 sm:py-8 px-2 sm:px-4 min-h-[80vh] relative z-0 animate-in fade-in duration-500 pb-24 sm:pb-20 mt-4 sm:mt-0">
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none opacity-[0.03] dark:opacity-[0.05]">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,#000_20px,#000_22px)]"></div>
            </div>

            {/* HEADER & DATE SELECTOR BAR */}
            <div className="mb-6 sm:mb-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border-2 border-slate-800 p-4 rounded-2xl sm:rounded-3xl shadow-xl text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 sm:p-2.5 bg-emerald-500/20 rounded-xl sm:rounded-2xl border border-emerald-500/30 shrink-0">
                            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-xl font-black uppercase tracking-tight">Program Meciuri</h2>
                            <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest">{matches.length} Meciuri azi</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-950 p-1.5 rounded-xl sm:rounded-2xl border border-slate-800 flex-wrap sm:flex-nowrap overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'all', label: 'Toate' },
                            { id: 'live', label: `Live (${liveCount})` },
                            { id: 'finished', label: 'Terminate' },
                            { id: 'favorites', label: `Favorite (${favoriteMatches.length})` }
                        ].map((fil) => (
                            <button
                                key={fil.id}
                                onClick={() => setSubFilter(fil.id as any)}
                                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                    subFilter === fil.id
                                        ? 'bg-emerald-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                                }`}
                            >
                                {fil.label}
                            </button>
                        ))}
                        <button
                            onClick={() => setShowNotifSettings(true)}
                            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-900 transition-colors ml-auto flex items-center gap-1.5 border border-transparent hover:border-amber-500/30 shrink-0"
                            title="Setări Notificări"
                        >
                            <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="text-[9px] sm:text-xs font-black uppercase tracking-wider hidden sm:inline">Alerte</span>
                        </button>
                    </div>
                </div>

                {/* SCROLLER ZILE - Orizontal pe mobil */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x -mx-2 px-2 sm:mx-0 sm:px-0">
                    {dates.map((item, idx) => {
                        const isSelected = item.date.toDateString() === selectedDate.toDateString();
                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedDate(item.date)}
                                className={`snap-start flex-1 min-w-[70px] sm:min-w-[90px] py-2 sm:py-3 px-2 sm:px-3 rounded-xl sm:rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
                                    isSelected
                                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/30 scale-105 sm:scale-[1.02]'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500'
                                }`}
                            >
                                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-80">{item.label}</span>
                                <span className="text-[10px] sm:text-sm font-black mt-0.5">
                                    {item.date.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' })}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* LISTA DE MECIURI PE LIGI */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-24">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3 sm:mb-4 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Se scanează transmisiile live...</p>
                </div>
            ) : filteredMatches.length === 0 ? (
                <div className="text-center py-16 sm:py-24 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 max-w-lg mx-auto p-6 sm:p-8 shadow-sm">
                    <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 mx-auto mb-3 sm:mb-4 opacity-40" />
                    <h3 className="text-lg sm:text-xl font-black uppercase tracking-widest text-slate-800 dark:text-white mb-1.5 sm:mb-2">Niciun Meci Disponibil</h3>
                    <p className="text-slate-500 font-bold uppercase text-[10px] sm:text-xs">Nu există meciuri înregistrate pentru filtrul sau data selectată.</p>
                </div>
            ) : (
                <div className="space-y-4 sm:space-y-6">
                    {sortedLeagueNames.map((leagueName) => {
                        const leagueData = groupedMatches[leagueName];
                        return (
                            <div key={leagueName} className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                <div className="bg-slate-100 dark:bg-slate-950 px-3 sm:px-6 py-2.5 sm:py-3 border-b-2 border-slate-200 dark:border-slate-800 flex items-center gap-2 sm:gap-3">
                                    {leagueData.logo ? (
                                        <img src={leagueData.logo} alt={leagueName} className="w-5 h-5 sm:w-6 sm:h-6 object-contain bg-white rounded p-0.5" />
                                    ) : (
                                        <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                                    )}
                                    <h3 className="font-black text-[10px] sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider truncate">{leagueName}</h3>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {leagueData.items.map((match: Match) => {
                                        const isFav = favoriteMatches.includes(match.fixture_id);
                                        return (
                                            <div
                                                key={match.fixture_id}
                                                onClick={() => handleMatchClick(match)}
                                                className="flex items-center justify-between p-2.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer gap-2 group"
                                            >
                                                <button
                                                    onClick={(e) => toggleFavoriteMatch(e, match.fixture_id)}
                                                    className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition shrink-0 ${isFav ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-amber-500'}`}
                                                    title="Marchează la favorite"
                                                >
                                                    <Heart className={`w-3.5 h-3.5 sm:w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                                                </button>

                                                <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-4 px-1 sm:px-2 min-w-0">
                                                    <div className="flex items-center justify-end gap-1.5 sm:gap-2 text-right min-w-0">
                                                        <span className="font-black text-[10px] sm:text-sm text-slate-900 dark:text-white uppercase tracking-tight truncate" title={match.home_team_name}>
                                                            {match.home_team_name}
                                                        </span>
                                                        <img src={match.home_team_logo} alt="home" className="w-5 h-5 sm:w-7 sm:h-7 object-contain bg-white rounded p-0.5 shrink-0" />
                                                    </div>

                                                    <div className="flex flex-col items-center justify-center px-1 sm:px-2 shrink-0 min-w-[60px] sm:min-w-[90px]">
                                                        {match.status_short === "NS" ? (
                                                            <span className="text-slate-500 font-black text-[10px] sm:text-base bg-slate-100 dark:bg-slate-800/50 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700">
                                                                {new Date(match.timestamp * 1000).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        ) : (
                                                            <div className="flex flex-col items-center">
                                                                <span className="font-black text-sm sm:text-xl text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/50 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                                    {match.home_goals ?? 0} - {match.away_goals ?? 0}
                                                                </span>
                                                                <span className="mt-0.5 sm:mt-1">{renderStatus(match)}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1.5 sm:gap-2 text-left min-w-0">
                                                        <img src={match.away_team_logo} alt="away" className="w-5 h-5 sm:w-7 sm:h-7 object-contain bg-white rounded p-0.5 shrink-0" />
                                                        <span className="font-black text-[10px] sm:text-sm text-slate-900 dark:text-white uppercase tracking-tight truncate" title={match.away_team_name}>
                                                            {match.away_team_name}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {loadingRoster && createPortal(
                <div className="fixed inset-0 z-[999999] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                    <h3 className="text-lg sm:text-xl font-black tracking-widest text-emerald-400 mt-3 sm:mt-4 animate-pulse uppercase">Scanăm Lotul...</h3>
                </div>,
                document.body
            )}

            {/* MODAL SETĂRI NOTIFICĂRI */}
            {showNotifSettings && createPortal(
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in" onClick={() => setShowNotifSettings(false)}>
                    <div className="bg-slate-900 rounded-2xl sm:rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl border-2 sm:border-4 border-slate-700" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-950 text-white p-4 sm:p-5 border-b-2 border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                                <h2 className="text-sm sm:text-lg font-black uppercase tracking-widest">Alerte Live</h2>
                            </div>
                            <button onClick={() => setShowNotifSettings(false)} className="p-1.5 sm:p-2 bg-slate-800 hover:bg-rose-600 rounded-full transition-colors text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                            <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest text-center mb-4 sm:mb-6">Alege ce primești pentru meciurile favorite</p>
                            
                            {[
                                { id: 'goals', label: 'Goluri Marcate', icon: '⚽' },
                                { id: 'matchStart', label: 'Fluier de Start', icon: '▶️' },
                                { id: 'halfTime', label: 'Pauză (Meci)', icon: '⏸️' },
                                { id: 'fullTime', label: 'Final de Meci', icon: '🏁' },
                                { id: 'redCards', label: 'Cartonașe Roșii', icon: '🟥' },
                            ].map((setting) => (
                                <div key={setting.id} className="flex items-center justify-between bg-slate-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-700">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <span className="text-lg sm:text-xl">{setting.icon}</span>
                                        <span className="text-[10px] sm:text-sm font-black text-white uppercase tracking-wider">{setting.label}</span>
                                    </div>
                                    <button 
                                        onClick={() => toggleNotifPref(setting.id as keyof NotificationPrefs)}
                                        className={`w-10 h-5 sm:w-12 sm:h-6 rounded-full transition-colors relative shrink-0 ${notifPrefs[setting.id as keyof NotificationPrefs] ? 'bg-emerald-500' : 'bg-slate-600'}`}
                                    >
                                        <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white rounded-full absolute top-[3px] sm:top-1 transition-transform ${notifPrefs[setting.id as keyof NotificationPrefs] ? 'translate-x-6 sm:translate-x-7' : 'translate-x-1'}`}></div>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL DETALII MECI */}
            {selectedMatchDetails && createPortal(
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-0 sm:p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setSelectedMatchDetails(null)}>
                    <div className="bg-white dark:bg-slate-900 sm:rounded-3xl w-full h-[100dvh] sm:h-auto sm:max-w-4xl sm:max-h-[92vh] overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)] sm:border-4 border-emerald-600/30" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-950 border-b-2 sm:border-b-4 border-emerald-600 text-white p-3 sm:p-6 shrink-0 relative overflow-hidden pt-safe">
                            <button onClick={() => setSelectedMatchDetails(null)} className="absolute top-2 right-2 sm:top-4 sm:right-4 p-1.5 sm:p-2 bg-slate-800 hover:bg-rose-600 border border-slate-700 rounded-lg sm:rounded-full transition-colors z-20">
                                <X className="w-4 h-4 sm:w-5 sm:h-5 font-bold" />
                            </button>
                            <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-[9px] sm:text-xs text-emerald-400 font-black tracking-widest mb-4 sm:mb-6 relative z-10 uppercase pr-8 sm:pr-0">
                                {selectedMatchDetails.league_logo && <img src={selectedMatchDetails.league_logo} alt="league" className="w-4 h-4 sm:w-5 sm:h-5 object-contain bg-white rounded p-0.5" />}
                                <span className="truncate max-w-[150px] sm:max-w-none">{selectedMatchDetails.league_name}</span>
                                {selectedMatchDetails.league_round && <span className="text-slate-500 hidden sm:inline">• {selectedMatchDetails.league_round}</span>}
                            </div>
                            
                            {/* SCOREBOARD-ul COMPACTAT PENTRU MOBIL */}
                            <div className="flex items-center justify-between gap-1 sm:gap-6 max-w-2xl mx-auto relative z-10 px-1 sm:px-0">
                                <div onClick={e => handleTeamClick(e, selectedMatchDetails.home_team_name)} className="flex-1 flex flex-col items-center text-center cursor-pointer group">
                                    <div className="w-12 h-12 sm:w-24 sm:h-24 bg-white rounded-xl sm:rounded-2xl p-1.5 sm:p-3 shadow-[0_0_15px_rgba(255,255,255,0.2)] mb-1.5 sm:mb-3 group-hover:scale-110 transition-transform">
                                        <img src={selectedMatchDetails.home_team_logo} alt={selectedMatchDetails.home_team_name} className="w-full h-full object-contain" />
                                    </div>
                                    <span className="font-black text-[9px] sm:text-base tracking-tight group-hover:text-emerald-400 transition-colors line-clamp-2 max-w-[80px] sm:max-w-none">{selectedMatchDetails.home_team_name}</span>
                                </div>
                                <div className="flex flex-col items-center justify-center px-1 sm:px-4 shrink-0">
                                    <div className="text-2xl sm:text-6xl font-black tracking-tighter bg-slate-900 border-2 border-slate-700 shadow-inner px-3 sm:px-6 py-1 sm:py-3 rounded-xl sm:rounded-2xl flex items-center justify-center min-w-[70px] sm:min-w-[160px]">
                                        {selectedMatchDetails.status_short === "NS" ? <span className="text-slate-600">- : -</span> : <span className={["1H", "2H", "HT", "LIVE", "P"].includes(selectedMatchDetails.status_short) ? "text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" : "text-white"}>{selectedMatchDetails.home_goals ?? 0} - {selectedMatchDetails.away_goals ?? 0}</span>}
                                    </div>
                                    <div className="mt-1.5 sm:mt-3 bg-slate-800 px-2 sm:px-3 py-0.5 sm:py-1 rounded border border-slate-700">{renderStatus(selectedMatchDetails)}</div>
                                </div>
                                <div onClick={e => handleTeamClick(e, selectedMatchDetails.away_team_name)} className="flex-1 flex flex-col items-center text-center cursor-pointer group">
                                    <div className="w-12 h-12 sm:w-24 sm:h-24 bg-white rounded-xl sm:rounded-2xl p-1.5 sm:p-3 shadow-[0_0_15px_rgba(255,255,255,0.2)] mb-1.5 sm:mb-3 group-hover:scale-110 transition-transform">
                                        <img src={selectedMatchDetails.away_team_logo} alt={selectedMatchDetails.away_team_name} className="w-full h-full object-contain" />
                                    </div>
                                    <span className="font-black text-[9px] sm:text-base tracking-tight group-hover:text-emerald-400 transition-colors line-clamp-2 max-w-[80px] sm:max-w-none">{selectedMatchDetails.away_team_name}</span>
                                </div>
                            </div>
                        </div>

                        {/* TABS CULISANTE PE MOBIL */}
                        <div className="flex border-b-2 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shrink-0 overflow-x-auto scrollbar-hide snap-x">
                            {[
                                { id: 'events', label: 'Evenimente', icon: Clock }, 
                                { id: 'lineups', label: 'Tactică', icon: Users }, 
                                { id: 'stats', label: 'Statistici', icon: BarChart2 }, 
                                { id: 'standings', label: 'Clasament', icon: ListOrdered },
                                { id: 'h2h', label: 'H2H & Formă', icon: History }
                            ].map(tab => {
                                const isActive = activeMatchTab === tab.id;
                                return (
                                    <button key={tab.id} onClick={() => { setActiveMatchTab(tab.id as any); if (tab.id === 'standings') fetchStandings(selectedMatchDetails.league_id); }} className={`snap-start flex-1 py-3 sm:py-3.5 px-3 sm:px-4 text-[9px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 sm:gap-2 border-b-4 transition-all whitespace-nowrap min-w-fit ${isActive ? 'border-emerald-600 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-inner' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
                                        <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {tab.label}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 sm:p-6 bg-slate-50 dark:bg-slate-900 pb-safe-bottom">
                            {loadingMatchDetails ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3 sm:mb-4"></div>
                                    <p className="text-[10px] sm:text-xs font-black tracking-widest text-slate-500 uppercase">Se decriptează foaia de joc...</p>
                                </div>
                            ) : (
                                <>
                                    {activeMatchTab === 'h2h' && renderH2HSection()}

                                    {activeMatchTab === 'events' && (
                                        <div>
                                            {!selectedMatchDetails.events || selectedMatchDetails.events.length === 0 ? (
                                                <div className="text-center py-12 sm:py-16 bg-white dark:bg-slate-950 rounded-2xl sm:rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 font-bold tracking-widest text-[10px] sm:text-xs uppercase mx-2 sm:mx-0">Niciun eveniment notabil până acum.</div>
                                            ) : (
                                                <div className="bg-white dark:bg-slate-950 rounded-xl sm:rounded-3xl border sm:border-2 border-slate-200 dark:border-slate-800 divide-y sm:divide-y-2 divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm mx-1 sm:mx-0">
                                                    {selectedMatchDetails.ht_home_goals !== null && selectedMatchDetails.ht_home_goals !== undefined && (
                                                        <div className="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-black text-center py-2 sm:py-2.5 text-[9px] sm:text-xs tracking-widest uppercase">Pauză (HT) • Scor: <span className="text-slate-900 dark:text-white">{selectedMatchDetails.ht_home_goals} - {selectedMatchDetails.ht_away_goals}</span></div>
                                                    )}
                                                    {selectedMatchDetails.events.map((ev: any, idx: number) => {
                                                        const isHome = ev.team?.id === selectedMatchDetails.home_team_id;
                                                        let icon = "•";
                                                        if (ev.type === "Goal") icon = "⚽"; else if (ev.type === "Card" && ev.detail === "Yellow Card") icon = "🟨"; else if (ev.type === "Card" && ev.detail?.includes("Red")) icon = "🟥"; else if (ev.type === "subst") icon = "🔄";
                                                        return (
                                                            <div key={idx} className={`flex items-center p-2.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors ${isHome ? 'flex-row' : 'flex-row-reverse text-right'}`}>
                                                                <div className="w-8 sm:w-16 font-black text-slate-900 dark:text-white text-center shrink-0 text-[10px] sm:text-base bg-slate-100 dark:bg-slate-800 py-0.5 sm:py-1 rounded">{ev.time?.elapsed}'</div>
                                                                <div className="text-sm sm:text-2xl mx-2 sm:mx-4 shrink-0 drop-shadow-md">{icon}</div>
                                                                <div className="flex-1 min-w-0">
                                                                    {ev.type === "subst" ? (
                                                                        <>
                                                                            <p className="font-black text-emerald-600 dark:text-emerald-500 tracking-tight text-[9px] sm:text-sm truncate uppercase">INTRĂ: {ev.assist?.name || "N/A"}</p>
                                                                            <p className="text-[8px] sm:text-[10px] font-bold text-rose-600 dark:text-rose-500 tracking-widest truncate mt-0.5 uppercase">IESE: {ev.player?.name}</p>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <p className="font-black text-slate-900 dark:text-white tracking-tight text-[10px] sm:text-sm truncate">{ev.player?.name}</p>
                                                                            {ev.assist?.name && <p className="text-[8px] sm:text-[10px] font-bold text-slate-500 tracking-widest truncate mt-0.5">Pasă: {ev.assist.name}</p>}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {["FT", "AET", "PEN"].includes(selectedMatchDetails.status_short) && (
                                                        <div className="bg-slate-900 border-t-2 sm:border-t-4 border-emerald-500 text-white font-black text-center py-2 sm:py-3 text-[9px] sm:text-xs tracking-widest uppercase">Fluier Final • <span className="text-emerald-400">Scor: {selectedMatchDetails.home_goals} - {selectedMatchDetails.away_goals}</span></div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeMatchTab === 'lineups' && (
                                        <div>
                                            {!selectedMatchDetails.lineups || selectedMatchDetails.lineups.length === 0 ? (
                                                <div className="text-center py-12 sm:py-16 bg-white dark:bg-slate-950 rounded-2xl sm:rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 font-bold tracking-widest text-[10px] sm:text-xs uppercase mx-2 sm:mx-0">Antrenorii nu au trimis foaia de joc.</div>
                                            ) : (
                                                <div className="space-y-4 sm:space-y-6">
                                                    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 bg-slate-200 dark:bg-slate-800 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl max-w-lg mx-auto shadow-inner border border-slate-300 dark:border-slate-700">
                                                        <button onClick={() => setLineupViewMode('both')} className={`flex-1 py-1.5 sm:py-2.5 px-2 sm:px-3 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-black tracking-widest transition-all uppercase ${lineupViewMode === 'both' ? 'bg-emerald-600 text-white shadow-md' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'}`}>⚽ Teren <span className="hidden sm:inline">(Ambele)</span></button>
                                                        <button onClick={() => setLineupViewMode('home')} className={`flex-1 py-1.5 sm:py-2.5 px-2 sm:px-3 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-black tracking-widest transition-all flex items-center justify-center gap-1 sm:gap-1.5 uppercase ${lineupViewMode === 'home' ? 'bg-slate-900 text-white shadow-md border border-slate-700' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'}`}>
                                                            {homeTeamLineup?.team?.logo && <img src={homeTeamLineup.team.logo} className="w-3 h-3 sm:w-4 sm:h-4 object-contain bg-white rounded p-0.5 shrink-0" />}
                                                            <span className="truncate max-w-[60px] sm:max-w-[95px]">{homeTeamLineup?.team?.name || 'Gazde'}</span>
                                                        </button>
                                                        <button onClick={() => setLineupViewMode('away')} className={`flex-1 py-1.5 sm:py-2.5 px-2 sm:px-3 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-black tracking-widest transition-all flex items-center justify-center gap-1 sm:gap-1.5 uppercase ${lineupViewMode === 'away' ? 'bg-blue-600 text-white shadow-md border border-blue-500' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'}`}>
                                                            {awayTeamLineup?.team?.logo && <img src={awayTeamLineup.team.logo} className="w-3 h-3 sm:w-4 sm:h-4 object-contain bg-white rounded p-0.5 shrink-0" />}
                                                            <span className="truncate max-w-[60px] sm:max-w-[95px]">{awayTeamLineup?.team?.name || 'Oaspeți'}</span>
                                                        </button>
                                                    </div>

                                                    <div className={`relative w-full ${lineupViewMode === 'both' ? 'h-[750px] sm:h-[950px]' : 'h-[500px] sm:h-[700px]'} rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl border-2 sm:border-8 border-slate-900 flex flex-col justify-between p-1 sm:p-5 select-none`} style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #10b981 0px, #10b981 40px, #059669 40px, #059669 80px)' }}>
                                                        <div className="absolute inset-1.5 sm:inset-3 border-2 sm:border-4 border-white/50 rounded-lg sm:rounded-xl pointer-events-none"></div>
                                                        <div className="absolute top-1/2 inset-x-1.5 sm:inset-x-3 h-0.5 sm:h-1 bg-white/50 -translate-y-1/2 pointer-events-none"></div>
                                                        <div className="absolute top-1/2 left-1/2 w-16 h-16 sm:w-40 sm:h-40 border-2 sm:border-4 border-white/50 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                                                        <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 sm:w-3 sm:h-3 bg-white/70 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

                                                        {lineupViewMode === 'both' ? (
                                                            <>
                                                                <div className="flex-1 flex flex-col justify-around relative z-10 pb-2 sm:pb-4 pt-1">
                                                                    {homeRowsTopDown.map((rowItems, rIdx) => (
                                                                        <div key={`home-row-${rIdx}`} className="flex items-center justify-around px-1 sm:px-2">{rowItems.map((item: any, pIdx: number) => renderPitchPlayerNode(item, false, pIdx))}</div>
                                                                    ))}
                                                                </div>
                                                                <div className="flex-1 flex flex-col justify-around relative z-10 pt-2 sm:pt-4 pb-1">
                                                                    {awayRowsBottomUp.map((rowItems, rIdx) => (
                                                                        <div key={`away-row-${rIdx}`} className="flex items-center justify-around px-1 sm:px-2">{rowItems.map((item: any, pIdx: number) => renderPitchPlayerNode(item, true, pIdx))}</div>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="flex-1 flex flex-col justify-around relative z-10 py-2 sm:py-4">
                                                                {singleTeamRows.map((rowItems, rIdx) => (
                                                                    <div key={`single-row-${rIdx}`} className="flex items-center justify-around px-1 sm:px-2">{rowItems.map((item: any, pIdx: number) => renderPitchPlayerNode(item, lineupViewMode === 'away', pIdx))}</div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeMatchTab === 'stats' && (
                                        <div className="px-1 sm:px-0">
                                            {!selectedMatchDetails.statistics || selectedMatchDetails.statistics.length < 2 ? (
                                                <div className="text-center py-12 sm:py-16 bg-white dark:bg-slate-950 rounded-2xl sm:rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 font-bold tracking-widest text-[10px] sm:text-xs uppercase">Datele statistice nu au fost procesate încă.</div>
                                            ) : (
                                                <>
                                                    <div className="bg-white dark:bg-slate-950 rounded-2xl sm:rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-8 space-y-4 sm:space-y-6 shadow-sm">
                                                        {(() => {
                                                            const homeStats = selectedMatchDetails.statistics[0].statistics;
                                                            const awayStats = selectedMatchDetails.statistics[1].statistics;
                                                            return homeStats.map((statItem: any) => {
                                                                const homeValRaw = statItem.value ?? 0;
                                                                const awayStatItem = awayStats.find((s: any) => s.type === statItem.type);
                                                                const awayValRaw = awayStatItem?.value ?? 0;
                                                                const homeNum = parseFloat(String(homeValRaw).replace('%', '')) || 0;
                                                                const awayNum = parseFloat(String(awayValRaw).replace('%', '')) || 0;
                                                                const total = homeNum + awayNum;
                                                                const homePercent = total > 0 ? Math.round((homeNum / total) * 100) : 50;
                                                                const awayPercent = 100 - homePercent;
                                                                return (
                                                                    <div key={statItem.type} className="space-y-1.5 sm:space-y-2">
                                                                        <div className="flex justify-between text-[11px] sm:text-base font-black">
                                                                            <span className="text-slate-900 dark:text-white w-8 sm:w-10 text-left">{homeValRaw}</span>
                                                                            <span className="text-slate-400 text-[8px] sm:text-[10px] tracking-widest text-center flex-1 uppercase truncate px-1">{translateStatLabel(statItem.type)}</span>
                                                                            <span className="text-slate-900 dark:text-white w-8 sm:w-10 text-right">{awayValRaw}</span>
                                                                        </div>
                                                                        <div className="w-full h-2 sm:h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-700">
                                                                            <div style={{ width: `${homePercent}%` }} className="bg-emerald-500 h-full transition-all"></div>
                                                                            <div style={{ width: `${awayPercent}%` }} className="bg-blue-500 h-full transition-all"></div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {activeMatchTab === 'standings' && (
                                        <div>
                                            {loadingStandings ? (
                                                <div className="flex flex-col items-center justify-center py-12 sm:py-16">
                                                    <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3 sm:mb-4"></div>
                                                    <span className="text-[8px] sm:text-[10px] font-black tracking-widest text-slate-500 uppercase">Se preia clasamentul oficial...</span>
                                                </div>
                                            ) : !standingsData || standingsData.length === 0 ? (
                                                <div className="text-center py-12 sm:py-16 bg-white dark:bg-slate-950 rounded-2xl sm:rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 font-bold tracking-widest text-[10px] sm:text-xs uppercase mx-2 sm:mx-0">Clasamentul nu este disponibil în arhivă.</div>
                                            ) : (
                                                <div className="space-y-4 sm:space-y-6 mx-1 sm:mx-0">
                                                    {liveStandings.map((groupTable: any[], gIdx: number) => (
                                                        <div key={gIdx} className="bg-white dark:bg-slate-950 rounded-xl sm:rounded-3xl border sm:border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm relative">
                                                            <div className="overflow-x-auto scrollbar-hide">
                                                                <table className="w-full text-[10px] sm:text-sm text-left min-w-[300px]">
                                                                    <thead className="bg-slate-900 text-slate-400 font-black tracking-widest text-[8px] sm:text-[9px] border-b sm:border-b-2 border-slate-700 uppercase">
                                                                        <tr>
                                                                            <th className="py-2 sm:py-4 px-1 sm:px-3 text-center w-8 sm:w-12">Loc</th>
                                                                            <th className="py-2 sm:py-4 px-1 sm:px-3 text-center w-6 sm:w-8">+/-</th>
                                                                            <th className="py-2 sm:py-4 px-1 sm:px-3">Formație</th>
                                                                            <th className="py-2 sm:py-4 px-1 sm:px-3 text-center">J</th>
                                                                            <th className="py-2 sm:py-4 px-1 sm:px-3 text-center">G</th>
                                                                            <th className="py-2 sm:py-4 px-1 sm:px-3 text-center text-emerald-400">PCT</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                                        {groupTable.map((row: any) => {
                                                                            const isCurrentTeam = row.team?.id === selectedMatchDetails.home_team_id || row.team?.id === selectedMatchDetails.away_team_id;
                                                                            const isPlayingNow = row.isLivePlaying;
                                                                            return (
                                                                                <tr key={row.team?.id || row.originalRank} onClick={e => row.team?.name && handleTeamClick(e, row.team.name)} className={`cursor-pointer transition-colors ${isPlayingNow ? 'bg-amber-50 dark:bg-amber-900/10' : isCurrentTeam ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                                                                                    <td className="py-2 sm:py-3.5 px-1 sm:px-3 text-center font-black text-slate-500">{row.liveRank}</td>
                                                                                    <td className="py-2 sm:py-3.5 px-1 sm:px-3 text-center">
                                                                                        {row.trend === 'up' && <ArrowUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-500 mx-auto" />}
                                                                                        {row.trend === 'down' && <ArrowDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-500 mx-auto" />}
                                                                                        {row.trend === 'same' && <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-300 dark:text-slate-600 mx-auto" />}
                                                                                    </td>
                                                                                    <td className="py-2 sm:py-3.5 px-1 sm:px-3 flex items-center gap-1.5 sm:gap-3">
                                                                                        <img src={row.team?.logo} alt="logo" className="w-4 h-4 sm:w-6 sm:h-6 object-contain bg-white rounded p-0.5 shrink-0" />
                                                                                        <span className={`font-black tracking-tight truncate max-w-[85px] sm:max-w-[200px] ${isCurrentTeam ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{row.team?.name}</span>
                                                                                        {isPlayingNow && <span className="ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0.5 bg-rose-600 text-white text-[6px] sm:text-[8px] font-black rounded uppercase animate-pulse">Live</span>}
                                                                                    </td>
                                                                                    <td className="py-2 sm:py-3.5 px-1 sm:px-3 text-center font-bold text-slate-500 dark:text-slate-400">{row.livePlayed}</td>
                                                                                    <td className="py-2 sm:py-3.5 px-1 sm:px-3 text-center font-bold text-slate-500 dark:text-slate-400 text-[9px] sm:text-[11px] whitespace-nowrap">{row.liveGoalsFor}:{row.liveGoalsAgainst}</td>
                                                                                    <td className={`py-2 sm:py-3.5 px-1 sm:px-3 text-center font-black text-xs sm:text-sm ${isPlayingNow ? 'text-amber-500' : isCurrentTeam ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{row.livePoints}</td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}