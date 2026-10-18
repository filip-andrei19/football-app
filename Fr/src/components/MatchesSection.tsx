import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Calendar, Trophy, Activity, X, Globe, User as UserIcon, Star, MapPin, Users, BarChart2, ListOrdered, Clock, Shield } from 'lucide-react';

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
    }
}

export function MatchesSection({ userEmail }: { userEmail?: string }) {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    
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

    const fetchMatches = async (dateStr: string) => {
        setLoading(true);
        try {
            const res = await fetch(`https://football-backend-m2a4.onrender.com/api/sport/matches?date=${dateStr}`);
            if (res.ok) {
                const data = await res.json();
                setMatches(data);
            }
        } catch (err) {
            console.error("Eroare preluare meciuri", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!selectedDate) return;
        const localDateStr = new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000))
                                .toISOString().split('T')[0];
        fetchMatches(localDateStr);
    }, [selectedDate]);

    useEffect(() => {
        socket.on("live_match_update", (updatedMatch: Match) => {
            setMatches(prevMatches => {
                const index = prevMatches.findIndex(m => m.fixture_id === updatedMatch.fixture_id);
                if (index !== -1) {
                    const newMatches = [...prevMatches];
                    newMatches[index] = { ...newMatches[index], ...updatedMatch };
                    return newMatches;
                }
                return prevMatches;
            });
            setSelectedMatchDetails(prev => 
                prev && prev.fixture_id === updatedMatch.fixture_id ? { ...prev, ...updatedMatch } : prev
            );
        });
        return () => { socket.off("live_match_update"); };
    }, []);

    const toggleFavoriteMatch = async (e: React.MouseEvent, fixtureId: number) => {
        e.stopPropagation();
        if (!userEmail) {
            alert("Trebuie să fii autentificat pentru a salva meciuri la favorite!");
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
        setLoadingRoster(true);
        setSelectedTeam(null);
        try {
            const res = await fetch(`https://football-backend-m2a4.onrender.com/api/sport/teams/${encodeURIComponent(teamName)}/roster`);
            if (!res.ok) throw new Error("Nu am putut prelua lotul. Posibil ca echipa să nu fie încă scanată complet.");
            const data = await res.json();
            setSelectedTeam(data);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoadingRoster(false);
        }
    };

    const handleMatchClick = async (match: Match) => {
        setLoadingMatchDetails(true);
        setSelectedMatchDetails(match);
        setStandingsData([]);
        setActiveMatchTab(match.status_short === "NS" ? 'standings' : 'events');

        try {
            const res = await fetch(`https://football-backend-m2a4.onrender.com/api/sport/matches/${match.fixture_id}/details`);
            if (res.ok) {
                const fullData = await res.json();
                setSelectedMatchDetails(fullData);
                setMatches(prev => prev.map(m => m.fixture_id === fullData.fixture_id ? { ...m, ...fullData } : m));
                if (fullData.status_short === "NS" && (!fullData.lineups || fullData.lineups.length === 0)) {
                    fetchStandings(fullData.league_id);
                }
            }
        } catch (err) {
            console.error("Eroare detalii meci:", err);
        } finally {
            setLoadingMatchDetails(false);
        }
    };

    const fetchStandings = async (leagueId: number) => {
        if (standingsData.length > 0) return;
        setLoadingStandings(true);
        try {
            const res = await fetch(`https://football-backend-m2a4.onrender.com/api/sport/standings/${leagueId}`);
            if (res.ok) {
                const data = await res.json();
                setStandingsData(data.table || []);
            }
        } catch (err) {
            console.error("Eroare clasament:", err);
        } finally {
            setLoadingStandings(false);
        }
    };

    const handleLineupPlayerClick = async (playerName: string) => {
        try {
            const res = await fetch(`https://football-backend-m2a4.onrender.com/api/sport/players?search=${encodeURIComponent(playerName)}`);
            if (res.ok) {
                const players = await res.json();
                if (players && players.length > 0) {
                    setSelectedPlayer(players[0]);
                } else {
                    alert(`Profilul complet pentru ${playerName} nu este încă în baza de date.`);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const filteredMatches = matches.filter(match => {
        const isLive = ["1H", "HT", "2H", "ET", "P", "BT", "LIVE"].includes(match.status_short);
        const isFinished = ["FT", "AET", "PEN"].includes(match.status_short);
        const isFav = favoriteMatches.includes(match.fixture_id);

        if (subFilter === 'live') return isLive;
        if (subFilter === 'finished') return isFinished;
        if (subFilter === 'favorites') return isFav;
        return true;
    });

    const groupedMatches = filteredMatches.reduce((acc, match) => {
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

    const liveCount = matches.filter(m => ["1H", "HT", "2H", "ET", "P", "BT", "LIVE"].includes(m.status_short)).length;

    const renderStatus = (match: Match) => {
        const status = match.status_short;
        const liveStatuses = ["1H", "2H", "HT", "ET", "P", "BT", "LIVE"];
        
        if (status === "NS") return <span className="text-slate-500 font-bold text-[13px] sm:text-sm">{new Date(match.timestamp * 1000).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>;
        else if (liveStatuses.includes(status)) return <span className="text-red-600 font-black animate-pulse text-[13px] sm:text-sm">{match.elapsed ? `${match.elapsed}'` : status}</span>;
        else if (status === "FT" || status === "AET" || status === "PEN") return <span className="text-slate-400 font-bold text-[11px] sm:text-xs uppercase">Final</span>;
        else return <span className="text-amber-500 font-bold text-[11px] sm:text-xs uppercase">{status}</span>;
    };

    const translateStatLabel = (type: string) => {
        const map: Record<string, string> = {
            "Shots on Goal": "Șuturi pe poartă",
            "Shots off Goal": "Șuturi pe lângă poartă",
            "Total Shots": "Total șuturi",
            "Blocked Shots": "Șuturi blocate",
            "Shots insidebox": "Șuturi din careu",
            "Shots outsidebox": "Șuturi din afara careului",
            "Fouls": "Faulturi",
            "Corner Kicks": "Cornere",
            "Offsides": "Ofsaiduri",
            "Ball Possession": "Posesie",
            "Yellow Cards": "Cartonașe galbene",
            "Red Cards": "Cartonașe roșii",
            "Goalkeeper Saves": "Parade portar",
            "Total passes": "Total pase",
            "Passes accurate": "Pase reușite",
            "Passes %": "Acuratețe pase",
            "expected_goals": "Goluri așteptate (xG)"
        };
        return map[type] || type;
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-2 sm:px-4 min-h-[80vh] relative">
            
            {loadingRoster && (
                <div className="fixed inset-0 z-[70] bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mb-4"></div>
                    <h3 className="text-xl font-black text-slate-800 animate-pulse">Încărcăm Lotul...</h3>
                </div>
            )}

            {selectedMatchDetails && (
                <div className="fixed inset-0 z-[50] flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedMatchDetails(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
                        
                        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-6 shrink-0 relative">
                            <button onClick={() => setSelectedMatchDetails(null)} className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition">
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center justify-center gap-2 text-xs text-slate-300 font-bold uppercase tracking-wider mb-4">
                                {selectedMatchDetails.league_logo && <img src={selectedMatchDetails.league_logo} alt="league" className="w-4 h-4 object-contain bg-white rounded-full p-0.5" />}
                                <span>{selectedMatchDetails.league_name}</span>
                                {selectedMatchDetails.league_round && <span>• {selectedMatchDetails.league_round}</span>}
                            </div>

                            <div className="flex items-center justify-between gap-2 sm:gap-6 max-w-2xl mx-auto">
                                <div onClick={(e) => handleTeamClick(e, selectedMatchDetails.home_team_name)} className="flex-1 flex flex-col items-center text-center cursor-pointer group">
                                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white rounded-2xl p-2 shadow-lg mb-2 group-hover:scale-105 transition">
                                        <img src={selectedMatchDetails.home_team_logo} alt={selectedMatchDetails.home_team_name} className="w-full h-full object-contain" />
                                    </div>
                                    <span className="font-black text-sm sm:text-lg group-hover:text-emerald-400 transition line-clamp-2">{selectedMatchDetails.home_team_name}</span>
                                </div>

                                <div className="flex flex-col items-center justify-center px-3 sm:px-6 shrink-0">
                                    <div className="text-3xl sm:text-5xl font-black tracking-tight bg-white/10 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl border border-white/10">
                                        {selectedMatchDetails.status_short === "NS" ? "- : -" : `${selectedMatchDetails.home_goals ?? 0} - ${selectedMatchDetails.away_goals ?? 0}`}
                                    </div>
                                    <div className="mt-2">
                                        {renderStatus(selectedMatchDetails)}
                                    </div>
                                </div>

                                <div onClick={(e) => handleTeamClick(e, selectedMatchDetails.away_team_name)} className="flex-1 flex flex-col items-center text-center cursor-pointer group">
                                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white rounded-2xl p-2 shadow-lg mb-2 group-hover:scale-105 transition">
                                        <img src={selectedMatchDetails.away_team_logo} alt={selectedMatchDetails.away_team_name} className="w-full h-full object-contain" />
                                    </div>
                                    <span className="font-black text-sm sm:text-lg group-hover:text-emerald-400 transition line-clamp-2">{selectedMatchDetails.away_team_name}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0 overflow-x-auto">
                            <button onClick={() => setActiveMatchTab('events')} className={`flex-1 py-3 px-3 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition ${activeMatchTab === 'events' ? 'border-emerald-600 text-emerald-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Clock className="w-4 h-4" /> Evenimente</button>
                            <button onClick={() => setActiveMatchTab('lineups')} className={`flex-1 py-3 px-3 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition ${activeMatchTab === 'lineups' ? 'border-emerald-600 text-emerald-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Users className="w-4 h-4" /> Formații & Teren</button>
                            <button onClick={() => setActiveMatchTab('stats')} className={`flex-1 py-3 px-3 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition ${activeMatchTab === 'stats' ? 'border-emerald-600 text-emerald-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><BarChart2 className="w-4 h-4" /> Statistici</button>
                            <button onClick={() => { setActiveMatchTab('standings'); fetchStandings(selectedMatchDetails.league_id); }} className={`flex-1 py-3 px-3 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition ${activeMatchTab === 'standings' ? 'border-emerald-600 text-emerald-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><ListOrdered className="w-4 h-4" /> Clasament</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-50">
                            {loadingMatchDetails ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-3"></div>
                                    <p className="text-sm font-bold text-slate-500">Se încarcă detaliile meciului...</p>
                                </div>
                            ) : (
                                <>
                                    {activeMatchTab === 'events' && (
                                        <div>
                                            {(!selectedMatchDetails.events || selectedMatchDetails.events.length === 0) ? (
                                                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">Nu există evenimente înregistrate.</div>
                                            ) : (
                                                <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                                                    {selectedMatchDetails.ht_home_goals !== null && (
                                                        <div className="bg-slate-100 text-slate-600 font-bold text-center py-2 text-xs uppercase tracking-wider">
                                                            Pauză (HT) • Scor: {selectedMatchDetails.ht_home_goals} - {selectedMatchDetails.ht_away_goals}
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
                                                            <div key={idx} className={`flex items-center p-3 sm:p-4 text-xs sm:text-sm ${isHome ? 'flex-row' : 'flex-row-reverse text-right'}`}>
                                                                <div className="w-12 sm:w-16 font-black text-slate-500 text-center shrink-0">{ev.time?.elapsed}'</div>
                                                                <div className="text-lg sm:text-xl mx-2 sm:mx-3 shrink-0">{icon}</div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-bold text-slate-800 truncate">{ev.player?.name}</p>
                                                                    {ev.assist?.name && <p className="text-[11px] text-slate-400 truncate">{ev.type === "subst" ? `Iese: ${ev.assist.name}` : `Asist: ${ev.assist.name}`}</p>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {["FT", "AET", "PEN"].includes(selectedMatchDetails.status_short) && (
                                                        <div className="bg-slate-900 text-white font-bold text-center py-2.5 text-xs uppercase tracking-wider">
                                                            Final Meci (FT) • Scor Final: {selectedMatchDetails.home_goals} - {selectedMatchDetails.away_goals}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeMatchTab === 'lineups' && (
                                        <div>
                                            {(!selectedMatchDetails.lineups || selectedMatchDetails.lineups.length === 0) ? (
                                                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">Formațiile de start nu au fost publicate încă.</div>
                                            ) : (
                                                <div className="space-y-6">
                                                    <div className="relative w-full h-[520px] bg-gradient-to-b from-emerald-700 via-emerald-600 to-emerald-800 rounded-3xl overflow-hidden shadow-xl border-4 border-white/20 flex flex-col justify-between p-4">
                                                        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>
                                                        <div className="absolute top-1/2 inset-x-0 h-0.5 bg-white/30 transform -translate-y-1/2"></div>
                                                        <div className="absolute top-1/2 left-1/2 w-32 h-32 border-2 border-white/30 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                                                        
                                                        <div className="text-center text-white/80 font-black text-xs uppercase tracking-widest relative z-10">Gazde ({selectedMatchDetails.lineups?.[0]?.team?.name || "Gazde"})</div>
                                                        
                                                        <div className="flex-1 flex flex-col justify-around relative z-10 py-2">
                                                            <div className="flex justify-center"><div onClick={() => handleLineupPlayerClick(selectedMatchDetails.lineups?.[0]?.startXI?.[0]?.player?.name)} className="cursor-pointer bg-slate-900/90 text-white px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-md border border-white/20 flex items-center gap-1"><span>{selectedMatchDetails.lineups?.[0]?.startXI?.[0]?.player?.number}</span><span className="truncate max-w-[100px]">{selectedMatchDetails.lineups?.[0]?.startXI?.[0]?.player?.name}</span></div></div>
                                                            <div className="flex justify-around">
                                                                {selectedMatchDetails.lineups?.[0]?.startXI?.slice(1, 5).map((item: any, i: number) => (
                                                                    <div key={i} onClick={() => handleLineupPlayerClick(item.player?.name)} className="cursor-pointer bg-slate-900/90 text-white px-2 py-1 rounded-xl text-[10px] font-bold shadow-md border border-white/20 flex items-center gap-1"><span>{item.player?.number}</span><span className="truncate max-w-[80px]">{item.player?.name}</span></div>
                                                                ))}
                                                            </div>
                                                            <div className="flex justify-around">
                                                                {selectedMatchDetails.lineups?.[0]?.startXI?.slice(5, 8).map((item: any, i: number) => (
                                                                    <div key={i} onClick={() => handleLineupPlayerClick(item.player?.name)} className="cursor-pointer bg-slate-900/90 text-white px-2 py-1 rounded-xl text-[10px] font-bold shadow-md border border-white/20 flex items-center gap-1"><span>{item.player?.number}</span><span className="truncate max-w-[80px]">{item.player?.name}</span></div>
                                                                ))}
                                                            </div>
                                                            <div className="flex justify-around">
                                                                {selectedMatchDetails.lineups?.[0]?.startXI?.slice(8, 11).map((item: any, i: number) => (
                                                                    <div key={i} onClick={() => handleLineupPlayerClick(item.player?.name)} className="cursor-pointer bg-slate-900/90 text-white px-2 py-1 rounded-xl text-[10px] font-bold shadow-md border border-white/20 flex items-center gap-1"><span>{item.player?.number}</span><span className="truncate max-w-[80px]">{item.player?.name}</span></div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 flex flex-col justify-around relative z-10 py-2 border-t border-white/10 pt-4">
                                                            <div className="flex justify-around">
                                                                {selectedMatchDetails.lineups?.[1]?.startXI?.slice(8, 11).map((item: any, i: number) => (
                                                                    <div key={i} onClick={() => handleLineupPlayerClick(item.player?.name)} className="cursor-pointer bg-blue-950/95 text-white px-2 py-1 rounded-xl text-[10px] font-bold shadow-md border border-white/20 flex items-center gap-1"><span>{item.player?.number}</span><span className="truncate max-w-[80px]">{item.player?.name}</span></div>
                                                                ))}
                                                            </div>
                                                            <div className="flex justify-around">
                                                                {selectedMatchDetails.lineups?.[1]?.startXI?.slice(5, 8).map((item: any, i: number) => (
                                                                    <div key={i} onClick={() => handleLineupPlayerClick(item.player?.name)} className="cursor-pointer bg-blue-950/95 text-white px-2 py-1 rounded-xl text-[10px] font-bold shadow-md border border-white/20 flex items-center gap-1"><span>{item.player?.number}</span><span className="truncate max-w-[80px]">{item.player?.name}</span></div>
                                                                ))}
                                                            </div>
                                                            <div className="flex justify-around">
                                                                {selectedMatchDetails.lineups?.[1]?.startXI?.slice(1, 5).map((item: any, i: number) => (
                                                                    <div key={i} onClick={() => handleLineupPlayerClick(item.player?.name)} className="cursor-pointer bg-blue-950/95 text-white px-2 py-1 rounded-xl text-[10px] font-bold shadow-md border border-white/20 flex items-center gap-1"><span>{item.player?.number}</span><span className="truncate max-w-[80px]">{item.player?.name}</span></div>
                                                                ))}
                                                            </div>
                                                            <div className="flex justify-center"><div onClick={() => handleLineupPlayerClick(selectedMatchDetails.lineups?.[1]?.startXI?.[0]?.player?.name)} className="cursor-pointer bg-blue-950/95 text-white px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-md border border-white/20 flex items-center gap-1"><span>{selectedMatchDetails.lineups?.[1]?.startXI?.[0]?.player?.number}</span><span className="truncate max-w-[100px]">{selectedMatchDetails.lineups?.[1]?.startXI?.[0]?.player?.name}</span></div></div>
                                                        </div>

                                                        <div className="text-center text-white/80 font-black text-xs uppercase tracking-widest relative z-10">Oaspeți ({selectedMatchDetails.lineups?.[1]?.team?.name || "Oaspeți"})</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeMatchTab === 'stats' && (
                                        <div>
                                            {(!selectedMatchDetails.statistics || selectedMatchDetails.statistics.length < 2) ? (
                                                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">Statisticile nu sunt disponibile momentan.</div>
                                            ) : (
                                                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-4">
                                                    {selectedMatchDetails.statistics[0].statistics.map((statItem: any, idx: number) => {
                                                        const homeValRaw = statItem.value ?? 0;
                                                        const awayValRaw = selectedMatchDetails.statistics![1]?.statistics?.[idx]?.value ?? 0;
                                                        const homeNum = parseFloat(String(homeValRaw).replace('%', '')) || 0;
                                                        const awayNum = parseFloat(String(awayValRaw).replace('%', '')) || 0;
                                                        const total = homeNum + awayNum;
                                                        const homePercent = total > 0 ? Math.round((homeNum / total) * 100) : 50;
                                                        const awayPercent = 100 - homePercent;

                                                        return (
                                                            <div key={idx} className="space-y-1.5">
                                                                <div className="flex justify-between text-xs sm:text-sm font-bold">
                                                                    <span className="text-slate-800">{homeValRaw}</span>
                                                                    <span className="text-slate-500 uppercase text-[11px] tracking-wider">{translateStatLabel(statItem.type)}</span>
                                                                    <span className="text-slate-800">{awayValRaw}</span>
                                                                </div>
                                                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                                                    <div style={{ width: `${homePercent}%` }} className="bg-emerald-600 h-full transition-all" />
                                                                    <div style={{ width: `${awayPercent}%` }} className="bg-slate-400 h-full transition-all" />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeMatchTab === 'standings' && (
                                        <div>
                                            {loadingStandings ? (
                                                <div className="flex flex-col items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-2"></div><span className="text-xs font-bold text-slate-500">Încărcăm clasamentul...</span></div>
                                            ) : (!standingsData || standingsData.length === 0) ? (
                                                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">Clasamentul nu este disponibil.</div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {standingsData.map((groupTable: any[], gIdx: number) => (
                                                        <div key={gIdx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-xs sm:text-sm text-left">
                                                                    <thead className="bg-slate-900 text-white uppercase text-[10px]">
                                                                        <tr>
                                                                            <th className="py-3 px-2 text-center">#</th>
                                                                            <th className="py-3 px-2">Echipă</th>
                                                                            <th className="py-3 px-2 text-center">M</th>
                                                                            <th className="py-3 px-2 text-center">G</th>
                                                                            <th className="py-3 px-2 text-center font-black">Pct</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {groupTable.map((row: any) => {
                                                                            const isCurrentTeam = row.team?.id === selectedMatchDetails.home_team_id || row.team?.id === selectedMatchDetails.away_team_id;
                                                                            return (
                                                                                <tr key={row.rank} onClick={(e) => row.team?.name && handleTeamClick(e, row.team.name)} className={`cursor-pointer transition ${isCurrentTeam ? 'bg-emerald-50 font-bold' : 'hover:bg-slate-50'}`}>
                                                                                    <td className="py-2.5 px-2 text-center font-bold text-slate-500">{row.rank}</td>
                                                                                    <td className="py-2.5 px-2 flex items-center gap-2"><img src={row.team?.logo} alt="logo" className="w-5 h-5 object-contain" /><span className="truncate">{row.team?.name}</span></td>
                                                                                    <td className="py-2.5 px-2 text-center">{row.all?.played}</td>
                                                                                    <td className="py-2.5 px-2 text-center">{row.all?.goals?.for}:{row.all?.goals?.against}</td>
                                                                                    <td className="py-2.5 px-2 text-center font-black">{row.points}</td>
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

            {selectedTeam && (
                <div className="fixed inset-0 z-[55] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedTeam(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-slate-900 text-white p-4 sm:p-6 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <img src={selectedTeam.teamInfo.logo} alt="Logo" className="w-12 h-12 object-contain bg-white rounded-xl p-1" />
                                <div><h2 className="text-xl sm:text-2xl font-black">{selectedTeam.teamInfo.name}</h2><p className="text-xs text-slate-400">{selectedTeam.teamInfo.totalPlayers} Jucători</p></div>
                            </div>
                            <button onClick={() => setSelectedTeam(null)} className="p-2 bg-white/10 rounded-full">✕</button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-4 flex-1">
                            {([
                                { title: "Portari", data: selectedTeam.squad.Goalkeepers, color: "text-amber-600" },
                                { title: "Fundași", data: selectedTeam.squad.Defenders, color: "text-blue-600" },
                                { title: "Mijlocași", data: selectedTeam.squad.Midfielders, color: "text-emerald-600" },
                                { title: "Atacanți", data: selectedTeam.squad.Attackers, color: "text-rose-600" }
                            ]).map((sec, idx) => sec.data.length > 0 && (
                                <div key={idx} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                    <div className="bg-slate-50 px-4 py-2"><h3 className={`font-black uppercase text-xs ${sec.color}`}>{sec.title}</h3></div>
                                    <div className="divide-y divide-slate-50">
                                        {sec.data.map(p => (
                                            <div key={p._id} onClick={() => setSelectedPlayer(p)} className="flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer">
                                                <div className="flex items-center gap-3"><img src={p.image || GENERIC_USER_IMAGE} alt={p.name} className="w-9 h-9 rounded-full object-cover" /><span className="font-bold text-slate-800">{p.name}</span></div>
                                                <div className="flex gap-4 text-center">
                                                    <div><span className="text-[9px] text-slate-400 uppercase">Meciuri</span><p className="font-black text-sm">{p.statistics_summary?.total_appearances || 0}</p></div>
                                                    <div><span className="text-[9px] text-slate-400 uppercase">Goluri</span><p className="font-black text-sm">{p.statistics_summary?.total_goals || 0}</p></div>
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

            {selectedPlayer && (
                <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedPlayer(null)}>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                        <div className="relative bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-800 shrink-0 px-6 py-8">
                            <button onClick={() => setSelectedPlayer(null)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur rounded-full p-2 text-white transition-colors z-10">
                                <X className="w-5 h-5" />
                            </button>
                            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 relative z-0">
                                <img src={selectedPlayer.image || GENERIC_USER_IMAGE} alt={selectedPlayer.name} className="w-28 h-28 md:w-36 md:h-36 rounded-2xl object-cover border-4 border-white dark:border-slate-900 shadow-xl bg-white dark:bg-slate-800 shrink-0" onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }} />
                                <div className="text-white drop-shadow-md text-center sm:text-left flex-1 min-w-0">
                                    <h2 className="text-3xl md:text-4xl font-black truncate">{selectedPlayer.name}</h2>
                                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 opacity-90">
                                        {selectedPlayer.team_logo && <img src={selectedPlayer.team_logo} alt="logo" className="w-6 h-6 bg-white rounded-full p-0.5 object-contain" />}
                                        <span className="font-bold text-lg truncate">{selectedPlayer.team_name || selectedPlayer.team}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
                            <div className="flex flex-wrap justify-center sm:justify-start gap-3 mb-8">
                                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-slate-700 shadow-sm"><Globe className="w-4 h-4 text-emerald-500" /> {selectedPlayer.nationality || "Necunoscut"}</div>
                                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-slate-700 shadow-sm"><UserIcon className="w-4 h-4 text-emerald-500" /> {selectedPlayer.age ? `${selectedPlayer.age} ani` : "-"}</div>
                                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-slate-700 shadow-sm"><Activity className="w-4 h-4 text-emerald-500" /> {selectedPlayer.height || "-"} / {selectedPlayer.weight || "-"}</div>
                                <div className="flex items-center gap-1.5 bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 text-sm font-bold text-emerald-700 shadow-sm">{selectedPlayer.position || "Necunoscut"}</div>
                            </div>

                            <h3 className="text-lg font-black text-slate-800 mb-3 flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" /> Rezumat Sezon</h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                                <div className="bg-white p-4 rounded-xl border border-gray-100 text-center shadow-sm"><span className="block text-2xl font-black text-slate-800">{selectedPlayer.statistics_summary?.total_appearances || 0}</span><span className="text-[10px] uppercase text-gray-400 font-bold">Meciuri</span></div>
                                <div className="bg-white p-4 rounded-xl border border-gray-100 text-center shadow-sm border-b-4 border-b-emerald-500"><span className="block text-2xl font-black text-emerald-600">{selectedPlayer.statistics_summary?.total_goals || 0}</span><span className="text-[10px] uppercase text-gray-400 font-bold">Goluri</span></div>
                                <div className="bg-white p-4 rounded-xl border border-gray-100 text-center shadow-sm border-b-4 border-b-red-500"><span className="block text-2xl font-black text-red-600">{selectedPlayer.statistics_summary?.total_assists || 0}</span><span className="text-[10px] uppercase text-gray-400 font-bold">Pase Decisive</span></div>
                                <div className="bg-white p-4 rounded-xl border border-gray-100 text-center shadow-sm"><span className="block text-2xl font-black text-slate-800">{selectedPlayer.statistics_summary?.minutes_played || 0}'</span><span className="text-[10px] uppercase text-gray-400 font-bold">Minute</span></div>
                                <div className="bg-white p-4 rounded-xl border border-gray-100 text-center shadow-sm"><span className="block text-2xl font-black text-yellow-500 flex items-center justify-center gap-1"><Star className="w-4 h-4 fill-yellow-500" />{selectedPlayer.statistics_summary?.rating ? parseFloat(selectedPlayer.statistics_summary.rating).toFixed(2) : "-"}</span><span className="text-[10px] uppercase text-gray-400 font-bold">Rating Mediu</span></div>
                            </div>

                            <h3 className="text-lg font-black text-slate-800 mb-3 flex items-center gap-2"><MapPin className="w-5 h-5 text-emerald-500" /> Detalii pe Competiții</h3>
                            {(!selectedPlayer.detailed_stats || selectedPlayer.detailed_stats.length === 0) ? (
                                <div className="text-center p-6 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">Nu sunt date disponibile pe competiții pentru acest jucător momentan.</div>
                            ) : (
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
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
                                                    <tr key={idx} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3 font-bold text-slate-800 flex items-center gap-2">{stat.competition}<span className="text-[9px] font-normal px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded uppercase tracking-wider">{stat.type}</span></td>
                                                        <td className="px-4 py-3 text-center font-medium text-slate-700">{stat.appearances}</td>
                                                        <td className="px-4 py-3 text-center font-black text-emerald-600">{stat.goals}</td>
                                                        <td className="px-4 py-3 text-center font-black text-red-600">{stat.assists}</td>
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-600 p-2.5 rounded-xl shadow-lg shadow-emerald-600/30">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-800">Scoruri Live</h1>
                </div>
                
                <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1 overflow-x-auto">
                    <button onClick={() => setSubFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${subFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Toate</button>
                    <button onClick={() => setSubFilter('live')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${subFilter === 'live' ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}><span className={`w-2 h-2 rounded-full ${liveCount > 0 ? 'bg-white animate-ping' : 'bg-slate-400'}`}></span> LIVE ({liveCount})</button>
                    <button onClick={() => setSubFilter('finished')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${subFilter === 'finished' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Finalizate</button>
                    <button onClick={() => setSubFilter('favorites')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${subFilter === 'favorites' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}><Star className="w-3.5 h-3.5 fill-current" /> Favorite</button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 mb-6 overflow-x-auto">
                <div className="flex justify-between gap-1 min-w-[450px]">
                    {dates.map((dObj, idx) => {
                        const isSelected = selectedDate.getTime() === dObj.date.getTime();
                        return (
                            <button key={idx} onClick={() => setSelectedDate(dObj.date)} className={`flex-1 py-2 px-1 rounded-xl text-xs sm:text-sm font-bold transition ${isSelected ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                                <span className="block">{dObj.label.toUpperCase()}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                </div>
            ) : sortedLeagueNames.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-slate-200">
                    <Calendar className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800">Niciun meci găsit.</h3>
                </div>
            ) : (
                <div className="space-y-6">
                    {sortedLeagueNames.map((leagueName) => (
                        <div key={leagueName} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            
                            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3">
                                {groupedMatches[leagueName].logo ? (
                                    <img src={groupedMatches[leagueName].logo} alt={leagueName} className="w-6 h-6 object-contain" />
                                ) : (
                                    <Trophy className="w-5 h-5 text-slate-400" />
                                )}
                                <h3 className="font-black text-slate-800 uppercase text-xs sm:text-sm">{leagueName}</h3>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {groupedMatches[leagueName].items.map((match) => {
                                    const isLive = ["1H", "2H", "HT", "ET", "P", "BT", "LIVE"].includes(match.status_short);
                                    const isFav = favoriteMatches.includes(match.fixture_id);

                                    return (
                                        <div
                                            key={match.fixture_id}
                                            onClick={() => handleMatchClick(match)}
                                            className="flex items-center px-4 py-3 hover:bg-slate-50 transition cursor-pointer group"
                                        >
                                            <button onClick={(e) => toggleFavoriteMatch(e, match.fixture_id)} className="mr-3 text-slate-300 hover:text-amber-500 transition">
                                                <Star className={`w-4 h-4 ${isFav ? 'text-amber-500 fill-amber-500' : ''}`} />
                                            </button>

                                            <div className="w-14 sm:w-16 flex flex-col items-center justify-center shrink-0 pr-3 border-r border-slate-100">
                                                {renderStatus(match)}
                                            </div>

                                            <div className="flex-1 flex flex-col justify-center gap-2 sm:hidden py-0.5 overflow-hidden ml-3">
                                                <div className="flex items-center justify-between w-full">
                                                    <div onClick={(e) => handleTeamClick(e, match.home_team_name)} className="flex items-center gap-2 overflow-hidden w-[82%]">
                                                        <img src={match.home_team_logo} alt="home" className="w-5 h-5 object-contain shrink-0" />
                                                        <span className="font-bold text-slate-800 text-sm truncate w-full">{match.home_team_name}</span>
                                                    </div>
                                                    <div className={`font-black text-sm text-center shrink-0 w-[18%] py-0.5 rounded bg-slate-100 ${isLive ? 'text-red-600 bg-red-50' : 'text-slate-800'}`}>
                                                        {match.status_short === "NS" ? "-" : match.home_goals}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between w-full">
                                                    <div onClick={(e) => handleTeamClick(e, match.away_team_name)} className="flex items-center gap-2 overflow-hidden w-[82%]">
                                                        <img src={match.away_team_logo} alt="away" className="w-5 h-5 object-contain shrink-0" />
                                                        <span className="font-bold text-slate-800 text-sm truncate w-full">{match.away_team_name}</span>
                                                    </div>
                                                    <div className={`font-black text-sm text-center shrink-0 w-[18%] py-0.5 rounded bg-slate-100 ${isLive ? 'text-red-600 bg-red-50' : 'text-slate-800'}`}>
                                                        {match.status_short === "NS" ? "-" : match.away_goals}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="hidden sm:flex flex-1 items-center justify-between mx-6">
                                                <div onClick={(e) => handleTeamClick(e, match.home_team_name)} className="flex-1 flex items-center justify-end gap-3 text-right hover:text-emerald-600 transition">
                                                    <span className="font-bold text-slate-800 text-base truncate">{match.home_team_name}</span>
                                                    <img src={match.home_team_logo} alt="home" className="w-6 h-6 object-contain shrink-0" />
                                                </div>

                                                <div className={`px-4 py-1.5 mx-4 rounded-lg font-black text-lg shrink-0 ${isLive ? 'bg-red-50 text-red-600 border border-red-100 animate-pulse' : 'bg-slate-100 text-slate-800'}`}>
                                                    {match.status_short === "NS" ? <span className="text-slate-400">- : -</span> : <span>{match.home_goals} - {match.away_goals}</span>}
                                                </div>

                                                <div onClick={(e) => handleTeamClick(e, match.away_team_name)} className="flex-1 flex items-center justify-start gap-3 text-left hover:text-emerald-600 transition">
                                                    <img src={match.away_team_logo} alt="away" className="w-6 h-6 object-contain shrink-0" />
                                                    <span className="font-bold text-slate-800 text-base truncate">{match.away_team_name}</span>
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