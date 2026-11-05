import React, { useState, useEffect } from 'react';
import { Trophy, ArrowUp, ArrowDown, Search, X, AlertTriangle, RotateCcw, Swords, Play, Activity, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

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

const API_URL = (import.meta as any).env.VITE_API_URL || 'https://football-backend-m2a4.onrender.com';
const GENERIC_USER_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

const TOP_LEAGUES = [283, 39, 140, 135, 78, 61]; 

function shuffleArray<T>(array: T[]): T[] {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

const getFlagEmoji = (country: string) => {
    const flags: Record<string, string> = {
        'Romania': '🇷🇴', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Spain': '🇪🇸', 'Italy': '🇮🇹',
        'Germany': '🇩🇪', 'France': '🇫🇷', 'Brazil': '🇧🇷', 'Argentina': '🇦🇷',
        'Portugal': '🇵🇹', 'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Croatia': '🇭🇷',
        'Nigeria': '🇳🇬', 'Senegal': '🇸🇳', 'Morocco': '🇲🇦', 'USA': '🇺🇸',
        'Uruguay': '🇺🇾', 'Colombia': '🇨🇴', 'Switzerland': '🇨🇭', 'Denmark': '🇩🇰'
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
                // Fetch ridicat la 10.000 pentru a asigura preluarea întregii baze de date de 7000 de jucători
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
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Grila Transferurilor</h3>
                            <p className="text-slate-400 font-bold text-sm mb-6 line-clamp-2">Găsește jucătorul perfect care să bifeze intersecția dintre echipe, naționalități și competiții.</p>
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
// GAME 1: GRILA TRANSFERURILOR (ALGORITM O(1) CU HĂRȚI DE MEMORIE)
// ============================================================================
function GridGame({ players, onBack }: { players: Player[], onBack: () => void }) {
    const [gridRows, setGridRows] = useState<GridCriteria[]>([]);
    const [gridCols, setGridCols] = useState<GridCriteria[]>([]);
    const [answers, setAnswers] = useState<Record<string, Player | null>>({});
    
    const [activeCell, setActiveCell] = useState<{ r: number, c: number } | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        generateValidGrid();
    }, []);

    const checkMatch = (p: Player, criteria: GridCriteria) => {
        if (criteria.type === 'team') {
            const currentTeam = p.team_name || p.team;
            const pastTeams = p.past_teams || [];
            return currentTeam === criteria.value || pastTeams.includes(criteria.value);
        }
        if (criteria.type === 'nationality') return p.nationality === criteria.value;
        if (criteria.type === 'league') return p.league_name === criteria.value;
        return false;
    };

    const generateValidGrid = () => {
        const criteriaPlayers = new Map<string, Set<string>>();
        const teamMap = new Map<string, string>();
        const natMap = new Map<string, string>();
        const leagueMap = new Map<string, string>();

        // Pre-calculăm apartenența fiecărui jucător la criterii (O(1) lookup time)
        players.forEach(p => {
            const t = p.team_name || p.team;
            if (t) {
                teamMap.set(t, p.team_logo || "");
                if (!criteriaPlayers.has(`team:${t}`)) criteriaPlayers.set(`team:${t}`, new Set());
                criteriaPlayers.get(`team:${t}`)!.add(p._id);
            }
            if (p.past_teams) {
                p.past_teams.forEach(pt => {
                    teamMap.set(pt, "");
                    if (!criteriaPlayers.has(`team:${pt}`)) criteriaPlayers.set(`team:${pt}`, new Set());
                    criteriaPlayers.get(`team:${pt}`)!.add(p._id);
                });
            }
            if (p.nationality) {
                natMap.set(p.nationality, getFlagEmoji(p.nationality));
                if (!criteriaPlayers.has(`nat:${p.nationality}`)) criteriaPlayers.set(`nat:${p.nationality}`, new Set());
                criteriaPlayers.get(`nat:${p.nationality}`)!.add(p._id);
            }
            if (p.league_name) {
                leagueMap.set(p.league_name, p.league_logo || "");
                if (!criteriaPlayers.has(`league:${p.league_name}`)) criteriaPlayers.set(`league:${p.league_name}`, new Set());
                criteriaPlayers.get(`league:${p.league_name}`)!.add(p._id);
            }
        });

        // Setăm reguli: liniile vor fi DOAR echipe (minim 5 jucători pentru a fi o echipă relevantă)
        const teamCriteria = Array.from(teamMap.entries())
            .filter(([val]) => (criteriaPlayers.get(`team:${val}`)?.size || 0) >= 5)
            .map(([val, img]) => ({ type: 'team' as const, value: val, image: img }));

        // Coloanele pot fi orice (echipe, națiuni, ligi) cu minim 3 jucători asociați
        const natCriteria = Array.from(natMap.entries())
            .filter(([val]) => (criteriaPlayers.get(`nat:${val}`)?.size || 0) >= 3)
            .map(([val, img]) => ({ type: 'nationality' as const, value: val, image: img }));

        const leagueCriteria = Array.from(leagueMap.entries())
            .filter(([val]) => (criteriaPlayers.get(`league:${val}`)?.size || 0) >= 3)
            .map(([val, img]) => ({ type: 'league' as const, value: val, image: img }));

        const allColCriteria = [...teamCriteria, ...natCriteria, ...leagueCriteria];

        let validRows: GridCriteria[] = [];
        let validCols: GridCriteria[] = [];
        let foundValidGrid = false;
        let attempts = 0;

        // Verificăm intersecția dinamic în Hash Map
        const checkIntersect = (rType: string, rVal: string, cType: string, cVal: string) => {
            const rKey = rType === 'nationality' ? 'nat' : rType;
            const cKey = cType === 'nationality' ? 'nat' : cType;
            const rSet = criteriaPlayers.get(`${rKey}:${rVal}`);
            const cSet = criteriaPlayers.get(`${cKey}:${cVal}`);
            if (!rSet || !cSet) return false;
            for (const id of rSet) {
                if (cSet.has(id)) return true; // Am găsit jucător comun
            }
            return false;
        };

        // Rulăm până la 20.000 de verificări matematice (durează milisecunde)
        while (!foundValidGrid && attempts < 20000) {
            attempts++;
            
            // Liniile vor fi mereu Echipe pentru a garanta intersecții logice
            const shuffledRows = shuffleArray(teamCriteria).slice(0, 3);
            
            const validColsForTheseRows = shuffleArray(allColCriteria).filter(col => {
                // Nu vrem același club și pe linie și pe coloană
                if (shuffledRows.some(r => r.value === col.value)) return false;
                
                // Căutăm dacă există intersecții valide pentru TOATE cele 3 echipe alese
                return shuffledRows.every(row => checkIntersect(row.type, row.value, col.type, col.value));
            });

            // Gata, am găsit o grilă 3x3 validă!
            if (validColsForTheseRows.length >= 3) {
                validRows = shuffledRows;
                validCols = validColsForTheseRows.slice(0, 3);
                foundValidGrid = true;
            }
        }

        if (foundValidGrid) {
            setGridRows(validRows);
            setGridCols(validCols);
            setAnswers({});
        } else {
            toast.error("Baza de date e prea mică pentru a genera combinații noi.");
        }
    };

    const handleSelectPlayer = (player: Player) => {
        if (!activeCell) return;
        const { r, c } = activeCell;
        
        const rowCriteria = gridRows[r];
        const colCriteria = gridCols[c];

        const matchRow = checkMatch(player, rowCriteria);
        const matchCol = checkMatch(player, colCriteria);

        const alreadyUsed = Object.values(answers).some(ans => ans?._id === player._id);

        if (alreadyUsed) {
            toast.error("Ai folosit deja acest jucător pe grilă!");
            return;
        }

        if (matchRow && matchCol) {
            toast.success("Răspuns Corect!");
            setAnswers(prev => ({ ...prev, [`${r}-${c}`]: player }));
            setActiveCell(null);
            setSearchTerm("");
        } else {
            toast.error("Jucător incorect pentru aceste criterii!");
        }
    };

    const searchResults = searchTerm.trim().length > 1 
        ? players.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 10)
        : [];

    const score = Object.keys(answers).length;

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
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-900 p-4 rounded-3xl border-2 border-slate-800">
                <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-1 font-bold text-xs uppercase tracking-widest"><X className="w-4 h-4"/> Înapoi</button>
                <div className="text-emerald-400 font-black uppercase tracking-widest text-sm flex items-center gap-2">
                    Scor Grilă: {score} / 9
                </div>
                <button onClick={generateValidGrid} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold text-xs uppercase tracking-widest"><RotateCcw className="w-4 h-4"/> Grilă Nouă</button>
            </div>

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
                                            onClick={() => !ans && setActiveCell({ r: rIdx, c: cIdx })}
                                            className={`aspect-square rounded-2xl border-4 flex flex-col items-center justify-center cursor-pointer transition-all p-1 ${
                                                ans 
                                                ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                                                : 'bg-white dark:bg-slate-950 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                            }`}
                                        >
                                            {ans ? (
                                                <>
                                                    <img src={ans.image || GENERIC_USER_IMAGE} className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover mb-1 border-2 border-white dark:border-emerald-500 shadow-sm" />
                                                    <span className="text-[9px] sm:text-[10px] font-black uppercase text-center text-slate-900 dark:text-white tracking-tight leading-none px-1 line-clamp-2">{ans.name}</span>
                                                </>
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

            {activeCell && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-slate-900 w-full max-w-lg rounded-3xl border-4 border-blue-600/50 shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-5 border-b-2 border-slate-800 flex justify-between items-center bg-slate-950">
                            <h3 className="font-black text-white uppercase tracking-widest text-sm">Selectează Jucătorul</h3>
                            <button onClick={() => {setActiveCell(null); setSearchTerm("");}} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5 font-bold" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 bg-slate-800 p-3 rounded-xl border border-slate-700">
                                Căutăm intersecția: <span className="text-white">{gridRows[activeCell.r].value}</span> + <span className="text-white">{gridCols[activeCell.c].value}</span>
                            </div>
                            <input 
                                type="text"
                                autoFocus
                                placeholder="Caută jucător după nume..."
                                className="w-full bg-slate-950 border-2 border-slate-700 p-4 rounded-xl text-white font-black uppercase tracking-widest outline-none focus:border-blue-500 transition-colors"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <div className="max-h-64 overflow-y-auto space-y-2">
                                {searchResults.map(p => (
                                    <button 
                                        key={p._id}
                                        onClick={() => handleSelectPlayer(p)}
                                        className="w-full flex items-center gap-4 bg-slate-800 hover:bg-blue-600 p-3 rounded-xl transition-colors border border-slate-700 hover:border-blue-500 text-left group"
                                    >
                                        <img src={p.image || GENERIC_USER_IMAGE} className="w-10 h-10 rounded-full object-cover border border-slate-600 group-hover:border-white" />
                                        <div>
                                            <div className="font-black text-white uppercase tracking-tight">{p.name}</div>
                                            <div className="text-[10px] text-slate-400 group-hover:text-blue-100 font-bold uppercase tracking-widest">{p.team_name || p.team} • {p.nationality}</div>
                                        </div>
                                    </button>
                                ))}
                                {searchTerm.length > 1 && searchResults.length === 0 && (
                                    <div className="text-center p-4 text-slate-500 font-bold uppercase tracking-widest text-xs">Jucătorul nu există în baza de date.</div>
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

    const getStatValue = (p: Player, cat: string) => {
        if (cat === 'age') return p.age || 0;
        if (cat === 'height') return parseInt(p.height?.replace(/\D/g, '') || "0", 10);
        if (cat === 'rating') return parseFloat(p.statistics_summary?.rating || "0");
        if (cat === 'market_value') {
            if (p.market_value) return p.market_value;
            const r = parseFloat(p.statistics_summary?.rating || "6.0");
            return Math.round(Math.pow((r - 5), 2) * 1.5) * 1000000; 
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
        const validPlayers = players.filter(p => getStatValue(p, category) > 0 && p.league_id && TOP_LEAGUES.includes(Number(p.league_id)));
        
        if (validPlayers.length < 10) {
            toast.error("Nu sunt suficienți jucători în baza de date pentru această categorie.");
            return;
        }

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
            
            const validPlayers = players.filter(p => getStatValue(p, category) > 0 && p.league_id && TOP_LEAGUES.includes(Number(p.league_id)));
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
    
    const catLabel = {
        'age': 'Vârsta',
        'height': 'Înălțimea',
        'market_value': 'Cota de Piață',
        'rating': 'Rating-ul'
    }[category];

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
                {/* Jucător A - Cunoscut */}
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

                {/* VS Badge */}
                <div className="md:w-24 flex items-center justify-center -my-8 md:my-0 md:-mx-12 z-20">
                    <div className="w-16 h-16 bg-rose-600 rounded-full flex items-center justify-center text-white font-black italic text-2xl border-4 border-slate-950 shadow-[0_0_20px_rgba(225,29,72,0.5)]">VS</div>
                </div>

                {/* Jucător B - De Ghicit */}
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