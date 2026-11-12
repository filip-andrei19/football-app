import React, { useState, useEffect, useRef } from 'react';
import { Trophy, ArrowUp, ArrowDown, Search, X, AlertTriangle, RotateCcw, Swords, Play, Activity, Globe, Users, Share2, Copy, Crown, Timer, Heart, Volume2, VolumeX, ListOrdered, Share, Shirt, Trash2, Plus, LayoutDashboard } from 'lucide-react';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';

// --- INTERFEȚE GENERALE ---
interface Player {
    _id: string;
    name: string;
    position: string;
    age?: number;
    nationality?: string;
    height?: string;
    image?: string;
    team_name?: string;
    team?: string;
    team_logo?: string;
    league_name?: string;
    league_id?: number | string; 
    league_logo?: string;
    past_teams?: string[];
    market_value?: number; 
    statistics_summary?: {
        rating?: string;
    };
    detailed_stats?: { competition: string }[];
}

interface GamesProps {
    user: { name: string; email: string };
}

interface GridCriteria {
    type: 'team' | 'nationality' | 'league';
    value: string;
    image?: string;
}

interface AnswerDetails {
    player: Player;
    markedBy: 'X' | 'O';
}

// --- INTERFEȚE STARTING XI ---
interface XIPlayer {
    _id: string; 
    id?: string;
    dbId?: string; 
    name: string;
    gridRow: number; 
}

interface StartingXIData {
    _id?: string; 
    id?: string;
    teamName: string;
    opponent: string;
    date: string;
    score: string;
    formation: string; 
    teamColor?: string;     
    opponentColor?: string; 
    isHome?: boolean;       
    players: XIPlayer[];
}

const API_URL = (import.meta as any).env.VITE_API_URL || 'https://football-backend-m2a4.onrender.com';
const GENERIC_USER_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

// --- SOUND ENGINE (Web Audio API) ---
const playTone = (frequency: number, type: OscillatorType, duration: number) => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); 
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {}
};

const playSound = (type: 'correct' | 'wrong' | 'timeout' | 'win', isMuted: boolean = false) => {
    if (isMuted) return;
    if (type === 'correct') { 
        playTone(600, 'sine', 0.1); 
        setTimeout(() => playTone(800, 'sine', 0.2), 100); 
    }
    if (type === 'wrong') { 
        playTone(300, 'sawtooth', 0.4); 
    }
    if (type === 'timeout') { 
        playTone(400, 'square', 0.2); 
        setTimeout(() => playTone(400, 'square', 0.5), 300); 
    }
    if (type === 'win') { 
        playTone(500, 'sine', 0.2); 
        setTimeout(() => playTone(650, 'sine', 0.2), 200); 
        setTimeout(() => playTone(800, 'sine', 0.4), 400); 
    }
};

