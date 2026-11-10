import React, { useState, useEffect, useRef } from 'react';
import { Trophy, ArrowUp, ArrowDown, Search, X, AlertTriangle, RotateCcw, Swords, Play, Activity, Globe, Users, Share2, Copy, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';

// --- INTERFEȚE ---
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

const API_URL = (import.meta as any).env.VITE_API_URL || 'https://football-backend-m2a4.onrender.com';
const GENERIC_USER_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

// Amestecare perfectă Fisher-Yates
function shuffleArray<T>(array: T[]): T[] {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

// Eliminare diacritice
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
    const [activeGame, setActiveGame] = useState<'menu' | 'grid' | 'hilo'>('menu');
    const [allPlayers, setAllPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

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
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h3 className="text-xl font-black tracking-widest text-slate-400 uppercase">Se pregătesc jocurile...</h3>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-8 px-2 sm:px-4 min-h-[80vh] relative z-0 animate-in fade-in duration-500 pb-20">
            {activeGame === 'menu' && (
                <div className="space-y-8">
                    <div className="text-center space-y-4 mb-12">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-500 font-black text-[10px] uppercase tracking-widest">
                            <Trophy className="w-4 h-4" /> Zona de Divertisment
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-slate-900 dark:text-white drop-shadow-sm">
                            Games <span className="text-blue-500">Hub</span>
                        </h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm max-w-lg mx-auto">
                            Testează-ți cunoștințele fotbalistice folosind baza de date oficială a platformei.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        <div 
                            onClick={() => setActiveGame('grid')}
                            className="bg-slate-900 rounded-3xl p-8 border-4 border-slate-800 hover:border-emerald-500 cursor-pointer transition-all hover:-translate-y-2 group relative overflow-hidden shadow-xl"
                        >
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/40 transition-colors"></div>
                            <Activity className="w-12 h-12 text-emerald-400 mb-6" />
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Grila (X și 0)</h3>
                            <p className="text-slate-400 font-bold text-sm mb-6 line-clamp-2">Joacă local sau online vs prieteni (Best of 5). Găsește jucătorul perfect care să bifeze intersecția.</p>
                            <button className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs group-hover:bg-emerald-500 transition-colors">
                                <Play className="w-4 h-4 fill-current" /> Joacă Acum
                            </button>
                        </div>

                        <div 
                            onClick={() => setActiveGame('hilo')}
                            className="bg-slate-900 rounded-3xl p-8 border-4 border-slate-800 hover:border-blue-500 cursor-pointer transition-all hover:-translate-y-2 group relative overflow-hidden shadow-xl"
                        >
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/40 transition-colors"></div>
                            <Swords className="w-12 h-12 text-blue-400 mb-6" />
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Hi-Lo: Cotă & Tactică</h3>
                            <p className="text-slate-400 font-bold text-sm mb-6 line-clamp-2">Mai mare sau mai mică? Alege o categorie și ghicește care jucător stă mai bine în statistici.</p>
                            <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs group-hover:bg-blue-500 transition-colors">
                                <Play className="w-4 h-4 fill-current" /> Joacă Acum
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeGame === 'grid' && <GridGame players={allPlayers} onBack={() => setActiveGame('menu')} />}
            {activeGame === 'hilo' && <HiLoGame players={allPlayers} onBack={() => setActiveGame('menu')} />}
        </div>
    );
}

// ============================================================================
// GAME 1: GRILA TRANSFERURILOR (X ȘI 0 - MULTIPLAYER & LOCAL)
// ============================================================================
type GridMode = 'menu' | 'local' | 'online_menu' | 'online_setup' | 'online_playing';

function GridGame({ players, onBack }: { players: Player[], onBack: () => void }) {
    const [mode, setMode] = useState<GridMode>('menu');
    
    // Grid & Joc
    const [gridRows, setGridRows] = useState<GridCriteria[]>([]);
    const [gridCols, setGridCols] = useState<GridCriteria[]>([]);
    const [answers, setAnswers] = useState<Record<string, AnswerDetails>>({});
    const [turn, setTurn] = useState<'X' | 'O'>('X');
    const [winner, setWinner] = useState<'X' | 'O' | 'Draw' | null>(null);
    const [activeCell, setActiveCell] = useState<{ r: number, c: number } | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Multiplayer Online (Best of 5)
    const [roomCode, setRoomCode] = useState("");
    const [joinInput, setJoinInput] = useState("");
    const [myRole, setMyRole] = useState<'X' | 'O' | null>(null);
    const [matchScore, setMatchScore] = useState({ X: 0, O: 0 });
    const [seriesWinner, setSeriesWinner] = useState<'X' | 'O' | null>(null);
    const socketRef = useRef<Socket | null>(null);
    
    // Refs pentru a avea mereu acces la ultima stare în socket listener
    const gridRowsRef = useRef(gridRows);
    const gridColsRef = useRef(gridCols);
    useEffect(() => { gridRowsRef.current = gridRows; gridColsRef.current = gridCols; }, [gridRows, gridCols]);

    const TOP_5_LEAGUES = [39, 140, 135, 78, 61]; 

    // === FUNCȚIA DE VERIFICARE ===
    const checkMatch = (p: Player, criteria: GridCriteria) => {
        const val = removeDiacritics(criteria.value.toLowerCase().trim());
        if (criteria.type === 'team') {
            const currentTeam = removeDiacritics((p.team_name || p.team || "").toLowerCase().trim());
            const pastTeams = (p.past_teams || []).map(t => removeDiacritics(t.toLowerCase().trim()));
            return currentTeam.includes(val) || val.includes(currentTeam) || pastTeams.some(t => t.includes(val) || val.includes(t));
        }
        if (criteria.type === 'nationality') return removeDiacritics((p.nationality || "").toLowerCase().trim()) === val;
        if (criteria.type === 'league') return removeDiacritics((p.league_name || "").toLowerCase().trim()) === val;
        return false;
    };

    // ---- SETUP SOCKET & ONLINE SYNC ----
    useEffect(() => {
        if (!socketRef.current) return;
        const socket = socketRef.current;

        const handleSocketMessage = (data: any) => {
            try {
                const payload = JSON.parse(data.message);
                
                if (payload.action === 'JOINED' && myRole === 'X') {
                    // Când un O s-a conectat, trimitem Grila Curentă către el
                    socket.emit("send_message", {
                        room: roomCode,
                        message: JSON.stringify({ action: 'SYNC_GRID', gridRows: gridRowsRef.current, gridCols: gridColsRef.current })
                    });
                    setMode('online_playing');
                    toast.success("Adversarul s-a conectat! Începe meciul.", { icon: '🎮' });
                } 
                else if (payload.action === 'SYNC_GRID') {
                    setGridRows(payload.gridRows);
                    setGridCols(payload.gridCols);
                    setAnswers({});
                    setTurn('X');
                    setWinner(null);
                    setMode('online_playing');
                    if (myRole === 'O') toast.success("Conectat cu succes!", { icon: '✅' });
                } 
                else if (payload.action === 'MOVE') {
                    // Aplicăm mutarea doar dacă a fost făcută de adversar
                    if (payload.markedBy !== myRole) {
                        applyMove(payload.r, payload.c, payload.player, payload.markedBy);
                    }
                } 
                else if (payload.action === 'NEXT_MATCH') {
                    setGridRows(payload.gridRows);
                    setGridCols(payload.gridCols);
                    setAnswers({});
                    setTurn('X');
                    setWinner(null);
                    toast("Host-ul a pornit meciul următor!", { icon: '🔥' });
                }
            } catch (err) {}
        };

        socket.on("receive_message", handleSocketMessage);
        return () => { socket.off("receive_message", handleSocketMessage); };
    }, [myRole, roomCode]);

    const startLocal = () => {
        setMode('local');
        setMatchScore({ X: 0, O: 0 });
        setSeriesWinner(null);
        generateValidGrid();
    };

    const createOnlineRoom = () => {
        const code = Math.random().toString(36).substring(2, 7).toUpperCase();
        setRoomCode(code);
        setMyRole('X');
        setMatchScore({ X: 0, O: 0 });
        setSeriesWinner(null);
        setMode('online_setup');
        
        socketRef.current = io(API_URL);
        socketRef.current.emit("join_room", code);
        generateValidGrid(); // Hostul generează prima grilă în fundal
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
        // Anunțăm Host-ul că am intrat
        socketRef.current.emit("send_message", { room: code, message: JSON.stringify({ action: 'JOINED' }) });
    };

    const quitGame = () => {
        if (socketRef.current) socketRef.current.disconnect();
        onBack();
    };

    // ---- LOGICĂ MECI ----
    const generateValidGrid = (isNextMatch = false) => {
        const tagToPlayers = new Map<string, Set<string>>(); 
        const tagToMeta = new Map<string, GridCriteria>();
        const knownTeamLogos = new Map<string, string>();
        const top5Teams = new Set<string>();

        players.forEach(p => {
            const tName = p.team_name?.toLowerCase().trim();
            const t = p.team?.toLowerCase().trim();
            if (p.league_id && TOP_5_LEAGUES.includes(Number(p.league_id))) {
                if (tName) top5Teams.add(tName);
                if (t) top5Teams.add(t);
            }
            if (tName && p.team_logo) knownTeamLogos.set(tName, p.team_logo);
            if (t && p.team_logo) knownTeamLogos.set(t, p.team_logo);
        });

        players.forEach(p => {
            const tags: GridCriteria[] = [];
            const currentTeam = (p.team_name || p.team)?.toLowerCase().trim();
            if (currentTeam && top5Teams.has(currentTeam)) {
                tags.push({ type: 'team', value: p.team_name || p.team || "", image: p.team_logo || knownTeamLogos.get(currentTeam) || "" });
            }
            if (Array.isArray(p.past_teams)) {
                p.past_teams.forEach(pt => {
                    const pastT = pt.toLowerCase().trim();
                    if (top5Teams.has(pastT)) tags.push({ type: 'team', value: pt, image: knownTeamLogos.get(pastT) || "" });
                });
            }
            if (p.nationality) {
                tags.push({ type: 'nationality', value: p.nationality, image: getFlagEmoji(p.nationality) });
            }

            tags.forEach(t => {
                if (!t.value) return;
                const tagId = `${t.type}:${t.value.trim().toLowerCase()}`;
                if (!tagToPlayers.has(tagId)) {
                    tagToPlayers.set(tagId, new Set());
                    tagToMeta.set(tagId, t);
                }
                tagToPlayers.get(tagId)!.add(p._id);
            });
        });

        const validTagIds = Array.from(tagToPlayers.keys()).filter(tId => tagToPlayers.get(tId)!.size >= 3);
        let foundValidGrid = false;
        let attempts = 0;
        let validRows: GridCriteria[] = [];
        let validCols: GridCriteria[] = [];

        while (!foundValidGrid && attempts < 15000) {
            attempts++;
            const shuffledTags = shuffleArray(validTagIds);
            const candidateRows = shuffledTags.slice(0, 3);
            
            const candidateCols = shuffledTags.filter(colTag => {
                if (candidateRows.includes(colTag)) return false;
                const colSet = tagToPlayers.get(colTag)!;
                const colType = colTag.split(':')[0];

                return candidateRows.every(rowTag => {
                    const rowType = rowTag.split(':')[0];
                    if (rowType === colType && rowType !== 'team') return false; 
                    const rowSet = tagToPlayers.get(rowTag)!;
                    for (const playerId of rowSet) {
                        if (colSet.has(playerId)) return true;
                    }
                    return false;
                });
            });

            if (candidateCols.length >= 3) {
                validRows = candidateRows.map(id => tagToMeta.get(id)!);
                validCols = shuffleArray(candidateCols).slice(0, 3).map(id => tagToMeta.get(id)!);
                foundValidGrid = true;
            }
        }

        if (foundValidGrid) {
            setGridRows(validRows);
            setGridCols(validCols);
            setAnswers({});
            setTurn('X');
            setWinner(null);
            
            if (isNextMatch && mode.includes('online') && socketRef.current && myRole === 'X') {
                socketRef.current.emit("send_message", {
                    room: roomCode,
                    message: JSON.stringify({ action: 'NEXT_MATCH', gridRows: validRows, gridCols: validCols })
                });
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
            toast.success(`Câștigător runda: ${winMark === 'X' ? '❌' : '⚽'} !`, { icon: '🏆' });
            setMatchScore(prev => {
                const newScore = { ...prev, [winMark!]: prev[winMark!] + 1 };
                if (newScore[winMark!] >= 3) setSeriesWinner(winMark);
                return newScore;
            });
        } else if (Object.keys(currentAnswers).length === 9) {
            setWinner('Draw');
            toast('Egalitate!', { icon: '🤝' });
        }
    };

    const applyMove = (r: number, c: number, player: Player, markedBy: 'X' | 'O') => {
        setAnswers(prev => {
            const newAnswers = { ...prev, [`${r}-${c}`]: { player, markedBy } };
            checkWinCondition(newAnswers);
            return newAnswers;
        });
        setTurn(prev => prev === 'X' ? 'O' : 'X');
    };

    const handleSelectPlayer = (player: Player) => {
        if (!activeCell || winner) return;
        
        // Blocare mutări dacă e rândul celuilalt (Online)
        if (mode === 'online_playing' && turn !== myRole) {
            toast.error(`Nu e rândul tău! Așteaptă mutarea lui ${turn === 'X' ? '❌' : '⚽'}`);
            return;
        }

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
            toast.error("Răspuns Greșit!");
        }
    };

    // ---- RENDER MENIURI ----
    if (mode === 'menu') {
        return (
            <div className="max-w-2xl mx-auto bg-slate-900 rounded-3xl p-8 border-4 border-slate-800 shadow-2xl text-center mt-10">
                <div className="flex justify-between items-center border-b-2 border-slate-800 pb-4 mb-8">
                    <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-1 font-bold text-xs uppercase tracking-widest"><X className="w-4 h-4"/> Înapoi</button>
                    <h2 className="text-xl font-black text-white uppercase tracking-widest">Grila X & 0</h2>
                    <div className="w-16"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={startLocal} className="p-8 rounded-2xl border-4 border-slate-800 hover:border-emerald-500 bg-slate-950 flex flex-col items-center gap-4 transition-all group">
                        <Users className="w-12 h-12 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                        <div>
                            <div className="font-black text-white uppercase tracking-widest mb-1">Ecran Comun</div>
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">Doi jucători, un singur telefon/PC</div>
                        </div>
                    </button>
                    <button onClick={() => setMode('online_menu')} className="p-8 rounded-2xl border-4 border-slate-800 hover:border-blue-500 bg-slate-950 flex flex-col items-center gap-4 transition-all group">
                        <Globe className="w-12 h-12 text-slate-400 group-hover:text-blue-400 transition-colors" />
                        <div>
                            <div className="font-black text-white uppercase tracking-widest mb-1">Online vs Prieten</div>
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">Creează Room, Dă-i Codul, Joacă Best of 5</div>
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'online_menu') {
        return (
            <div className="max-w-md mx-auto bg-slate-900 rounded-3xl p-8 border-4 border-slate-800 shadow-2xl text-center mt-10 space-y-6">
                 <div className="flex justify-between items-center border-b-2 border-slate-800 pb-4">
                    <button onClick={() => setMode('menu')} className="text-slate-400 hover:text-white flex items-center gap-1 font-bold text-xs uppercase tracking-widest"><X className="w-4 h-4"/> Înapoi</button>
                    <h2 className="text-xl font-black text-white uppercase tracking-widest">Multiplayer</h2>
                    <div className="w-16"></div>
                </div>

                <button onClick={createOnlineRoom} className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-2xl font-black uppercase tracking-widest transition-all border-b-4 border-blue-800 hover:border-b-2 hover:translate-y-[2px] flex items-center justify-center gap-2">
                    <Share2 className="w-5 h-5" /> Creează Cameră (Host)
                </button>

                <div className="flex items-center gap-4 py-4">
                    <div className="h-px bg-slate-800 flex-1"></div>
                    <span className="text-slate-500 font-black uppercase tracking-widest text-xs">SAU</span>
                    <div className="h-px bg-slate-800 flex-1"></div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border-2 border-slate-800 space-y-3">
                    <input 
                        type="text" 
                        placeholder="Ex: A7B9K" 
                        value={joinInput}
                        onChange={(e) => setJoinInput(e.target.value)}
                        className="w-full bg-slate-900 border-2 border-slate-700 p-3 rounded-xl text-center text-white font-black uppercase tracking-[0.3em] outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button onClick={joinOnlineRoom} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all border-b-4 border-emerald-800 hover:border-b-2 hover:translate-y-[2px]">
                        Conectează-te
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'online_setup') {
        return (
            <div className="max-w-md mx-auto bg-slate-900 rounded-3xl p-8 border-4 border-slate-800 shadow-2xl text-center mt-10 space-y-6">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Așteptăm jucătorul...</h3>
                
                {myRole === 'X' && (
                    <div className="bg-slate-950 p-6 rounded-2xl border-2 border-slate-800 space-y-4">
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Trimite acest cod prietenului tău:</p>
                        <div className="text-5xl font-black text-emerald-400 tracking-[0.2em]">{roomCode}</div>
                        <button onClick={() => { navigator.clipboard.writeText(roomCode); toast.success("Cod copiat!"); }} className="flex items-center justify-center gap-2 mx-auto text-slate-300 hover:text-white font-bold uppercase tracking-widest text-xs mt-2">
                            <Copy className="w-4 h-4" /> Copiază Codul
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // ---- RENDER GRILĂ & JOC ----
    const normalizedSearch = removeDiacritics(searchTerm.toLowerCase());
    const searchResults = searchTerm.trim().length > 1 
        ? players.filter(p => removeDiacritics(p.name.toLowerCase()).includes(normalizedSearch)).slice(0, 10)
        : [];

    const renderHeader = (item: GridCriteria) => (
        <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-2 flex flex-col items-center justify-center text-center shadow-inner border-2 border-slate-200 dark:border-slate-700 h-full w-full">
            {item.type === 'nationality' ? (
                <span className="text-3xl sm:text-4xl mb-1 drop-shadow-sm leading-none">{item.image}</span>
            ) : item.image ? (
                <img src={item.image} alt={item.value} className="w-8 h-8 sm:w-10 sm:h-10 object-contain mb-1 drop-shadow-md bg-white rounded-md p-0.5" />
            ) : (
                <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 mb-1" />
            )}
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1 mb-0.5">
                {item.type === 'nationality' ? 'Națiune' : item.type === 'team' ? 'Club' : 'Ligă'}
            </span>
            <span className="text-[10px] sm:text-xs font-black text-slate-900 dark:text-white uppercase leading-tight line-clamp-2 w-full truncate px-1" title={item.value}>
                {item.value}
            </span>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* SERIE CÂȘTIGATĂ OVERLAY */}
            {seriesWinner && (
                <div className="fixed inset-0 z-[200000] bg-slate-950/90 backdrop-blur-lg flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-500">
                    <Crown className="w-32 h-32 text-yellow-400 animate-bounce mb-6 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]" />
                    <h2 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter text-white mb-2 text-center">Seria Câștigată!</h2>
                    <p className="text-2xl text-slate-300 font-black uppercase tracking-widest mb-10">Câștigător Final: {seriesWinner === 'X' ? '❌' : '⚽'}</p>
                    
                    <button onClick={quitGame} className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-2xl border-b-4 border-blue-800">
                        Ieși din Joc
                    </button>
                </div>
            )}

            {/* SCOR MULTIPLAYER */}
            {(mode === 'online_playing' || mode === 'local') && (
                <div className="max-w-3xl mx-auto flex justify-between items-center bg-slate-900 p-4 rounded-2xl border-2 border-slate-800 shadow-xl">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">BEST OF 5</span>
                        <span className="text-white font-black uppercase text-sm tracking-widest">Scor General</span>
                    </div>
                    <div className="flex items-center gap-6 text-3xl font-black bg-slate-950 px-6 py-2 rounded-xl border border-slate-800">
                        <span className={`${myRole === 'X' || mode === 'local' ? 'text-white' : 'text-slate-600'} drop-shadow-md`}>❌ {matchScore.X}</span>
                        <span className="text-slate-700">-</span>
                        <span className={`${myRole === 'O' || mode === 'local' ? 'text-white' : 'text-slate-600'} drop-shadow-md`}>⚽ {matchScore.O}</span>
                    </div>
                </div>
            )}

            {/* HEADER MECI */}
            <div className="flex items-center justify-between bg-slate-900 p-4 rounded-3xl border-2 border-slate-800 shadow-xl">
                <button onClick={quitGame} className="text-slate-400 hover:text-rose-500 flex items-center gap-1 font-bold text-xs uppercase tracking-widest"><X className="w-4 h-4"/> Ieșire</button>
                
                <div className="flex flex-col items-center">
                    {winner ? (
                        <div className="text-emerald-400 font-black uppercase tracking-widest text-sm animate-pulse">
                            {winner === 'Draw' ? 'Egalitate!' : `Runda câștigată de: ${winner === 'X' ? '❌' : '⚽'}`}
                        </div>
                    ) : (
                        <div className="text-blue-400 font-black uppercase tracking-widest text-sm flex items-center gap-2">
                            Muta: <span className="text-2xl leading-none">{turn === 'X' ? '❌' : '⚽'}</span>
                            {mode === 'online_playing' && turn === myRole && <span className="text-xs text-white bg-blue-600 px-2 py-0.5 rounded-md ml-2">(Tu)</span>}
                        </div>
                    )}
                </div>

                {winner ? (
                    (mode === 'local' || (mode === 'online_playing' && myRole === 'X')) ? (
                        <button onClick={() => generateValidGrid(true)} className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-black text-xs uppercase tracking-widest bg-emerald-950 px-3 py-1.5 rounded-lg"><RotateCcw className="w-4 h-4"/> Runda Următoare</button>
                    ) : (
                        <div className="text-slate-500 text-xs font-bold uppercase">Așteptăm Host-ul...</div>
                    )
                ) : (
                    <div className="w-20"></div>
                )}
            </div>

            {/* GRILA */}
            {gridRows.length > 0 && (
                <div className="max-w-3xl mx-auto p-3 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border-4 border-slate-200 dark:border-slate-800 shadow-2xl overflow-x-auto">
                    <div className="grid grid-cols-[minmax(80px,1fr)_minmax(80px,1fr)_minmax(80px,1fr)_minmax(80px,1fr)] gap-2 sm:gap-4 min-w-[400px]">
                        <div className="flex items-center justify-center p-2">
                            <Trophy className="w-10 h-10 text-slate-200 dark:text-slate-800" />
                        </div>
                        
                        {gridCols.map((col, idx) => (
                            <div key={`col-${idx}`}>{renderHeader(col)}</div>
                        ))}

                        {gridRows.map((row, rIdx) => (
                            <React.Fragment key={`row-${rIdx}`}>
                                <div>{renderHeader(row)}</div>
                                {[0, 1, 2].map((cIdx) => {
                                    const ans = answers[`${rIdx}-${cIdx}`];
                                    return (
                                        <div 
                                            key={`cell-${rIdx}-${cIdx}`} 
                                            onClick={() => !ans && !winner && setActiveCell({ r: rIdx, c: cIdx })}
                                            className={`aspect-square rounded-2xl border-4 flex flex-col items-center justify-center cursor-pointer transition-all p-1 ${
                                                ans 
                                                ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                                                : 'bg-white dark:bg-slate-950 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                            } ${winner && !ans ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {ans ? (
                                                <div className="flex flex-col items-center justify-center w-full h-full space-y-1">
                                                    <span className="text-3xl sm:text-4xl drop-shadow-md leading-none mb-1">
                                                        {ans.markedBy === 'X' ? '❌' : '⚽'}
                                                    </span>
                                                    <span className="text-[9px] sm:text-[10px] font-black uppercase text-center text-slate-900 dark:text-white tracking-tight leading-none px-1 line-clamp-2">
                                                        {ans.player.name}
                                                    </span>
                                                </div>
                                            ) : (
                                                <Search className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300 dark:text-slate-600" />
                                            )}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}

            {/* MODAL CĂUTARE */}
            {activeCell && !winner && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-slate-900 w-full max-w-lg rounded-3xl border-4 border-blue-600/50 shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-5 border-b-2 border-slate-800 flex justify-between items-center bg-slate-950">
                            <h3 className="font-black text-white uppercase tracking-widest text-sm flex items-center gap-2">
                                Răspunde pentru {turn === 'X' ? '❌' : '⚽'}
                            </h3>
                            <button onClick={() => {setActiveCell(null); setSearchTerm("");}} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5 font-bold" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 bg-slate-800 p-3 rounded-xl border border-slate-700">
                                Intersecția: <span className="text-white">{gridRows[activeCell.r].value}</span> + <span className="text-white">{gridCols[activeCell.c].value}</span>
                            </div>
                            <input 
                                type="text"
                                autoFocus
                                placeholder="Caută jucător (ex: Kante, Mbappe)..."
                                className="w-full bg-slate-950 border-2 border-slate-700 p-4 rounded-xl text-white font-black uppercase tracking-widest outline-none focus:border-blue-500 transition-colors"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <div className="max-h-64 overflow-y-auto space-y-2">
                                {searchResults.map(p => (
                                    <button 
                                        key={p._id}
                                        onClick={() => handleSelectPlayer(p)}
                                        className="w-full flex items-center justify-center p-4 rounded-xl transition-colors border border-slate-700 hover:border-blue-500 bg-slate-800 hover:bg-blue-600 group"
                                    >
                                        <div className="font-black text-white uppercase tracking-tight truncate text-center text-lg">{p.name}</div>
                                    </button>
                                ))}
                                {searchTerm.length > 1 && searchResults.length === 0 && (
                                    <div className="text-center p-4 text-slate-500 font-bold uppercase tracking-widest text-xs">Jucătorul nu a fost găsit.</div>
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
function HiLoGame({ players, onBack }: { players: Player[], onBack: () => void }) {
    const [gameState, setGameState] = useState<'setup' | 'playing' | 'gameover'>('setup');
    const [category, setCategory] = useState<'age' | 'height' | 'market_value' | 'rating'>('market_value');
    
    const [score, setScore] = useState(0);
    const [playerA, setPlayerA] = useState<Player | null>(null);
    const [playerB, setPlayerB] = useState<Player | null>(null);

    // Cele 5 ligi de top (Premier League, La Liga, Serie A, Bundesliga, Ligue 1)
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
    
            // 1. MULTIPLICATOR DE VÂRSTĂ
            if (age <= 18) baseValue *= 5.5;      
            else if (age <= 21) baseValue *= 4.0; 
            else if (age <= 23) baseValue *= 2.8; 
            else if (age <= 26) baseValue *= 1.8; 
            else if (age <= 29) baseValue *= 1.4; // Ridicat ușor pentru "peak age"
            else if (age <= 31) baseValue *= 0.8; 
            else if (age <= 34) baseValue *= 0.4; 
            else baseValue *= 0.1;                
    
            // 2. MULTIPLICATOR DE PERFORMANȚĂ
            if (rating >= 8.5) baseValue *= 15;     
            else if (rating >= 8.0) baseValue *= 8; 
            else if (rating >= 7.5) baseValue *= 4; 
            else if (rating >= 7.0) baseValue *= 2; 
            else if (rating >= 6.5) baseValue *= 1.3; // AM ACOPERIT ZONA LUI VALVERDE (6.5 - 6.99)
            else if (rating < 6.0) baseValue *= 0.5; // Doar jucătorii sub 6.0 sunt penalizați masiv
    
            // 3. TAXA DE LIGĂ
            if (leagueId === 39) baseValue *= 2.0; 
            else if (leagueId === 140) baseValue *= 1.5; 
            else if (leagueId === 135 || leagueId === 78) baseValue *= 1.3; 
            
            // 4. TAXA DE "GIANT CLUB"
            const giantClubs = ['real madrid', 'manchester city', 'arsenal', 'bayern', 'paris saint germain', 'liverpool', 'barcelona', 'chelsea'];
            const bigClubs = ['juventus', 'inter', 'ac milan', 'manchester united', 'tottenham', 'atletico madrid', 'borussia dortmund', 'napoli'];
            
            if (giantClubs.some(club => currentTeam.includes(club))) baseValue *= 2.2;
            else if (bigClubs.some(club => currentTeam.includes(club))) baseValue *= 1.5;
    
            // 5. TAXA DE POZIȚIE
            if (position.includes('attacker') || position.includes('forward') || position.includes('wing') || position.includes('striker')) {
                baseValue *= 1.3;
            } else if (position.includes('midfield')) {
                baseValue *= 1.1;
            } else if (position.includes('goalkeeper') || position.includes('portar')) {
                baseValue *= 0.7; 
            }
    
            // --- REAJUSTĂRI FINALE ȘI ROTUNJIRE ---
            
            // Plasa de siguranță EXTINSĂ pentru Giganți
            if (giantClubs.some(club => currentTeam.includes(club))) {
                if (age <= 23 && rating >= 6.8) baseValue = Math.max(baseValue, 45_000_000); // Tineri la Real/City
                else if (age <= 29 && rating >= 6.5) baseValue = Math.max(baseValue, 60_000_000); // Peak age la Real/City (Valverde intră aici!)
            }
    
            baseValue = Math.min(Math.max(baseValue, 1_000_000), 200_000_000);
    
            if (baseValue > 10_000_000) {
                return Math.round(baseValue / 1_000_000) * 1_000_000;
            } else {
                return Math.round(baseValue / 500_000) * 500_000;
            }
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
        // Filtrăm lista pentru a permite DOAR jucători din ligile de top și care au statistica validă
        const validPlayers = players.filter(p => getStatValue(p, category) > 0 && p.league_id && TOP_5_LEAGUES.includes(Number(p.league_id)));
        
        if (validPlayers.length < 10) { toast.error("Nu sunt suficienți jucători în cele 5 ligi de top pentru această categorie."); return; }
        const shuffled = shuffleArray(validPlayers);
        setPlayerA(shuffled[0]);
        setPlayerB(shuffled[1]);
        setScore(0);
        setGameState('playing');
    };

    const handleGuess = (guess: 'higher' | 'lower') => {
        if (!playerA || !playerB) return;
        const valA = getStatValue(playerA, category);
        const valB = getStatValue(playerB, category);
        const isCorrect = (guess === 'higher' && valB >= valA) || (guess === 'lower' && valB <= valA);

        if (isCorrect) {
            toast.success("Corect!");
            setScore(prev => prev + 1);
            setPlayerA(playerB);
            
            // Re-filtrăm și căutăm următorul jucător
            const validPlayers = players.filter(p => getStatValue(p, category) > 0 && p.league_id && TOP_5_LEAGUES.includes(Number(p.league_id)));
            const shuffled = shuffleArray(validPlayers);
            const nextPB = shuffled.find(p => p._id !== playerB._id && getStatValue(p, category) !== getStatValue(playerB, category)) || shuffled[0];
            setPlayerB(nextPB);
        } else {
            setGameState('gameover');
        }
    };

    if (gameState === 'setup') {
        return (
            <div className="max-w-2xl mx-auto bg-slate-900 rounded-3xl p-8 border-4 border-slate-800 shadow-2xl text-center space-y-8 mt-10">
                <div className="flex justify-between items-center border-b-2 border-slate-800 pb-4">
                    <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-1 font-bold text-xs uppercase tracking-widest"><X className="w-4 h-4"/> Înapoi</button>
                    <h2 className="text-xl font-black text-white uppercase tracking-widest">Setup: Hi-Lo</h2>
                    <div className="w-16"></div>
                </div>
                <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs">Alege criteriul de departajare:</h3>
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { id: 'market_value', label: 'Cotă de Piață' },
                        { id: 'rating', label: 'Rating SofaScore' },
                        { id: 'age', label: 'Vârstă' },
                        { id: 'height', label: 'Înălțime' },
                    ].map(c => (
                        <button 
                            key={c.id}
                            onClick={() => setCategory(c.id as any)}
                            className={`p-4 rounded-2xl border-2 font-black uppercase tracking-widest transition-all ${
                                category === c.id ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-105' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                            }`}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
                <button onClick={startGame} className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-lg hover:bg-emerald-500 transition-colors border-b-4 border-emerald-800 hover:border-b-2 hover:translate-y-[2px]">
                    Începe Jocul
                </button>
            </div>
        );
    }

    if (gameState === 'gameover') {
        return (
            <div className="max-w-lg mx-auto bg-slate-900 rounded-3xl p-8 border-4 border-rose-600/50 shadow-2xl text-center space-y-6 mt-10">
                <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-2" />
                <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Fluier Final</h2>
                <div className="bg-slate-950 rounded-2xl p-6 border-2 border-slate-800">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Scorul Tău</p>
                    <p className="text-6xl font-black text-blue-500 drop-shadow-md">{score}</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={startGame} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-colors border-b-4 border-blue-800 hover:border-b-2 hover:translate-y-[2px]">Joacă din nou</button>
                    <button onClick={() => setGameState('setup')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-colors border-b-4 border-slate-950 hover:border-b-2 hover:translate-y-[2px]">Schimbă Categoria</button>
                </div>
            </div>
        );
    }

    const valA = playerA ? getStatValue(playerA, category) : 0;
    const catLabel = { 'age': 'Vârsta', 'height': 'Înălțimea', 'market_value': 'Cota de Piață', 'rating': 'Rating-ul' }[category];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-900 p-4 rounded-3xl border-2 border-slate-800 shadow-lg">
                <button onClick={() => setGameState('setup')} className="text-slate-400 hover:text-rose-500 flex items-center gap-1 font-bold text-xs uppercase tracking-widest"><X className="w-4 h-4"/> Renunță</button>
                <div className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                    Categoria: <span className="text-blue-400">{catLabel}</span>
                </div>
                <div className="text-emerald-400 font-black uppercase tracking-widest text-sm">
                    Scor: {score}
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 h-[60vh] min-h-[500px]">
                <div className="flex-1 bg-slate-900 rounded-3xl border-4 border-slate-800 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/80 z-0"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <img src={playerA?.image || GENERIC_USER_IMAGE} className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-xl mb-6 bg-white" />
                        <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">{playerA?.name}</h2>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">{playerA?.team_name || playerA?.team}</p>
                        <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2">Are {catLabel}</p>
                        <div className="text-5xl font-black text-white drop-shadow-md bg-white/10 px-6 py-3 rounded-2xl border border-white/20">
                            {getStatFormat(valA, category)}
                        </div>
                    </div>
                </div>

                <div className="md:w-24 flex items-center justify-center -my-8 md:my-0 md:-mx-12 z-20">
                    <div className="w-16 h-16 bg-rose-600 rounded-full flex items-center justify-center text-white font-black italic text-2xl border-4 border-slate-950 shadow-[0_0_20px_rgba(225,29,72,0.5)]">VS</div>
                </div>

                <div className="flex-1 bg-slate-900 rounded-3xl border-4 border-slate-800 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden shadow-2xl">
                     <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/80 z-0"></div>
                     <div className="relative z-10 flex flex-col items-center w-full">
                        <img src={playerB?.image || GENERIC_USER_IMAGE} className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-xl mb-6 bg-white" />
                        <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">{playerB?.name}</h2>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">{playerB?.team_name || playerB?.team}</p>
                        <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-4">Are {catLabel}</p>
                        <div className="flex flex-col gap-3 w-full max-w-xs">
                            <button onClick={() => handleGuess('higher')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-lg transition-all border-b-4 border-emerald-800 hover:border-b-2 hover:translate-y-[2px] flex items-center justify-center gap-2 shadow-lg">
                                <ArrowUp className="w-6 h-6" /> Mai Mare
                            </button>
                            <button onClick={() => handleGuess('lower')} className="w-full bg-rose-600 hover:bg-rose-500 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-lg transition-all border-b-4 border-rose-800 hover:border-b-2 hover:translate-y-[2px] flex items-center justify-center gap-2 shadow-lg">
                                <ArrowDown className="w-6 h-6" /> Mai Mică
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}