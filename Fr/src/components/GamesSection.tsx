import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Trophy, ArrowUp, ArrowDown, Search, X, AlertTriangle, RotateCcw,
    Swords, Play, Activity, Globe, Users, Share2, Copy, Crown, Timer,
    Heart, Volume2, VolumeX, ListOrdered, Share, Shirt, ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { useQuery } from '@tanstack/react-query';
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, SortingState } from '@tanstack/react-table';

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

const API_URL = (import.meta as any).env?.VITE_API_URL || 'https://football-backend-m2a4.onrender.com';
const GENERIC_USER_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
const PLAYERS_CACHE_KEY = 'scoutpro_players_cache_v1';
const PLAYERS_CACHE_TTL = 1000 * 60 * 15; // 15 minute

const getCachedPlayers = (): Player[] | undefined => {
    try {
        const raw = localStorage.getItem(PLAYERS_CACHE_KEY);
        if (!raw) return undefined;
        const parsed = JSON.parse(raw);
        if (parsed?.timestamp && Date.now() - parsed.timestamp < PLAYERS_CACHE_TTL && Array.isArray(parsed.data)) {
            return parsed.data;
        }
    } catch {}
    return undefined;
};

const setCachedPlayers = (data: Player[]) => {
    try {
        localStorage.setItem(PLAYERS_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
    } catch {}
};

const getAuthHeaders = () => {
    const token = localStorage.getItem('footballAppToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

// --- FUNCȚIE CONTRAST CULORI ---
const getContrastTextColor = (hexColor: string) => {
    if (!hexColor) return '#ffffff';
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#0f172a' : '#ffffff';
};

// --- SOUND ENGINE (Web Audio API) ---
const playTone = (frequency: number, type: OscillatorType, duration: number) => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
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
    } catch {}
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
        'Scotland': '🏴', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Ivory Coast': '🇨🇮', 'Cameroon': '🇨🇲',
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
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        if (activeGame !== 'xi') {
            window.dispatchEvent(new CustomEvent('toggle-floating-bars', { detail: false }));
        }
    }, [activeGame]);

    const initialCached = useMemo(() => getCachedPlayers(), []);

    const { data: allPlayers = [], isLoading, isError } = useQuery<Player[]>({
        queryKey: ['sport-players-games'],
        initialData: initialCached,
        staleTime: 1000 * 60 * 10,
        gcTime: 1000 * 60 * 30,
        refetchOnWindowFocus: false,
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/sport/players?limit=10000`);
            if (!res.ok) {
                throw new Error('Eroare la conectarea cu baza de date sportivă.');
            }
            const data: Player[] = await res.json();
            setCachedPlayers(data);
            return data;
        },
    });

    useEffect(() => {
        if (isError && allPlayers.length === 0) {
            toast.error("Eroare la conectarea cu baza de date sportivă.");
        }
    }, [isError, allPlayers.length]);

    if (isLoading && allPlayers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[55vh] gap-3">
                <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Se pregătesc jocurile...
                </span>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto min-h-[75vh] relative pb-16">
            {activeGame !== 'menu' && (
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="fixed bottom-20 left-4 lg:bottom-6 lg:left-6 z-40 bg-white dark:bg-[#11161D] p-2.5 rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm cursor-pointer"
                    title={isMuted ? "Activează sunetul" : "Dezactivează sunetul"}
                >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
            )}

            {activeGame === 'menu' && (
                <div className="space-y-6">
                    <div className="text-center space-y-1.5 pt-2 sm:pt-4">
                        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                            Games Hub
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                            Testează-ți cunoștințele fotbalistice folosind baza de date oficială a platformei.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div
                            onClick={() => setActiveGame('grid')}
                            className="bg-white dark:bg-[#11161D] rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-white/[0.07] hover:border-emerald-500/40 cursor-pointer transition-colors group flex flex-col items-start"
                        >
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                                <Activity className="w-5 h-5 text-emerald-500" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">
                                Grila (X și 0)
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5 flex-1">
                                Joacă local sau online împotriva prietenilor (Best of 5). Găsește jucătorul care bifează intersecția.
                            </p>
                            <button className="inline-flex items-center gap-1.5 bg-emerald-600 group-hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium text-xs transition-colors w-full sm:w-auto justify-center cursor-pointer">
                                <Play className="w-3.5 h-3.5 fill-current" /> Joacă
                            </button>
                        </div>

                        <div
                            onClick={() => setActiveGame('hilo')}
                            className="bg-white dark:bg-[#11161D] rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-white/[0.07] hover:border-blue-500/40 cursor-pointer transition-colors group flex flex-col items-start"
                        >
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                                <Swords className="w-5 h-5 text-blue-500" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">
                                Hi-Lo: Statistici
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5 flex-1">
                                Mai mare sau mai mică? Alege o categorie și ghicește care jucător stă mai bine în cifre.
                            </p>
                            <button className="inline-flex items-center gap-1.5 bg-blue-600 group-hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium text-xs transition-colors w-full sm:w-auto justify-center cursor-pointer">
                                <Play className="w-3.5 h-3.5 fill-current" /> Joacă
                            </button>
                        </div>

                        <div
                            onClick={() => setActiveGame('xi')}
                            className="bg-white dark:bg-[#11161D] rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-white/[0.07] hover:border-amber-500/40 cursor-pointer transition-colors group flex flex-col items-start"
                        >
                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                                <Shirt className="w-5 h-5 text-amber-500" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">
                                Primul 11
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5 flex-1">
                                Ghicește cei 11 titulari dintr-o partidă memorabilă, literă cu literă, în stil Wordle.
                            </p>
                            <button className="inline-flex items-center gap-1.5 bg-amber-600 group-hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-medium text-xs transition-colors w-full sm:w-auto justify-center cursor-pointer">
                                <Play className="w-3.5 h-3.5 fill-current" /> Joacă
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
// COMPONENTA TANSTACK TABLE PENTRU LEADERBOARD (TOP 50 HI-LO)
// ============================================================================
function LeaderboardTable({ data, currentUserName }: { data: any[], currentUserName: string }) {
    const [sorting, setSorting] = useState<SortingState>([]);

    const tableData = useMemo(() => {
        return data.map((entry, index) => ({
            rank: index + 1,
            name: entry.name,
            score: entry.score
        }));
    }, [data]);

    const columns = useMemo(() => [
        {
            accessorKey: 'rank',
            header: '#',
            cell: (info: any) => {
                const rank = info.getValue();
                let colorClass = 'text-slate-500';
                if (rank === 1) colorClass = 'text-amber-500 font-semibold';
                else if (rank === 2) colorClass = 'text-slate-400 font-semibold';
                else if (rank === 3) colorClass = 'text-amber-700 dark:text-amber-600 font-semibold';

                return <div className={`text-center tabular-nums ${colorClass}`}>{rank}</div>;
            }
        },
        {
            accessorKey: 'name',
            header: 'Jucător',
            cell: (info: any) => {
                const name = info.getValue();
                const isMe = name.toLowerCase() === currentUserName.toLowerCase();
                return (
                    <div className="flex items-center gap-2">
                        <span className={`font-medium truncate max-w-[140px] sm:max-w-[280px] ${isMe ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-900 dark:text-slate-100'}`}>
                            {name}
                        </span>
                        {isMe && (
                            <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-[10px] font-medium px-1.5 py-0.5 rounded">
                                Tu
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            accessorKey: 'score',
            header: 'Scor',
            cell: (info: any) => (
                <div className="text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {info.getValue()} pct
                </div>
            )
        }
    ], [currentUserName]);

    const table = useReactTable({
        data: tableData,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className="overflow-x-auto scrollbar-hide max-h-[60vh] sm:max-h-96 border border-slate-200 dark:border-white/[0.07] rounded-lg">
            <table className="w-full text-xs sm:text-[13px] text-left">
                <thead className="sticky top-0 bg-slate-50 dark:bg-[#0B0F14] text-slate-500 dark:text-slate-400 font-medium text-[11px] border-b border-slate-200 dark:border-white/[0.07] z-10">
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <th
                                    key={header.id}
                                    onClick={header.column.getToggleSortingHandler()}
                                    className="py-2.5 px-3 cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                    <div className={`flex items-center gap-1 ${header.column.id === 'score' ? 'justify-end' : header.column.id === 'rank' ? 'justify-center' : 'justify-start'}`}>
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                        {header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05] bg-white dark:bg-[#11161D]">
                    {table.getRowModel().rows.length === 0 ? (
                        <tr>
                            <td colSpan={3} className="text-slate-500 text-center text-xs py-10">
                                Niciun scor înregistrat încă.
                            </td>
                        </tr>
                    ) : (
                        table.getRowModel().rows.map(row => {
                            const isMe = row.original.name.toLowerCase() === currentUserName.toLowerCase();
                            return (
                                <tr key={row.id} className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02] ${isMe ? 'bg-emerald-500/[0.06]' : ''}`}>
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className={`py-2.5 px-3 ${cell.column.id === 'score' ? 'text-right' : ''}`}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}

// ============================================================================
// GAME 3: STARTING XI (GHICEȘTE PRIMUL 11) - WORDLE STYLE
// ============================================================================
function StartingXIGame({ onBack, isMuted }: { onBack: () => void, isMuted: boolean }) {
    const [allMatches, setAllMatches] = useState<StartingXIData[]>([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
    const [match, setMatch] = useState<StartingXIData | null>(null);

    const [guessedIds, setGuessedIds] = useState<Set<string>>(new Set());
    const [gaveUp, setGaveUp] = useState(false);

    const [activeSlot, setActiveSlot] = useState<XIPlayer | null>(null);
    const [slotGuess, setSlotGuess] = useState("");
    const [slotGuessesHistory, setSlotGuessesHistory] = useState<Record<string, string[]>>({});

    const [win, setWin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const shouldHide = Boolean(activeSlot && !win && !gaveUp);
        window.dispatchEvent(new CustomEvent('toggle-floating-bars', { detail: shouldHide }));
        return () => {
            window.dispatchEvent(new CustomEvent('toggle-floating-bars', { detail: false }));
        };
    }, [activeSlot, win, gaveUp]);

    useEffect(() => {
        const fetchMatches = async () => {
            try {
                const res = await fetch(`${API_URL}/api/sport/starting-xi`);
                if (res.ok) {
                    const matches: StartingXIData[] = await res.json();
                    if (matches.length > 0) {
                        setAllMatches(matches);
                        setMatch(matches[0]);
                        setCurrentMatchIndex(0);
                    }
                }
            } catch {
                toast.error("Eroare la preluarea meciurilor.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchMatches();
    }, []);

    const loadMatch = (index: number) => {
        setCurrentMatchIndex(index);
        setMatch(allMatches[index]);
        setGuessedIds(new Set());
        setGaveUp(false);
        setWin(false);
        setActiveSlot(null);
        setSlotGuess("");
        setSlotGuessesHistory({});
    };

    const handlePrevMatch = () => {
        if (currentMatchIndex > 0) loadMatch(currentMatchIndex - 1);
    };

    const handleNextMatch = () => {
        if (currentMatchIndex < allMatches.length - 1) loadMatch(currentMatchIndex + 1);
    };

    const evaluateWordleGuess = (guess: string, target: string) => {
        const targetClean = removeDiacritics(target).toUpperCase();
        const guessClean = removeDiacritics(guess).toUpperCase().padEnd(targetClean.length, ' ').slice(0, targetClean.length);

        const colors = new Array(targetClean.length).fill('bg-slate-600 dark:bg-slate-700');
        const targetCounts: Record<string, number> = {};

        for (const char of targetClean) {
            targetCounts[char] = (targetCounts[char] || 0) + 1;
        }

        for (let i = 0; i < targetClean.length; i++) {
            if (guessClean[i] === targetClean[i]) {
                colors[i] = 'bg-emerald-600';
                targetCounts[guessClean[i]]--;
            }
        }

        for (let i = 0; i < targetClean.length; i++) {
            if (colors[i] !== 'bg-emerald-600' && guessClean[i] !== ' ' && targetCounts[guessClean[i]] > 0) {
                colors[i] = 'bg-amber-500';
                targetCounts[guessClean[i]]--;
            }
        }

        return { chars: guessClean.split(''), colors };
    };

    const handleSlotGuess = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeSlot || !match || gaveUp || win) return;

        const targetClean = removeDiacritics(activeSlot.name).toUpperCase();
        const guessText = slotGuess;

        if (guessText.length < targetClean.length) {
            toast.error("Completează toate caracterele.");
            playSound('wrong', isMuted);
            return;
        }

        if (/\d/.test(guessText)) {
            toast.error("Numele nu poate conține cifre.");
            playSound('wrong', isMuted);
            return;
        }

        const userClean = removeDiacritics(guessText).toUpperCase();
        const pid = activeSlot._id || activeSlot.id || activeSlot.dbId;

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
                    toast.success("Felicitări! Ai ghicit tot primul 11.");
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
        toast("Meci încheiat. Iată echipa completă.");
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!match) {
        return (
            <div className="max-w-md mx-auto bg-white dark:bg-[#11161D] rounded-xl p-6 border border-slate-200 dark:border-white/[0.07] text-center space-y-4 mt-8">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Niciun meci disponibil</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Nu există meciuri adăugate în baza de date.</p>
                <button onClick={onBack} className="bg-slate-900 dark:bg-white/[0.08] text-white px-4 py-2 rounded-lg font-medium text-xs cursor-pointer">
                    Înapoi
                </button>
            </div>
        );
    }

    const lines = [1, ...match.formation.split('-').map(Number)];
    const rows: XIPlayer[][] = [];

    lines.forEach((_, rowIndex) => {
        rows.push(match.players.filter(p => p.gridRow === rowIndex));
    });

    const homeColor = match.teamColor || '#1e293b';
    const awayColor = match.opponentColor || '#1e293b';

    return (
        <div className="max-w-3xl mx-auto space-y-4">
            {/* Header Meci */}
            <div className="bg-white dark:bg-[#11161D] p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-white/[0.07] space-y-4">
                <div className="flex items-center justify-between">
                    <button onClick={onBack} className="text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 font-medium text-xs cursor-pointer">
                        <ChevronLeft className="w-4 h-4" /> Înapoi
                    </button>
                    <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {match.date} • {match.formation}
                    </span>
                </div>

                <div className="flex items-center justify-between gap-2 sm:gap-4">
                    <div
                        className="flex-1 text-xs sm:text-base font-semibold text-center px-3 py-2 rounded-lg border border-black/10 truncate"
                        style={{
                            backgroundColor: match.isHome !== false ? homeColor : awayColor,
                            color: getContrastTextColor(match.isHome !== false ? homeColor : awayColor)
                        }}
                    >
                        {match.isHome !== false ? match.teamName : match.opponent}
                    </div>

                    <div className="shrink-0 bg-slate-100 dark:bg-white/[0.05] px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] font-bold text-slate-900 dark:text-white text-base sm:text-xl tabular-nums">
                        {match.score}
                    </div>

                    <div
                        className="flex-1 text-xs sm:text-base font-semibold text-center px-3 py-2 rounded-lg border border-black/10 truncate"
                        style={{
                            backgroundColor: match.isHome !== false ? awayColor : homeColor,
                            color: getContrastTextColor(match.isHome !== false ? awayColor : homeColor)
                        }}
                    >
                        {match.isHome !== false ? match.opponent : match.teamName}
                    </div>
                </div>

                {allMatches.length > 1 && (
                    <div className="flex items-center justify-center gap-4 pt-3 border-t border-slate-200 dark:border-white/[0.07]">
                        <button
                            onClick={handlePrevMatch}
                            disabled={currentMatchIndex === 0}
                            className="inline-flex items-center gap-1 bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors disabled:opacity-35 cursor-pointer"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                        </button>
                        <span className="text-xs font-medium text-slate-500 tabular-nums">
                            {currentMatchIndex + 1} / {allMatches.length}
                        </span>
                        <button
                            onClick={handleNextMatch}
                            disabled={currentMatchIndex === allMatches.length - 1}
                            className="inline-flex items-center gap-1 bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors disabled:opacity-35 cursor-pointer"
                        >
                            Următor <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Teren tactic mat */}
            <div
                className="rounded-xl border border-white/10 py-6 px-2 sm:p-6 min-h-[440px] sm:min-h-[540px] relative overflow-hidden flex flex-col-reverse justify-around gap-3 sm:gap-5 select-none"
                style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #142820 0px, #142820 44px, #11221b 44px, #11221b 88px)' }}
            >
                <div className="absolute inset-2.5 border border-white/15 rounded-lg pointer-events-none" />
                <div className="absolute top-1/2 inset-x-2.5 h-px bg-white/15 -translate-y-1/2 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 w-20 h-20 sm:w-28 sm:h-28 border border-white/15 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                {rows.map((rowPlayers, rowIndex) => (
                    <div key={rowIndex} className="relative z-10 flex justify-center gap-1.5 sm:gap-8 w-full px-1">
                        {rowPlayers.map((player, idx) => {
                            const pid = player._id || player.id || player.dbId;
                            const isGuessed = pid ? guessedIds.has(pid) : false;
                            const showRed = gaveUp && !isGuessed;
                            const isClickable = !isGuessed && !showRed && !win;

                            return (
                                <div
                                    key={idx}
                                    className={`flex flex-col items-center flex-1 max-w-[23%] sm:max-w-[110px] ${isClickable ? 'cursor-pointer group' : ''}`}
                                    onClick={() => {
                                        if (isClickable) {
                                            setActiveSlot(player);
                                            setSlotGuess("");
                                        }
                                    }}
                                >
                                    <div className="w-9 h-9 sm:w-12 sm:h-12 relative flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                                        <Shirt
                                            className={`w-full h-full drop-shadow ${showRed ? 'opacity-50' : ''}`}
                                            style={{
                                                fill: rowIndex === 0 ? '#f59e0b' : (match.teamColor || '#f1f5f9'),
                                                stroke: rowIndex === 0 ? '#92400e' : 'rgba(0,0,0,0.35)',
                                                strokeWidth: 1.5
                                            }}
                                        />
                                        {(isGuessed || showRed) && (
                                            <div className="absolute -bottom-1 -right-1 bg-[#0B0F14] rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center border border-white/40">
                                                <span className="text-[7px] sm:text-[9px] font-semibold text-white">
                                                    {player.name.substring(0, 2).toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        {isClickable && (
                                            <div className="absolute -bottom-1 -right-1 bg-emerald-600 rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center border border-white/60">
                                                <Search className="w-2.5 h-2.5 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-0.5 text-center w-full">
                                        {(isGuessed || showRed) ? (
                                            <div className={`font-medium text-[9px] sm:text-[11px] bg-[#0B0F14]/90 px-1.5 py-0.5 rounded border truncate ${showRed ? 'text-rose-400 border-rose-500/40' : 'text-white border-white/15'}`}>
                                                {player.name}
                                            </div>
                                        ) : (
                                            <div className="font-mono text-white/70 bg-black/35 px-1.5 py-0.5 rounded text-[9px] sm:text-xs truncate">
                                                {"_".repeat(Math.min(player.name.length, 10))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Footer progres */}
            <div className="bg-white dark:bg-[#11161D] p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-white/[0.07] flex items-center justify-between gap-3">
                <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-white/[0.05] px-3 py-1.5 rounded-lg tabular-nums">
                    <span className="text-emerald-600 dark:text-emerald-400">{guessedIds.size}</span>
                    <span className="text-slate-400">/11</span>
                </div>

                <div className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 text-center flex-1">
                    {win ? "Ai ghicit tot primul 11!" : gaveUp ? "Meci încheiat" : "Apasă pe un tricou pentru a ghici jucătorul"}
                </div>

                {!win && !gaveUp ? (
                    <button
                        onClick={handleGiveUp}
                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-3.5 py-1.5 rounded-lg font-medium text-xs transition-colors cursor-pointer"
                    >
                        Renunță
                    </button>
                ) : <div className="w-16" />}
            </div>

            {/* Modal Wordle */}
            {activeSlot && !win && !gaveUp && (
                <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
                    <div className="bg-white dark:bg-[#11161D] w-full max-h-[88dvh] sm:h-auto sm:max-w-xl sm:rounded-xl border-t sm:border border-slate-200 dark:border-white/[0.08] shadow-2xl flex flex-col overflow-hidden rounded-t-xl">
                        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-white/[0.07] flex justify-between items-center shrink-0">
                            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Ghicește numele</h3>
                            <button
                                onClick={() => { setActiveSlot(null); setSlotGuess(""); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1 flex flex-col items-center space-y-2">
                            {(slotGuessesHistory[activeSlot._id || activeSlot.id || activeSlot.dbId || ''] || []).map((guess, idx) => {
                                const { chars, colors } = evaluateWordleGuess(guess, activeSlot.name);
                                return (
                                    <div key={idx} className="flex gap-1 flex-wrap justify-center w-full">
                                        {chars.map((char, j) => (
                                            <div key={j} className={`w-6 h-8 sm:w-9 sm:h-10 flex items-center justify-center font-semibold text-white rounded text-xs sm:text-base ${colors[j]}`}>
                                                {char}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}

                            <div className="flex gap-1 flex-wrap justify-center opacity-60 mt-1 w-full">
                                {removeDiacritics(activeSlot.name).toUpperCase().split('').map((char, j) => (
                                    <div key={`empty-${j}`} className="w-6 h-8 sm:w-9 sm:h-10 flex items-center justify-center font-semibold text-slate-500 dark:text-slate-400 rounded text-xs sm:text-base border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#0B0F14]">
                                        {char === ' ' ? ' ' : '_'}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={handleSlotGuess} className="p-4 bg-slate-50 dark:bg-[#0B0F14] border-t border-slate-200 dark:border-white/[0.07] shrink-0 space-y-2.5">
                            <p className="text-[11px] text-slate-500 text-center">
                                Verde: literă corectă • Galben: există în nume, altă poziție
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    autoFocus
                                    maxLength={activeSlot ? removeDiacritics(activeSlot.name).length : undefined}
                                    placeholder="Scrie numele..."
                                    className="flex-1 bg-white dark:bg-[#11161D] border border-slate-200 dark:border-white/[0.08] px-3 py-2.5 rounded-lg text-center text-slate-900 dark:text-white font-semibold uppercase tracking-wider outline-none focus:border-emerald-500 text-sm"
                                    value={slotGuess}
                                    onChange={e => {
                                        const val = e.target.value.toUpperCase();
                                        if (/\d/.test(val)) return;
                                        setSlotGuess(val);
                                    }}
                                />
                                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 rounded-lg font-medium text-xs transition-colors cursor-pointer">
                                    Verifică
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

const TOP_5_LEAGUES = [39, 140, 135, 78, 61];

function GridGame({ players, onBack, isMuted, user }: { players: Player[], onBack: () => void, isMuted: boolean, user: any }) {
    const top5Players = useMemo(() => {
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
    const roomCodeRef = useRef(roomCode);

    useEffect(() => { gridRowsRef.current = gridRows; gridColsRef.current = gridCols; }, [gridRows, gridCols]);
    useEffect(() => { turnRef.current = turn; }, [turn]);
    useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);

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

        const handleConnect = () => {
            if (roomCodeRef.current) {
                socket.emit("join_room", roomCodeRef.current);
            }
        };

        const handleDisconnect = () => {
            toast("Conexiune instabilă, se reconectează...", { id: 'grid-socket-status' });
        };

        const handleSocketMessage = (data: any) => {
            try {
                const payload = JSON.parse(data.message);
                if (payload.action === 'JOINED' && myRole === 'X') {
                    socket.emit("send_message", {
                        room: roomCode,
                        message: JSON.stringify({ action: 'SYNC_GRID', gridRows: gridRowsRef.current, gridCols: gridColsRef.current, hostName: playerName || 'Host' })
                    });
                    setMode('online_playing');
                    toast.success(`${payload.name || 'Adversarul'} s-a conectat! Începe meciul.`);
                } else if (payload.action === 'SYNC_GRID') {
                    setGridRows(payload.gridRows);
                    setGridCols(payload.gridCols);
                    setAnswers({});
                    setTurn('X');
                    setWinner(null);
                    setMode('online_playing');
                    setSkipVotes({ X: false, O: false });
                    if (myRole === 'O') toast.success(`Te-ai conectat la meciul lui ${payload.hostName}.`);
                } else if (payload.action === 'MOVE') {
                    if (payload.markedBy !== myRole) {
                        applyMove(payload.r, payload.c, payload.player, payload.markedBy, true);
                    }
                } else if (payload.action === 'SWITCH_TURN') {
                    setTurn(payload.nextTurn);
                    setActiveCell(null);
                    setSearchTerm("");
                    if (payload.nextTurn === myRole) {
                        toast.success(payload.reason === 'timeout' ? "Timpul a expirat! E rândul tău." : "Adversarul a greșit! E rândul tău.");
                    } else if (payload.reason === 'wrong') {
                        playSound('wrong', isMuted);
                    }
                } else if (payload.action === 'SKIP_VOTE') {
                    setSkipVotes(prev => {
                        const newVotes = { ...prev, [payload.role]: true };
                        if (newVotes.X && newVotes.O) {
                            toast("Ambii au renunțat! Se generează altă grilă...");
                            if (myRole === 'X') setTimeout(() => generateValidGrid(true), 1000);
                        } else {
                            toast("Adversarul a votat să schimbe grila (1/2)");
                        }
                        return newVotes;
                    });
                } else if (payload.action === 'NEXT_MATCH') {
                    setGridRows(payload.gridRows);
                    setGridCols(payload.gridCols);
                    setAnswers({});
                    setTurn('X');
                    setWinner(null);
                    setTimeLeft(60);
                    setSkipVotes({ X: false, O: false });
                    toast("S-a generat o nouă grilă.");
                }
            } catch {}
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("receive_message", handleSocketMessage);
        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("receive_message", handleSocketMessage);
        };
    }, [myRole, roomCode, isMuted, playerName]);

    const createGridSocket = (code: string) => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        const sock = io(API_URL, {
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });
        sock.emit("join_room", code);
        socketRef.current = sock;
        return sock;
    };

    const startLocal = () => {
        if (!playerName.trim()) { toast.error("Introdu un nume pentru a juca."); return; }
        setMode('local');
        setMatchScore({ X: 0, O: 0 });
        setSeriesWinner(null);
        generateValidGrid();
    };

    const createOnlineRoom = () => {
        if (!playerName.trim()) { toast.error("Introdu un nume pentru a juca."); return; }
        const code = Math.random().toString(36).substring(2, 7).toUpperCase();
        setRoomCode(code);
        setMyRole('X');
        setMatchScore({ X: 0, O: 0 });
        setSeriesWinner(null);
        setMode('online_setup');

        createGridSocket(code);
        generateValidGrid();
    };

    const joinOnlineRoom = () => {
        if (joinInput.trim().length < 5) { toast.error("Cod invalid."); return; }
        const code = joinInput.trim().toUpperCase();
        setRoomCode(code);
        setMyRole('O');
        setMatchScore({ X: 0, O: 0 });
        setSeriesWinner(null);
        setMode('online_setup');

        const sock = createGridSocket(code);
        sock.emit("send_message", { room: code, message: JSON.stringify({ action: 'JOINED', name: playerName || 'Jucător Oaspete' }) });
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
                    toast("Ambii jucători au renunțat! Se generează altă grilă...");
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
            toast.error("Eroare la generarea grilei.");
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
        for (const line of lines) {
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
            toast.success(`Câștigător rundă: ${winMark}`);
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
            toast('Egalitate!');
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
        if (mode === 'online_playing' && turn !== myRole) { toast.error("Nu e rândul tău."); return; }

        const { r, c } = activeCell;
        const rowCriteria = gridRows[r];
        const colCriteria = gridCols[c];

        const matchRow = checkMatch(player, rowCriteria);
        const matchCol = checkMatch(player, colCriteria);

        const alreadyUsed = Object.values(answers).some(ans => ans?.player._id === player._id);

        if (alreadyUsed) { toast.error("Jucător deja folosit."); return; }

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
            toast.error("Răspuns greșit! Ai pierdut rândul.");
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
        <div className="bg-slate-50 dark:bg-[#0B0F14] rounded-lg p-1.5 sm:p-2.5 flex flex-col items-center justify-center text-center border border-slate-200 dark:border-white/[0.07] h-full w-full">
            {item.type === 'nationality' ? (
                <span className="text-xl sm:text-3xl mb-1 leading-none">{item.image}</span>
            ) : item.image ? (
                <img src={item.image} alt={item.value} className="w-6 h-6 sm:w-9 sm:h-9 object-contain mb-1" />
            ) : (
                <Globe className="w-5 h-5 sm:w-7 sm:h-7 text-slate-400 mb-1" />
            )}
            <span className="text-[9px] sm:text-xs font-medium text-slate-900 dark:text-slate-100 leading-tight line-clamp-2 w-full px-0.5" title={item.value}>
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
            <div className="max-w-lg mx-auto bg-white dark:bg-[#11161D] rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-white/[0.07] mt-4 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/[0.07] pb-3.5">
                    <button onClick={onBack} className="text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 font-medium text-xs cursor-pointer">
                        <ChevronLeft className="w-4 h-4" /> Înapoi
                    </button>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Grila X & 0</h2>
                    <div className="w-12" />
                </div>

                <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Numele tău în joc</label>
                    <input
                        type="text"
                        value={playerName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlayerName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0B0F14] border border-slate-200 dark:border-white/[0.08] px-3 py-2.5 rounded-lg text-slate-900 dark:text-white text-sm outline-none focus:border-emerald-500"
                        placeholder="Introdu numele..."
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        onClick={startLocal}
                        className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.07] hover:border-emerald-500/50 bg-slate-50 dark:bg-[#0B0F14] flex flex-col items-center gap-2 transition-colors cursor-pointer"
                    >
                        <Users className="w-6 h-6 text-emerald-500" />
                        <div className="text-center">
                            <div className="font-semibold text-sm text-slate-900 dark:text-white">Ecran comun</div>
                            <div className="text-xs text-slate-500">Doi jucători local</div>
                        </div>
                    </button>
                    <button
                        onClick={() => {
                            if (!playerName.trim()) { toast.error("Introdu un nume pentru a juca online."); return; }
                            setMode('online_menu');
                        }}
                        className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.07] hover:border-blue-500/50 bg-slate-50 dark:bg-[#0B0F14] flex flex-col items-center gap-2 transition-colors cursor-pointer"
                    >
                        <Globe className="w-6 h-6 text-blue-500" />
                        <div className="text-center">
                            <div className="font-semibold text-sm text-slate-900 dark:text-white">Online vs Prieten</div>
                            <div className="text-xs text-slate-500">Creează sau intră cu cod</div>
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'online_menu') {
        return (
            <div className="max-w-md mx-auto bg-white dark:bg-[#11161D] rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-white/[0.07] mt-4 space-y-5">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/[0.07] pb-3.5">
                    <button onClick={() => setMode('menu')} className="text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 font-medium text-xs cursor-pointer">
                        <ChevronLeft className="w-4 h-4" /> Înapoi
                    </button>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Multiplayer</h2>
                    <div className="w-12" />
                </div>

                <button
                    onClick={createOnlineRoom}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                    <Share2 className="w-4 h-4" /> Creează cameră nouă
                </button>

                <div className="flex items-center gap-3">
                    <div className="h-px bg-slate-200 dark:bg-white/[0.07] flex-1" />
                    <span className="text-slate-400 text-xs">sau</span>
                    <div className="h-px bg-slate-200 dark:bg-white/[0.07] flex-1" />
                </div>

                <div className="space-y-2.5">
                    <input
                        type="text"
                        placeholder="Cod cameră (ex: A7B9K)"
                        value={joinInput}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJoinInput(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0B0F14] border border-slate-200 dark:border-white/[0.08] px-3 py-2.5 rounded-lg text-center text-slate-900 dark:text-white font-semibold uppercase tracking-widest outline-none focus:border-emerald-500 text-sm"
                    />
                    <button
                        onClick={joinOnlineRoom}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-colors cursor-pointer"
                    >
                        Conectează-te
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'online_setup') {
        return (
            <div className="relative max-w-md mx-auto bg-white dark:bg-[#11161D] rounded-xl p-6 border border-slate-200 dark:border-white/[0.07] text-center mt-4 space-y-5">
                <button
                    onClick={() => {
                        if (socketRef.current) socketRef.current.disconnect();
                        setMode('online_menu');
                    }}
                    className="absolute top-3.5 left-3.5 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-lg cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mt-2" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Așteptăm adversarul...</h3>

                {myRole === 'X' && (
                    <div className="bg-slate-50 dark:bg-[#0B0F14] p-5 rounded-xl border border-slate-200 dark:border-white/[0.07] space-y-3">
                        <p className="text-slate-500 text-xs">Trimite acest cod prietenului tău:</p>
                        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-[0.2em] tabular-nums">{roomCode}</div>
                        <button
                            onClick={() => { navigator.clipboard.writeText(roomCode); toast.success("Cod copiat!"); }}
                            className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium text-xs cursor-pointer"
                        >
                            <Copy className="w-3.5 h-3.5" /> Copiază codul
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            {seriesWinner && (
                <div className="fixed inset-0 z-[200000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#11161D] border border-slate-200 dark:border-white/[0.08] rounded-xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
                        <Crown className="w-10 h-10 text-amber-500 mx-auto" />
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Câștigător serie!</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                A câștigat jucătorul <span className="font-semibold text-emerald-500">{seriesWinner}</span>
                            </p>
                        </div>
                        <button onClick={quitGame} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-medium text-sm cursor-pointer">
                            Înapoi la meniu
                        </button>
                    </div>
                </div>
            )}

            {/* Bara Scor & Status */}
            <div className="bg-white dark:bg-[#11161D] p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-white/[0.07] space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <button onClick={quitGame} className="text-slate-500 hover:text-rose-500 flex items-center gap-1 font-medium text-xs cursor-pointer">
                        <X className="w-4 h-4" /> Ieșire
                    </button>

                    <div className="flex items-center gap-3 text-sm font-semibold bg-slate-100 dark:bg-white/[0.05] px-3 py-1 rounded-lg tabular-nums">
                        <span className={myRole === 'X' || mode === 'local' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>X: {matchScore.X}</span>
                        <span className="text-slate-400">–</span>
                        <span className={myRole === 'O' || mode === 'local' ? 'text-blue-500' : 'text-slate-400'}>O: {matchScore.O}</span>
                    </div>

                    {winner ? (
                        (mode === 'local' || (mode === 'online_playing' && myRole === 'X')) ? (
                            <button onClick={() => generateValidGrid(true)} className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium text-xs cursor-pointer">
                                <RotateCcw className="w-3.5 h-3.5" /> Următoarea
                            </button>
                        ) : (
                            <span className="text-xs text-slate-500">Așteaptă host...</span>
                        )
                    ) : (
                        <button
                            onClick={handleSkipVote}
                            disabled={mode === 'online_playing' && myRole ? skipVotes[myRole] : false}
                            className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 cursor-pointer"
                        >
                            {mode === 'local' ? 'Schimbă grila' : `Skip (${(skipVotes.X ? 1 : 0) + (skipVotes.O ? 1 : 0)}/2)`}
                        </button>
                    )}
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-slate-200 dark:border-white/[0.07] text-xs">
                    {winner ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {winner === 'Draw' ? 'Egalitate!' : `Runda câștigată de ${winner}`}
                        </span>
                    ) : (
                        <span className="text-slate-600 dark:text-slate-300">
                            Rândul lui: <strong className={turn === 'X' ? 'text-emerald-500' : 'text-blue-500'}>{turn}</strong>
                        </span>
                    )}
                    {!winner && (
                        <span className={`inline-flex items-center gap-1 font-semibold tabular-nums px-2 py-0.5 rounded ${
                            timeLeft <= 10 ? 'bg-rose-500/15 text-rose-500' : 'bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-200'
                        }`}>
                            <Timer className="w-3.5 h-3.5" /> 00:{timeLeft.toString().padStart(2, '0')}
                        </span>
                    )}
                </div>
            </div>

            {/* Grila 3x3 */}
            {gridRows.length > 0 && (
                <div className="p-3 sm:p-5 bg-white dark:bg-[#11161D] rounded-xl border border-slate-200 dark:border-white/[0.07] relative overflow-hidden">
                    {!isMyTurn && !winner && (
                        <div className="absolute inset-0 z-50 bg-transparent cursor-not-allowed" onClick={() => toast.error("Nu este rândul tău.")} />
                    )}

                    <div className="grid grid-cols-4 gap-2 sm:gap-3">
                        <div className="flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-slate-300 dark:text-slate-700" />
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
                                                    if (mode === 'online_playing') toast.error("Așteaptă rândul tău.");
                                                    return;
                                                }
                                                if (!ans) setActiveCell({ r: rIdx, c: cIdx });
                                            }}
                                            className={`aspect-square rounded-lg border flex flex-col items-center justify-center transition-colors p-1.5 ${
                                                ans
                                                    ? ans.markedBy === 'X'
                                                        ? 'bg-emerald-500/10 border-emerald-500/35'
                                                        : 'bg-blue-500/10 border-blue-500/35'
                                                    : 'bg-slate-50 dark:bg-[#0B0F14] border-dashed border-slate-300 dark:border-white/[0.12] hover:border-emerald-500/50'
                                            } ${winner || (!isMyTurn && !ans) ? 'cursor-not-allowed' : 'cursor-pointer'} ${winner && !ans ? 'opacity-40' : ''}`}
                                        >
                                            {ans ? (
                                                <div className="flex flex-col items-center justify-center text-center space-y-1">
                                                    <span className={`text-lg sm:text-2xl font-bold leading-none ${ans.markedBy === 'X' ? 'text-emerald-500' : 'text-blue-500'}`}>
                                                        {ans.markedBy}
                                                    </span>
                                                    <span className="text-[9px] sm:text-[11px] font-medium text-slate-900 dark:text-slate-100 leading-tight line-clamp-2">
                                                        {ans.player.name}
                                                    </span>
                                                </div>
                                            ) : (
                                                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 dark:text-slate-600" />
                                            )}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal căutare jucător */}
            {activeCell && !winner && isMyTurn && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
                    <div className="bg-white dark:bg-[#11161D] w-full max-w-md rounded-xl border border-slate-200 dark:border-white/[0.08] shadow-2xl flex flex-col overflow-hidden max-h-[85dvh]">
                        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-white/[0.07] flex justify-between items-center shrink-0">
                            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                                Răspunde pentru <span className={turn === 'X' ? 'text-emerald-500' : 'text-blue-500'}>{turn}</span>
                            </h3>
                            <button
                                onClick={() => { setActiveCell(null); setSearchTerm(""); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 space-y-3 flex-1 overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-[#0B0F14] px-3 py-2 rounded-lg border border-slate-200 dark:border-white/[0.07] shrink-0">
                                <span className="text-slate-600 dark:text-slate-300 font-medium truncate">
                                    {gridRows[activeCell.r].value} + {gridCols[activeCell.c].value}
                                </span>
                                <span className={`font-semibold tabular-nums ml-2 ${timeLeft <= 10 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {timeLeft}s
                                </span>
                            </div>

                            <input
                                type="text"
                                autoFocus
                                placeholder="Caută jucător (ex: Mbappe)..."
                                className="w-full bg-slate-50 dark:bg-[#0B0F14] border border-slate-200 dark:border-white/[0.08] px-3 py-2.5 rounded-lg text-slate-900 dark:text-white text-sm outline-none focus:border-emerald-500 shrink-0"
                                value={searchTerm}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                            />

                            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                                {searchResults.map((p: Player) => (
                                    <button
                                        key={p._id}
                                        onClick={() => handleSelectPlayer(p)}
                                        className="w-full text-left px-3 py-2.5 rounded-lg border border-slate-200 dark:border-white/[0.07] hover:border-emerald-500/50 bg-slate-50 dark:bg-[#0B0F14] hover:bg-emerald-500/10 text-slate-900 dark:text-slate-100 font-medium text-sm transition-colors cursor-pointer"
                                    >
                                        {p.name}
                                    </button>
                                ))}
                                {searchTerm.length > 1 && searchResults.length === 0 && (
                                    <div className="text-center py-6 text-slate-500 text-xs">Niciun jucător găsit.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// GAME 2: HI-LO (MAI MARE SAU MAI MICĂ)
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
    const [leaderboard, setLeaderboard] = useState<{ name: string, score: number, date: string }[]>([]);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch(`${API_URL}/api/sport/leaderboard`);
                if (res.ok) {
                    setLeaderboard(await res.json());
                }
            } catch {}
        };
        fetchLeaderboard();
    }, [gameState]);

    const saveScore = async (finalScore: number) => {
        if (finalScore === 0) return;
        try {
            const finalName = playerName.trim() || 'Jucător Anonim';
            await fetch(`${API_URL}/api/sport/leaderboard`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ name: finalName, score: finalScore })
            });
        } catch {}
    };

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

    const validPool = useMemo(() => {
        return players.filter((p: Player) => getStatValue(p, category) > 0 && p.league_id && TOP_5_LEAGUES.includes(Number(p.league_id)));
    }, [players, category]);

    const getStatFormat = (val: number, cat: string) => {
        if (cat === 'age') return `${val} ani`;
        if (cat === 'height') return `${val} cm`;
        if (cat === 'rating') return `${val.toFixed(2)}`;
        if (cat === 'market_value') return `${(val / 1000000).toFixed(1)} mil. €`;
        return val;
    };

    const startGame = () => {
        const finalName = playerName.trim();
        if (finalName.length < 2) {
            toast.error("Introdu un nume de minim 2 caractere.");
            return;
        }

        if (finalName.toLowerCase() !== sessionName.toLowerCase()) {
            const nameExists = leaderboard.some(entry => entry.name.toLowerCase() === finalName.toLowerCase());
            if (nameExists) {
                toast.error("Numele există deja în clasament. Alege altul.");
                return;
            }
        }

        setSessionName(finalName);

        if (validPool.length < 10) { toast.error("Nu sunt suficienți jucători pentru această categorie."); return; }
        const shuffled = shuffleArray(validPool);
        setPlayerA(shuffled[0]); setPlayerB(shuffled[1]); setScore(0); setLives(3); setRevealResult(null); setGameState('playing');
    };

    const pickNextOpponent = (currentB: Player) => {
        const shuffled = shuffleArray(validPool);
        return shuffled.find((p: Player) => p._id !== currentB._id && getStatValue(p, category) !== getStatValue(currentB, category)) || shuffled[0];
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
                setPlayerB(pickNextOpponent(playerB));
                setRevealResult(null);
            } else {
                if (lives > 1) {
                    setLives(prev => prev - 1);
                    toast.error("Răspuns greșit! Ai pierdut o viață.");
                    setPlayerA(playerB);
                    setPlayerB(pickNextOpponent(playerB));
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
        const text = `România Scout - Hi-Lo\nJucător: ${playerName.trim()}\nCategorie: ${category.replace('_', ' ')}\nScor final: ${score}`;
        navigator.clipboard.writeText(text);
        toast.success("Scorul a fost copiat în clipboard.");
    };

    if (gameState === 'setup') {
        if (showLeaderboard) {
            return (
                <div className="max-w-xl mx-auto bg-white dark:bg-[#11161D] rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-white/[0.07] mt-4 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/[0.07] pb-3.5">
                        <button onClick={() => setShowLeaderboard(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 font-medium text-xs cursor-pointer">
                            <ChevronLeft className="w-4 h-4" /> Înapoi
                        </button>
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Trophy className="w-4 h-4 text-amber-500" /> Top Hi-Lo
                        </h2>
                        <div className="w-12" />
                    </div>
                    <LeaderboardTable data={leaderboard} currentUserName={playerName.trim()} />
                </div>
            );
        }

        return (
            <div className="max-w-lg mx-auto bg-white dark:bg-[#11161D] rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-white/[0.07] mt-4 space-y-5">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/[0.07] pb-3.5">
                    <button onClick={onBack} className="text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 font-medium text-xs cursor-pointer">
                        <ChevronLeft className="w-4 h-4" /> Înapoi
                    </button>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Hi-Lo: Statistici</h2>
                    <button onClick={() => setShowLeaderboard(true)} className="text-amber-500 hover:text-amber-400 flex items-center gap-1 font-medium text-xs cursor-pointer">
                        <ListOrdered className="w-3.5 h-3.5" /> Top 50
                    </button>
                </div>

                <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Nume jucător (clasament)</label>
                    <input
                        type="text"
                        value={playerName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlayerName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0B0F14] border border-slate-200 dark:border-white/[0.08] px-3 py-2.5 rounded-lg text-slate-900 dark:text-white text-sm outline-none focus:border-emerald-500"
                        placeholder="Alege un nume..."
                    />
                </div>

                <div className="space-y-2.5">
                    <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">Criteriu de comparație</span>
                    <div className="grid grid-cols-2 gap-2.5">
                        {[
                            { id: 'market_value', label: 'Cotă de piață' },
                            { id: 'rating', label: 'Rating' },
                            { id: 'age', label: 'Vârstă' },
                            { id: 'height', label: 'Înălțime' },
                        ].map(c => (
                            <button
                                key={c.id}
                                onClick={() => setCategory(c.id as any)}
                                className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                                    category === c.id
                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                        : 'bg-slate-50 dark:bg-[#0B0F14] border-slate-200 dark:border-white/[0.07] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/[0.15]'
                                }`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={startGame}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-colors cursor-pointer"
                >
                    Începe jocul (3 vieți)
                </button>
            </div>
        );
    }

    if (gameState === 'gameover') {
        return (
            <div className="max-w-md mx-auto bg-white dark:bg-[#11161D] rounded-xl p-6 border border-slate-200 dark:border-white/[0.07] text-center space-y-5 mt-6">
                <div className="w-11 h-11 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Joc încheiat</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Nu mai ai vieți rămase.</p>
                </div>

                <div className="bg-slate-50 dark:bg-[#0B0F14] rounded-xl p-4 border border-slate-200 dark:border-white/[0.07]">
                    <p className="text-xs text-slate-500 mb-1">Scor final</p>
                    <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{score}</p>
                </div>

                <button
                    onClick={shareScore}
                    className="w-full bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-900 dark:text-white py-2.5 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                    <Share className="w-3.5 h-3.5" /> Copiază rezultatul
                </button>

                <div className="flex gap-2.5">
                    <button onClick={startGame} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-medium text-xs transition-colors cursor-pointer">
                        Joacă din nou
                    </button>
                    <button onClick={() => setGameState('setup')} className="flex-1 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 py-2.5 rounded-lg font-medium text-xs transition-colors cursor-pointer">
                        Meniu
                    </button>
                </div>
            </div>
        );
    }

    const valA = playerA ? getStatValue(playerA, category) : 0;
    const catLabel = { 'age': 'Vârstă', 'height': 'Înălțime', 'market_value': 'Cotă de piață', 'rating': 'Rating' }[category];

    return (
        <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between bg-white dark:bg-[#11161D] px-4 py-3 rounded-xl border border-slate-200 dark:border-white/[0.07]">
                <button
                    onClick={() => { saveScore(score); setGameState('setup'); }}
                    className="text-slate-500 hover:text-rose-500 flex items-center gap-1 font-medium text-xs cursor-pointer"
                >
                    <X className="w-4 h-4" /> Renunță
                </button>

                <div className="flex items-center gap-1.5">
                    {[1, 2, 3].map((i: number) => (
                        <Heart
                            key={i}
                            className={`w-4 h-4 transition-colors ${lives >= i ? 'fill-rose-500 text-rose-500' : 'text-slate-300 dark:text-slate-700'}`}
                        />
                    ))}
                </div>

                <div className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md tabular-nums">
                    Scor: {score}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                {/* Jucător A */}
                <div className="bg-white dark:bg-[#11161D] rounded-xl border border-slate-200 dark:border-white/[0.07] flex flex-col items-center justify-center p-6 sm:p-8 text-center">
                    <img
                        src={playerA?.image || GENERIC_USER_IMAGE}
                        alt={playerA?.name}
                        className="w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover border border-slate-200 dark:border-white/[0.1] mb-4 bg-white"
                    />
                    <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white line-clamp-1">{playerA?.name}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 line-clamp-1">{playerA?.team_name || playerA?.team}</p>
                    <span className="text-[11px] font-medium text-slate-500 mb-1.5">{catLabel}</span>
                    <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-white/[0.05] px-4 py-2 rounded-lg tabular-nums">
                        {getStatFormat(valA, category)}
                    </div>
                </div>

                {/* Jucător B */}
                <div className={`rounded-xl border flex flex-col items-center justify-center p-6 sm:p-8 text-center transition-colors ${
                    revealResult === 'correct'
                        ? 'bg-emerald-500/10 border-emerald-500/40'
                        : revealResult === 'wrong'
                        ? 'bg-rose-500/10 border-rose-500/40'
                        : 'bg-white dark:bg-[#11161D] border-slate-200 dark:border-white/[0.07]'
                }`}>
                    <img
                        src={playerB?.image || GENERIC_USER_IMAGE}
                        alt={playerB?.name}
                        className="w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover border border-slate-200 dark:border-white/[0.1] mb-4 bg-white"
                    />
                    <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white line-clamp-1">{playerB?.name}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 line-clamp-1">{playerB?.team_name || playerB?.team}</p>
                    <span className="text-[11px] font-medium text-slate-500 mb-2">{catLabel}</span>

                    {revealResult ? (
                        <div className={`text-2xl sm:text-3xl font-bold px-4 py-2 rounded-lg tabular-nums ${
                            revealResult === 'correct' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'
                        }`}>
                            {playerB && getStatFormat(getStatValue(playerB, category), category)}
                        </div>
                    ) : (
                        <div className="flex gap-2.5 w-full max-w-[260px]">
                            <button
                                onClick={() => handleGuess('higher')}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-3 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <ArrowUp className="w-4 h-4" /> Mai mare
                            </button>
                            <button
                                onClick={() => handleGuess('lower')}
                                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 px-3 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <ArrowDown className="w-4 h-4" /> Mai mică
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}