function shuffleArray<T>(array: T[]): T[] {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

const removeDiacritics = (str: string) => {
    return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
};

const getFlagEmoji = (country: string) => {
    const flags: Record<string, string> = {
        'Romania': '🇷🇴', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Spain': '🇪🇸', 'Italy': '🇮🇹',
        'Germany': '🇩🇪', 'France': '🇫🇷', 'Brazil': '🇧🇷', 'Argentina': '🇦🇷',
        'Portugal': '🇵🇹', 'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Croatia': '🇭🇷',
        'Nigeria': '🇳🇬', 'Senegal': '🇸🇳', 'Morocco': '🇲🇦', 'USA': '🇺🇸',
        'Uruguay': '🇺🇾', 'Colombia': '🇨🇴', 'Switzerland': '🇨🇭', 'Denmark': '🇩🇰',
        'Serbia': '🇷🇸', 'Poland': '🇵🇱', 'Sweden': '🇸🇪', 'Norway': '🇳🇴',
        'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Ivory Coast': '🇨🇮', 'Cameroon': '🇨🇲',
        'Ghana': '🇬🇭', 'Egypt': '🇪🇬', 'Algeria': '🇩🇿', 'Mali': '🇲🇱',
        'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Australia': '🇦🇺', 'Mexico': '🇲🇽',
        'Canada': '🇨🇦', 'Chile': '🇨🇱', 'Ecuador': '🇪🇨', 'Peru': '🇵🇪',
        'Turkey': '🇹🇷', 'Greece': '🇬🇷', 'Czech Republic': '🇨🇿', 'Austria': '🇦🇹',
        'Hungary': '🇭🇺', 'Ukraine': '🇺🇦', 'Slovakia': '🇸🇰', 'Ireland': '🇮🇪',
        'Albania': '🇦🇱', 'Bosnia': '🇧🇦', 'Bulgaria': '🇧🇬'
    };
    return flags[country] || '🌍';
};

export function GamesSection({ user }: GamesProps) {
    const [activeGame, setActiveGame] = useState<'menu' | 'grid' | 'hilo' | 'xi'>('menu');
    const [allPlayers, setAllPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        const fetchPlayers = async () => {
            try {
                const res = await fetch(`${API_URL}/api/sport/players?limit=10000`);
                if (res.ok) {
                    const data = await res.json();
                    setAllPlayers(data);
                }
            } catch (err) {
                toast.error("Eroare la conectarea cu baza de date sportivă.");
            } finally {
                setLoading(false);
            }
        };
        fetchPlayers();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3 sm:mb-4"></div>
                <h3 className="text-sm sm:text-xl font-black tracking-widest text-slate-400 uppercase">Se pregătesc jocurile...</h3>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto py-6 sm:py-8 px-2 sm:px-4 min-h-[80vh] relative z-0 animate-in fade-in duration-500 pb-24 sm:pb-20 mt-4 sm:mt-0">
             {activeGame !== 'menu' && (
                <button 
                    onClick={() => setIsMuted(!isMuted)} 
                    className="absolute top-2 right-2 sm:top-0 sm:right-6 z-50 bg-slate-800 p-2 rounded-full border border-slate-700 text-slate-400 hover:text-white transition-colors shadow-lg"
                    title={isMuted ? "Activează Sunetul" : "Dezactivează Sunetul"}
                >
                    {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
            )}

            {activeGame === 'menu' && (
                <div className="space-y-6 sm:space-y-8">
                    <div className="text-center space-y-3 sm:space-y-4 mb-8 sm:mb-12">
                        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-500 font-black text-[9px] sm:text-[10px] uppercase tracking-widest">
                            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Zona de Divertisment
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 dark:text-white drop-shadow-sm px-2">
                            Games <span className="text-blue-500">Hub</span>
                        </h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs sm:text-sm max-w-lg mx-auto px-4">
                            Testează-ți cunoștințele fotbalistice folosind baza de date oficială a platformei.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto px-2 sm:px-0">
                        <div onClick={() => setActiveGame('grid')} className="bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 border-4 border-slate-800 hover:border-emerald-500 cursor-pointer transition-all sm:hover:-translate-y-2 group relative overflow-hidden shadow-xl flex flex-col items-start min-h-[220px]">
                            <div className="absolute top-0 right-0 -mr-4 -mt-4 sm:-mr-8 sm:-mt-8 w-24 h-24 sm:w-32 sm:h-32 bg-emerald-500/20 rounded-full blur-2xl sm:group-hover:bg-emerald-500/40 transition-colors"></div>
                            <Activity className="w-8 h-8 sm:w-12 sm:h-12 text-emerald-400 mb-4 sm:mb-6 relative z-10" />
                            <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white uppercase tracking-tighter mb-1.5 sm:mb-2 relative z-10">Grila (X și 0)</h3>
                            <p className="text-slate-400 font-bold text-[10px] sm:text-xs md:text-sm mb-4 sm:mb-6 line-clamp-3 flex-1 relative z-10 pr-2">Joacă local sau online vs prieteni (Best of 5). Găsește jucătorul perfect care să bifeze intersecția.</p>
                            <button className="flex items-center gap-1.5 sm:gap-2 bg-emerald-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs group-hover:bg-emerald-500 transition-colors mt-auto w-full sm:w-auto justify-center relative z-10 border-b-4 border-emerald-800 group-hover:border-b-2 group-hover:translate-y-[2px]">
                                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" /> Joacă
                            </button>
                        </div>

                        <div onClick={() => setActiveGame('hilo')} className="bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 border-4 border-slate-800 hover:border-blue-500 cursor-pointer transition-all sm:hover:-translate-y-2 group relative overflow-hidden shadow-xl flex flex-col items-start min-h-[220px]">
                            <div className="absolute top-0 right-0 -mr-4 -mt-4 sm:-mr-8 sm:-mt-8 w-24 h-24 sm:w-32 sm:h-32 bg-blue-500/20 rounded-full blur-2xl sm:group-hover:bg-blue-500/40 transition-colors"></div>
                            <Swords className="w-8 h-8 sm:w-12 sm:h-12 text-blue-400 mb-4 sm:mb-6 relative z-10" />
                            <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white uppercase tracking-tighter mb-1.5 sm:mb-2 relative z-10">Hi-Lo: Cotă</h3>
                            <p className="text-slate-400 font-bold text-[10px] sm:text-xs md:text-sm mb-4 sm:mb-6 line-clamp-3 flex-1 relative z-10 pr-2">Mai mare sau mai mică? Alege o categorie și ghicește care jucător stă mai bine în statistici.</p>
                            <button className="flex items-center gap-1.5 sm:gap-2 bg-blue-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs group-hover:bg-blue-500 transition-colors mt-auto w-full sm:w-auto justify-center relative z-10 border-b-4 border-blue-800 group-hover:border-b-2 group-hover:translate-y-[2px]">
                                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" /> Joacă
                            </button>
                        </div>

                        <div onClick={() => setActiveGame('xi')} className="bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 border-4 border-slate-800 hover:border-yellow-500 cursor-pointer transition-all sm:hover:-translate-y-2 group relative overflow-hidden shadow-xl flex flex-col items-start min-h-[220px]">
                            <div className="absolute top-0 right-0 -mr-4 -mt-4 sm:-mr-8 sm:-mt-8 w-24 h-24 sm:w-32 sm:h-32 bg-yellow-500/20 rounded-full blur-2xl sm:group-hover:bg-yellow-500/40 transition-colors"></div>
                            <Shirt className="w-8 h-8 sm:w-12 sm:h-12 text-yellow-400 mb-4 sm:mb-6 relative z-10" />
                            <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white uppercase tracking-tighter mb-1.5 sm:mb-2 relative z-10">Primul 11</h3>
                            <p className="text-slate-400 font-bold text-[10px] sm:text-xs md:text-sm mb-4 sm:mb-6 line-clamp-3 flex-1 relative z-10 pr-2">Ghicește cei 11 jucători dintr-o partidă istorică. Ai opțiuni limitate, testează-ți memoria!</p>
                            <button className="flex items-center gap-1.5 sm:gap-2 bg-yellow-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs group-hover:bg-yellow-500 transition-colors mt-auto w-full sm:w-auto justify-center relative z-10 border-b-4 border-yellow-800 group-hover:border-b-2 group-hover:translate-y-[2px]">
                                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" /> Joacă
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeGame === 'grid' && <GridGame players={allPlayers} onBack={() => setActiveGame('menu')} isMuted={isMuted} user={user} />}
            {activeGame === 'hilo' && <HiLoGame players={allPlayers} onBack={() => setActiveGame('menu')} user={user} isMuted={isMuted} />}
            {activeGame === 'xi' && <StartingXIGame onBack={() => setActiveGame('menu')} isMuted={isMuted} />}
        </div>
    );
}

// ============================================================================
// GAME 3: STARTING XI (GHICEȘTE PRIMUL 11) - WORDLE STYLE
// ============================================================================
function StartingXIGame({ onBack, isMuted }: { onBack: () => void, isMuted: boolean }) {
    const [match, setMatch] = useState<StartingXIData | null>(null);
    const [guessedIds, setGuessedIds] = useState<Set<string>>(new Set());
    const [gaveUp, setGaveUp] = useState(false);
    
    const [activeSlot, setActiveSlot] = useState<XIPlayer | null>(null);
    const [slotGuess, setSlotGuess] = useState("");
    const [slotGuessesHistory, setSlotGuessesHistory] = useState<Record<string, string[]>>({});
    
    const [win, setWin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMatches = async () => {
            try {
                const res = await fetch(`${API_URL}/api/sport/starting-xi`);
                if (res.ok) {
                    const matches: StartingXIData[] = await res.json();
                    if (matches.length > 0) {
                        const randomMatch = matches[Math.floor(Math.random() * matches.length)];
                        setMatch(randomMatch);
                    }
                }
            } catch (err) {
                toast.error("Eroare la preluarea meciurilor.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchMatches();
    }, []);

    const evaluateWordleGuess = (guess: string, target: string) => {
        const targetClean = removeDiacritics(target).toUpperCase();
        const guessClean = removeDiacritics(guess).toUpperCase().padEnd(targetClean.length, ' ').slice(0, targetClean.length);
        
        const colors = new Array(targetClean.length).fill('bg-slate-600'); 
        const targetCounts: Record<string, number> = {};
        
        for (const char of targetClean) {
            targetCounts[char] = (targetCounts[char] || 0) + 1;
        }

        for (let i = 0; i < targetClean.length; i++) {
            if (guessClean[i] === targetClean[i]) {
                colors[i] = 'bg-emerald-500';
                targetCounts[guessClean[i]]--;
            }
        }

        for (let i = 0; i < targetClean.length; i++) {
            if (colors[i] !== 'bg-emerald-500' && guessClean[i] !== ' ' && targetCounts[guessClean[i]] > 0) {
                colors[i] = 'bg-amber-500';
                targetCounts[guessClean[i]]--;
            }
        }

        return { chars: guessClean.split(''), colors };
    };

    const handleSlotGuess = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeSlot || !match || gaveUp || win) return;
        
        const guessText = slotGuess.trim();
        if (guessText.length === 0) return;

        const pid = activeSlot._id || activeSlot.id || activeSlot.dbId;
        const targetClean = removeDiacritics(activeSlot.name).toUpperCase();
        const userClean = removeDiacritics(guessText).toUpperCase();

        setSlotGuessesHistory(prev => ({
            ...prev,
            [pid as string]: [...(prev[pid as string] || []), guessText]
        }));

        if (userClean === targetClean) {
            playSound('correct', isMuted);
            
            setGuessedIds(prev => {
                const noile = new Set(prev);
                if (pid) noile.add(pid);
                
                if (noile.size === match.players.length) {
                    setWin(true);
                    playSound('win', isMuted);
                    toast.success("Felicitări! Ai ghicit tot primul 11!", { icon: '🏆' });
                }
                return noile;
            });
            
            setTimeout(() => {
                setActiveSlot(null);
                setSlotGuess("");
            }, 800); 
        } else {
            playSound('wrong', isMuted);
            setSlotGuess("");
        }
    };

    const handleGiveUp = () => {
        setGaveUp(true);
        setActiveSlot(null);
        playSound('wrong', isMuted);
        toast("Meci încheiat. Iată echipa completă!", { icon: '🏳️' });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            </div>
        );
    }

    if (!match) {
        return (
            <div className="max-w-2xl mx-auto bg-slate-900 rounded-3xl p-6 sm:p-10 border-4 border-slate-800 text-center space-y-4 sm:space-y-6 mt-10 mx-2">
                <AlertTriangle className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-500 mx-auto" />
                <h2 className="text-lg sm:text-2xl font-black text-white uppercase tracking-widest">Niciun meci disponibil</h2>
                <p className="text-[10px] sm:text-sm text-slate-400 font-bold">Nu există meciuri adăugate de admin în baza de date.</p>
                <div className="flex gap-4 justify-center pt-2 sm:pt-4">
                    <button onClick={onBack} className="bg-slate-800 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-black uppercase text-[10px] sm:text-xs">Înapoi</button>
                </div>
            </div>
        );
    }

    const lines = [1, ...match.formation.split('-').map(Number)]; 
    const rows: XIPlayer[][] = [];
    
    lines.forEach((_, rowIndex) => {
        rows.push(match.players.filter(p => p.gridRow === rowIndex));
    });

    return (
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 relative">
            
            {/* Header scor/meci adaptat pt mobil (stiva verticala daca nu are loc, altfel orizontal) */}
            <div className="bg-slate-950 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-slate-800 flex flex-col justify-between items-center gap-3 sm:gap-4 shadow-xl">
                <div className="w-full flex justify-between items-center md:hidden mb-2">
                    <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-1 font-bold text-[10px] uppercase tracking-widest"><X className="w-4 h-4"/> Înapoi</button>
                </div>

                <div className="flex-1 text-center flex flex-col items-center w-full">
                    <div className="flex items-center justify-between sm:justify-center w-full sm:gap-6">
                        {/* ECHIPA DIN STÂNGA (Acasă) */}
                        <div className="flex-1 text-base sm:text-3xl font-black uppercase tracking-tighter truncate text-right px-2"
                            style={{ color: match.isHome !== false ? match.teamColor || '#ffffff' : match.opponentColor || '#94a3b8' }}>
                            {match.isHome !== false ? match.teamName : match.opponent}
                        </div>
                        
                        {/* SCORUL */}
                        <div className="shrink-0 bg-slate-800 px-3 py-1 sm:px-4 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-700 font-black text-emerald-400 text-lg sm:text-2xl tracking-[0.2em]">
                            {match.score}
                        </div>
                        
                        {/* ECHIPA DIN DREAPTA (Deplasare) */}
                        <div className="flex-1 text-base sm:text-3xl font-black uppercase tracking-tighter truncate text-left px-2"
                            style={{ color: match.isHome !== false ? match.opponentColor || '#94a3b8' : match.teamColor || '#ffffff' }}>
                            {match.isHome !== false ? match.opponent : match.teamName}
                        </div>
                    </div>
                    <div className="text-[9px] sm:text-xs font-bold text-slate-500 uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-3 sm:mt-2">
                        {match.date} • FORMAȚIE: {match.formation}
                    </div>
                </div>

                <div className="hidden md:block absolute top-6 left-6">
                    <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-1 font-bold text-xs uppercase tracking-widest"><X className="w-4 h-4"/> Înapoi</button>
                </div>
            </div>

            {/* TERENUL DE JOC - Scalat pe telefon pentru a incapea toata formatia fara scroll */}
            <div className="bg-[#4ade80] rounded-2xl sm:rounded-3xl border-4 sm:border-8 border-white py-6 px-2 sm:p-8 min-h-[450px] sm:min-h-[600px] relative shadow-2xl overflow-hidden flex flex-col-reverse justify-around gap-2 sm:gap-6 mx-1 sm:mx-0">
                {/* Liniile terenului */}
                <div className="absolute inset-0 border-4 sm:border-[6px] border-white/40 m-2 sm:m-4 rounded-lg sm:rounded-xl pointer-events-none"></div>
                <div className="absolute top-1/2 left-0 w-full h-[4px] sm:h-[6px] bg-white/40 -translate-y-1/2 pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 w-20 h-20 sm:w-32 sm:h-32 border-4 sm:border-[6px] border-white/40 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                
                {rows.map((rowPlayers, rowIndex) => (
                    <div key={rowIndex} className="relative z-10 flex justify-center gap-2 sm:gap-12 w-full px-1">
                        {rowPlayers.map((player, idx) => {
                            const pid = player._id || player.id || player.dbId;
                            const isGuessed = pid ? guessedIds.has(pid) : false;
                            const showRed = gaveUp && !isGuessed;
                            const isClickable = !isGuessed && !showRed && !win;
                            
                            return (
                                <div 
                                    key={idx} 
                                    className={`flex flex-col items-center w-[18%] sm:w-auto ${isClickable ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
                                    onClick={() => {
                                        if (isClickable) {
                                            setActiveSlot(player);
                                            setSlotGuess("");
                                        }
                                    }}
                                >
                                    <div className={`w-8 h-8 sm:w-16 sm:h-16 relative flex items-center justify-center mb-1`}>
                                        <Shirt 
                                            className={`w-full h-full drop-shadow-md sm:drop-shadow-lg ${showRed ? 'opacity-50' : ''}`} 
                                            style={{ 
                                                fill: rowIndex === 0 ? '#fbbf24' : (match.teamColor || '#ffffff'), 
                                                stroke: rowIndex === 0 ? '#b45309' : 'rgba(0,0,0,0.3)',             
                                                strokeWidth: 1.5
                                            }} 
                                        />
                                        {(isGuessed || showRed) && (
                                            <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-slate-900 rounded-full w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center border sm:border-2 border-white shadow-sm sm:shadow-md">
                                                <span className="text-[7px] sm:text-[10px] font-black text-white">{player.name.substring(0,2).toUpperCase()}</span>
                                            </div>
                                        )}
                                        {isClickable && (
                                            <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-blue-600 rounded-full w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center border sm:border-2 border-white shadow-sm sm:shadow-md animate-pulse">
                                                <Search className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-0.5 sm:mt-2 text-center w-full px-0.5">
                                        {(isGuessed || showRed) ? (
                                            <div className={`font-black uppercase text-[7px] sm:text-xs tracking-tighter sm:tracking-tight bg-slate-900 px-1 sm:px-2 py-0.5 sm:py-1 rounded sm:rounded-md border sm:border-2 truncate w-full ${showRed ? 'text-rose-400 border-rose-500' : 'text-white border-slate-700'}`}>
                                                {player.name}
                                            </div>
                                        ) : (
                                            <div className="font-black text-slate-800/60 tracking-[0.1em] sm:tracking-[0.2em] bg-white/30 px-1 sm:px-2 rounded sm:rounded-md text-[8px] sm:text-base">
                                                {"_".repeat(Math.min(player.name.length, 8))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Bara de scor și butoane - Responsiva */}
            <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-slate-800 shadow-xl flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 sm:gap-6 mx-1 sm:mx-0">
                <div className="text-xl sm:text-3xl font-black text-white tracking-widest bg-slate-950 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-800 text-center flex-1 sm:flex-none">
                    <span className="text-emerald-400">{guessedIds.size}</span><span className="text-slate-600">/11</span>
                </div>
                
                <div className="w-full sm:flex-1 text-center font-black text-white uppercase tracking-widest text-[10px] sm:text-lg order-last sm:order-none">
                    {win ? "🏆 Ai câștigat!" : gaveUp ? "Ai renunțat!" : "Apasă pe un tricou!"}
                </div>

                {!win && !gaveUp ? (
                    <button onClick={handleGiveUp} className="flex-1 sm:flex-none bg-rose-600 hover:bg-rose-500 text-white px-4 sm:px-6 py-2 sm:py-4 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-sm transition-all border-b-2 sm:border-b-4 border-rose-800 hover:border-b-2 hover:translate-y-[2px]">
                        Give Up
                    </button>
                ) : <div className="flex-1 sm:flex-none sm:w-[120px]"></div>}
            </div>

            {/* Modal Ghicire Jucător (Wordle Style) - Fullscreen pe mobil, centrat */}
            {activeSlot && !win && !gaveUp && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/95 sm:bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in">
                    <div className="bg-slate-900 w-full h-[100dvh] sm:h-auto sm:max-w-3xl sm:rounded-3xl sm:border-4 border-blue-600/50 shadow-2xl flex flex-col overflow-hidden max-h-[100dvh] sm:max-h-[90vh]">
                        <div className="p-4 sm:p-5 border-b-2 border-slate-800 flex justify-between items-center bg-slate-950 shrink-0 mt-safe-top">
                            <h3 className="font-black text-white uppercase tracking-widest text-[10px] sm:text-sm flex items-center gap-2">Ghicește Numele</h3>
                            <button onClick={() => {setActiveSlot(null); setSlotGuess("");}} className="text-slate-400 hover:text-rose-500 bg-slate-800 p-1.5 rounded-md"><X className="w-4 h-4 sm:w-5 sm:h-5 font-bold" /></button>
                        </div>
                        
                        <div className="p-3 sm:p-5 overflow-y-auto flex-1 flex flex-col items-center space-y-1.5 sm:space-y-2">
                            {(slotGuessesHistory[activeSlot._id || activeSlot.id || activeSlot.dbId || ''] || []).map((guess, idx) => {
                                const { chars, colors } = evaluateWordleGuess(guess, activeSlot.name);
                                return (
                                    <div key={idx} className="flex gap-0.5 sm:gap-1 flex-wrap justify-center">
                                        {chars.map((char, j) => (
                                            <div key={j} className={`w-6 h-8 sm:w-10 sm:h-12 flex items-center justify-center font-black text-white rounded sm:rounded-md text-sm sm:text-xl border sm:border-2 border-transparent ${colors[j]}`}>
                                                {char}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                            
                            {/* Spațiile goale pentru target */}
                            <div className="flex gap-0.5 sm:gap-1 flex-wrap justify-center opacity-50 mt-2">
                                {removeDiacritics(activeSlot.name).toUpperCase().split('').map((char, j) => (
                                    <div key={`empty-${j}`} className="w-6 h-8 sm:w-10 sm:h-12 flex items-center justify-center font-black text-white rounded sm:rounded-md text-sm sm:text-xl border sm:border-2 border-slate-700 bg-slate-800">
                                        {char === ' ' ? ' ' : '_'}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={handleSlotGuess} className="p-3 sm:p-5 bg-slate-950 border-t-2 border-slate-800 shrink-0 pb-safe-bottom">
                            <div className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 text-center">
                                Verde: Corect | Portocaliu: Există, altă poziție
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    autoFocus
                                    placeholder="SCRIE..."
                                    className="flex-1 bg-slate-900 border-2 border-slate-700 p-3 sm:p-4 rounded-lg sm:rounded-xl text-center text-white font-black uppercase tracking-widest outline-none focus:border-blue-500 transition-colors text-xs sm:text-base"
                                    value={slotGuess}
                                    onChange={e => setSlotGuess(e.target.value)}
                                    maxLength={activeSlot.name.length}
                                />
                                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 sm:px-6 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-sm transition-all border-b-2 sm:border-b-4 border-blue-800 hover:border-b-2 hover:translate-y-[2px]">
                                    Testează
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// GAME 1: GRILA TRANSFERURILOR (X ȘI 0)
// ============================================================================
type GridMode = 'menu' | 'local' | 'online_menu' | 'online_setup' | 'online_playing';

function GridGame({ players, onBack, isMuted, user }: { players: Player[], onBack: () => void, isMuted: boolean, user: any }) {
    const TOP_5_LEAGUES = [39, 140, 135, 78, 61]; 
    const top5Players = React.useMemo(() => {
        return players.filter((p: Player) => p.league_id && TOP_5_LEAGUES.includes(Number(p.league_id)));
    }, [players]);

    const [mode, setMode] = useState<GridMode>('menu');
    const [playerName, setPlayerName] = useState(user?.name || "");
    const [gridRows, setGridRows] = useState<GridCriteria[]>([]);
    const [gridCols, setGridCols] = useState<GridCriteria[]>([]);
    const [answers, setAnswers] = useState<Record<string, AnswerDetails>>({});
    const [turn, setTurn] = useState<'X' | 'O'>('X');
    const [winner, setWinner] = useState<'X' | 'O' | 'Draw' | null>(null);
    const [activeCell, setActiveCell] = useState<{ r: number, c: number } | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [timeLeft, setTimeLeft] = useState(60);

    const [roomCode, setRoomCode] = useState("");
    const [joinInput, setJoinInput] = useState("");
    const [myRole, setMyRole] = useState<'X' | 'O' | null>(null);
    const [matchScore, setMatchScore] = useState({ X: 0, O: 0 });
    const [seriesWinner, setSeriesWinner] = useState<'X' | 'O' | null>(null);
    const [skipVotes, setSkipVotes] = useState({ X: false, O: false });
    const socketRef = useRef<Socket | null>(null);
    
    const gridRowsRef = useRef(gridRows);
    const gridColsRef = useRef(gridCols);
    const turnRef = useRef(turn);
    
    useEffect(() => { gridRowsRef.current = gridRows; gridColsRef.current = gridCols; }, [gridRows, gridCols]);
    useEffect(() => { turnRef.current = turn; }, [turn]);

    const checkMatch = (p: Player, criteria: GridCriteria) => {
        const val = removeDiacritics(criteria.value.toLowerCase().trim());
        if (criteria.type === 'team') {
            const currentTeam = removeDiacritics((p.team_name || p.team || "").toLowerCase().trim());
            const pastTeams = (p.past_teams || []).map((t: string) => removeDiacritics(t.toLowerCase().trim()));
            return currentTeam.includes(val) || val.includes(currentTeam) || pastTeams.some((t: string) => t.includes(val) || val.includes(t));
        }
        if (criteria.type === 'nationality') return removeDiacritics((p.nationality || "").toLowerCase().trim()) === val;
        if (criteria.type === 'league') return removeDiacritics((p.league_name || "").toLowerCase().trim()) === val;
        return false;
    };

    useEffect(() => {
        setTimeLeft(60); 
        if (winner || mode === 'menu' || mode === 'online_menu' || mode === 'online_setup') return;

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    playSound('timeout', isMuted);
                    const currentTurn = turnRef.current;
                    const canEmit = mode === 'local' || (mode === 'online_playing' && currentTurn === myRole);
                    
                    if (canEmit) {
                        if (mode === 'online_playing' && socketRef.current) {
                            socketRef.current.emit("send_message", {
                                room: roomCode,
                                message: JSON.stringify({ action: 'SWITCH_TURN', nextTurn: currentTurn === 'X' ? 'O' : 'X', reason: 'timeout' })
                            });
                        }
                        setTurn(currentTurn === 'X' ? 'O' : 'X');
                        setActiveCell(null);
                        setSearchTerm("");
                        toast.error("Timpul a expirat! Pierzi rândul.");
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [turn, winner, mode, isMuted, myRole, roomCode]);

    useEffect(() => {
        if (!socketRef.current) return;
        const socket = socketRef.current;

        const handleSocketMessage = (data: any) => {
            try {
                const payload = JSON.parse(data.message);
                if (payload.action === 'JOINED' && myRole === 'X') {
                    socket.emit("send_message", {
                        room: roomCode,
                        message: JSON.stringify({ action: 'SYNC_GRID', gridRows: gridRowsRef.current, gridCols: gridColsRef.current, hostName: playerName || 'Host' })
                    });
                    setMode('online_playing');
                    toast.success(`${payload.name || 'Adversarul'} s-a conectat! Începe meciul.`, { icon: '🎮' });
                } 
                else if (payload.action === 'SYNC_GRID') {
                    setGridRows(payload.gridRows);
                    setGridCols(payload.gridCols);
                    setAnswers({});
                    setTurn('X');
                    setWinner(null);
                    setMode('online_playing');
                    setSkipVotes({ X: false, O: false });
                    if (myRole === 'O') toast.success(`Te-ai conectat la meciul lui ${payload.hostName}!`, { icon: '✅' });
                } 
                else if (payload.action === 'MOVE') {
                    if (payload.markedBy !== myRole) {
                        applyMove(payload.r, payload.c, payload.player, payload.markedBy, true);
                    }
                } 
                else if (payload.action === 'SWITCH_TURN') {
                    setTurn(payload.nextTurn);
                    setActiveCell(null);
                    setSearchTerm("");
                    if (payload.nextTurn === myRole) {
                        toast.success(payload.reason === 'timeout' ? "Timpul expirat! E rândul tău." : "Adversarul a greșit! E rândul tău.", { icon: '⏱️' });
                    } else if (payload.reason === 'wrong') {
                        playSound('wrong', isMuted);
                    }
                }
                else if (payload.action === 'SKIP_VOTE') {
                    setSkipVotes(prev => {
                        const newVotes = { ...prev, [payload.role]: true };
                        if (newVotes.X && newVotes.O) {
                            toast("Ambii au renunțat! Se generează altă grilă...", { icon: '🔄' });
                            if (myRole === 'X') setTimeout(() => generateValidGrid(true), 1000);
                        } else {
                            toast(`Adversarul a votat să schimbe grila (1/2)`, { icon: '👀' });
                        }
                        return newVotes;
                    });
                }
                else if (payload.action === 'NEXT_MATCH') {
                    setGridRows(payload.gridRows);
                    setGridCols(payload.gridCols);
                    setAnswers({});
                    setTurn('X');
                    setWinner(null);
                    setTimeLeft(60);
                    setSkipVotes({ X: false, O: false });
                    toast("S-a generat o nouă grilă!", { icon: '🔥' });
                }
            } catch (err) {}
        };

        socket.on("receive_message", handleSocketMessage);
        return () => { socket.off("receive_message", handleSocketMessage); };
    }, [myRole, roomCode, isMuted, playerName]);

    const startLocal = () => {
        if (!playerName.trim()) { toast.error("Introdu un nume pentru a juca!"); return; }
        setMode('local');
        setMatchScore({ X: 0, O: 0 });
        setSeriesWinner(null);
        generateValidGrid();
    };

    const createOnlineRoom = () => {
        if (!playerName.trim()) { toast.error("Introdu un nume pentru a juca!"); return; }
        const code = Math.random().toString(36).substring(2, 7).toUpperCase();
        setRoomCode(code);
        setMyRole('X');
        setMatchScore({ X: 0, O: 0 });
        setSeriesWinner(null);
        setMode('online_setup');
        
        socketRef.current = io(API_URL);
        socketRef.current.emit("join_room", code);
        generateValidGrid(); 
    };

    const joinOnlineRoom = () => {
        if (joinInput.trim().length < 5) { toast.error("Cod invalid!"); return; }
        const code = joinInput.trim().toUpperCase();
        setRoomCode(code);
        setMyRole('O');
        setMatchScore({ X: 0, O: 0 });
        setSeriesWinner(null);
        setMode('online_setup');
        
        socketRef.current = io(API_URL);
        socketRef.current.emit("join_room", code);
        socketRef.current.emit("send_message", { room: code, message: JSON.stringify({ action: 'JOINED', name: playerName || 'Jucător Oaspete' }) });
    };

    const quitGame = () => {
        if (socketRef.current) socketRef.current.disconnect();
        onBack();
    };

    const handleSkipVote = () => {
        if (mode === 'local') {
            generateValidGrid(true);
            return;
        }
        
        if (mode === 'online_playing' && myRole) {
            setSkipVotes(prev => {
                const newVotes = { ...prev, [myRole]: true };
                if (socketRef.current) {
                    socketRef.current.emit("send_message", { room: roomCode, message: JSON.stringify({ action: 'SKIP_VOTE', role: myRole }) });
                }
                if (newVotes.X && newVotes.O && myRole === 'X') {
                    toast("Ambii jucători au renunțat! Se generează altă grilă...", { icon: '🔄' });
                    setTimeout(() => generateValidGrid(true), 1000);
                } else if (!newVotes.X || !newVotes.O) {
                    toast.success("Ai votat pentru schimbarea grilei.");
                }
                return newVotes;
            });
        }
    };

    const generateValidGrid = (isNextMatch = false) => {
        setSkipVotes({ X: false, O: false });
        const tagToPlayers = new Map<string, Set<string>>(); 
        const tagToMeta = new Map<string, GridCriteria>();
        const knownTeamLogos = new Map<string, string>();
        const top5Teams = new Set<string>();

        top5Players.forEach((p: Player) => {
            const tName = p.team_name?.toLowerCase().trim();
            const t = p.team?.toLowerCase().trim();
            if (tName) top5Teams.add(tName);
            if (t) top5Teams.add(t);
            if (tName && p.team_logo) knownTeamLogos.set(tName, p.team_logo);
            if (t && p.team_logo) knownTeamLogos.set(t, p.team_logo);
        });

        top5Players.forEach((p: Player) => {
            const tags: GridCriteria[] = [];
            const currentTeam = (p.team_name || p.team)?.toLowerCase().trim();
            
            if (currentTeam && top5Teams.has(currentTeam)) {
                tags.push({ type: 'team', value: p.team_name || p.team || "", image: p.team_logo || knownTeamLogos.get(currentTeam) || "" });
            }
            if (Array.isArray(p.past_teams)) {
                p.past_teams.forEach((pt: string) => {
                    const pastT = pt.toLowerCase().trim();
                    if (top5Teams.has(pastT)) tags.push({ type: 'team', value: pt, image: knownTeamLogos.get(pastT) || "" });
                });
            }
            if (p.nationality && !['necunoscut', 'unknown'].includes(p.nationality.toLowerCase().trim())) {
                tags.push({ type: 'nationality', value: p.nationality, image: getFlagEmoji(p.nationality) });
            }
            if (p.league_name && p.league_id && TOP_5_LEAGUES.includes(Number(p.league_id))) {
                tags.push({ type: 'league', value: p.league_name, image: p.league_logo || "" });
            }

            tags.forEach((t: GridCriteria) => {
                if (!t.value) return;
                const tagId = `${t.type}:${t.value.trim().toLowerCase()}`;
                if (!tagToPlayers.has(tagId)) {
                    tagToPlayers.set(tagId, new Set());
                    tagToMeta.set(tagId, t);
                }
                tagToPlayers.get(tagId)!.add(p._id);
            });
        });

        const validTagIds = Array.from(tagToPlayers.keys()).filter((tId: string) => tagToPlayers.get(tId)!.size >= 3);
        let foundValidGrid = false;
        let attempts = 0;
        let validRows: GridCriteria[] = [];
        let validCols: GridCriteria[] = [];

        while (!foundValidGrid && attempts < 15000) {
            attempts++;
            const shuffledTags = shuffleArray(validTagIds);
            const candidateRows = shuffledTags.slice(0, 3);
            
            const candidateCols = shuffledTags.filter((colTag: string) => {
                if (candidateRows.includes(colTag)) return false;
                const colSet = tagToPlayers.get(colTag)!;
                const colType = colTag.split(':')[0];
                return candidateRows.every((rowTag: string) => {
                    const rowType = rowTag.split(':')[0];
                    if (rowType === colType && rowType !== 'team') return false; 
                    const rowSet = tagToPlayers.get(rowTag)!;
                    for (const playerId of rowSet) { if (colSet.has(playerId)) return true; }
                    return false;
                });
            });

            if (candidateCols.length >= 3) {
                validRows = candidateRows.map((id: string) => tagToMeta.get(id)!);
                validCols = shuffleArray(candidateCols).slice(0, 3).map((id: string) => tagToMeta.get(id)!);
                foundValidGrid = true;
            }
        }

        if (foundValidGrid) {
            setGridRows(validRows);
            setGridCols(validCols);
            setAnswers({});
            setTurn('X');
            setWinner(null);
            setTimeLeft(60);
            if (isNextMatch && mode.includes('online') && socketRef.current && myRole === 'X') {
                socketRef.current.emit("send_message", { room: roomCode, message: JSON.stringify({ action: 'NEXT_MATCH', gridRows: validRows, gridCols: validCols }) });
            }
        } else {
            toast.error("Eroare generare grilă.");
        }
    };

    const checkWinCondition = (currentAnswers: Record<string, AnswerDetails>) => {
        const lines = [
            ['0-0', '0-1', '0-2'], ['1-0', '1-1', '1-2'], ['2-0', '2-1', '2-2'], 
            ['0-0', '1-0', '2-0'], ['0-1', '1-1', '2-1'], ['0-2', '1-2', '2-2'], 
            ['0-0', '1-1', '2-2'], ['0-2', '1-1', '2-0']                         
        ];
        
        let won = false;
        let winMark: 'X' | 'O' | null = null;
        for (let line of lines) {
            const [a, b, c] = line;
            if (currentAnswers[a] && currentAnswers[b] && currentAnswers[c] &&
                currentAnswers[a].markedBy === currentAnswers[b].markedBy &&
                currentAnswers[a].markedBy === currentAnswers[c].markedBy) {
                winMark = currentAnswers[a].markedBy;
                won = true;
                break;
            }
        }
        
        if (won && winMark) {
            setWinner(winMark);
            playSound('win', isMuted);
            toast.success(`Câștigător runda: ${winMark === 'X' ? '❌' : '⚽'} !`, { icon: '🏆' });
            setMatchScore(prev => {
                const newScore = { ...prev, [winMark!]: prev[winMark!] + 1 };
                if (newScore[winMark!] >= 3) {
                     setSeriesWinner(winMark);
                     playSound('win', isMuted);
                }
                return newScore;
            });
        } else if (Object.keys(currentAnswers).length === 9) {
            setWinner('Draw');
            toast('Egalitate!', { icon: '🤝' });
        }
    };

    const applyMove = (r: number, c: number, player: Player, markedBy: 'X' | 'O', isRemote = false) => {
        if (!isRemote) playSound('correct', isMuted);
        setAnswers(prev => {
            const newAnswers = { ...prev, [`${r}-${c}`]: { player, markedBy } };
            checkWinCondition(newAnswers);
            return newAnswers;
        });
        setTurn(prev => prev === 'X' ? 'O' : 'X');
    };

    const handleSelectPlayer = (player: Player) => {
        if (!activeCell || winner) return;
        if (mode === 'online_playing' && turn !== myRole) { toast.error(`Nu e rândul tău!`); return; }

        const { r, c } = activeCell;
        const rowCriteria = gridRows[r];
        const colCriteria = gridCols[c];

        const matchRow = checkMatch(player, rowCriteria);
        const matchCol = checkMatch(player, colCriteria);

        const alreadyUsed = Object.values(answers).some(ans => ans?.player._id === player._id);

        if (alreadyUsed) { toast.error("Jucător deja folosit!"); return; }

        if (matchRow && matchCol) {
            if (mode === 'online_playing' && socketRef.current) {
                socketRef.current.emit("send_message", {
                    room: roomCode,
                    message: JSON.stringify({ action: 'MOVE', r, c, player, markedBy: turn })
                });
            }
            applyMove(r, c, player, turn);
            setActiveCell(null);
            setSearchTerm("");
        } else {
            playSound('wrong', isMuted);
            toast.error("Răspuns Greșit! Ai pierdut rândul.", { icon: '❌' });
            if (mode === 'online_playing' && socketRef.current) {
                socketRef.current.emit("send_message", {
                    room: roomCode,
                    message: JSON.stringify({ action: 'SWITCH_TURN', nextTurn: turn === 'X' ? 'O' : 'X', reason: 'wrong' })
                });
            }
            setTurn(prev => prev === 'X' ? 'O' : 'X');
            setActiveCell(null);
            setSearchTerm("");
        }
    };

    const isMyTurn = mode === 'local' || (mode === 'online_playing' && turn === myRole);

    const renderHeader = (item: GridCriteria) => (
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg sm:rounded-2xl p-1.5 sm:p-2 flex flex-col items-center justify-center text-center shadow-inner border-2 border-slate-200 dark:border-slate-700 h-full w-full">
            {item.type === 'nationality' ? (
                <span className="text-xl sm:text-4xl mb-0.5 sm:mb-1 drop-shadow-sm leading-none">{item.image}</span>
            ) : item.image ? (
                <img src={item.image} alt={item.value} className="w-5 h-5 sm:w-10 sm:h-10 object-contain mb-0.5 sm:mb-1 drop-shadow-md bg-white rounded sm:rounded-md p-0.5" />
            ) : (
                <Globe className="w-4 h-4 sm:w-8 sm:h-8 text-slate-400 mb-0.5 sm:mb-1" />
            )}
            <span className="hidden sm:block text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1 mb-0.5">
                {item.type === 'nationality' ? 'Națiune' : item.type === 'team' ? 'Club' : 'Ligă'}
            </span>
            <span className="text-[7px] sm:text-xs font-black text-slate-900 dark:text-white uppercase leading-tight line-clamp-2 w-full truncate px-0.5 sm:px-1" title={item.value}>
                {item.value}
            </span>
        </div>
    );

    const normalizedSearch = removeDiacritics(searchTerm.toLowerCase());
    const searchResults: Player[] = searchTerm.trim().length > 1 
        ? top5Players.filter((p: Player) => removeDiacritics(p.name.toLowerCase()).includes(normalizedSearch)).slice(0, 10)
        : [];

    if (mode === 'menu') {
        return (
            <div className="max-w-2xl mx-auto bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 border-2 sm:border-4 border-slate-800 shadow-2xl text-center mt-6 sm:mt-10">
                <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3 sm:pb-4 mb-6 sm:mb-8">
                    <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-1 font-bold text-[10px] sm:text-xs uppercase tracking-widest"><X className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> Înapoi</button>
                    <h2 className="text-sm sm:text-xl font-black text-white uppercase tracking-widest">Grila X & 0</h2>
                    <div className="w-10 sm:w-16"></div>
                </div>

                <div className="mb-6 sm:mb-8 space-y-2 max-w-sm mx-auto">
                    <label className="text-slate-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs">Numele tău în joc:</label>
                    <input 
                        type="text" 
                        value={playerName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlayerName(e.target.value)}
                        className="w-full bg-slate-950 border-2 border-slate-700 p-2.5 sm:p-3 rounded-lg sm:rounded-xl text-center text-white font-black uppercase tracking-widest outline-none focus:border-emerald-500 transition-colors text-xs sm:text-base"
                        placeholder="Cum te numești?"
                    />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <button onClick={startLocal} className="p-4 sm:p-8 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-slate-800 hover:border-emerald-500 bg-slate-950 flex flex-col items-center gap-2 sm:gap-4 transition-all group">
                        <Users className="w-8 h-8 sm:w-12 sm:h-12 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                        <div>
                            <div className="font-black text-[10px] sm:text-base text-white uppercase tracking-widest mb-1">Ecran Comun</div>
                            <div className="text-[9px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest">Doi jucători local</div>
                        </div>
                    </button>
                    <button onClick={() => {
                        if (!playerName.trim()) { toast.error("Introdu un nume pentru a juca online!"); return; }
                        setMode('online_menu');
                    }} className="p-4 sm:p-8 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-slate-800 hover:border-blue-500 bg-slate-950 flex flex-col items-center gap-2 sm:gap-4 transition-all group">
                        <Globe className="w-8 h-8 sm:w-12 sm:h-12 text-slate-400 group-hover:text-blue-400 transition-colors" />
                        <div>
                            <div className="font-black text-[10px] sm:text-base text-white uppercase tracking-widest mb-1">Online vs Prieten</div>
                            <div className="text-[9px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest">Creează Room/Cod</div>
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'online_menu') {
        return (
            <div className="max-w-md mx-auto bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 border-2 sm:border-4 border-slate-800 shadow-2xl text-center mt-6 sm:mt-10 space-y-4 sm:space-y-6">
                 <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3 sm:pb-4">
                    <button onClick={() => setMode('menu')} className="text-slate-400 hover:text-white flex items-center gap-1 font-bold text-[10px] sm:text-xs uppercase tracking-widest"><X className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> Înapoi</button>
                    <h2 className="text-sm sm:text-xl font-black text-white uppercase tracking-widest">Multiplayer</h2>
                    <div className="w-10 sm:w-16"></div>
                </div>

                <button onClick={createOnlineRoom} className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-xs sm:text-base transition-all border-b-2 sm:border-b-4 border-blue-800 hover:border-b-2 hover:translate-y-[2px] flex items-center justify-center gap-2">
                    <Share2 className="w-4 h-4 sm:w-5 sm:h-5" /> Cameră Nouă
                </button>

                <div className="flex items-center gap-3 sm:gap-4 py-2 sm:py-4">
                    <div className="h-px bg-slate-800 flex-1"></div>
                    <span className="text-slate-500 font-black uppercase tracking-widest text-[9px] sm:text-xs">SAU</span>
                    <div className="h-px bg-slate-800 flex-1"></div>
                </div>

                <div className="bg-slate-950 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-slate-800 space-y-2 sm:space-y-3">
                    <input 
                        type="text" 
                        placeholder="Ex: A7B9K" 
                        value={joinInput}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJoinInput(e.target.value)}
                        className="w-full bg-slate-900 border-2 border-slate-700 p-2.5 sm:p-3 rounded-lg sm:rounded-xl text-center text-white font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] outline-none focus:border-emerald-500 transition-colors text-xs sm:text-base"
                    />
                    <button onClick={joinOnlineRoom} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 sm:p-3 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-sm transition-all border-b-2 sm:border-b-4 border-emerald-800 hover:border-b-2 hover:translate-y-[2px]">
                        Conectează-te
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'online_setup') {
        return (
            <div className="relative max-w-md mx-auto bg-slate-900 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border-2 sm:border-4 border-slate-800 shadow-2xl text-center mt-6 sm:mt-10 space-y-4 sm:space-y-6">
                <button 
                    onClick={() => {
                        if (socketRef.current) socketRef.current.disconnect();
                        setMode('online_menu');
                    }}
                    className="absolute top-3 left-3 sm:top-4 sm:left-4 text-slate-400 hover:text-rose-500 transition-colors p-1.5 sm:p-2"
                >
                    <X className="w-5 h-5 sm:w-6 sm:h-6 font-bold" />
                </button>

                <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3 sm:mb-4 mt-2"></div>
                <h3 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tighter">Așteptăm jucătorul...</h3>
                
                {myRole === 'X' && (
                    <div className="bg-slate-950 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-slate-800 space-y-3 sm:space-y-4">
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] sm:text-xs">Trimite acest cod:</p>
                        <div className="text-3xl sm:text-5xl font-black text-emerald-400 tracking-[0.1em] sm:tracking-[0.2em]">{roomCode}</div>
                        <button onClick={() => { navigator.clipboard.writeText(roomCode); toast.success("Cod copiat!"); }} className="flex items-center justify-center gap-1.5 sm:gap-2 mx-auto text-slate-300 hover:text-white font-bold uppercase tracking-widest text-[9px] sm:text-xs mt-1 sm:mt-2">
                            <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Copiază
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3 sm:space-y-4">
            {seriesWinner && (
                <div className="fixed inset-0 z-[200000] bg-slate-950/90 backdrop-blur-lg flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-500">
                    <Crown className="w-24 h-24 sm:w-32 sm:h-32 text-yellow-400 animate-bounce mb-4 sm:mb-6 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]" />
                    <h2 className="text-4xl sm:text-7xl font-black uppercase tracking-tighter text-white mb-2 text-center">Câștigător!</h2>
                    <p className="text-lg sm:text-2xl text-slate-300 font-black uppercase tracking-widest mb-8 sm:mb-10 text-center">Seria: {seriesWinner === 'X' ? '❌' : '⚽'}</p>
                    
                    <button onClick={quitGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 sm:px-10 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest transition-all shadow-2xl border-b-2 sm:border-b-4 border-blue-800 text-xs sm:text-base">
                        Ieși din Joc
                    </button>
                </div>
            )}

            {/* BARA SCOR (TOP) */}
            {(mode === 'online_playing' || mode === 'local') && (
                <div className="max-w-3xl mx-auto flex justify-between items-center bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-slate-800 shadow-xl">
                    <div className="flex flex-col">
                        <span className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest">BEST OF 5</span>
                        <span className="text-white font-black uppercase text-[10px] sm:text-sm tracking-widest">Scor General</span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-6 text-xl sm:text-3xl font-black bg-slate-950 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-slate-800">
                        <span className={`${myRole === 'X' || mode === 'local' ? 'text-white' : 'text-slate-600'} drop-shadow-md`}>❌ {matchScore.X}</span>
                        <span className="text-slate-700">-</span>
                        <span className={`${myRole === 'O' || mode === 'local' ? 'text-white' : 'text-slate-600'} drop-shadow-md`}>⚽ {matchScore.O}</span>
                    </div>
                </div>
            )}

            {/* BARA CONTROALE (STATUS RUNDA) */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-3xl border-2 border-slate-800 shadow-xl gap-2 sm:gap-0">
                <button onClick={quitGame} className="text-slate-400 hover:text-rose-500 flex items-center gap-1 font-bold text-[9px] sm:text-xs uppercase tracking-widest"><X className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> Ieșire</button>
                
                <div className="flex flex-col items-center w-full sm:w-auto order-last sm:order-none mt-2 sm:mt-0">
                    {winner ? (
                        <div className="text-emerald-400 font-black uppercase tracking-widest text-[10px] sm:text-sm animate-pulse text-center">
                            {winner === 'Draw' ? 'Egalitate!' : `Runda pentru: ${winner === 'X' ? '❌' : '⚽'}`}
                        </div>
                    ) : (
                        <div className="flex flex-row sm:flex-col items-center justify-center gap-2 sm:gap-2 w-full">
                            <div className="text-blue-400 font-black uppercase tracking-widest text-[9px] sm:text-sm flex items-center gap-1.5 sm:gap-2">
                                Muta: <span className="text-lg sm:text-2xl leading-none">{turn === 'X' ? '❌' : '⚽'}</span>
                            </div>
                            <div className={`flex items-center gap-1 sm:gap-1.5 text-sm sm:text-xl font-black tabular-nums tracking-widest px-2 sm:px-3 py-0.5 rounded-md sm:rounded-lg border-2 transition-colors ${timeLeft <= 10 ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse' : 'bg-slate-950 border-slate-800 text-white'}`}>
                                <Timer className="w-3 h-3 sm:w-4 sm:h-4" /> 00:{timeLeft.toString().padStart(2, '0')}
                            </div>
                            <button 
                                onClick={handleSkipVote} 
                                disabled={mode === 'online_playing' && myRole ? skipVotes[myRole] : false}
                                className="text-[8px] sm:text-[10px] uppercase font-bold tracking-widest bg-slate-800 hover:bg-slate-700 px-2 sm:px-4 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-slate-300 transition-colors disabled:opacity-50 border border-slate-700 whitespace-nowrap"
                            >
                                {mode === 'local' ? 'Schimbă Grilă' : `Renunță (${(skipVotes.X ? 1 : 0) + (skipVotes.O ? 1 : 0)}/2)`}
                            </button>
                        </div>
                    )}
                </div>

                {winner ? (
                    (mode === 'local' || (mode === 'online_playing' && myRole === 'X')) ? (
                        <button onClick={() => generateValidGrid(true)} className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-black text-[9px] sm:text-xs uppercase tracking-widest bg-emerald-950 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-emerald-800"><RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> Următoarea</button>
                    ) : (
                        <div className="text-slate-500 text-[8px] sm:text-xs font-bold uppercase">Așteaptă Host...</div>
                    )
                ) : (
                    <div className="w-[50px] sm:w-20 hidden sm:block"></div>
                )}
            </div>

            {/* GRILA PROPRIU-ZISĂ */}
            {gridRows.length > 0 && (
                <div className="max-w-3xl mx-auto p-2 sm:p-6 bg-white dark:bg-slate-900 rounded-xl sm:rounded-3xl border-2 sm:border-4 border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
                    {/* Oferim scroll orizontal pe ecrane FOARTE mici dacă e nevoie, dar grila va incerca sa incapa flexibil */}
                    <div className="overflow-x-auto scrollbar-hide w-full pb-1">
                        {!isMyTurn && !winner && (
                            <div className="absolute inset-0 z-50 bg-transparent cursor-not-allowed" onClick={() => toast.error("Nu este rândul tău!")} title="Așteaptă mutarea adversarului"></div>
                        )}

                        <div className="grid grid-cols-[minmax(60px,1fr)_minmax(60px,1fr)_minmax(60px,1fr)_minmax(60px,1fr)] sm:grid-cols-[minmax(80px,1fr)_minmax(80px,1fr)_minmax(80px,1fr)_minmax(80px,1fr)] gap-1.5 sm:gap-4 w-full min-w-[280px]">
                            <div className="flex items-center justify-center p-1 sm:p-2">
                                <Trophy className="w-6 h-6 sm:w-10 sm:h-10 text-slate-200 dark:text-slate-800" />
                            </div>
                            
                            {gridCols.map((col: GridCriteria, idx: number) => (
                                <div key={`col-${idx}`}>{renderHeader(col)}</div>
                            ))}

                            {gridRows.map((row: GridCriteria, rIdx: number) => (
                                <React.Fragment key={`row-${rIdx}`}>
                                    <div>{renderHeader(row)}</div>
                                    {[0, 1, 2].map((cIdx: number) => {
                                        const ans = answers[`${rIdx}-${cIdx}`];
                                        return (
                                            <div 
                                                key={`cell-${rIdx}-${cIdx}`} 
                                                onClick={() => {
                                                    if (winner) return;
                                                    if (!isMyTurn) {
                                                        if (mode === 'online_playing') toast.error("Așteaptă rândul tău!");
                                                        return;
                                                    }
                                                    if (!ans) setActiveCell({ r: rIdx, c: cIdx });
                                                }}
                                                className={`aspect-square rounded-lg sm:rounded-2xl border-2 sm:border-4 flex flex-col items-center justify-center transition-all p-0.5 sm:p-1 ${
                                                    ans 
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                                                    : 'bg-white dark:bg-slate-950 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                                } ${winner || (!isMyTurn && !ans) ? 'cursor-not-allowed' : 'cursor-pointer'} ${winner && !ans ? 'opacity-50' : ''}`}
                                            >
                                                {ans ? (
                                                    <div className="flex flex-col items-center justify-center w-full h-full space-y-0.5 sm:space-y-1">
                                                        <span className="text-xl sm:text-4xl drop-shadow-md leading-none mb-0.5 sm:mb-1">
                                                            {ans.markedBy === 'X' ? '❌' : '⚽'}
                                                        </span>
                                                        <span className="text-[6px] sm:text-[10px] font-black uppercase text-center text-slate-900 dark:text-white tracking-tighter sm:tracking-tight leading-none px-0.5 sm:px-1 line-clamp-2">
                                                            {ans.player.name}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <Search className="w-4 h-4 sm:w-8 sm:h-8 text-slate-300 dark:text-slate-600" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL SEARCH JUCATOR GRILA */}
            {activeCell && !winner && isMyTurn && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in">
                    <div className="bg-slate-900 w-full h-[100dvh] sm:h-auto sm:max-w-lg sm:rounded-3xl sm:border-4 border-blue-600/50 shadow-2xl flex flex-col overflow-hidden max-h-[100dvh]">
                        <div className="p-3 sm:p-5 border-b-2 border-slate-800 flex justify-between items-center bg-slate-950 mt-safe-top shrink-0">
                            <h3 className="font-black text-white uppercase tracking-widest text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2">
                                Răspunde pt {turn === 'X' ? '❌' : '⚽'}
                            </h3>
                            <button onClick={() => {setActiveCell(null); setSearchTerm("");}} className="text-slate-400 hover:text-rose-500 bg-slate-800 p-1.5 sm:p-2 rounded-md"><X className="w-4 h-4 sm:w-5 sm:h-5 font-bold" /></button>
                        </div>
                        <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 flex-1 overflow-hidden flex flex-col pb-safe-bottom">
                            <div className="text-center text-[9px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 mb-1 sm:mb-4 bg-slate-800 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-slate-700 flex flex-col sm:flex-row justify-between items-center px-3 sm:px-4 gap-2 sm:gap-0 shrink-0">
                                <div>
                                    Intersecția: <span className="text-white block sm:inline">{gridRows[activeCell.r].value} + {gridCols[activeCell.c].value}</span>
                                </div>
                                <div className={`text-[10px] sm:text-sm font-black tabular-nums ${timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-blue-400'}`}>
                                    {timeLeft}s
                                </div>
                            </div>
                            <input 
                                type="text"
                                autoFocus
                                placeholder="Caută (ex: Mbappe)..."
                                className="w-full bg-slate-950 border-2 border-slate-700 p-3 sm:p-4 rounded-lg sm:rounded-xl text-white font-black uppercase tracking-widest outline-none focus:border-blue-500 transition-colors text-xs sm:text-base shrink-0"
                                value={searchTerm}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                            />
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                {searchResults.map((p: Player) => (
                                    <button 
                                        key={p._id}
                                        onClick={() => handleSelectPlayer(p)}
                                        className="w-full flex items-center justify-center p-3 sm:p-4 rounded-lg sm:rounded-xl transition-colors border border-slate-700 hover:border-blue-500 bg-slate-800 hover:bg-blue-600 group"
                                    >
                                        <div className="font-black text-white uppercase tracking-tight truncate text-center text-[10px] sm:text-lg">{p.name}</div>
                                    </button>
                                ))}
                                {searchTerm.length > 1 && searchResults.length === 0 ? (
                                    <div className="text-center p-4 text-slate-500 font-bold uppercase tracking-widest text-[10px] sm:text-xs">Nu a fost găsit.</div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// GAME 2: HI-LO (MAI MARE SAU MAI MICĂ) - OPTIMIZAT MOBILE (SPLIT VERTICAL)
// ============================================================================
function HiLoGame({ players, onBack, user, isMuted }: { players: Player[], onBack: () => void, user: any, isMuted: boolean }) {
    const [gameState, setGameState] = useState<'setup' | 'playing' | 'gameover'>('setup');
    const [category, setCategory] = useState<'age' | 'height' | 'market_value' | 'rating'>('market_value');
    
    const [playerName, setPlayerName] = useState(user?.name || "");
    const [sessionName, setSessionName] = useState(""); 

    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [playerA, setPlayerA] = useState<Player | null>(null);
    const [playerB, setPlayerB] = useState<Player | null>(null);
    const [revealResult, setRevealResult] = useState<'correct' | 'wrong' | null>(null);
    
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [leaderboard, setLeaderboard] = useState<{name: string, score: number, date: string}[]>([]);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch(`${API_URL}/api/sport/leaderboard`);
                if(res.ok) {
                    setLeaderboard(await res.json());
                }
            } catch (e) {}
        };
        fetchLeaderboard();
    }, [gameState]);

    const saveScore = async (finalScore: number) => {
        if (finalScore === 0) return;
        try {
            const finalName = playerName.trim() || 'Jucător Anonim';
            await fetch(`${API_URL}/api/sport/leaderboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: finalName, score: finalScore })
            });
        } catch (e) {}
    };

    const TOP_5_LEAGUES = [39, 140, 135, 78, 61]; 

    const getStatValue = (p: Player, cat: string) => {
        if (cat === 'age') return p.age || 0;
        if (cat === 'height') return parseInt(p.height?.replace(/\D/g, '') || "0", 10);
        if (cat === 'rating') return parseFloat(p.statistics_summary?.rating || "0");
        if (cat === 'market_value') {
            if (p.market_value) return p.market_value;
            const rating = parseFloat(p.statistics_summary?.rating || "6.0");
            const age = p.age || 27; 
            const currentTeam = (p.team_name || p.team || "").toLowerCase();
            const leagueId = Number(p.league_id);
            const position = (p.position || "").toLowerCase();
    
            let baseValue = 2_000_000; 
            if (age <= 18) baseValue *= 5.5;      
            else if (age <= 21) baseValue *= 4.0; 
            else if (age <= 23) baseValue *= 2.8; 
            else if (age <= 26) baseValue *= 1.8; 
            else if (age <= 29) baseValue *= 1.4; 
            else if (age <= 31) baseValue *= 0.8; 
            else if (age <= 34) baseValue *= 0.4; 
            else baseValue *= 0.1;                
    
            if (rating >= 8.5) baseValue *= 15;     
            else if (rating >= 8.0) baseValue *= 8; 
            else if (rating >= 7.5) baseValue *= 4; 
            else if (rating >= 7.0) baseValue *= 2; 
            else if (rating >= 6.5) baseValue *= 1.3; 
            else if (rating < 6.0) baseValue *= 0.5; 
    
            if (leagueId === 39) baseValue *= 2.0; 
            else if (leagueId === 140) baseValue *= 1.5; 
            else if (leagueId === 135 || leagueId === 78) baseValue *= 1.3; 
            
            const giantClubs = ['real madrid', 'manchester city', 'arsenal', 'bayern', 'paris saint germain', 'liverpool', 'barcelona', 'chelsea'];
            const bigClubs = ['juventus', 'inter', 'ac milan', 'manchester united', 'tottenham', 'atletico madrid', 'borussia dortmund', 'napoli'];
            if (giantClubs.some(club => currentTeam.includes(club))) baseValue *= 2.2;
            else if (bigClubs.some(club => currentTeam.includes(club))) baseValue *= 1.5;
            
            if (position.includes('attacker') || position.includes('forward') || position.includes('wing') || position.includes('striker')) baseValue *= 1.3;
            else if (position.includes('midfield')) baseValue *= 1.1;
            else if (position.includes('goalkeeper') || position.includes('portar')) baseValue *= 0.7; 
    
            if (giantClubs.some(club => currentTeam.includes(club))) {
                if (age <= 23 && rating >= 6.8) baseValue = Math.max(baseValue, 45_000_000); 
                else if (age <= 29 && rating >= 6.5) baseValue = Math.max(baseValue, 60_000_000); 
            }
            baseValue = Math.min(Math.max(baseValue, 1_000_000), 200_000_000);
            return baseValue > 10_000_000 ? Math.round(baseValue / 1_000_000) * 1_000_000 : Math.round(baseValue / 500_000) * 500_000;
        }
        return 0;
    };

    const getStatFormat = (val: number, cat: string) => {
        if (cat === 'age') return `${val} Ani`;
        if (cat === 'height') return `${val} cm`;
        if (cat === 'rating') return `${val.toFixed(2)} ⭐`;
        if (cat === 'market_value') return `${(val / 1000000).toFixed(1)} Mil. €`;
        return val;
    };

    const startGame = () => {
        const finalName = playerName.trim();
        if (finalName.length < 2) { 
            toast.error("Te rog să introduci un nume de minim 2 caractere."); 
            return; 
        }

        if (finalName.toLowerCase() !== sessionName.toLowerCase()) {
            const nameExists = leaderboard.some(entry => entry.name.toLowerCase() === finalName.toLowerCase());
            if (nameExists) {
                toast.error("Numele există deja în clasament! Alege altul.");
                return;
            }
        }
        
        setSessionName(finalName);

        const validPlayers = players.filter((p: Player) => getStatValue(p, category) > 0 && p.league_id && TOP_5_LEAGUES.includes(Number(p.league_id)));
        if (validPlayers.length < 10) { toast.error("Nu sunt suficienți jucători pentru această categorie."); return; }
        const shuffled = shuffleArray(validPlayers);
        setPlayerA(shuffled[0]); setPlayerB(shuffled[1]); setScore(0); setLives(3); setRevealResult(null); setGameState('playing');
    };

    const handleGuess = (guess: 'higher' | 'lower') => {
        if (!playerA || !playerB || revealResult) return; 

        const valA = getStatValue(playerA, category);
        const valB = getStatValue(playerB, category);
        const isCorrect = (guess === 'higher' && valB >= valA) || (guess === 'lower' && valB <= valA);

        setRevealResult(isCorrect ? 'correct' : 'wrong');
        playSound(isCorrect ? 'correct' : 'wrong', isMuted);

        setTimeout(() => {
            if (isCorrect) {
                setScore(prev => prev + 1);
                setPlayerA(playerB);
                const validPlayers = players.filter((p: Player) => getStatValue(p, category) > 0 && p.league_id && TOP_5_LEAGUES.includes(Number(p.league_id)));
                const shuffled = shuffleArray(validPlayers);
                const nextPB = shuffled.find((p: Player) => p._id !== playerB._id && getStatValue(p, category) !== getStatValue(playerB, category)) || shuffled[0];
                setPlayerB(nextPB);
                setRevealResult(null); 
            } else {
                if (lives > 1) {
                    setLives(prev => prev - 1);
                    toast.error("Răspuns greșit! Ai pierdut o viață.");
                    setPlayerA(playerB);
                    const validPlayers = players.filter((p: Player) => getStatValue(p, category) > 0 && p.league_id && TOP_5_LEAGUES.includes(Number(p.league_id)));
                    const shuffled = shuffleArray(validPlayers);
                    const nextPB = shuffled.find((p: Player) => p._id !== playerB._id && getStatValue(p, category) !== getStatValue(playerB, category)) || shuffled[0];
                    setPlayerB(nextPB);
                    setRevealResult(null);
                } else {
                    setLives(0);
                    saveScore(score);
                    setGameState('gameover');
                    setRevealResult(null); 
                }
            }
        }, 1200); 
    };

    const shareScore = () => {
        const text = `⚽ Football Games Hub - Hi-Lo\n👤 ${playerName.trim()}\n🔥 Categoria: ${category.replace('_', ' ')}\n🏆 Scor final: ${score}\nJoci mai bine? Încearcă și tu!`;
        navigator.clipboard.writeText(text);
        toast.success("Scorul a fost copiat! Dă-i Paste prietenilor.", { icon: '📋' });
    };

    if (gameState === 'setup') {
        if (showLeaderboard) {
            return (
                <div className="max-w-2xl mx-auto bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 border-2 sm:border-4 border-slate-800 shadow-2xl mt-6 sm:mt-10 mx-2 sm:mx-auto">
                    <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3 sm:pb-4 mb-4 sm:mb-6">
                        <button onClick={() => setShowLeaderboard(false)} className="text-slate-400 hover:text-white flex items-center gap-1 font-bold text-[10px] sm:text-xs uppercase tracking-widest"><X className="w-4 h-4"/> Înapoi</button>
                        <h2 className="text-sm sm:text-xl font-black text-white uppercase tracking-widest flex items-center gap-1.5 sm:gap-2"><Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" /> Top Hi-Lo</h2>
                        <div className="w-10 sm:w-16"></div>
                    </div>
                    <div className="space-y-2 max-h-[60vh] sm:max-h-96 overflow-y-auto pr-1 sm:pr-2">
                        {leaderboard.length === 0 ? (
                            <p className="text-slate-500 text-center font-bold uppercase tracking-widest text-xs sm:text-sm py-10">Niciun scor înregistrat încă.</p>
                        ) : (
                            leaderboard.map((entry: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center bg-slate-950 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-slate-800">
                                    <div className="flex items-center gap-2 sm:gap-4">
                                        <span className={`text-base sm:text-xl font-black w-6 sm:w-8 text-center ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-600'}`}>#{idx + 1}</span>
                                        <span className="font-bold text-white text-xs sm:text-base truncate max-w-[120px] sm:max-w-[300px]">{entry.name}</span>
                                    </div>
                                    <span className="font-black text-emerald-400 text-sm sm:text-xl shrink-0">{entry.score} pct</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="max-w-2xl mx-auto bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 border-2 sm:border-4 border-slate-800 shadow-2xl text-center mt-6 sm:mt-10 mx-2 sm:mx-auto">
                <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3 sm:pb-4 mb-6 sm:mb-8">
                    <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-1 font-bold text-[10px] sm:text-xs uppercase tracking-widest"><X className="w-4 h-4"/> Înapoi</button>
                    <h2 className="text-sm sm:text-xl font-black text-white uppercase tracking-widest">Setup: Hi-Lo</h2>
                    <button onClick={() => setShowLeaderboard(true)} className="text-yellow-500 hover:text-yellow-400 flex items-center gap-1 font-bold text-[10px] sm:text-xs uppercase tracking-widest"><ListOrdered className="w-4 h-4"/> Top 50</button>
                </div>

                <div className="mb-6 sm:mb-8 space-y-2 max-w-sm mx-auto">
                    <label className="text-slate-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs">Nume Jucător (Clasament):</label>
                    <input 
                        type="text" 
                        value={playerName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlayerName(e.target.value)}
                        className="w-full bg-slate-950 border-2 border-slate-700 p-2.5 sm:p-3 rounded-lg sm:rounded-xl text-center text-white font-black uppercase tracking-widest outline-none focus:border-blue-500 transition-colors text-xs sm:text-base"
                        placeholder="Alege un nume unic..."
                    />
                </div>

                <div className="space-y-4 sm:space-y-6">
                    <h3 className="text-slate-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs">Alege criteriul de departajare:</h3>
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                        {[
                            { id: 'market_value', label: 'Cotă de Piață' },
                            { id: 'rating', label: 'Rating SofaScore' },
                            { id: 'age', label: 'Vârstă' },
                            { id: 'height', label: 'Înălțime' },
                        ].map(c => (
                            <button key={c.id} onClick={() => setCategory(c.id as any)} className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 font-black uppercase tracking-tighter sm:tracking-widest transition-all text-[10px] sm:text-sm ${category === c.id ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] sm:scale-105' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
                                {c.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={startGame} className="w-full bg-emerald-600 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-xs sm:text-lg hover:bg-emerald-500 transition-colors border-b-4 border-emerald-800 hover:border-b-2 hover:translate-y-[2px]">Începe Jocul (Ai 3 vieți ❤️)</button>
                </div>
            </div>
        );
    }

    if (gameState === 'gameover') {
        return (
            <div className="max-w-lg mx-auto bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 border-2 sm:border-4 border-rose-600/50 shadow-2xl text-center space-y-4 sm:space-y-6 mt-6 sm:mt-10 mx-2 sm:mx-auto">
                <AlertTriangle className="w-12 h-12 sm:w-16 sm:h-16 text-rose-500 mx-auto mb-1 sm:mb-2" />
                <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter text-white">Fără Vieți Ramase</h2>
                <div className="bg-slate-950 rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-slate-800">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs mb-1 sm:mb-2">Scorul Tău Final</p>
                    <p className="text-4xl sm:text-6xl font-black text-blue-500 drop-shadow-md">{score}</p>
                </div>
                
                <button onClick={shareScore} className="w-full bg-[#1DA1F2] hover:bg-[#1a91da] text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-sm transition-colors border-b-4 border-[#147bba] hover:border-b-2 hover:translate-y-[2px] flex items-center justify-center gap-2">
                    <Share className="w-4 h-4 sm:w-5 sm:h-5" /> Trimite Rezultatul
                </button>

                <div className="flex gap-3 sm:gap-4">
                    <button onClick={startGame} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-sm transition-colors border-b-4 border-emerald-800 hover:border-b-2 hover:translate-y-[2px]">Din nou</button>
                    <button onClick={() => setGameState('setup')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-sm transition-colors border-b-4 border-slate-950 hover:border-b-2 hover:translate-y-[2px]">Meniu</button>
                </div>
            </div>
        );
    }

    const valA = playerA ? getStatValue(playerA, category) : 0;
    const catLabel = { 'age': 'Vârsta', 'height': 'Înălțimea', 'market_value': 'Cota de Piață', 'rating': 'Rating-ul' }[category];

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header-ul Jocului */}
            <div className="flex items-center justify-between bg-slate-900 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border-2 border-slate-800 shadow-lg mx-1 sm:mx-0">
                <button onClick={() => {saveScore(score); setGameState('setup')}} className="text-slate-400 hover:text-rose-500 flex items-center gap-1 font-bold text-[9px] sm:text-xs uppercase tracking-widest"><X className="w-3.5 h-3.5 sm:w-4 h-4"/> Renunță</button>
                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="text-white font-black uppercase tracking-widest text-xs sm:text-sm hidden sm:flex items-center gap-2">
                        Jucător: <span className="text-blue-400">{playerName.trim() || 'Anonim'}</span>
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-950 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg border border-slate-800">
                        {[1, 2, 3].map((i: number) => (
                            <Heart key={i} className={`w-3.5 h-3.5 sm:w-5 sm:h-5 transition-all ${lives >= i ? 'fill-rose-500 text-rose-500 animate-pulse' : 'fill-transparent text-slate-700'}`} />
                        ))}
                    </div>
                </div>
                <div className="text-emerald-400 font-black uppercase tracking-widest text-[10px] sm:text-sm bg-emerald-950/30 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg border border-emerald-900/50">
                    Scor: {score}
                </div>
            </div>

            {/* Split Screen Jucători (Vertical pe mobil, orizontal pe desktop) */}
            <div className="flex flex-col md:flex-row gap-2 sm:gap-4 h-[75vh] md:h-[60vh] min-h-[500px] mx-1 sm:mx-0">
                
                {/* JUCĂTOR A (SUS PE MOBIL / STÂNGA PE DESKTOP) */}
                <div className="flex-1 bg-slate-900 rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-slate-800 flex flex-col items-center justify-center p-4 sm:p-8 text-center relative overflow-hidden shadow-xl sm:shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/80 z-0"></div>
                    <div className="relative z-10 flex flex-col items-center w-full">
                        <img src={playerA?.image || GENERIC_USER_IMAGE} className="w-20 h-20 sm:w-40 sm:h-40 rounded-full object-cover border-2 sm:border-4 border-white shadow-xl mb-3 sm:mb-6 bg-white" />
                        <h2 className="text-lg sm:text-3xl font-black text-white uppercase tracking-tight mb-1 sm:mb-2 line-clamp-1">{playerA?.name}</h2>
                        <p className="text-[10px] sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 sm:mb-6 line-clamp-1">{playerA?.team_name || playerA?.team}</p>
                        <p className="text-[8px] sm:text-xs font-black text-blue-400 uppercase tracking-widest mb-1.5 sm:mb-2">Are {catLabel}</p>
                        <div className="text-2xl sm:text-5xl font-black text-white drop-shadow-md bg-white/10 px-4 sm:px-6 py-1.5 sm:py-3 rounded-xl sm:rounded-2xl border border-white/20 whitespace-nowrap">
                            {getStatFormat(valA, category)}
                        </div>
                    </div>
                </div>

                {/* BULINA VS */}
                <div className="md:w-24 flex items-center justify-center -my-6 md:my-0 md:-mx-12 z-20 shrink-0">
                    <div className="w-10 h-10 sm:w-16 sm:h-16 bg-rose-600 rounded-full flex items-center justify-center text-white font-black italic text-sm sm:text-2xl border-2 sm:border-4 border-slate-950 shadow-[0_0_15px_rgba(225,29,72,0.5)]">VS</div>
                </div>

                {/* JUCĂTOR B (JOS PE MOBIL / DREAPTA PE DESKTOP) */}
                <div className={`flex-1 rounded-2xl sm:rounded-3xl border-2 sm:border-4 flex flex-col items-center justify-center p-4 sm:p-8 text-center relative overflow-hidden shadow-xl sm:shadow-2xl transition-colors duration-300 ${
                    revealResult === 'correct' ? 'bg-emerald-900 border-emerald-500' :
                    revealResult === 'wrong' ? 'bg-rose-900 border-rose-500' : 'bg-slate-900 border-slate-800'
                }`}>
                     <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-b from-transparent to-slate-950/80 z-0"></div>
                     <div className="relative z-10 flex flex-col items-center w-full h-full justify-center">
                        <img src={playerB?.image || GENERIC_USER_IMAGE} className="w-20 h-20 sm:w-40 sm:h-40 rounded-full object-cover border-2 sm:border-4 border-white shadow-xl mb-3 sm:mb-6 bg-white mt-4 sm:mt-0" />
                        <h2 className="text-lg sm:text-3xl font-black text-white uppercase tracking-tight mb-1 sm:mb-2 line-clamp-1">{playerB?.name}</h2>
                        <p className="text-[10px] sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 sm:mb-6 line-clamp-1">{playerB?.team_name || playerB?.team}</p>
                        <p className={`text-[8px] sm:text-xs font-black uppercase tracking-widest mb-2 sm:mb-4 ${
                            revealResult === 'correct' ? 'text-emerald-300' : revealResult === 'wrong' ? 'text-rose-300' : 'text-emerald-400'
                        }`}>Are {catLabel}</p>
                        
                        {revealResult ? (
                            <div className="animate-in fade-in zoom-in duration-300">
                                <div className={`text-2xl sm:text-5xl font-black drop-shadow-md bg-white/10 px-4 sm:px-6 py-1.5 sm:py-3 rounded-xl sm:rounded-2xl border border-white/20 whitespace-nowrap ${
                                    revealResult === 'correct' ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                    {playerB && getStatFormat(getStatValue(playerB, category), category)}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-row md:flex-col gap-2 sm:gap-3 w-full max-w-[280px] sm:max-w-xs animate-in fade-in duration-300 mt-auto md:mt-0">
                                <button onClick={() => handleGuess('higher')} className="flex-1 md:w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 sm:p-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-lg transition-all border-b-4 border-emerald-800 hover:border-b-2 hover:translate-y-[2px] flex items-center justify-center gap-1 sm:gap-2 shadow-lg">
                                    <ArrowUp className="w-4 h-4 sm:w-6 sm:h-6" /> <span className="hidden sm:inline">Mai </span>Mare
                                </button>
                                <button onClick={() => handleGuess('lower')} className="flex-1 md:w-full bg-rose-600 hover:bg-rose-500 text-white py-3 sm:p-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-lg transition-all border-b-4 border-rose-800 hover:border-b-2 hover:translate-y-[2px] flex items-center justify-center gap-1 sm:gap-2 shadow-lg">
                                    <ArrowDown className="w-4 h-4 sm:w-6 sm:h-6" /> <span className="hidden sm:inline">Mai </span>Mică
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}