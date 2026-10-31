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
    Clock
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

export function MatchesSection({ userEmail }: { userEmail?: string }) {
    const queryClient = useQueryClient();

    const [dates, setDates] = useState<{ date: Date; label: string; isToday: boolean }[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [subFilter, setSubFilter] = useState<'all' | 'live' | 'finished' | 'favorites'>('all');
    const [favoriteMatches, setFavoriteMatches] = useState<number[]>([]);

    const [selectedTeam, setSelectedTeam] = useState<SquadData | null>(null);
    const [loadingRoster, setLoadingRoster] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

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
                    if (data.success && data.user?.favoriteMatches) {
                        setFavoriteMatches(data.user.favoriteMatches);
                    }
                })
                .catch(() => {});
        }
    }, [userEmail]);

    // === FORMATĂM DATA PENTRU REACT QUERY ===
    const localDateStr = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000)
        .toISOString()
        .split('T')[0];

    // === REACT QUERY PENTRU CACHING ȘI FETCH AUTOMAT ===
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

    // === SOCKET.IO ACTUALIZAT PENTRU A MODIFICA CACHE-UL REACT QUERY ===
    useEffect(() => {
        socket.on("live_match_update", (updatedMatch: Match) => {
            queryClient.setQueriesData<Match[]>({ queryKey: ['matches'] }, (oldMatches) => {
                if (!oldMatches) return oldMatches;
                const index = oldMatches.findIndex(m => m.fixture_id === updatedMatch.fixture_id);
                
                if (index !== -1) {
                    const oldMatch = oldMatches[index];

                    // Notificări Push la marcarea unui gol în meciurile favorite
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
        return () => {
            socket.off("live_match_update");
        };
    }, [favoriteMatches, queryClient]);

    const toggleFavoriteMatch = async (e: React.MouseEvent, fixtureId: number) => {
        e.stopPropagation();
        if (!userEmail) {
            alert("Trebuie să ai legitimație (cont) pentru a salva meciuri la favorite!");
            return;
        }
        try {
            const res = await fetch(`https://football-backend-m2a4.onrender.com/api/users/favorite-matches/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, fixtureId })
            });
            const data = await res.json();
            if (data.success) {
                setFavoriteMatches(data.favoriteMatches);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleTeamClick = async (e: React.MouseEvent, teamName: string) => {
        e.stopPropagation();
        
        const cachedRoster = queryClient.getQueryData(['teamRoster', teamName]);
        if (!cachedRoster) {
            setLoadingRoster(true);
            setSelectedTeam(null);
        }

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
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoadingRoster(false);
        }
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
        } catch (err) {
            console.error("Eroare detalii meci:", err);
        } finally {
            setLoadingMatchDetails(false);
        }
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
        } catch (err) {
            console.error("Eroare clasament:", err);
        } finally {
            setLoadingStandings(false);
        }
    };

    const handleLineupPlayerClick = async (playerName?: string) => {
        if (!playerName) return;
        try {
            const res = await fetch(`https://football-backend-m2a4.onrender.com/api/sport/players?search=${encodeURIComponent(playerName)}`);
            if (res.ok) {
                const players = await res.json();
                if (players && players.length > 0) {
                    setSelectedPlayer(players[0]);
                } else {
                    alert(`Dosarul pentru jucătorul ${playerName} nu se află încă în arhivă.`);
                }
            }
        } catch (err) {
            console.error(err);
        }
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
        if (!acc[match.league_name]) {
            acc[match.league_name] = { league_id: match.league_id, logo: match.league_logo, items: [] };
        }
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
            return (
                <span className="text-slate-500 font-black text-xs sm:text-sm">
                    {new Date(match.timestamp * 1000).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                </span>
            );
        }
        if (liveStatuses.includes(status)) {
            return (
                <span className="text-rose-600 font-black animate-pulse text-xs sm:text-sm">
                    {match.elapsed ? `${match.elapsed}'` : status}
                </span>
            );
        }
        if (status === "FT" || status === "AET" || status === "PEN") {
            return <span className="text-slate-400 font-black text-[10px] sm:text-xs uppercase tracking-widest">Final</span>;
        }
        return <span className="text-amber-500 font-black text-[10px] sm:text-xs uppercase tracking-widest">{status}</span>;
    };

    const translateStatLabel = (type: string) => {
        const map: Record<string, string> = {
            "Shots on Goal": "Șuturi pe poartă",
            "Shots off Goal": "Șuturi pe lângă",
            "Total Shots": "Total șuturi",
            "Blocked Shots": "Șuturi blocate",
            "Shots insidebox": "Din careu",
            "Shots outsidebox": "Din afara careului",
            "Fouls": "Faulturi",
            "Corner Kicks": "Cornere",
            "Offsides": "Ofsaiduri",
            "Ball Possession": "Posesie %",
            "Yellow Cards": "Cartonașe galbene",
            "Red Cards": "Cartonașe roșii",
            "Goalkeeper Saves": "Parade portar",
            "Total passes": "Total pase",
            "Passes accurate": "Pase reușite",
            "Passes %": "Acuratețe pase",
            "expected_goals": "xG (Expected Goals)"
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
                let row = 1;
                let col = idx + 1;

                if (gridStr && String(gridStr).includes(':')) {
                    const parts = String(gridStr).split(':');
                    row = parseInt(parts[0], 10) || 1;
                    col = parseInt(parts[1], 10) || idx + 1;
                } else if (item?.player?.pos === 'G') {
                    row = 1;
                    col = 1;
                } else if (item?.player?.pos === 'D') {
                    row = 2;
                } else if (item?.player?.pos === 'M') {
                    row = 3;
                } else {
                    row = 4;
                }

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
                if (slice.length > 0) {
                    resultRows.push(isTopDown ? [...slice].reverse() : slice);
                }
                cursor += count;
            });
            if (cursor < outfield.length) {
                resultRows.push(outfield.slice(cursor));
            }
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
        let goals = 0;
        let yellow = false;
        let red = false;
        let subOut = false;

        events.forEach((ev: any) => {
            const isSamePlayer =
                (playerId && ev.player?.id === playerId) ||
                (playerName && ev.player?.name && ev.player.name.toLowerCase() === playerName.toLowerCase());
            const isSubbedOut =
                ev.type === 'subst' &&
                ((playerId && ev.assist?.id === playerId) ||
                    (playerName && ev.assist?.name && ev.assist.name.toLowerCase() === playerName.toLowerCase()));

            if (isSamePlayer) {
                if (ev.type === 'Goal' && ev.detail !== 'Missed Penalty') goals += 1;
                if (ev.type === 'Card' && ev.detail === 'Yellow Card') yellow = true;
                if (ev.type === 'Card' && ev.detail?.includes('Red')) red = true;
                if (ev.type === 'subst') subOut = true;
            }
            if (isSubbedOut) {
                subOut = true;
            }
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

        const shortName = pName.includes(' ')
            ? `${pName.split(' ')[0].charAt(0)}. ${pName.split(' ').slice(-1)[0]}`
            : pName;

        let shirtStyle = isAwayTeam
            ? "bg-slate-900 text-white border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            : "bg-white text-slate-900 border-slate-300 shadow-[0_0_10px_rgba(255,255,255,0.5)]";

        if (isGK) {
            shirtStyle = isAwayTeam
                ? "bg-amber-500 text-slate-950 border-amber-300"
                : "bg-yellow-400 text-slate-950 border-white";
        }

        const ratingNum = pRating ? parseFloat(pRating) : 0;
        const ratingBg =
            ratingNum >= 7.5
                ? "bg-emerald-500"
                : ratingNum >= 6.8
                ? "bg-emerald-600"
                : ratingNum > 0
                ? "bg-amber-500"
                : "bg-slate-700";

        return (
            <div
                key={item?.player?.id || `${pName}-${idx}`}
                onClick={() => handleLineupPlayerClick(pName)}
                className="cursor-pointer group flex flex-col items-center select-none w-[65px] sm:w-[85px] z-10"
                title={`${pName} (#${pNum}) - Poziție: ${pPos || 'Titular'}`}
            >
                <div className="relative">
                    <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${shirtStyle} font-black text-sm sm:text-base flex items-center justify-center border-4 group-hover:scale-110 transition-transform`}
                    >
                        {pNum}
                    </div>

                    {ratingNum > 0 && (
                        <span
                            className={`absolute -top-1.5 -right-3 ${ratingBg} text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm border border-white/30`}
                        >
                            {ratingNum.toFixed(1)}
                        </span>
                    )}

                    {badges.goals > 0 && (
                        <span className="absolute -bottom-1.5 -right-2 bg-white text-[10px] rounded-full px-1 shadow border border-slate-200 font-black text-slate-900">
                            ⚽{badges.goals > 1 ? badges.goals : ''}
                        </span>
                    )}

                    {(badges.yellow || badges.red) && (
                        <span
                            className={`absolute -top-1 -left-1.5 w-3 h-4 rounded-sm shadow border border-white/50 ${
                                badges.red ? 'bg-red-600' : 'bg-yellow-400'
                            }`}
                        />
                    )}

                    {badges.subOut && (
                        <span className="absolute -bottom-1.5 -left-2 bg-slate-900 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center shadow border border-white/50">
                            🔄
                        </span>
                    )}
                </div>

                <div className="mt-1 bg-slate-950/90 text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded shadow-md max-w-full truncate text-center border border-white/10 uppercase tracking-widest">
                    {shortName}
                </div>
            </div>
        );
    };

    const homeTeamLineup = selectedMatchDetails?.lineups?.[0] || null;
    const awayTeamLineup = selectedMatchDetails?.lineups?.[1] || null;

    const homeRowsTopDown = buildExactCoachRows(
        homeTeamLineup?.startXI || [],
        homeTeamLineup?.formation,
        true
    );
    const awayRowsBottomUp = buildExactCoachRows(
        awayTeamLineup?.startXI || [],
        awayTeamLineup?.formation,
        false
    );

    const singleTeamLineup = lineupViewMode === 'home' ? homeTeamLineup : awayTeamLineup;
    const singleTeamRows = buildExactCoachRows(
        singleTeamLineup?.startXI || [],
        singleTeamLineup?.formation,
        false
    );

    return (
        <div className="max-w-5xl mx-auto py-8 px-2 sm:px-4 min-h-[80vh] relative z-0 animate-in fade-in duration-500 pb-20">
            
            {/* FUNDAL SPORTIV (Stadion / Tabelă) */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none opacity-[0.03] dark:opacity-[0.05]">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,#000_20px,#000_22px)]"></div>
            </div>
            
            {loadingRoster && (
                <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                    <h3 className="text-xl font-black uppercase tracking-widest text-emerald-400 mt-4 animate-pulse">Scanăm Lotul...</h3>
                </div>
            )}

            {/* MODAL DETALII MECI (Tabelă Oficială) */}
            {selectedMatchDetails && (
                <div
                    className="fixed inset-0 z-[50] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setSelectedMatchDetails(null)}
                >
                    <div
                        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-emerald-600/30"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* SCOREBOARD HEADER */}
                        <div className="bg-slate-950 border-b-4 border-emerald-600 text-white p-4 sm:p-6 shrink-0 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.2),transparent_70%)] pointer-events-none"></div>
                            <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,#fff_2px,#fff_4px)] pointer-events-none" style={{ backgroundSize: '4px 100%' }}></div>
                            
                            <button
                                onClick={() => setSelectedMatchDetails(null)}
                                className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 bg-slate-800 hover:bg-rose-600 border border-slate-700 rounded-full transition-colors z-20"
                            >
                                <X className="w-5 h-5 font-bold" />
                            </button>

                            <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs text-emerald-400 font-black uppercase tracking-widest mb-6 relative z-10">
                                {selectedMatchDetails.league_logo && (
                                    <img
                                        src={selectedMatchDetails.league_logo}
                                        alt="league"
                                        className="w-5 h-5 object-contain bg-white rounded-md p-0.5"
                                    />
                                )}
                                <span>{selectedMatchDetails.league_name}</span>
                                {selectedMatchDetails.league_round && <span className="text-slate-500">• {selectedMatchDetails.league_round}</span>}
                            </div>

                            <div className="flex items-center justify-between gap-2 sm:gap-6 max-w-2xl mx-auto relative z-10">
                                <div
                                    onClick={e => handleTeamClick(e, selectedMatchDetails.home_team_name)}
                                    className="flex-1 flex flex-col items-center text-center cursor-pointer group"
                                >
                                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-2xl p-2 sm:p-3 shadow-[0_0_15px_rgba(255,255,255,0.2)] mb-3 group-hover:scale-110 transition-transform">
                                        <img
                                            src={selectedMatchDetails.home_team_logo}
                                            alt={selectedMatchDetails.home_team_name}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <span className="font-black text-xs sm:text-base uppercase tracking-tight group-hover:text-emerald-400 transition-colors line-clamp-2">
                                        {selectedMatchDetails.home_team_name}
                                    </span>
                                </div>

                                <div className="flex flex-col items-center justify-center px-2 sm:px-4 shrink-0">
                                    <div className="text-4xl sm:text-6xl font-black tracking-tighter bg-slate-900 border-2 border-slate-700 shadow-inner px-4 sm:px-6 py-2 sm:py-3 rounded-2xl flex items-center justify-center min-w-[120px] sm:min-w-[160px]">
                                        {selectedMatchDetails.status_short === "NS"
                                            ? <span className="text-slate-600">- : -</span>
                                            : <span className={["1H", "2H", "HT", "LIVE", "P"].includes(selectedMatchDetails.status_short) ? "text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" : "text-white"}>{selectedMatchDetails.home_goals ?? 0} - {selectedMatchDetails.away_goals ?? 0}</span>}
                                    </div>
                                    <div className="mt-3 bg-slate-800 px-3 py-1 rounded border border-slate-700">
                                        {renderStatus(selectedMatchDetails)}
                                    </div>
                                </div>

                                <div
                                    onClick={e => handleTeamClick(e, selectedMatchDetails.away_team_name)}
                                    className="flex-1 flex flex-col items-center text-center cursor-pointer group"
                                >
                                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-2xl p-2 sm:p-3 shadow-[0_0_15px_rgba(255,255,255,0.2)] mb-3 group-hover:scale-110 transition-transform">
                                        <img
                                            src={selectedMatchDetails.away_team_logo}
                                            alt={selectedMatchDetails.away_team_name}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <span className="font-black text-xs sm:text-base uppercase tracking-tight group-hover:text-emerald-400 transition-colors line-clamp-2">
                                        {selectedMatchDetails.away_team_name}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* NAVIGARE TAB-URI MECI (Stil Panou) */}
                        <div className="flex border-b-2 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shrink-0 overflow-x-auto scrollbar-hide">
                            {[
                                { id: 'events', label: 'Evenimente', icon: Clock },
                                { id: 'lineups', label: 'Tactică', icon: Users },
                                { id: 'stats', label: 'Statistici', icon: BarChart2 },
                                { id: 'standings', label: 'Clasament', icon: ListOrdered }
                            ].map(tab => {
                                const isActive = activeMatchTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveMatchTab(tab.id as any);
                                            if (tab.id === 'standings') fetchStandings(selectedMatchDetails.league_id);
                                        }}
                                        className={`flex-1 py-3.5 px-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border-b-4 transition-all whitespace-nowrap ${
                                            isActive
                                                ? 'border-emerald-600 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-inner'
                                                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                                        }`}
                                    >
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
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Se decriptează foaia de joc...</p>
                                </div>
                            ) : (
                                <>
                                    {/* EVENIMENTE */}
                                    {activeMatchTab === 'events' && (
                                        <div>
                                            {!selectedMatchDetails.events || selectedMatchDetails.events.length === 0 ? (
                                                <div className="text-center py-16 bg-white dark:bg-slate-950 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-widest text-xs">
                                                    Niciun eveniment notabil până acum.
                                                </div>
                                            ) : (
                                                <div className="bg-white dark:bg-slate-950 rounded-3xl border-2 border-slate-200 dark:border-slate-800 divide-y-2 divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
                                                    {selectedMatchDetails.ht_home_goals !== null && selectedMatchDetails.ht_home_goals !== undefined && (
                                                        <div className="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-black text-center py-2.5 text-[10px] sm:text-xs uppercase tracking-widest">
                                                            Pauză (HT) • Scor: <span className="text-slate-900 dark:text-white">{selectedMatchDetails.ht_home_goals} - {selectedMatchDetails.ht_away_goals}</span>
                                                        </div>
                                                    )}
                                                    
                                                    {selectedMatchDetails.events.map((ev: any, idx: number) => {
                                                        const isHome = ev.team?.id === selectedMatchDetails.home_team_id;
                                                        let icon = "•";
                                                        if (ev.type === "Goal") icon = "⚽";
                                                        else if (ev.type === "Card" && ev.detail === "Yellow Card") icon = "🟨";
                                                        else if (ev.type === "Card" && ev.detail?.includes("Red")) icon = "🟥";
                                                        else if (ev.type === "subst") icon = "🔄";

                                                        return (
                                                            <div key={idx} className={`flex items-center p-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors ${isHome ? 'flex-row' : 'flex-row-reverse text-right'}`}>
                                                                <div className="w-12 sm:w-16 font-black text-slate-900 dark:text-white text-center shrink-0 text-sm sm:text-base bg-slate-100 dark:bg-slate-800 py-1 rounded">
                                                                    {ev.time?.elapsed}'
                                                                </div>
                                                                <div className="text-xl sm:text-2xl mx-3 sm:mx-4 shrink-0 drop-shadow-md">{icon}</div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-xs sm:text-sm truncate">{ev.player?.name}</p>
                                                                    {ev.assist?.name && (
                                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate mt-0.5">
                                                                            {ev.type === "subst" ? `Iese: ${ev.assist.name}` : `Pasă: ${ev.assist.name}`}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    
                                                    {["FT", "AET", "PEN"].includes(selectedMatchDetails.status_short) && (
                                                        <div className="bg-slate-900 border-t-4 border-emerald-500 text-white font-black text-center py-3 text-[10px] sm:text-xs uppercase tracking-widest">
                                                            Fluier Final • <span className="text-emerald-400">Scor Oficial: {selectedMatchDetails.home_goals} - {selectedMatchDetails.away_goals}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* LINEUPS (Teren de Fotbal) */}
                                    {activeMatchTab === 'lineups' && (
                                        <div>
                                            {!selectedMatchDetails.lineups || selectedMatchDetails.lineups.length === 0 ? (
                                                <div className="text-center py-16 bg-white dark:bg-slate-950 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-widest text-xs">
                                                    Antrenorii nu au trimis foaia de joc.
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    <div className="flex flex-wrap items-center justify-center gap-2 bg-slate-200 dark:bg-slate-800 p-2 rounded-2xl max-w-lg mx-auto shadow-inner border border-slate-300 dark:border-slate-700">
                                                        <button
                                                            onClick={() => setLineupViewMode('both')}
                                                            className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${
                                                                lineupViewMode === 'both'
                                                                    ? 'bg-emerald-600 text-white shadow-md'
                                                                    : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                                                            }`}
                                                        >
                                                            ⚽ Teren (Ambele)
                                                        </button>
                                                        <button
                                                            onClick={() => setLineupViewMode('home')}
                                                            className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                                                                lineupViewMode === 'home'
                                                                    ? 'bg-slate-900 text-white shadow-md border border-slate-700'
                                                                    : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                                                            }`}
                                                        >
                                                            {homeTeamLineup?.team?.logo && <img src={homeTeamLineup.team.logo} className="w-4 h-4 object-contain bg-white rounded p-0.5" />}
                                                            <span className="truncate max-w-[95px]">{homeTeamLineup?.team?.name || 'Gazde'}</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setLineupViewMode('away')}
                                                            className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                                                                lineupViewMode === 'away'
                                                                    ? 'bg-blue-600 text-white shadow-md border border-blue-500'
                                                                    : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                                                            }`}
                                                        >
                                                            {awayTeamLineup?.team?.logo && <img src={awayTeamLineup.team.logo} className="w-4 h-4 object-contain bg-white rounded p-0.5" />}
                                                            <span className="truncate max-w-[95px]">{awayTeamLineup?.team?.name || 'Oaspeți'}</span>
                                                        </button>
                                                    </div>

                                                    <div className="space-y-6">
                                                        <div className="flex items-center justify-between bg-slate-900 border-2 border-slate-800 text-white px-4 py-4 rounded-2xl shadow-xl">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                {homeTeamLineup?.team?.logo && <img src={homeTeamLineup.team.logo} className="w-7 h-7 object-contain bg-white rounded-lg p-1 shrink-0" />}
                                                                <span className="font-black uppercase tracking-tight text-xs sm:text-sm truncate hidden sm:inline">{homeTeamLineup?.team?.name || selectedMatchDetails.home_team_name}</span>
                                                                {homeTeamLineup?.formation && <span className="bg-emerald-600 border border-emerald-500 text-white font-black text-[10px] sm:text-[11px] px-2.5 py-1 rounded-md shrink-0 ml-1 shadow-sm tracking-widest">{homeTeamLineup.formation}</span>}
                                                            </div>

                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center px-2">Dispunere Tactică</span>

                                                            <div className="flex items-center justify-end gap-2 min-w-0">
                                                                {awayTeamLineup?.formation && <span className="bg-blue-600 border border-blue-500 text-white font-black text-[10px] sm:text-[11px] px-2.5 py-1 rounded-md shrink-0 mr-1 shadow-sm tracking-widest">{awayTeamLineup.formation}</span>}
                                                                <span className="font-black uppercase tracking-tight text-xs sm:text-sm truncate hidden sm:inline text-right">{awayTeamLineup?.team?.name || selectedMatchDetails.away_team_name}</span>
                                                                {awayTeamLineup?.team?.logo && <img src={awayTeamLineup.team.logo} className="w-7 h-7 object-contain bg-white rounded-lg p-1 shrink-0" />}
                                                            </div>
                                                        </div>

                                                        {/* TERENUL (Pitch) */}
                                                        <div
                                                            className={`relative w-full ${
                                                                lineupViewMode === 'both' ? 'h-[850px] sm:h-[950px]' : 'h-[600px] sm:h-[700px]'
                                                            } rounded-3xl overflow-hidden shadow-2xl border-8 border-slate-900 flex flex-col justify-between p-3 sm:p-5 select-none`}
                                                            style={{
                                                                backgroundImage: 'repeating-linear-gradient(to bottom, #10b981 0px, #10b981 50px, #059669 50px, #059669 100px)'
                                                            }}
                                                        >
                                                            {/* Marcaje Teren */}
                                                            <div className="absolute inset-3 border-4 border-white/50 rounded-xl pointer-events-none"></div>
                                                            <div className="absolute top-1/2 inset-x-3 h-1 bg-white/50 -translate-y-1/2 pointer-events-none"></div>
                                                            <div className="absolute top-1/2 left-1/2 w-32 h-32 sm:w-40 sm:h-40 border-4 border-white/50 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                                                            <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-white/70 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                                                            
                                                            {/* Careuri */}
                                                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-24 border-b-4 border-x-4 border-white/50 pointer-events-none"></div>
                                                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 sm:w-32 h-10 border-b-4 border-x-4 border-white/50 pointer-events-none"></div>
                                                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-24 border-t-4 border-x-4 border-white/50 pointer-events-none"></div>
                                                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-24 sm:w-32 h-10 border-t-4 border-x-4 border-white/50 pointer-events-none"></div>

                                                            {lineupViewMode === 'both' ? (
                                                                <>
                                                                    <div className="flex-1 flex flex-col justify-around relative z-10 pb-4 pt-1">
                                                                        {homeRowsTopDown.map((rowItems, rIdx) => (
                                                                            <div key={`home-row-${rIdx}`} className="flex items-center justify-around px-2">
                                                                                {rowItems.map((item: any, pIdx: number) => renderPitchPlayerNode(item, false, pIdx))}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div className="flex-1 flex flex-col justify-around relative z-10 pt-4 pb-1">
                                                                        {awayRowsBottomUp.map((rowItems, rIdx) => (
                                                                            <div key={`away-row-${rIdx}`} className="flex items-center justify-around px-2">
                                                                                {rowItems.map((item: any, pIdx: number) => renderPitchPlayerNode(item, true, pIdx))}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="flex-1 flex flex-col justify-around relative z-10 py-4">
                                                                    {singleTeamRows.map((rowItems, rIdx) => (
                                                                        <div key={`single-row-${rIdx}`} className="flex items-center justify-around px-2">
                                                                            {rowItems.map((item: any, pIdx: number) => renderPitchPlayerNode(item, lineupViewMode === 'away', pIdx))}
                                                                        </div>
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
                                                                                <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white uppercase tracking-tight truncate">{teamLineup.team?.name}</span>
                                                                            </div>
                                                                            {teamLineup.coach?.name && (
                                                                                <div className="flex flex-col items-end">
                                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Antrenor</span>
                                                                                    <strong className="text-xs text-slate-900 dark:text-white uppercase tracking-wide">{teamLineup.coach.name}</strong>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">
                                                                            Banca de Rezerve
                                                                        </h4>
                                                                        <div className="grid grid-cols-1 gap-2">
                                                                            {teamLineup.substitutes?.map((sub: any, sIdx: number) => {
                                                                                const badges = getPlayerMatchBadges(sub.player?.name, sub.player?.id);
                                                                                return (
                                                                                    <div
                                                                                        key={sIdx}
                                                                                        onClick={() => handleLineupPlayerClick(sub.player?.name)}
                                                                                        className="py-2.5 px-3 flex items-center justify-between bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                                                                    >
                                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                                            <span className={`w-8 h-8 rounded-lg font-black flex items-center justify-center text-xs shrink-0 border-2 ${isAway ? 'bg-slate-900 text-white border-blue-500' : 'bg-white text-slate-900 border-slate-300'}`}>
                                                                                                {sub.player?.number || "-"}
                                                                                            </span>
                                                                                            <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 uppercase tracking-tight truncate">
                                                                                                {sub.player?.name}
                                                                                            </span>
                                                                                            {badges.subOut && <span className="text-xs" title="A intrat pe teren">🔄</span>}
                                                                                            {badges.goals > 0 && <span className="text-xs">⚽</span>}
                                                                                        </div>
                                                                                        <span className="text-[9px] font-black px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md uppercase tracking-widest shrink-0">
                                                                                            {sub.player?.pos || "-"}
                                                                                        </span>
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
                                                <div className="text-center py-16 bg-white dark:bg-slate-950 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-widest text-xs">
                                                    Datele statistice nu au fost procesate încă.
                                                </div>
                                            ) : (
                                                <div className="bg-white dark:bg-slate-950 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-5 sm:p-8 space-y-6 shadow-sm">
                                                    {selectedMatchDetails.statistics[0].statistics.map((statItem: any, idx: number) => {
                                                        const homeValRaw = statItem.value ?? 0;
                                                        const awayValRaw = selectedMatchDetails.statistics?.[1]?.statistics?.[idx]?.value ?? 0;
                                                        const homeNum = parseFloat(String(homeValRaw).replace('%', '')) || 0;
                                                        const awayNum = parseFloat(String(awayValRaw).replace('%', '')) || 0;
                                                        const total = homeNum + awayNum;
                                                        const homePercent = total > 0 ? Math.round((homeNum / total) * 100) : 50;
                                                        const awayPercent = 100 - homePercent;

                                                        return (
                                                            <div key={idx} className="space-y-2">
                                                                <div className="flex justify-between text-sm sm:text-base font-black">
                                                                    <span className="text-slate-900 dark:text-white w-10 text-left">{homeValRaw}</span>
                                                                    <span className="text-slate-400 uppercase text-[10px] tracking-widest text-center flex-1">
                                                                        {translateStatLabel(statItem.type)}
                                                                    </span>
                                                                    <span className="text-slate-900 dark:text-white w-10 text-right">{awayValRaw}</span>
                                                                </div>
                                                                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-700">
                                                                    <div style={{ width: `${homePercent}%` }} className="bg-emerald-500 h-full transition-all"></div>
                                                                    <div style={{ width: `${awayPercent}%` }} className="bg-blue-500 h-full transition-all"></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
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
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Se preia clasamentul oficial...</span>
                                                </div>
                                            ) : !standingsData || standingsData.length === 0 ? (
                                                <div className="text-center py-16 bg-white dark:bg-slate-950 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-widest text-xs">
                                                    Clasamentul nu este disponibil în arhivă.
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {standingsData.map((groupTable: any[], gIdx: number) => (
                                                        <div key={gIdx} className="bg-white dark:bg-slate-950 rounded-3xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-xs sm:text-sm text-left">
                                                                    <thead className="bg-slate-900 text-slate-400 font-black uppercase tracking-widest text-[9px] border-b-2 border-slate-700">
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
                                                                                <tr
                                                                                    key={row.rank}
                                                                                    onClick={e => row.team?.name && handleTeamClick(e, row.team.name)}
                                                                                    className={`cursor-pointer transition-colors ${
                                                                                        isCurrentTeam ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                                                                                    }`}
                                                                                >
                                                                                    <td className="py-3.5 px-3 text-center font-black text-slate-500">
                                                                                        {row.rank}
                                                                                    </td>
                                                                                    <td className="py-3.5 px-3 flex items-center gap-3">
                                                                                        <img src={row.team?.logo} alt="logo" className="w-6 h-6 object-contain bg-white rounded p-0.5" />
                                                                                        <span className={`font-black uppercase tracking-tight truncate ${isCurrentTeam ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                                                                                            {row.team?.name}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="py-3.5 px-3 text-center font-bold text-slate-500 dark:text-slate-400">
                                                                                        {row.all?.played}
                                                                                    </td>
                                                                                    <td className="py-3.5 px-3 text-center font-bold text-slate-500 dark:text-slate-400 text-[11px]">
                                                                                        {row.all?.goals?.for}:{row.all?.goals?.against}
                                                                                    </td>
                                                                                    <td className={`py-3.5 px-3 text-center font-black text-sm ${isCurrentTeam ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                                                                                        {row.points}
                                                                                    </td>
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

            {/* MODAL LOT (Echipa Extinsă) */}
            {selectedTeam && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md"
                    onClick={() => setSelectedTeam(null)}
                >
                    <div
                        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-slate-700"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-slate-950 text-white p-5 sm:p-8 flex items-center justify-between shrink-0 border-b-4 border-slate-700">
                            <div className="flex items-center gap-4 sm:gap-6">
                                <img
                                    src={selectedTeam.teamInfo.logo}
                                    alt="Logo"
                                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain bg-white rounded-2xl p-2 shadow-inner"
                                />
                                <div>
                                    <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter leading-none mb-1">{selectedTeam.teamInfo.name}</h2>
                                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-400">Lot Oficial • {selectedTeam.teamInfo.totalPlayers} Jucători</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedTeam(null)} className="p-3 bg-slate-800 hover:bg-rose-600 border border-slate-700 rounded-xl transition-colors">
                                <X className="w-6 h-6 font-bold" />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1 bg-slate-50 dark:bg-slate-950">
                            {[
                                { title: "Portari", data: selectedTeam.squad.Goalkeepers, color: "text-amber-500", border: "border-amber-500" },
                                { title: "Fundași", data: selectedTeam.squad.Defenders, color: "text-blue-500", border: "border-blue-500" },
                                { title: "Mijlocași", data: selectedTeam.squad.Midfielders, color: "text-emerald-500", border: "border-emerald-500" },
                                { title: "Atacanți", data: selectedTeam.squad.Attackers, color: "text-rose-500", border: "border-rose-500" }
                            ].map(
                                (sec, idx) =>
                                    sec.data.length > 0 && (
                                        <div key={idx} className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                            <div className={`bg-slate-100 dark:bg-slate-950 px-5 py-3 border-l-4 ${sec.border}`}>
                                                <h3 className={`font-black uppercase tracking-widest text-xs sm:text-sm ${sec.color}`}>{sec.title}</h3>
                                            </div>
                                            <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
                                                {sec.data.map(p => (
                                                    <div
                                                        key={p._id}
                                                        onClick={() => setSelectedPlayer(p)}
                                                        className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                                    >
                                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                                            <img
                                                                src={p.image || GENERIC_USER_IMAGE}
                                                                alt={p.name}
                                                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700 bg-white"
                                                            />
                                                            <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white uppercase tracking-tight truncate">{p.name}</span>
                                                        </div>
                                                        <div className="flex gap-2 sm:gap-4 text-center shrink-0">
                                                            <div className="bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 min-w-[50px]">
                                                                <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Meciuri</span>
                                                                <p className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-none">
                                                                    {p.statistics_summary?.total_appearances || 0}
                                                                </p>
                                                            </div>
                                                            <div className="bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 min-w-[50px]">
                                                                <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Goluri</span>
                                                                <p className="font-black text-sm sm:text-base text-emerald-600 dark:text-emerald-400 leading-none">
                                                                    {p.statistics_summary?.total_goals || 0}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETALII JUCĂTOR (Scouting Card) */}
            {selectedPlayer && (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setSelectedPlayer(null)}
                >
                    <div
                        className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[95vh] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border-4 border-emerald-600/30"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header Jucător */}
                        <div className="relative bg-slate-900 shrink-0 px-5 sm:px-8 py-6 sm:py-8 border-b-4 border-emerald-500 overflow-hidden">
                            <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_20px,#10b981_20px,#10b981_22px),repeating-linear-gradient(90deg,transparent,transparent_20px,#10b981_20px,#10b981_22px)] pointer-events-none"></div>
                            
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
                                    onError={e => { e.currentTarget.src = GENERIC_USER_IMAGE; }}
                                />
                                
                                <div className="text-white text-center sm:text-left flex-1 min-w-0">
                                    <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter truncate drop-shadow-md leading-none mb-2">{selectedPlayer.name}</h2>
                                    <div className="flex items-center justify-center sm:justify-start gap-2">
                                        {selectedPlayer.team_logo && (
                                            <img src={selectedPlayer.team_logo} alt="logo" className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-md p-1 object-contain" />
                                        )}
                                        <span className="font-bold text-lg sm:text-xl text-emerald-400 uppercase tracking-widest truncate">
                                            {selectedPlayer.team_name || selectedPlayer.team}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 dark:bg-slate-950">
                            
                            <div className="flex flex-wrap justify-center sm:justify-start gap-3 mb-8">
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                    <Globe className="w-4 h-4 text-emerald-500" /> {selectedPlayer.nationality || "N/A"}
                                </div>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                    <UserIcon className="w-4 h-4 text-emerald-500" /> {selectedPlayer.age ? `${selectedPlayer.age} ANI` : "N/A"}
                                </div>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                    <Activity className="w-4 h-4 text-emerald-500" /> {selectedPlayer.height || "-"} / {selectedPlayer.weight || "-"}
                                </div>
                                <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/40 px-4 py-2 rounded-xl border-2 border-emerald-300 dark:border-emerald-700 text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                                    {selectedPlayer.position || "N/A"}
                                </div>
                            </div>

                            <h3 className="text-lg font-black uppercase tracking-widest text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b-2 border-emerald-500/20 pb-2">
                                <Trophy className="w-6 h-6 text-amber-500" /> Cifrele Sezonului
                            </h3>
                            
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-10">
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-center flex flex-col justify-center shadow-sm">
                                    <span className="block text-3xl font-black text-slate-900 dark:text-white leading-none">
                                        {selectedPlayer.statistics_summary?.total_appearances || 0}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-2">Meciuri</span>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-center flex flex-col justify-center border-b-4 border-b-emerald-500 shadow-sm">
                                    <span className="block text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
                                        {selectedPlayer.statistics_summary?.total_goals || 0}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-2">Goluri</span>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-center flex flex-col justify-center border-b-4 border-b-blue-500 shadow-sm">
                                    <span className="block text-3xl font-black text-blue-600 dark:text-blue-400 leading-none">
                                        {selectedPlayer.statistics_summary?.total_assists || 0}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-2">Pase Dec.</span>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-center flex flex-col justify-center shadow-sm">
                                    <span className="block text-3xl font-black text-slate-900 dark:text-white leading-none">
                                        {selectedPlayer.statistics_summary?.minutes_played || 0}'
                                    </span>
                                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-2">Minute</span>
                                </div>
                                <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-2xl border-2 border-amber-300 dark:border-amber-700 text-center flex flex-col justify-center shadow-sm">
                                    <span className="block text-3xl font-black text-amber-500 leading-none">
                                        {selectedPlayer.statistics_summary?.rating ? parseFloat(selectedPlayer.statistics_summary.rating).toFixed(2) : "-"}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-widest text-amber-600/80 font-bold mt-2">SofaScore</span>
                                </div>
                            </div>

                            <h3 className="text-lg font-black uppercase tracking-widest text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b-2 border-emerald-500/20 pb-2">
                                <MapPin className="w-6 h-6 text-emerald-500" /> Situație Competițională
                            </h3>
                            
                            {!selectedPlayer.detailed_stats || selectedPlayer.detailed_stats.length === 0 ? (
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
                                            <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800">
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

            {/* HEADER SECȚIUNE (Tabelă Principală) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="bg-slate-900 border-2 border-emerald-500 p-3 sm:p-4 rounded-2xl shadow-[0_10px_20px_rgba(16,185,129,0.3)]">
                        <Activity className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none mb-1 drop-shadow-sm">Scoruri <span className="text-emerald-500">Live</span></h1>
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500">Tabelă Oficială Meciuri</span>
                    </div>
                </div>

                <div className="flex bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl border-2 border-slate-300/50 dark:border-slate-700/50 p-1.5 overflow-x-auto scrollbar-hide shadow-sm">
                    <button
                        onClick={() => setSubFilter('all')}
                        className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap border-b-2 ${
                            subFilter === 'all' 
                            ? 'bg-slate-900 text-white border-slate-950 shadow-md translate-y-[-2px]' 
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                        }`}
                    >
                        Toate
                    </button>
                    <button
                        onClick={() => setSubFilter('live')}
                        className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-b-2 whitespace-nowrap ${
                            subFilter === 'live' 
                            ? 'bg-rose-600 text-white border-rose-800 shadow-[0_4px_15px_rgba(225,29,72,0.3)] translate-y-[-2px]' 
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                        }`}
                    >
                        <span className={`w-2.5 h-2.5 rounded-full ${liveCount > 0 ? (subFilter === 'live' ? 'bg-white animate-ping' : 'bg-rose-500 animate-ping') : 'bg-slate-400'}`}></span>
                        LIVE ({liveCount})
                    </button>
                    <button
                        onClick={() => setSubFilter('finished')}
                        className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap border-b-2 ${
                            subFilter === 'finished' 
                            ? 'bg-slate-900 text-white border-slate-950 shadow-md translate-y-[-2px]' 
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                        }`}
                    >
                        Finalizate
                    </button>
                    <button
                        onClick={() => setSubFilter('favorites')}
                        className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-b-2 whitespace-nowrap ${
                            subFilter === 'favorites' 
                            ? 'bg-amber-500 text-slate-950 border-amber-700 shadow-[0_4px_15px_rgba(245,158,11,0.3)] translate-y-[-2px]' 
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-amber-500 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                        }`}
                    >
                        <Star className="w-4 h-4 fill-current" /> Listă (Fav)
                    </button>
                </div>
            </div>

            {/* NAVIGARE ZILE */}
            <div className="bg-slate-900 rounded-2xl shadow-xl border-4 border-slate-800 p-2 mb-8 overflow-x-auto relative z-10">
                <div className="flex justify-between gap-2 min-w-[500px]">
                    {dates.map((dObj, idx) => {
                        const isSelected = selectedDate.getTime() === dObj.date.getTime();
                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedDate(dObj.date)}
                                className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all border-b-4 ${
                                    isSelected 
                                    ? 'bg-emerald-600 text-white border-emerald-800 shadow-md translate-y-[-2px]' 
                                    : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                            >
                                <span className="block">{dObj.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* LISTA MECIURI */}
            {loading ? (
                <div className="flex flex-col justify-center items-center py-20 relative z-10">
                    <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 animate-pulse">Se aprinde nocturna...</span>
                </div>
            ) : sortedLeagueNames.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border-4 border-dashed border-slate-200 dark:border-slate-800 relative z-10">
                    <Calendar className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                    <h3 className="text-2xl font-black uppercase tracking-widest text-slate-800 dark:text-white mb-2">Teren Închis</h3>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Niciun meci programat pentru data selectată.</p>
                </div>
            ) : (
                <div className="space-y-6 relative z-10">
                    {sortedLeagueNames.map(leagueName => (
                        <div key={leagueName} className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="bg-slate-100 dark:bg-slate-950 border-b-2 border-slate-200 dark:border-slate-800 px-5 py-4 flex items-center gap-3">
                                {groupedMatches[leagueName].logo ? (
                                    <img
                                        src={groupedMatches[leagueName].logo}
                                        alt={leagueName}
                                        className="w-7 h-7 object-contain drop-shadow-sm"
                                    />
                                ) : (
                                    <Trophy className="w-6 h-6 text-slate-400" />
                                )}
                                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm sm:text-base drop-shadow-sm">{leagueName}</h3>
                            </div>

                            <div className="divide-y-2 divide-slate-100 dark:divide-slate-800/50">
                                {groupedMatches[leagueName].items.map((match: Match) => {
                                    const isLive = ["1H", "2H", "HT", "ET", "P", "BT", "LIVE"].includes(match.status_short);
                                    const isFav = favoriteMatches.includes(match.fixture_id);

                                    return (
                                        <div
                                            key={match.fixture_id}
                                            onClick={() => handleMatchClick(match)}
                                            className="flex flex-col sm:flex-row items-stretch sm:items-center p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                        >
                                            <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto mb-4 sm:mb-0">
                                                <button
                                                    onClick={e => toggleFavoriteMatch(e, match.fixture_id)}
                                                    className={`p-2 rounded-xl border-2 transition-all mr-4 sm:mr-6 shrink-0 ${isFav ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-500' : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 hover:text-amber-500 hover:border-amber-300'}`}
                                                >
                                                    <Star className={`w-5 h-5 ${isFav ? 'fill-amber-500' : ''}`} />
                                                </button>

                                                <div className="w-20 sm:w-24 flex flex-col items-center justify-center shrink-0 sm:border-r-2 sm:border-slate-100 dark:sm:border-slate-800 pr-0 sm:pr-6 bg-slate-50 dark:bg-slate-900 sm:bg-transparent rounded-lg sm:rounded-none py-2 sm:py-0">
                                                    {renderStatus(match)}
                                                </div>
                                            </div>

                                            {/* Afișare Meci Mobil */}
                                            <div className="flex-1 flex flex-col justify-center gap-3 sm:hidden w-full bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center justify-between w-full">
                                                    <div
                                                        onClick={e => handleTeamClick(e, match.home_team_name)}
                                                        className="flex items-center gap-3 overflow-hidden w-[80%]"
                                                    >
                                                        <img src={match.home_team_logo} className="w-6 h-6 object-contain bg-white rounded-md p-0.5 shrink-0" />
                                                        <span className={`font-black uppercase tracking-tight text-sm truncate w-full ${match.home_goals !== null && match.away_goals !== null && match.home_goals > match.away_goals ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                                            {match.home_team_name}
                                                        </span>
                                                    </div>
                                                    <div className={`font-black text-lg text-center shrink-0 w-[20%] ${isLive ? 'text-rose-600' : (match.home_goals !== null && match.away_goals !== null && match.home_goals > match.away_goals ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500')}`}>
                                                        {match.status_short === "NS" ? "-" : match.home_goals}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between w-full">
                                                    <div
                                                        onClick={e => handleTeamClick(e, match.away_team_name)}
                                                        className="flex items-center gap-3 overflow-hidden w-[80%]"
                                                    >
                                                        <img src={match.away_team_logo} className="w-6 h-6 object-contain bg-white rounded-md p-0.5 shrink-0" />
                                                        <span className={`font-black uppercase tracking-tight text-sm truncate w-full ${match.home_goals !== null && match.away_goals !== null && match.away_goals > match.home_goals ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                                            {match.away_team_name}
                                                        </span>
                                                    </div>
                                                    <div className={`font-black text-lg text-center shrink-0 w-[20%] ${isLive ? 'text-rose-600' : (match.home_goals !== null && match.away_goals !== null && match.away_goals > match.home_goals ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500')}`}>
                                                        {match.status_short === "NS" ? "-" : match.away_goals}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Afișare Meci Desktop */}
                                            <div className="hidden sm:flex flex-1 items-center justify-between ml-6">
                                                <div
                                                    onClick={e => handleTeamClick(e, match.home_team_name)}
                                                    className="flex-1 flex items-center justify-end gap-4 text-right hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                                >
                                                    <span className={`font-black uppercase tracking-tight text-lg truncate ${match.home_goals !== null && match.away_goals !== null && match.home_goals > match.away_goals ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 group-hover:text-emerald-600'}`}>
                                                        {match.home_team_name}
                                                    </span>
                                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center p-1.5 shrink-0">
                                                        <img src={match.home_team_logo} className="w-full h-full object-contain" />
                                                    </div>
                                                </div>

                                                <div className="px-6 py-2 mx-6 rounded-2xl bg-slate-900 border-2 border-slate-800 shadow-inner flex items-center justify-center min-w-[120px] shrink-0">
                                                    {match.status_short === "NS" ? (
                                                        <span className="text-slate-500 font-black text-xl">- : -</span>
                                                    ) : (
                                                        <span className={`font-black text-2xl tracking-widest ${isLive ? 'text-rose-500 drop-shadow-[0_0_8px_rgba(225,29,72,0.8)]' : 'text-white'}`}>
                                                            {match.home_goals} - {match.away_goals}
                                                        </span>
                                                    )}
                                                </div>

                                                <div
                                                    onClick={e => handleTeamClick(e, match.away_team_name)}
                                                    className="flex-1 flex items-center justify-start gap-4 text-left hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                                >
                                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center p-1.5 shrink-0">
                                                        <img src={match.away_team_logo} className="w-full h-full object-contain" />
                                                    </div>
                                                    <span className={`font-black uppercase tracking-tight text-lg truncate ${match.home_goals !== null && match.away_goals !== null && match.away_goals > match.home_goals ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 group-hover:text-emerald-600'}`}>
                                                        {match.away_team_name}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}