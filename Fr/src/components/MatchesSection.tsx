import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Calendar, Trophy, Activity, X, Globe, User as UserIcon, Star, MapPin, Users, BarChart2, ListOrdered, Clock, Shield } from 'lucide-react';

const GENERIC_USER_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

const socket = io("https://football-backend-m2a4.onrender.com");

// --- INTERFEȚE ---
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

export function MatchesSection() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [dates, setDates] = useState<{ date: Date; label: string; isToday: boolean }[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // STATE PENTRU LOTURI & JUCĂTORI
    const [selectedTeam, setSelectedTeam] = useState<SquadData | null>(null);
    const [loadingRoster, setLoadingRoster] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

    // STATE PENTRU CENTRU MECI (FORMAȚII, EVENIMENTE, STATISTICI, CLASAMENT)
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
    }, []);

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
            console.error(err);
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

    const groupedMatches = matches.reduce((acc, match) => {
        if (!acc[match.league_name]) {
            acc[match.league_name] = { logo: match.league_logo, items: [] };
        }
        acc[match.league_name].items.push(match);
        return acc;
    }, {} as Record<string, { logo: string; items: Match[] }>);

    const renderStatus = (match: Match) => {
        const status = match.status_short;
        const liveStatuses = ["1H", "2H", "HT", "ET", "P", "LIVE"];
        
        if (status === "NS") return <span className="text-slate-500 font-bold text-[13px] sm:text-sm">{new Date(match.timestamp * 1000).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>;
        else if (liveStatuses.includes(status)) return <span className="text-red-600 font-black animate-pulse text-[13px] sm:text-sm">{match.elapsed ? `${match.elapsed}'` : status}</span>;
        else if (status === "FT" || status === "AET" || status === "PEN") return <span className="text-slate-400 font-bold text-[11px] sm:text-xs uppercase">Final</span>;
        else return <span className="text-amber-500 font-bold text-[11px] sm:text-xs uppercase">{status}</span>;
    };

    // Traducere etichete statistici în Română
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
            
            {/* LOADER PENTRU LOT */}
            {loadingRoster && (
                <div className="fixed inset-0 z-[70] bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mb-4"></div>
                    <h3 className="text-xl font-black text-slate-800 animate-pulse">Încărcăm Lotul...</h3>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL CENTRU MECI (EVENIMENTE, FORMAȚII, STATISTICI, CLASAMENT) */}
            {/* ========================================================= */}
            {selectedMatchDetails && (
                <div className="fixed inset-0 z-[50] flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedMatchDetails(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
                        
                        {/* HEADER MECI */}
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
                                {/* Gazde */}
                                <div onClick={(e) => handleTeamClick(e, selectedMatchDetails.home_team_name)} className="flex-1 flex flex-col items-center text-center cursor-pointer group">
                                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white rounded-2xl p-2 shadow-lg mb-2 group-hover:scale-105 transition">
                                        <img src={selectedMatchDetails.home_team_logo} alt={selectedMatchDetails.home_team_name} className="w-full h-full object-contain" />
                                    </div>
                                    <span className="font-black text-sm sm:text-lg group-hover:text-emerald-400 transition line-clamp-2">{selectedMatchDetails.home_team_name}</span>
                                </div>

                                {/* Scor & Status */}
                                <div className="flex flex-col items-center justify-center px-3 sm:px-6 shrink-0">
                                    <div className="text-3xl sm:text-5xl font-black tracking-tight bg-white/10 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl border border-white/10">
                                        {selectedMatchDetails.status_short === "NS" ? "- : -" : `${selectedMatchDetails.home_goals ?? 0} - ${selectedMatchDetails.away_goals ?? 0}`}
                                    </div>
                                    <div className="mt-2">
                                        {renderStatus(selectedMatchDetails)}
                                    </div>
                                </div>

                                {/* Oaspeți */}
                                <div onClick={(e) => handleTeamClick(e, selectedMatchDetails.away_team_name)} className="flex-1 flex flex-col items-center text-center cursor-pointer group">
                                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white rounded-2xl p-2 shadow-lg mb-2 group-hover:scale-105 transition">
                                        <img src={selectedMatchDetails.away_team_logo} alt={selectedMatchDetails.away_team_name} className="w-full h-full object-contain" />
                                    </div>
                                    <span className="font-black text-sm sm:text-lg group-hover:text-emerald-400 transition line-clamp-2">{selectedMatchDetails.away_team_name}</span>
                                </div>
                            </div>

                            {(selectedMatchDetails.venue_name || selectedMatchDetails.referee) && (
                                <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-3 border-t border-white/10 text-[11px] sm:text-xs text-slate-400">
                                    {selectedMatchDetails.venue_name && <span>🏟️ {selectedMatchDetails.venue_name}{selectedMatchDetails.venue_city ? `, ${selectedMatchDetails.venue_city}` : ''}</span>}
                                    {selectedMatchDetails.referee && <span>⚖️ Arbitru: {selectedMatchDetails.referee}</span>}
                                </div>
                            )}
                        </div>

                        {/* TAB-URI NAVIGARE */}
                        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0 overflow-x-auto">
                            <button
                                onClick={() => setActiveMatchTab('events')}
                                className={`flex-1 py-3 px-3 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition ${activeMatchTab === 'events' ? 'border-emerald-600 text-emerald-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <Clock className="w-4 h-4" /> Evenimente
                            </button>
                            <button
                                onClick={() => setActiveMatchTab('lineups')}
                                className={`flex-1 py-3 px-3 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition ${activeMatchTab === 'lineups' ? 'border-emerald-600 text-emerald-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <Users className="w-4 h-4" /> Formații
                            </button>
                            <button
                                onClick={() => setActiveMatchTab('stats')}
                                className={`flex-1 py-3 px-3 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition ${activeMatchTab === 'stats' ? 'border-emerald-600 text-emerald-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <BarChart2 className="w-4 h-4" /> Statistici
                            </button>
                            <button
                                onClick={() => { setActiveMatchTab('standings'); fetchStandings(selectedMatchDetails.league_id); }}
                                className={`flex-1 py-3 px-3 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition ${activeMatchTab === 'standings' ? 'border-emerald-600 text-emerald-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <ListOrdered className="w-4 h-4" /> Clasament
                            </button>
                        </div>

                        {/* CONȚINUT TAB-URI */}
                        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-50">
                            {loadingMatchDetails ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-3"></div>
                                    <p className="text-sm font-bold text-slate-500">Se încarcă datele meciului...</p>
                                </div>
                            ) : (
                                <>
                                    {/* 1. TAB EVENIMENTE */}
                                    {activeMatchTab === 'events' && (
                                        <div>
                                            {(!selectedMatchDetails.events || selectedMatchDetails.events.length === 0) ? (
                                                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">
                                                    Nu există evenimente înregistrate pentru acest meci.
                                                </div>
                                            ) : (
                                                <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                                                    {selectedMatchDetails.events.map((ev: any, idx: number) => {
                                                        const isHome = ev.team?.id === selectedMatchDetails.home_team_id;
                                                        let icon = "•";
                                                        if (ev.type === "Goal") icon = "⚽";
                                                        else if (ev.type === "Card" && ev.detail === "Yellow Card") icon = "🟨";
                                                        else if (ev.type === "Card" && ev.detail?.includes("Red")) icon = "🟥";
                                                        else if (ev.type === "subst") icon = "🔄";
                                                        else if (ev.type === "Var") icon = "🖥️";

                                                        return (
                                                            <div key={idx} className={`flex items-center p-3 sm:p-4 text-xs sm:text-sm ${isHome ? 'flex-row' : 'flex-row-reverse text-right'}`}>
                                                                <div className="w-12 sm:w-16 font-black text-slate-500 text-center shrink-0">
                                                                    {ev.time?.elapsed}'{ev.time?.extra ? `+${ev.time.extra}` : ''}
                                                                </div>
                                                                <div className="text-lg sm:text-xl mx-2 sm:mx-3 shrink-0">{icon}</div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-bold text-slate-800 truncate">{ev.player?.name}</p>
                                                                    {ev.assist?.name && (
                                                                        <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                                                                            {ev.type === "subst" ? `Iese: ${ev.assist.name}` : `Asist: ${ev.assist.name}`}
                                                                        </p>
                                                                    )}
                                                                    <span className="text-[10px] text-slate-400 uppercase font-semibold">{ev.detail}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 2. TAB FORMAȚII */}
                                    {activeMatchTab === 'lineups' && (
                                        <div>
                                            {(!selectedMatchDetails.lineups || selectedMatchDetails.lineups.length === 0) ? (
                                                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">
                                                    Formațiile de start nu au fost încă publicate pentru acest meci.
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                                    {selectedMatchDetails.lineups.map((teamLineup: any, idx: number) => (
                                                        <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                                            <div className="bg-slate-900 text-white p-3 sm:p-4 flex items-center justify-between">
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    {teamLineup.team?.logo && <img src={teamLineup.team.logo} alt="logo" className="w-6 h-6 object-contain bg-white rounded-full p-0.5" />}
                                                                    <span className="font-black text-sm sm:text-base truncate">{teamLineup.team?.name}</span>
                                                                </div>
                                                                {teamLineup.formation && (
                                                                    <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded-lg shrink-0">
                                                                        {teamLineup.formation}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {teamLineup.coach?.name && (
                                                                <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-600 flex items-center justify-between">
                                                                    <span>Antrenor:</span>
                                                                    <span className="text-slate-900">{teamLineup.coach.name}</span>
                                                                </div>
                                                            )}

                                                            {/* Primul 11 */}
                                                            <div className="p-3 sm:p-4">
                                                                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 mb-2">Titulari (11)</h4>
                                                                <div className="divide-y divide-slate-100">
                                                                    {teamLineup.startXI?.map((item: any, pIdx: number) => (
                                                                        <div
                                                                            key={pIdx}
                                                                            onClick={() => item.player?.name && handleLineupPlayerClick(item.player.name)}
                                                                            className="py-2 flex items-center justify-between text-xs sm:text-sm hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition"
                                                                        >
                                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
                                                                                    {item.player?.number || "-"}
                                                                                </span>
                                                                                <span className="font-bold text-slate-800 truncate">{item.player?.name}</span>
                                                                            </div>
                                                                            <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded uppercase shrink-0">
                                                                                {item.player?.pos || "-"}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Rezerve */}
                                                                {teamLineup.substitutes && teamLineup.substitutes.length > 0 && (
                                                                    <>
                                                                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 mt-5 mb-2">Rezerve</h4>
                                                                        <div className="divide-y divide-slate-100">
                                                                            {teamLineup.substitutes.map((item: any, sIdx: number) => (
                                                                                <div
                                                                                    key={sIdx}
                                                                                    onClick={() => item.player?.name && handleLineupPlayerClick(item.player.name)}
                                                                                    className="py-1.5 flex items-center justify-between text-xs hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition"
                                                                                >
                                                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                                                        <span className="w-5 h-5 rounded-full bg-slate-50 text-slate-500 font-bold text-[10px] flex items-center justify-center shrink-0">
                                                                                            {item.player?.number || "-"}
                                                                                        </span>
                                                                                        <span className="font-medium text-slate-700 truncate">{item.player?.name}</span>
                                                                                    </div>
                                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">
                                                                                        {item.player?.pos || "-"}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 3. TAB STATISTICI ECHIPE */}
                                    {activeMatchTab === 'stats' && (
                                        <div>
                                            {(!selectedMatchDetails.statistics || selectedMatchDetails.statistics.length < 2) ? (
                                                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">
                                                    Statisticile meciului nu sunt disponibile momentan.
                                                </div>
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
                                                                    <span className="text-slate-500 uppercase text-[11px] sm:text-xs tracking-wider">{translateStatLabel(statItem.type)}</span>
                                                                    <span className="text-slate-800">{awayValRaw}</span>
                                                                </div>
                                                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                                                    <div style={{ width: `${homePercent}%` }} className="bg-emerald-600 h-full transition-all duration-300" />
                                                                    <div style={{ width: `${awayPercent}%` }} className="bg-slate-400 h-full transition-all duration-300" />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 4. TAB CLASAMENT */}
                                    {activeMatchTab === 'standings' && (
                                        <div>
                                            {loadingStandings ? (
                                                <div className="flex flex-col items-center justify-center py-12">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-2"></div>
                                                    <span className="text-xs font-bold text-slate-500">Încărcăm clasamentul...</span>
                                                </div>
                                            ) : (!standingsData || standingsData.length === 0) ? (
                                                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">
                                                    Clasamentul nu este disponibil pentru această competiție.
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {standingsData.map((groupTable: any[], gIdx: number) => (
                                                        <div key={gIdx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-xs sm:text-sm text-left">
                                                                    <thead className="bg-slate-900 text-white uppercase text-[10px] sm:text-xs">
                                                                        <tr>
                                                                            <th className="py-3 px-2 sm:px-3 text-center">#</th>
                                                                            <th className="py-3 px-2 sm:px-3">Echipă</th>
                                                                            <th className="py-3 px-1.5 sm:px-2 text-center">M</th>
                                                                            <th className="py-3 px-1.5 sm:px-2 text-center hidden sm:table-cell">V</th>
                                                                            <th className="py-3 px-1.5 sm:px-2 text-center hidden sm:table-cell">E</th>
                                                                            <th className="py-3 px-1.5 sm:px-2 text-center hidden sm:table-cell">Î</th>
                                                                            <th className="py-3 px-1.5 sm:px-2 text-center">G</th>
                                                                            <th className="py-3 px-2 sm:px-3 text-center font-black">Pct</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {groupTable.map((row: any) => {
                                                                            const isCurrentMatchTeam =
                                                                                row.team?.id === selectedMatchDetails.home_team_id ||
                                                                                row.team?.id === selectedMatchDetails.away_team_id;

                                                                            return (
                                                                                <tr
                                                                                    key={row.rank}
                                                                                    onClick={(e) => row.team?.name && handleTeamClick(e, row.team.name)}
                                                                                    className={`cursor-pointer transition ${isCurrentMatchTeam ? 'bg-emerald-50/90 font-bold' : 'hover:bg-slate-50'}`}
                                                                                >
                                                                                    <td className="py-2.5 px-2 sm:px-3 text-center font-bold text-slate-500">{row.rank}</td>
                                                                                    <td className="py-2.5 px-2 sm:px-3 flex items-center gap-2 min-w-[140px]">
                                                                                        {row.team?.logo && <img src={row.team.logo} alt="logo" className="w-5 h-5 object-contain shrink-0" />}
                                                                                        <span className={`truncate ${isCurrentMatchTeam ? 'text-emerald-700 font-black' : 'text-slate-800 font-semibold'}`}>
                                                                                            {row.team?.name}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="py-2.5 px-1.5 sm:px-2 text-center text-slate-600">{row.all?.played}</td>
                                                                                    <td className="py-2.5 px-1.5 sm:px-2 text-center text-slate-500 hidden sm:table-cell">{row.all?.win}</td>
                                                                                    <td className="py-2.5 px-1.5 sm:px-2 text-center text-slate-500 hidden sm:table-cell">{row.all?.draw}</td>
                                                                                    <td className="py-2.5 px-1.5 sm:px-2 text-center text-slate-500 hidden sm:table-cell">{row.all?.lose}</td>
                                                                                    <td className="py-2.5 px-1.5 sm:px-2 text-center text-slate-600">{row.all?.goals?.for}:{row.all?.goals?.against}</td>
                                                                                    <td className="py-2.5 px-2 sm:px-3 text-center font-black text-slate-900">{row.points}</td>
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

            {/* MODAL LOT ECHIPĂ */}
            {selectedTeam && (
                <div className="fixed inset-0 z-[55] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedTeam(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
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

            {/* MODAL DETALII JUCĂTOR */}
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

            {/* HEADER SECȚIUNE MECIURI */}
            <div className="flex items-center gap-3 mb-6 sm:mb-8 ml-1 sm:ml-0">
                <div className="bg-emerald-600 p-2 sm:p-2.5 rounded-xl shadow-lg shadow-emerald-600/30">
                    <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-800">Scoruri Live</h1>
            </div>

            {/* NAVIGARE ZILE */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 sm:p-2 mb-6 flex overflow-x-auto hide-scrollbar">
                <div className="flex w-full justify-between gap-1 min-w-[450px] sm:min-w-[500px]">
                    {dates.map((dObj, idx) => {
                        const isSelected = selectedDate.getTime() === dObj.date.getTime();
                        return (
                            <button 
                                key={idx}
                                onClick={() => setSelectedDate(dObj.date)}
                                className={`flex-1 py-1.5 sm:py-2 px-1 rounded-xl text-[11px] sm:text-sm font-bold transition-all ${
                                    isSelected ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                                }`}
                            >
                                <span className="block">{dObj.label.toUpperCase()}</span>
                                {!dObj.isToday && dObj.label !== "IERI" && dObj.label !== "MÂINE" && (
                                    <span className="block text-[9px] sm:text-[10px] font-medium opacity-70 mt-0.5">
                                        {dObj.date.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' })}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* LISTA MECIURI */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                </div>
            ) : matches.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-slate-200">
                    <Calendar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg sm:text-xl font-bold text-slate-800">Niciun meci programat.</h3>
                    <p className="text-sm sm:text-base text-slate-500">Nu sunt meciuri în baza de date pentru această zi.</p>
                </div>
            ) : (
                <div className="space-y-4 sm:space-y-6">
                    {Object.keys(groupedMatches).map((leagueName) => (
                        <div key={leagueName} className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            
                            <div className="bg-slate-50 border-b border-slate-200 px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3">
                                {groupedMatches[leagueName].logo ? (
                                    <img src={groupedMatches[leagueName].logo} alt={leagueName} className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
                                ) : (
                                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                                )}
                                <h3 className="font-black text-slate-800 uppercase tracking-wide text-xs sm:text-sm">{leagueName}</h3>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {groupedMatches[leagueName].items.map((match) => {
                                    const isLive = ["1H", "2H", "HT", "ET", "P", "LIVE"].includes(match.status_short);
                                    
                                    return (
                                        <div
                                            key={match.fixture_id}
                                            onClick={() => handleMatchClick(match)}
                                            className="flex px-3 sm:px-4 py-3 hover:bg-slate-50 transition-colors group cursor-pointer"
                                        >
                                            
                                            {/* TIMPUL */}
                                            <div className="w-12 sm:w-16 flex flex-col items-center justify-center shrink-0 border-r border-slate-100 pr-2 mr-3 sm:border-none sm:pr-0 sm:mr-0">
                                                {renderStatus(match)}
                                            </div>

                                            {/* ===== DESIGN PENTRU TELEFON (ECHIPELE SUNT SUPRAPUSE) ===== */}
                                            <div className="flex-1 flex flex-col justify-center gap-2.5 sm:hidden py-0.5 overflow-hidden">
                                                
                                                <div className="flex items-center justify-between w-full">
                                                    <div
                                                        onClick={(e) => handleTeamClick(e, match.home_team_name)}
                                                        className="flex items-center gap-2.5 overflow-hidden w-[82%]"
                                                    >
                                                        <img src={match.home_team_logo} alt="home" className="w-5 h-5 object-contain shrink-0" />
                                                        <span className="font-bold text-slate-800 text-sm truncate w-full hover:text-emerald-600">{match.home_team_name}</span>
                                                    </div>
                                                    <div className={`font-black text-sm text-center shrink-0 w-[18%] py-0.5 rounded bg-slate-100 ${isLive ? 'text-red-600 bg-red-50' : 'text-slate-800'}`}>
                                                        {match.status_short === "NS" ? "-" : match.home_goals}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between w-full">
                                                    <div
                                                        onClick={(e) => handleTeamClick(e, match.away_team_name)}
                                                        className="flex items-center gap-2.5 overflow-hidden w-[82%]"
                                                    >
                                                        <img src={match.away_team_logo} alt="away" className="w-5 h-5 object-contain shrink-0" />
                                                        <span className="font-bold text-slate-800 text-sm truncate w-full hover:text-emerald-600">{match.away_team_name}</span>
                                                    </div>
                                                    <div className={`font-black text-sm text-center shrink-0 w-[18%] py-0.5 rounded bg-slate-100 ${isLive ? 'text-red-600 bg-red-50' : 'text-slate-800'}`}>
                                                        {match.status_short === "NS" ? "-" : match.away_goals}
                                                    </div>
                                                </div>

                                            </div>

                                            {/* ===== DESIGN PENTRU DESKTOP (PE UN SINGUR RÂND) ===== */}
                                            <div className="hidden sm:flex flex-1 items-center justify-between mx-6">
                                                
                                                <div 
                                                    onClick={(e) => handleTeamClick(e, match.home_team_name)}
                                                    className="flex-1 flex items-center justify-end gap-3 text-right hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                                                    title="Vezi lotul echipei"
                                                >
                                                    <span className="font-bold text-slate-800 text-base truncate hover:text-emerald-600">{match.home_team_name}</span>
                                                    <img src={match.home_team_logo} alt="home" className="w-6 h-6 object-contain shrink-0" />
                                                </div>

                                                <div
                                                    className={`px-4 py-1.5 mx-4 rounded-lg font-black text-lg shrink-0 transition transform group-hover:scale-105 ${isLive ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-100 text-slate-800 hover:bg-emerald-50 hover:text-emerald-700'}`}
                                                    title="Vezi detalii meci, formații și clasament"
                                                >
                                                    {match.status_short === "NS" ? (
                                                        <span className="text-slate-400">- : -</span>
                                                    ) : (
                                                        <span>{match.home_goals} - {match.away_goals}</span>
                                                    )}
                                                </div>

                                                <div 
                                                    onClick={(e) => handleTeamClick(e, match.away_team_name)}
                                                    className="flex-1 flex items-center justify-start gap-3 text-left hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                                                    title="Vezi lotul echipei"
                                                >
                                                    <img src={match.away_team_logo} alt="away" className="w-6 h-6 object-contain shrink-0" />
                                                    <span className="font-bold text-slate-800 text-base truncate hover:text-emerald-600">{match.away_team_name}</span>
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