import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Calendar,
    Trophy,
    Activity,
    X,
    Globe,
    User as UserIcon,
    Star,
    MapPin,
    Users,
    BarChart2,
    ListOrdered,
    Clock,
    Scale,
    Bookmark,
    Check,
    TrendingUp
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

// === FUNCȚII DE SCOUTING & GRAFICE (Preluate din HomeSection) ===
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

    // 1. FINALIZARE SAU APĂRARE
    let primaryScore = 20;
    let primaryLabel = "Finalizare";
    if (isDefensive) {
        primaryLabel = "Defensivă";
        primaryScore = Math.min(99, Math.max(20, Math.round(35 + (rating > 6.8 ? (rating - 6.8) * 40 : 0) + (Math.min(apps, 30) * 0.8))));
    } else {
        primaryScore = Math.min(99, Math.max(20, Math.round(25 + (goalsPer90 * 75) + (Math.min(goals, 20) * 1.5))));
    }

    // 2. CREAȚIE
    const creativityScore = Math.min(99, Math.max(20, Math.round(25 + (assistsPer90 * 100) + (Math.min(assists, 15) * 1.5))));

    // 3. CONSTANȚĂ
    const consistencyScore = Math.min(99, Math.max(25, Math.round(20 + (Math.min(apps, 38) * 1.2) + (Math.min(minutes, 3000) / 75))));

    // 4. FORMĂ
    let formScore = 30;
    if (rating > 5.5) {
        formScore = Math.min(99, Math.max(30, Math.round(30 + ((rating - 6.0) * 35))));
    }

    // 5. IMPACT
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
    const size = 230;
    const center = size / 2;
    const radius = 78;
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
                    return (
                        <polygon key={level} points={pts} fill="none" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1" strokeDasharray={level < 100 ? "3 3" : undefined} />
                    );
                })}
                {axes.map((_, idx) => {
                    const end = getCoordinates(idx, 100);
                    return <line key={idx} x1={center} y1={center} x2={end.x} y2={end.y} stroke="rgba(16, 185, 129, 0.4)" strokeWidth="1" />;
                })}
                {m2 && <polygon points={buildPolygonPoints(m2.radar)} fill="rgba(59, 130, 246, 0.4)" stroke="#2563eb" strokeWidth="3" />}
                <polygon points={buildPolygonPoints(m1.radar)} fill="rgba(250, 204, 21, 0.4)" stroke="#facc15" strokeWidth="3" />
                {m1.radar.map((item, idx) => {
                    const pt1 = getCoordinates(idx, item.value);
                    const labelPos = getCoordinates(idx, 120);
                    return (
                        <g key={idx}>
                            <circle cx={pt1.x} cy={pt1.y} r="4" fill="#facc15" stroke="#fff" strokeWidth="1.5" />
                            <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="middle" className="text-[10px] font-black fill-slate-700 dark:fill-slate-200 uppercase tracking-wider">
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

    const [selectedTeam, setSelectedTeam] = useState<SquadData | null>(null);
    const [loadingRoster, setLoadingRoster] = useState(false);
    
    // Stări pentru jucători, comparare și watchlist (Sincronizate cu HomeSection)
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
    const [activeMatchTab, setActiveMatchTab] = useState<'events' | 'lineups' | 'stats' | 'standings'>('events');
    const [standingsData, setStandingsData] = useState<any[]>([]);
    const [loadingStandings, setLoadingStandings] = useState(false);

    const [lineupViewMode, setLineupViewMode] = useState<'both' | 'home' | 'away'>('both');

    // === SOLICITĂ PERMISIUNEA PENTRU NOTIFICĂRI ===
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

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
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.user) {
                        if (data.user.favoriteMatches) setFavoriteMatches(data.user.favoriteMatches);
                        if (data.user.scoutWatchlist) {
                            setWatchlistIds(data.user.scoutWatchlist);
                            localStorage.setItem('scout_watchlist_ids', JSON.stringify(data.user.scoutWatchlist));
                        }
                    }
                })
                .catch(() => {});
        }
    }, [userEmail]);

    const localDateStr = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000)
        .toISOString()
        .split('T')[0];

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
                    if (favoriteMatches.includes(updatedMatch.fixture_id)) {
                        const homeGoal = updatedMatch.home_goals !== oldMatch.home_goals && updatedMatch.home_goals !== null;
                        const awayGoal = updatedMatch.away_goals !== oldMatch.away_goals && updatedMatch.away_goals !== null;
                        if ((homeGoal || awayGoal) && "Notification" in window && Notification.permission === "granted") {
                            new Notification("⚽ GOL!", {
                                body: `${updatedMatch.home_team_name} ${updatedMatch.home_goals} - ${updatedMatch.away_goals} ${updatedMatch.away_team_name}`,
                                icon: updatedMatch.league_logo || '/icon-192.png',
                                badge: '/icon-192.png',
                                vibrate: [200, 100, 200]
                            } as any);
                        }
                    }
                    const newMatches = [...oldMatches];
                    newMatches[index] = { ...newMatches[index], ...updatedMatch };
                    return newMatches;
                }
                return oldMatches;
            });

            setSelectedMatchDetails(prev =>
                prev && prev.fixture_id === updatedMatch.fixture_id ? { ...prev, ...updatedMatch } : prev
            );
        });
        return () => { socket.off("live_match_update"); };
    }, [favoriteMatches, queryClient]);

    const toggleFavoriteMatch = async (e: React.MouseEvent, fixtureId: number) => {
        e.stopPropagation();
        if (!userEmail) { alert("Trebuie să ai legitimație (cont) pentru a salva meciuri la favorite!"); return; }
        try {
            const res = await fetch(`https://football-backend-m2a4.onrender.com/api/users/favorite-matches/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, fixtureId })
            });
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
            await fetch(`https://football-backend-m2a4.onrender.com/api/users/watchlist/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, playerId })
            });
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
                    if (!res.ok) throw new Error("Nu am putut prelua lotul. Echipa încă nu este înregistrată complet la comisie.");
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
        setStandingsData([]);
        setLineupViewMode('both');
        setActiveMatchTab(match.status_short === "NS" ? 'standings' : 'events');

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

            if (fullData.status_short === "NS" && (!fullData.lineups || fullData.lineups.length === 0)) {
                fetchStandings(fullData.league_id);
            }
        } catch (err) { console.error("Eroare detalii meci:", err); } finally { setLoadingMatchDetails(false); }
    };

    const fetchStandings = async (leagueId: number) => {
        if (standingsData.length > 0) return;
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
        const isFav = favoriteMatches.includes(match.fixture_id);
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
        if (status === "NS") {
            return <span className="text-slate-500 font-black text-xs sm:text-sm">{new Date(match.timestamp * 1000).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>;
        }
        if (liveStatuses.includes(status)) {
            return <span className="text-rose-600 font-black animate-pulse text-xs sm:text-sm">{match.elapsed ? `${match.elapsed}'` : status}</span>;
        }
        if (status === "FT" || status === "AET" || status === "PEN") {
            return <span className="text-slate-400 font-black text-[10px] sm:text-xs uppercase tracking-widest">Final</span>;
        }
        return <span className="text-amber-500 font-black text-[10px] sm:text-xs uppercase tracking-widest">{status}</span>;
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
            <div key={item?.player?.id || `${pName}-${idx}`} onClick={() => handleLineupPlayerClick(pName)} className="cursor-pointer group flex flex-col items-center select-none w-[50px] sm:w-[85px] z-10 mx-1" title={`${pName} (#${pNum}) - Poziție: ${pPos || 'Titular'}`}>
                <div className="relative">
                    <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full ${shirtStyle} font-black text-xs sm:text-base flex items-center justify-center border-[3px] sm:border-4 group-hover:scale-110 transition-transform`}>{pNum}</div>
                    {ratingNum > 0 && <span className={`absolute -top-1.5 -right-2 sm:-right-3 ${ratingBg} text-white text-[8px] sm:text-[9px] font-black px-1 sm:px-1.5 py-0.5 rounded shadow-sm border border-white/30`}>{ratingNum.toFixed(1)}</span>}
                    {badges.goals > 0 && <span className="absolute -bottom-1 -right-1 sm:-bottom-1.5 sm:-right-2 bg-white text-[8px] sm:text-[10px] rounded-full px-1 shadow border border-slate-200 font-black text-slate-900">⚽{badges.goals > 1 ? badges.goals : ''}</span>}
                    {(badges.yellow || badges.red) && <span className={`absolute -top-1 -left-1 w-2.5 h-3 sm:w-3 sm:h-4 rounded-sm shadow border border-white/50 ${badges.red ? 'bg-red-600' : 'bg-yellow-400'}`} />}
                    {badges.subOut && <span className="absolute -bottom-1 -left-1 sm:-bottom-1.5 sm:-left-2 bg-slate-900 text-white text-[7px] sm:text-[8px] rounded-full w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center shadow border border-white/50">🔄</span>}
                </div>
                <div className="mt-1 bg-slate-950/90 text-white text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md max-w-full text-center border border-white/10 tracking-wide leading-tight w-full break-words">{shortName}</div>
            </div>
        );
    };

    const homeTeamLineup = selectedMatchDetails?.lineups?.[0] || null;
    const awayTeamLineup = selectedMatchDetails?.lineups?.[1] || null;
    const homeRowsTopDown = buildExactCoachRows(homeTeamLineup?.startXI || [], homeTeamLineup?.formation, true);
    const awayRowsBottomUp = buildExactCoachRows(awayTeamLineup?.startXI || [], awayTeamLineup?.formation, false);
    const singleTeamLineup = lineupViewMode === 'home' ? homeTeamLineup : awayTeamLineup;
    const singleTeamRows = buildExactCoachRows(singleTeamLineup?.startXI || [], singleTeamLineup?.formation, false);

    return (
        <div className="max-w-5xl mx-auto py-8 px-2 sm:px-4 min-h-[80vh] relative z-0 animate-in fade-in duration-500 pb-20">
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none opacity-[0.03] dark:opacity-[0.05]">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,#000_20px,#000_22px)]"></div>
            </div>
            
            {loadingRoster && (
                <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                    <h3 className="text-xl font-black tracking-widest text-emerald-400 mt-4 animate-pulse uppercase">Scanăm Lotul...</h3>
                </div>
            )}

            {selectedMatchDetails && (
                <div className="fixed inset-0 z-[99995] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setSelectedMatchDetails(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-emerald-600/30" onClick={e => e.stopPropagation()}>
                        {/* SCOREBOARD HEADER */}
                        <div className="bg-slate-950 border-b-4 border-emerald-600 text-white p-4 sm:p-6 shrink-0 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.2),transparent_70%)] pointer-events-none"></div>
                            <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,#fff_2px,#fff_4px)] pointer-events-none" style={{ backgroundSize: '4px 100%' }}></div>
                            <button onClick={() => setSelectedMatchDetails(null)} className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 bg-slate-800 hover:bg-rose-600 border border-slate-700 rounded-full transition-colors z-20">
                                <X className="w-5 h-5 font-bold" />
                            </button>
                            <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs text-emerald-400 font-black tracking-widest mb-6 relative z-10 uppercase">
                                {selectedMatchDetails.league_logo && <img src={selectedMatchDetails.league_logo} alt="league" className="w-5 h-5 object-contain bg-white rounded-md p-0.5" />}
                                <span>{selectedMatchDetails.league_name}</span>
                                {selectedMatchDetails.league_round && <span className="text-slate-500">• {selectedMatchDetails.league_round}</span>}
                            </div>
                            <div className="flex items-center justify-between gap-2 sm:gap-6 max-w-2xl mx-auto relative z-10">
                                <div onClick={e => handleTeamClick(e, selectedMatchDetails.home_team_name)} className="flex-1 flex flex-col items-center text-center cursor-pointer group">
                                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-2xl p-2 sm:p-3 shadow-[0_0_15px_rgba(255,255,255,0.2)] mb-3 group-hover:scale-110 transition-transform">
                                        <img src={selectedMatchDetails.home_team_logo} alt={selectedMatchDetails.home_team_name} className="w-full h-full object-contain" />
                                    </div>
                                    <span className="font-black text-xs sm:text-base tracking-tight group-hover:text-emerald-400 transition-colors line-clamp-2">{selectedMatchDetails.home_team_name}</span>
                                </div>
                                <div className="flex flex-col items-center justify-center px-2 sm:px-4 shrink-0">
                                    <div className="text-4xl sm:text-6xl font-black tracking-tighter bg-slate-900 border-2 border-slate-700 shadow-inner px-4 sm:px-6 py-2 sm:py-3 rounded-2xl flex items-center justify-center min-w-[120px] sm:min-w-[160px]">
                                        {selectedMatchDetails.status_short === "NS" ? <span className="text-slate-600">- : -</span> : <span className={["1H", "2H", "HT", "LIVE", "P"].includes(selectedMatchDetails.status_short) ? "text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" : "text-white"}>{selectedMatchDetails.home_goals ?? 0} - {selectedMatchDetails.away_goals ?? 0}</span>}
                                    </div>
                                    <div className="mt-3 bg-slate-800 px-3 py-1 rounded border border-slate-700">{renderStatus(selectedMatchDetails)}</div>
                                </div>
                                <div onClick={e => handleTeamClick(e, selectedMatchDetails.away_team_name)} className="flex-1 flex flex-col items-center text-center cursor-pointer group">
                                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-2xl p-2 sm:p-3 shadow-[0_0_15px_rgba(255,255,255,0.2)] mb-3 group-hover:scale-110 transition-transform">
                                        <img src={selectedMatchDetails.away_team_logo} alt={selectedMatchDetails.away_team_name} className="w-full h-full object-contain" />
                                    </div>
                                    <span className="font-black text-xs sm:text-base tracking-tight group-hover:text-emerald-400 transition-colors line-clamp-2">{selectedMatchDetails.away_team_name}</span>
                                </div>
                            </div>
                        </div>

                        {/* NAVIGARE TAB-URI */}
                        <div className="flex border-b-2 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shrink-0 overflow-x-auto scrollbar-hide">
                            {[{ id: 'events', label: 'Evenimente', icon: Clock }, { id: 'lineups', label: 'Tactică', icon: Users }, { id: 'stats', label: 'Statistici', icon: BarChart2 }, { id: 'standings', label: 'Clasament', icon: ListOrdered }].map(tab => {
                                const isActive = activeMatchTab === tab.id;
                                return (
                                    <button key={tab.id} onClick={() => { setActiveMatchTab(tab.id as any); if (tab.id === 'standings') fetchStandings(selectedMatchDetails.league_id); }} className={`flex-1 py-3.5 px-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border-b-4 transition-all whitespace-nowrap ${isActive ? 'border-emerald-600 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-inner' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
                                        <tab.icon className="w-4 h-4" /> {tab.label}
                                    </button>
                                )
                            })}
                        </div>

                        {/* CONȚINUT TAB-URI */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-900">
                            {loadingMatchDetails ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <p className="text-xs font-black tracking-widest text-slate-500 uppercase">Se decriptează foaia de joc...</p>
                                </div>
                            ) : (
                                <>
                                    {/* EVENIMENTE */}
                                    {activeMatchTab === 'events' && (
                                        <div>
                                            {!selectedMatchDetails.events || selectedMatchDetails.events.length === 0 ? (
                                                <div className="text-center py-16 bg-white dark:bg-slate-950 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 font-bold tracking-widest text-xs uppercase">Niciun eveniment notabil până acum.</div>
                                            ) : (
                                                <div className="bg-white dark:bg-slate-950 rounded-3xl border-2 border-slate-200 dark:border-slate-800 divide-y-2 divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
                                                    {selectedMatchDetails.ht_home_goals !== null && selectedMatchDetails.ht_home_goals !== undefined && (
                                                        <div className="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-black text-center py-2.5 text-[10px] sm:text-xs tracking-widest uppercase">Pauză (HT) • Scor: <span className="text-slate-900 dark:text-white">{selectedMatchDetails.ht_home_goals} - {selectedMatchDetails.ht_away_goals}</span></div>
                                                    )}
                                                    {selectedMatchDetails.events.map((ev: any, idx: number) => {
                                                        const isHome = ev.team?.id === selectedMatchDetails.home_team_id;
                                                        let icon = "•";
                                                        if (ev.type === "Goal") icon = "⚽"; else if (ev.type === "Card" && ev.detail === "Yellow Card") icon = "🟨"; else if (ev.type === "Card" && ev.detail?.includes("Red")) icon = "🟥"; else if (ev.type === "subst") icon = "🔄";
                                                        return (
                                                            <div key={idx} className={`flex items-center p-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors ${isHome ? 'flex-row' : 'flex-row-reverse text-right'}`}>
                                                                <div className="w-12 sm:w-16 font-black text-slate-900 dark:text-white text-center shrink-0 text-sm sm:text-base bg-slate-100 dark:bg-slate-800 py-1 rounded">{ev.time?.elapsed}'</div>
                                                                <div className="text-xl sm:text-2xl mx-3 sm:mx-4 shrink-0 drop-shadow-md">{icon}</div>
                                                                <div className="flex-1 min-w-0">
                                                                    {ev.type === "subst" ? (
                                                                        <>
                                                                            <p className="font-black text-emerald-600 dark:text-emerald-500 tracking-tight text-xs sm:text-sm truncate uppercase">INTRĂ: {ev.assist?.name || "N/A"}</p>
                                                                            <p className="text-[10px] font-bold text-rose-600 dark:text-rose-500 tracking-widest truncate mt-0.5 uppercase">IESE: {ev.player?.name}</p>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <p className="font-black text-slate-900 dark:text-white tracking-tight text-xs sm:text-sm truncate">{ev.player?.name}</p>
                                                                            {ev.assist?.name && <p className="text-[10px] font-bold text-slate-500 tracking-widest truncate mt-0.5">Pasă: {ev.assist.name}</p>}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {["FT", "AET", "PEN"].includes(selectedMatchDetails.status_short) && (
                                                        <div className="bg-slate-900 border-t-4 border-emerald-500 text-white font-black text-center py-3 text-[10px] sm:text-xs tracking-widest uppercase">Fluier Final • <span className="text-emerald-400">Scor Oficial: {selectedMatchDetails.home_goals} - {selectedMatchDetails.away_goals}</span></div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* LINEUPS (Teren de Fotbal) */}
                                    {activeMatchTab === 'lineups' && (
                                        <div>
                                            {!selectedMatchDetails.lineups || selectedMatchDetails.lineups.length === 0 ? (
                                                <div className="text-center py-16 bg-white dark:bg-slate-950 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 font-bold tracking-widest text-xs uppercase">Antrenorii nu au trimis foaia de joc.</div>
                                            ) : (
                                                <div className="space-y-6">
                                                    <div className="flex flex-wrap items-center justify-center gap-2 bg-slate-200 dark:bg-slate-800 p-2 rounded-2xl max-w-lg mx-auto shadow-inner border border-slate-300 dark:border-slate-700">
                                                        <button onClick={() => setLineupViewMode('both')} className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] sm:text-xs font-black tracking-widest transition-all uppercase ${lineupViewMode === 'both' ? 'bg-emerald-600 text-white shadow-md' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'}`}>⚽ Teren (Ambele)</button>
                                                        <button onClick={() => setLineupViewMode('home')} className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] sm:text-xs font-black tracking-widest transition-all flex items-center justify-center gap-1.5 uppercase ${lineupViewMode === 'home' ? 'bg-slate-900 text-white shadow-md border border-slate-700' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'}`}>
                                                            {homeTeamLineup?.team?.logo && <img src={homeTeamLineup.team.logo} className="w-4 h-4 object-contain bg-white rounded p-0.5" />}
                                                            <span className="truncate max-w-[95px]">{homeTeamLineup?.team?.name || 'Gazde'}</span>
                                                        </button>
                                                        <button onClick={() => setLineupViewMode('away')} className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] sm:text-xs font-black tracking-widest transition-all flex items-center justify-center gap-1.5 uppercase ${lineupViewMode === 'away' ? 'bg-blue-600 text-white shadow-md border border-blue-500' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'}`}>
                                                            {awayTeamLineup?.team?.logo && <img src={awayTeamLineup.team.logo} className="w-4 h-4 object-contain bg-white rounded p-0.5" />}
                                                            <span className="truncate max-w-[95px]">{awayTeamLineup?.team?.name || 'Oaspeți'}</span>
                                                        </button>
                                                    </div>

                                                    <div className="space-y-6">
                                                        <div className="flex items-center justify-between bg-slate-900 border-2 border-slate-800 text-white px-4 py-4 rounded-2xl shadow-xl">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                {homeTeamLineup?.team?.logo && <img src={homeTeamLineup.team.logo} className="w-7 h-7 object-contain bg-white rounded-lg p-1 shrink-0" />}
                                                                <span className="font-black tracking-tight text-xs sm:text-sm truncate hidden sm:inline">{homeTeamLineup?.team?.name || selectedMatchDetails.home_team_name}</span>
                                                                {homeTeamLineup?.formation && <span className="bg-emerald-600 border border-emerald-500 text-white font-black text-[10px] sm:text-[11px] px-2.5 py-1 rounded-md shrink-0 ml-1 shadow-sm tracking-widest">{homeTeamLineup.formation}</span>}
                                                            </div>
                                                            <span className="text-[10px] font-black tracking-widest text-slate-500 text-center px-2 uppercase">Dispunere Tactică</span>
                                                            <div className="flex items-center justify-end gap-2 min-w-0">
                                                                {awayTeamLineup?.formation && <span className="bg-blue-600 border border-blue-500 text-white font-black text-[10px] sm:text-[11px] px-2.5 py-1 rounded-md shrink-0 mr-1 shadow-sm tracking-widest">{awayTeamLineup.formation}</span>}
                                                                <span className="font-black tracking-tight text-xs sm:text-sm truncate hidden sm:inline text-right">{awayTeamLineup?.team?.name || selectedMatchDetails.away_team_name}</span>
                                                                {awayTeamLineup?.team?.logo && <img src={awayTeamLineup.team.logo} className="w-7 h-7 object-contain bg-white rounded-lg p-1 shrink-0" />}
                                                            </div>
                                                        </div>

                                                        {/* TERENUL (Pitch) */}
                                                        <div className={`relative w-full ${lineupViewMode === 'both' ? 'h-[850px] sm:h-[950px]' : 'h-[600px] sm:h-[700px]'} rounded-3xl overflow-hidden shadow-2xl border-4 sm:border-8 border-slate-900 flex flex-col justify-between p-1 sm:p-5 select-none`} style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #10b981 0px, #10b981 50px, #059669 50px, #059669 100px)' }}>
                                                            <div className="absolute inset-2 sm:inset-3 border-4 border-white/50 rounded-xl pointer-events-none"></div>
                                                            <div className="absolute top-1/2 inset-x-2 sm:inset-x-3 h-1 bg-white/50 -translate-y-1/2 pointer-events-none"></div>
                                                            <div className="absolute top-1/2 left-1/2 w-24 h-24 sm:w-40 sm:h-40 border-4 border-white/50 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                                                            <div className="absolute top-1/2 left-1/2 w-2 h-2 sm:w-3 sm:h-3 bg-white/70 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                                                            
                                                            <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 w-40 sm:w-64 h-16 sm:h-24 border-b-4 border-x-4 border-white/50 pointer-events-none"></div>
                                                            <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 w-20 sm:w-32 h-8 sm:h-10 border-b-4 border-x-4 border-white/50 pointer-events-none"></div>
                                                            <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 w-40 sm:w-64 h-16 sm:h-24 border-t-4 border-x-4 border-white/50 pointer-events-none"></div>
                                                            <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 w-20 sm:w-32 h-8 sm:h-10 border-t-4 border-x-4 border-white/50 pointer-events-none"></div>

                                                            {lineupViewMode === 'both' ? (
                                                                <>
                                                                    <div className="flex-1 flex flex-col justify-around relative z-10 pb-4 pt-1">
                                                                        {homeRowsTopDown.map((rowItems, rIdx) => (
                                                                            <div key={`home-row-${rIdx}`} className="flex items-center justify-around px-1 sm:px-2">{rowItems.map((item: any, pIdx: number) => renderPitchPlayerNode(item, false, pIdx))}</div>
                                                                        ))}
                                                                    </div>
                                                                    <div className="flex-1 flex flex-col justify-around relative z-10 pt-4 pb-1">
                                                                        {awayRowsBottomUp.map((rowItems, rIdx) => (
                                                                            <div key={`away-row-${rIdx}`} className="flex items-center justify-around px-1 sm:px-2">{rowItems.map((item: any, pIdx: number) => renderPitchPlayerNode(item, true, pIdx))}</div>
                                                                        ))}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="flex-1 flex flex-col justify-around relative z-10 py-4">
                                                                    {singleTeamRows.map((rowItems, rIdx) => (
                                                                        <div key={`single-row-${rIdx}`} className="flex items-center justify-around px-1 sm:px-2">{rowItems.map((item: any, pIdx: number) => renderPitchPlayerNode(item, lineupViewMode === 'away', pIdx))}</div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Rezerve */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            {[homeTeamLineup, awayTeamLineup].map((teamLineup: any, tIdx: number) => {
                                                                if (!teamLineup) return null;
                                                                const isAway = tIdx === 1;
                                                                return (
                                                                    <div key={tIdx} className="bg-white dark:bg-slate-950 p-4 sm:p-5 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                                                                        <div className="flex items-center justify-between pb-4 border-b-2 border-slate-100 dark:border-slate-800">
                                                                            <div className="flex items-center gap-3 min-w-0">
                                                                                {teamLineup.team?.logo && <img src={teamLineup.team.logo} className="w-8 h-8 object-contain bg-slate-100 rounded-lg p-1" />}
                                                                                <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white tracking-tight truncate">{teamLineup.team?.name}</span>
                                                                            </div>
                                                                            {teamLineup.coach?.name && (
                                                                                <div className="flex flex-col items-end">
                                                                                    <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">Antrenor</span>
                                                                                    <strong className="text-xs text-slate-900 dark:text-white tracking-wide">{teamLineup.coach.name}</strong>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <h4 className="text-[10px] font-black tracking-widest text-slate-500 px-1 uppercase">Banca de Rezerve</h4>
                                                                        <div className="grid grid-cols-1 gap-2">
                                                                            {teamLineup.substitutes?.map((sub: any, sIdx: number) => {
                                                                                const badges = getPlayerMatchBadges(sub.player?.name, sub.player?.id);
                                                                                return (
                                                                                    <div key={sIdx} onClick={() => handleLineupPlayerClick(sub.player?.name)} className="py-2.5 px-3 flex items-center justify-between bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                                            <span className={`w-8 h-8 rounded-lg font-black flex items-center justify-center text-xs shrink-0 border-2 ${isAway ? 'bg-slate-900 text-white border-blue-500' : 'bg-white text-slate-900 border-slate-300'}`}>{sub.player?.number || "-"}</span>
                                                                                            <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 tracking-tight truncate">{sub.player?.name}</span>
                                                                                            {badges.subOut && <span className="text-xs" title="A intrat pe teren">🔄</span>}
                                                                                            {badges.goals > 0 && <span className="text-xs">⚽</span>}
                                                                                        </div>
                                                                                        <span className="text-[9px] font-black px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md tracking-widest shrink-0 uppercase">{sub.player?.pos || "-"}</span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* STATISTICI */}
                                    {activeMatchTab === 'stats' && (
                                        <div>
                                            {!selectedMatchDetails.statistics || selectedMatchDetails.statistics.length < 2 ? (
                                                <div className="text-center py-16 bg-white dark:bg-slate-950 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 font-bold tracking-widest text-xs uppercase">Datele statistice nu au fost procesate încă.</div>
                                            ) : (
                                                <div className="bg-white dark:bg-slate-950 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-5 sm:p-8 space-y-6 shadow-sm">
                                                    {(() => {
                                                        const homeStats = selectedMatchDetails.statistics[0].statistics;
                                                        const awayStats = selectedMatchDetails.statistics[1].statistics;
                                                        const priorityTypes = ["Ball Possession", "Total Shots", "Shots on Goal", "Corner Kicks"];
                                                        const sortedStats = [...homeStats].sort((a, b) => {
                                                            const aIndex = priorityTypes.indexOf(a.type);
                                                            const bIndex = priorityTypes.indexOf(b.type);
                                                            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                                                            if (aIndex !== -1) return -1;
                                                            if (bIndex !== -1) return 1;
                                                            return 0; 
                                                        });
                                                        return sortedStats.map((statItem: any) => {
                                                            const homeValRaw = statItem.value ?? 0;
                                                            const awayStatItem = awayStats.find((s: any) => s.type === statItem.type);
                                                            const awayValRaw = awayStatItem?.value ?? 0;
                                                            const homeNum = parseFloat(String(homeValRaw).replace('%', '')) || 0;
                                                            const awayNum = parseFloat(String(awayValRaw).replace('%', '')) || 0;
                                                            const total = homeNum + awayNum;
                                                            const homePercent = total > 0 ? Math.round((homeNum / total) * 100) : 50;
                                                            const awayPercent = 100 - homePercent;
                                                            return (
                                                                <div key={statItem.type} className="space-y-2">
                                                                    <div className="flex justify-between text-sm sm:text-base font-black">
                                                                        <span className="text-slate-900 dark:text-white w-10 text-left">{homeValRaw}</span>
                                                                        <span className="text-slate-400 text-[10px] tracking-widest text-center flex-1 uppercase">{translateStatLabel(statItem.type)}</span>
                                                                        <span className="text-slate-900 dark:text-white w-10 text-right">{awayValRaw}</span>
                                                                    </div>
                                                                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-700">
                                                                        <div style={{ width: `${homePercent}%` }} className="bg-emerald-500 h-full transition-all"></div>
                                                                        <div style={{ width: `${awayPercent}%` }} className="bg-blue-500 h-full transition-all"></div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* CLASAMENT */}
                                    {activeMatchTab === 'standings' && (
                                        <div>
                                            {loadingStandings ? (
                                                <div className="flex flex-col items-center justify-center py-16">
                                                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                                    <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Se preia clasamentul oficial...</span>
                                                </div>
                                            ) : !standingsData || standingsData.length === 0 ? (
                                                <div className="text-center py-16 bg-white dark:bg-slate-950 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 font-bold tracking-widest text-xs uppercase">Clasamentul nu este disponibil în arhivă.</div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {standingsData.map((groupTable: any[], gIdx: number) => (
                                                        <div key={gIdx} className="bg-white dark:bg-slate-950 rounded-3xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-xs sm:text-sm text-left">
                                                                    <thead className="bg-slate-900 text-slate-400 font-black tracking-widest text-[9px] border-b-2 border-slate-700 uppercase">
                                                                        <tr>
                                                                            <th className="py-4 px-3 text-center w-12">Loc</th>
                                                                            <th className="py-4 px-3">Formație</th>
                                                                            <th className="py-4 px-3 text-center">J</th>
                                                                            <th className="py-4 px-3 text-center">G</th>
                                                                            <th className="py-4 px-3 text-center text-white">PCT</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/50">
                                                                        {groupTable.map((row: any) => {
                                                                            const isCurrentTeam = row.team?.id === selectedMatchDetails.home_team_id || row.team?.id === selectedMatchDetails.away_team_id;
                                                                            return (
                                                                                <tr key={row.rank} onClick={e => row.team?.name && handleTeamClick(e, row.team.name)} className={`cursor-pointer transition-colors ${isCurrentTeam ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                                                                                    <td className="py-3.5 px-3 text-center font-black text-slate-500">{row.rank}</td>
                                                                                    <td className="py-3.5 px-3 flex items-center gap-3">
                                                                                        <img src={row.team?.logo} alt="logo" className="w-6 h-6 object-contain bg-white rounded p-0.5" />
                                                                                        <span className={`font-black tracking-tight truncate ${isCurrentTeam ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{row.team?.name}</span>
                                                                                    </td>
                                                                                    <td className="py-3.5 px-3 text-center font-bold text-slate-500 dark:text-slate-400">{row.all?.played}</td>
                                                                                    <td className="py-3.5 px-3 text-center font-bold text-slate-500 dark:text-slate-400 text-[11px]">{row.all?.goals?.for}:{row.all?.goals?.against}</td>
                                                                                    <td className={`py-3.5 px-3 text-center font-black text-sm ${isCurrentTeam ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{row.points}</td>
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
                </div>
            )}

            {/* MODAL LOT (Echipa Extinsă) - ACTUALIZAT CU DESIGN COMPLET SI BUTON COMPARARE */}
            {selectedTeam && (
                <div className="fixed inset-0 z-[99996] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md transition-opacity" onClick={() => setSelectedTeam(null)}>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-4 border-slate-700 animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-950 text-white p-4 sm:p-6 flex items-center justify-between shrink-0 border-b-4 border-slate-700">
                            <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white p-2 rounded-2xl shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                    <img src={selectedTeam.teamInfo.logo} alt="Logo" className="w-full h-full object-contain" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter truncate drop-shadow-md">{selectedTeam.teamInfo.name}</h2>
                                    <p className="text-sm sm:text-base text-emerald-400 font-bold uppercase tracking-widest mt-1 truncate">
                                        ⚽ LOTUL OFICIAL • {selectedTeam.teamInfo.totalPlayers} Jucători
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedTeam(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 transition text-white shrink-0 ml-2">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-3 sm:p-6 bg-slate-100 dark:bg-slate-950 space-y-6 flex-1">
                            {[
                                { title: "Portari", data: selectedTeam.squad.Goalkeepers, color: "text-amber-500 border-amber-500", bg: "bg-amber-500/10" },
                                { title: "Fundași", data: selectedTeam.squad.Defenders, color: "text-blue-500 border-blue-500", bg: "bg-blue-500/10" },
                                { title: "Mijlocași", data: selectedTeam.squad.Midfielders, color: "text-emerald-500 border-emerald-500", bg: "bg-emerald-500/10" },
                                { title: "Atacanți", data: selectedTeam.squad.Attackers, color: "text-rose-500 border-rose-500", bg: "bg-rose-500/10" }
                            ].map((section, idx) => section.data.length > 0 && (
                                <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border-2 border-slate-200 dark:border-slate-800 overflow-hidden">
                                    <div className={`px-4 py-3 border-l-4 ${section.color} ${section.bg} border-b border-b-slate-100 dark:border-b-slate-800`}>
                                        <h3 className={`font-black uppercase tracking-wider text-sm sm:text-base ${section.color.split(' ')[0]}`}>{section.title}</h3>
                                    </div>
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {section.data.map(p => {
                                            const isSelectedForCompare = compareList.some(item => item._id === p._id);
                                            return (
                                                <div key={p._id} onClick={() => setSelectedPlayer(p)} className="flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition gap-2 cursor-pointer">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <img src={p.image || GENERIC_USER_IMAGE} alt={p.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shrink-0 bg-white" onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }} />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate uppercase tracking-tight" title={p.name}>{p.name}</p>
                                                            <div className="flex gap-2 text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate uppercase">
                                                                {p.age && <span className="shrink-0">{p.age} ani</span>}
                                                                {p.nationality && <span className="truncate">{p.nationality}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 sm:gap-5 text-center shrink-0">
                                                        <div className="w-[45px] sm:w-[50px] bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                                                            <p className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase">Meciuri</p>
                                                            <p className="font-black text-slate-800 dark:text-white text-sm sm:text-base">{p.statistics_summary?.total_appearances || 0}</p>
                                                        </div>
                                                        <div className="w-[45px] sm:w-[50px] bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                                                            <p className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase">Goluri</p>
                                                            <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">{p.statistics_summary?.total_goals || 0}</p>
                                                        </div>
                                                        <div className="w-[45px] sm:w-[50px] bg-amber-50 dark:bg-amber-900/10 p-1.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                                            <p className="text-[9px] sm:text-[10px] text-amber-600 font-black uppercase">Rating</p>
                                                            <p className="font-black text-amber-600 text-sm sm:text-base">{p.statistics_summary?.rating ? parseFloat(p.statistics_summary.rating).toFixed(2) : "-"}</p>
                                                        </div>
                                                        <button
                                                            onClick={(e) => toggleComparePlayer(e, p)}
                                                            title="Compară jucătorul"
                                                            className={`p-2.5 rounded-xl border-2 transition ${
                                                                isSelectedForCompare
                                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600'
                                                            }`}
                                                        >
                                                            {isSelectedForCompare ? <Check className="w-5 h-5" /> : <Scale className="w-5 h-5" />}
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

            {/* MODAL DETALII JUCĂTOR (Scouting Card) - ACTUALIZAT PENTRU COMPARARE SI WATCHLIST */}
            {selectedPlayer && (
                <div className="fixed inset-0 z-[99997] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setSelectedPlayer(null)}>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[95vh] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border-4 border-emerald-600/30" onClick={e => e.stopPropagation()}>
                        <div className="relative bg-slate-900 shrink-0 px-5 sm:px-8 py-6 sm:py-8 border-b-4 border-emerald-500 overflow-hidden">
                            <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_20px,#10b981_20px,#10b981_22px),repeating-linear-gradient(90deg,transparent,transparent_20px,#10b981_20px,#10b981_22px)] pointer-events-none"></div>
                            
                            <button onClick={() => setSelectedPlayer(null)} className="absolute top-4 right-4 bg-slate-950/50 border border-white/20 hover:bg-rose-500 hover:border-rose-500 rounded-full p-2 text-white transition-colors z-20">
                                <X className="w-5 h-5 font-bold" />
                            </button>
                            
                            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-6 relative z-10">
                                <img src={selectedPlayer.image || GENERIC_USER_IMAGE} alt={selectedPlayer.name} className="w-32 h-32 md:w-40 md:h-40 rounded-2xl object-cover border-4 border-white shadow-2xl bg-slate-800 shrink-0" onError={e => { e.currentTarget.src = GENERIC_USER_IMAGE; }} />
                                
                                <div className="text-white text-center sm:text-left flex-1 min-w-0">
                                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter break-words whitespace-normal drop-shadow-md leading-tight mb-2 uppercase">{selectedPlayer.name}</h2>
                                    <div className="flex items-center justify-center sm:justify-start gap-2">
                                        {selectedPlayer.team_logo && <img src={selectedPlayer.team_logo} alt="logo" className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-md p-1 object-contain" />}
                                        <span className="font-bold text-lg sm:text-xl text-emerald-400 tracking-widest truncate uppercase">{selectedPlayer.team_name || selectedPlayer.team}</span>
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
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-black tracking-wider text-slate-800 dark:text-slate-200 uppercase">
                                    <Globe className="w-4 h-4 text-emerald-500" /> {selectedPlayer.nationality || "N/A"}
                                </div>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-black tracking-wider text-slate-800 dark:text-slate-200 uppercase">
                                    <UserIcon className="w-4 h-4 text-emerald-500" /> {selectedPlayer.age ? `${selectedPlayer.age} ANI` : "N/A"}
                                </div>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-black tracking-wider text-slate-800 dark:text-slate-200 uppercase">
                                    <Activity className="w-4 h-4 text-emerald-500" /> {selectedPlayer.height || "-"} / {selectedPlayer.weight || "-"}
                                </div>
                                <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/40 px-4 py-2 rounded-xl border-2 border-emerald-300 dark:border-emerald-700 text-xs sm:text-sm font-black tracking-wider text-emerald-800 dark:text-emerald-400 uppercase">
                                    {selectedPlayer.position || "N/A"}
                                </div>
                            </div>

                            <h3 className="text-lg font-black tracking-widest text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b-2 border-emerald-500/20 pb-2 uppercase">
                                <Trophy className="w-6 h-6 text-amber-500" /> Cifrele Sezonului
                            </h3>
                            
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-10">
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-center flex flex-col justify-center shadow-sm">
                                    <span className="block text-3xl font-black text-slate-900 dark:text-white leading-none">{selectedPlayer.statistics_summary?.total_appearances || 0}</span>
                                    <span className="text-[10px] tracking-widest text-slate-400 font-bold mt-2 uppercase">Meciuri</span>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-center flex flex-col justify-center border-b-4 border-b-emerald-500 shadow-sm">
                                    <span className="block text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-none">{selectedPlayer.statistics_summary?.total_goals || 0}</span>
                                    <span className="text-[10px] tracking-widest text-slate-400 font-bold mt-2 uppercase">Goluri</span>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-center flex flex-col justify-center border-b-4 border-b-blue-500 shadow-sm">
                                    <span className="block text-3xl font-black text-blue-600 dark:text-blue-400 leading-none">{selectedPlayer.statistics_summary?.total_assists || 0}</span>
                                    <span className="text-[10px] tracking-widest text-slate-400 font-bold mt-2 uppercase">Pase Dec.</span>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-center flex flex-col justify-center shadow-sm">
                                    <span className="block text-3xl font-black text-slate-900 dark:text-white leading-none">{selectedPlayer.statistics_summary?.minutes_played || 0}'</span>
                                    <span className="text-[10px] tracking-widest text-slate-400 font-bold mt-2 uppercase">Minute</span>
                                </div>
                                <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-2xl border-2 border-amber-300 dark:border-amber-700 text-center flex flex-col justify-center shadow-sm">
                                    <span className="block text-3xl font-black text-amber-500 leading-none">{selectedPlayer.statistics_summary?.rating ? parseFloat(selectedPlayer.statistics_summary.rating).toFixed(2) : "-"}</span>
                                    <span className="text-[10px] tracking-widest text-amber-600/80 font-bold mt-2 uppercase">SofaScore</span>
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
                                                    <p className="text-3xl font-black text-white mt-1">{m.minsPerContribution > 0 ? `${m.minsPerContribution}'` : '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            <h3 className="text-lg font-black tracking-widest text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b-2 border-emerald-500/20 pb-2 uppercase">
                                <MapPin className="w-6 h-6 text-emerald-500" /> Situație Competițională
                            </h3>
                            
                            {!selectedPlayer.detailed_stats || selectedPlayer.detailed_stats.length === 0 ? (
                                <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold tracking-widest text-sm uppercase">
                                    DATE COMPETIȚIONALE INDISPONIBILE 🚫
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 tracking-widest bg-slate-100 dark:bg-slate-800/80 border-b-2 border-slate-200 dark:border-slate-700 uppercase">
                                                <tr>
                                                    <th className="px-4 py-4 font-black">Competiție</th>
                                                    <th className="px-4 py-4 font-black text-center">Meciuri</th>
                                                    <th className="px-4 py-4 font-black text-center">Goluri</th>
                                                    <th className="px-4 py-4 font-black text-center">Pase</th>
                                                    <th className="px-4 py-4 font-black text-center hidden sm:table-cell">Minute</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800">
                                                {selectedPlayer.detailed_stats.map((stat, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-4 py-4 font-bold text-slate-900 dark:text-white flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                                            {stat.competition}
                                                            <span className="text-[9px] font-black px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded tracking-widest w-fit uppercase">
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

            {/* BARA DE COMPARARE JUCĂTORI (Plutitoare) */}
            {compareList.length > 0 && (
                <div className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-[99998] bg-slate-950 px-4 py-3 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-2 border-emerald-500 flex items-center gap-4 max-w-xl w-[95%] justify-between animate-in slide-in-from-bottom-5">          
                    <div className="flex items-center gap-3 overflow-hidden">
                        <Scale className="w-6 h-6 text-emerald-400 shrink-0 animate-pulse" />
                        <div className="flex items-center gap-2 overflow-hidden">
                            {compareList.map((p) => (
                                <div key={p._id} className="flex items-center gap-2 bg-slate-800 border border-slate-600 pl-1 pr-2 py-1 rounded-xl text-xs font-black uppercase tracking-wider text-white truncate">
                                    <img src={p.image || GENERIC_USER_IMAGE} alt={p.name} className="w-6 h-6 rounded-md object-cover" />
                                    <span className="truncate max-w-[80px] sm:max-w-[120px]">{p.name}</span>
                                    <button onClick={(e) => toggleComparePlayer(e, p)} className="text-slate-400 hover:text-rose-400 ml-1 bg-slate-900 p-0.5 rounded">
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

            {/* MODALUL PRINCIPAL DE COMPARARE "MECI DIRECT" */}
            {showCompareModal && compareList.length === 2 && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowCompareModal(false)}>
                    <div className="bg-slate-900 w-full max-w-4xl max-h-[95vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border-4 border-emerald-600/50" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-slate-950 text-white p-4 sm:p-6 flex items-center justify-between border-b-2 border-emerald-600/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/20 rounded-lg">
                                    <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                                </div>
                                <h2 className="text-base sm:text-2xl font-black uppercase tracking-widest">
                                    MECI DIRECT: <span className="text-emerald-400">Analiză</span>
                                </h2>
                            </div>
                            <button onClick={() => setShowCompareModal(false)} className="p-2.5 bg-slate-800 hover:bg-rose-500 hover:border-rose-500 border border-slate-700 rounded-full transition text-white">
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
                                            <span className="flex items-center gap-2 text-yellow-400"><span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block shadow-[0_0_10px_#facc15]"></span> {p1.name}</span>
                                            <span className="flex items-center gap-2 text-blue-400"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block shadow-[0_0_10px_#3b82f6]"></span> {p2.name}</span>
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
                                                        <span className={p1Wins ? "text-yellow-400" : (isTie ? "text-slate-400" : "text-slate-500")}>{r.format(r.v1)}</span>
                                                        <span className="text-slate-300">{r.label}</span>
                                                        <span className={p2Wins ? "text-blue-400" : (isTie ? "text-slate-400" : "text-slate-500")}>{r.format(r.v2)}</span>
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