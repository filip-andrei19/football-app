import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Calendar, Clock, Trophy, ChevronLeft, ChevronRight, Activity } from 'lucide-react';

// Ne conectăm la backend-ul tău pentru actualizări live
const socket = io("https://football-backend-m2a4.onrender.com");

interface Match {
    fixture_id: number;
    date: string;
    timestamp: number;
    league_id: number;
    league_name: string;
    league_logo: string;
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
}

export function MatchesSection() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Generăm cele 7 zile (Azi, -3 zile, +3 zile)
    const [dates, setDates] = useState<{ date: Date; label: string; isToday: boolean }[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    useEffect(() => {
        // Inițializăm calendarul
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

    // Funcția care aduce meciurile din baza ta de date
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

    // Apelăm API-ul când se schimbă ziua selectată
    useEffect(() => {
        if (!selectedDate) return;
        
        // Formatăm data YYYY-MM-DD pentru API-ul tău
        const localDateStr = new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000))
                                .toISOString().split('T')[0];
        
        fetchMatches(localDateStr);
    }, [selectedDate]);

    // Socket.io - Ascultăm scorurile live care vin din 2 în 2 minute
    useEffect(() => {
        socket.on("live_match_update", (updatedMatch: Match) => {
            setMatches(prevMatches => {
                const index = prevMatches.findIndex(m => m.fixture_id === updatedMatch.fixture_id);
                if (index !== -1) {
                    const newMatches = [...prevMatches];
                    newMatches[index] = updatedMatch;
                    return newMatches;
                }
                return prevMatches;
            });
        });

        return () => {
            socket.off("live_match_update");
        };
    }, []);

    // Grupăm meciurile pe Ligi (exact ca pe Flashscore)
    const groupedMatches = matches.reduce((acc, match) => {
        if (!acc[match.league_name]) {
            acc[match.league_name] = { logo: match.league_logo, items: [] };
        }
        acc[match.league_name].items.push(match);
        return acc;
    }, {} as Record<string, { logo: string; items: Match[] }>);

    // Funcție pentru afișarea statusului / minutului
    const renderStatus = (match: Match) => {
        const status = match.status_short;
        const liveStatuses = ["1H", "2H", "HT", "ET", "P", "LIVE"];
        
        if (status === "NS") {
            // Meci neînceput -> Afișăm ora
            return <span className="text-slate-500 font-bold text-sm">{new Date(match.timestamp * 1000).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>;
        } else if (liveStatuses.includes(status)) {
            // Meci LIVE -> Afișăm minutul cu roșu
            return <span className="text-red-600 font-black animate-pulse text-sm">{match.elapsed ? `${match.elapsed}'` : status}</span>;
        } else if (status === "FT" || status === "AET" || status === "PEN") {
            // Meci terminat
            return <span className="text-slate-400 font-bold text-xs uppercase">Final</span>;
        } else {
            // Amânat / Anulat etc.
            return <span className="text-amber-500 font-bold text-xs uppercase">{status}</span>;
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 min-h-[80vh]">
            
            {/* HEADER SECȚIUNE */}
            <div className="flex items-center gap-3 mb-8">
                <div className="bg-emerald-600 p-2.5 rounded-xl shadow-lg shadow-emerald-600/30">
                    <Activity className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-black text-slate-800">Scoruri & Program</h1>
            </div>

            {/* BARA DE NAVIGARE ZILE (FLASHSCORE STYLE) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 mb-6 flex overflow-x-auto hide-scrollbar">
                <div className="flex w-full justify-between gap-1 min-w-[500px]">
                    {dates.map((dObj, idx) => {
                        const isSelected = selectedDate.getTime() === dObj.date.getTime();
                        return (
                            <button 
                                key={idx}
                                onClick={() => setSelectedDate(dObj.date)}
                                className={`flex-1 py-2 px-1 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                                    isSelected 
                                    ? 'bg-slate-900 text-white shadow-md' 
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                                }`}
                            >
                                <span className="block">{dObj.label.toUpperCase()}</span>
                                {!dObj.isToday && dObj.label !== "IERI" && dObj.label !== "MÂINE" && (
                                    <span className="block text-[10px] font-medium opacity-70 mt-0.5">
                                        {dObj.date.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' })}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* LISTA DE MECIURI GRUPATĂ PE LIGI */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                </div>
            ) : matches.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-slate-200">
                    <Calendar className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800">Niciun meci programat.</h3>
                    <p className="text-slate-500">Nu sunt meciuri în baza de date pentru această zi.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.keys(groupedMatches).map((leagueName) => (
                        <div key={leagueName} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            {/* HEADER LIGĂ */}
                            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3">
                                {groupedMatches[leagueName].logo ? (
                                    <img src={groupedMatches[leagueName].logo} alt={leagueName} className="w-6 h-6 object-contain" />
                                ) : (
                                    <Trophy className="w-5 h-5 text-slate-400" />
                                )}
                                <h3 className="font-black text-slate-800 uppercase tracking-wide text-sm">{leagueName}</h3>
                            </div>

                            {/* MECIURILE DIN LIGĂ */}
                            <div className="divide-y divide-slate-100">
                                {groupedMatches[leagueName].items.map((match) => {
                                    const isLive = ["1H", "2H", "HT", "ET", "P", "LIVE"].includes(match.status_short);
                                    
                                    return (
                                        <div key={match.fixture_id} className="flex items-center px-4 py-3 hover:bg-slate-50 transition-colors">
                                            {/* Status / Minut / Ora */}
                                            <div className="w-14 sm:w-16 text-center shrink-0">
                                                {renderStatus(match)}
                                            </div>

                                            {/* Echipe și Scor */}
                                            <div className="flex-1 flex items-center justify-between mx-2 sm:mx-6">
                                                {/* Echipa Gazdă */}
                                                <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3 text-right">
                                                    <span className="font-bold text-slate-800 text-xs sm:text-base line-clamp-1">{match.home_team_name}</span>
                                                    <img src={match.home_team_logo} alt="home" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
                                                </div>

                                                {/* Scor */}
                                                <div className={`px-3 py-1 sm:px-4 sm:py-1.5 mx-2 rounded-lg font-black text-sm sm:text-lg shrink-0 ${isLive ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-100 text-slate-800'}`}>
                                                    {match.status_short === "NS" ? (
                                                        <span className="text-slate-400">- : -</span>
                                                    ) : (
                                                        <span>{match.home_goals} - {match.away_goals}</span>
                                                    )}
                                                </div>

                                                {/* Echipa Oaspete */}
                                                <div className="flex-1 flex items-center justify-start gap-2 sm:gap-3 text-left">
                                                    <img src={match.away_team_logo} alt="away" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
                                                    <span className="font-bold text-slate-800 text-xs sm:text-base line-clamp-1">{match.away_team_name}</span>
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