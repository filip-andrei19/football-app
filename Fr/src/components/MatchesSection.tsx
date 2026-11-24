import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { io } from 'socket.io-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, SortingState } from '@tanstack/react-table';
import {
    Calendar, Trophy, X, Globe,
    Users, BarChart2, ListOrdered, Clock, Bookmark,
    Swords, History, ArrowUp, ArrowDown, Minus,
    Heart, Bell, Settings, Scale, Activity, Award, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

const GENERIC_USER_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
const API_BASE = (import.meta as any).env?.VITE_API_URL || "https://football-backend-m2a4.onrender.com";
const socket = io(API_BASE, {
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
});
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
        team_name?: string;
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

const normalizeName = (val?: string) =>
    String(val || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const sanitizeTeamName = (
    playerOrName?: Player | string | null,
    fallback = "Echipă necunoscută"
): string => {
    const candidates: Array<string | undefined> =
        typeof playerOrName === "string"
            ? [playerOrName]
            : [
                  playerOrName?.team_name,
                  playerOrName?.team,
                  playerOrName?.statistics_summary?.team_name,
              ];

    for (const raw of candidates) {
        const cleaned = String(raw || "").trim();
        if (cleaned && !/^\d+$/.test(cleaned)) {
            return cleaned;
        }
    }

    return fallback;
};

const hasValidImageUrl = (url?: string): boolean => {
    return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
};

const getAuthHeaders = () => {
    const token = localStorage.getItem('footballAppToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const getEventPresentation = (ev: any) => {
    const type = String(ev?.type || '').toLowerCase().trim();
    const detail = String(ev?.detail || '').trim();
    const comments = String(ev?.comments || '').trim();
    const combinedLower = `${detail} ${comments}`.toLowerCase();

    const isMissedPenalty =
        combinedLower.includes('missed penalty') ||
        combinedLower.includes('penalty missed') ||
        combinedLower.includes('missed') ||
        combinedLower.includes('penalty shootout missed') ||
        (combinedLower.includes('penalty') && (
            combinedLower.includes('fail') ||
            combinedLower.includes('save') ||
            combinedLower.includes('saved') ||
            combinedLower.includes('post') ||
            combinedLower.includes('bar') ||
            combinedLower.includes('off target')
        ));

    if (isMissedPenalty) {
        return {
            icon: '❌',
            badge: 'PENALTY RATAT',
            badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40',
            isActualGoal: false,
        };
    }

    if (type === 'goal') {
        if (combinedLower.includes('cancelled') || combinedLower.includes('disallowed') || combinedLower.includes('var')) {
            return {
                icon: '🚫',
                badge: detail ? detail.toUpperCase() : 'GOL ANULAT',
                badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40',
                isActualGoal: false,
            };
        }
        if (combinedLower.includes('own')) {
            return {
                icon: '⚽',
                badge: 'AUTOGOL',
                badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40',
                isActualGoal: true,
            };
        }
        if (combinedLower.includes('penalty')) {
            return {
                icon: '⚽',
                badge: 'PENALTY',
                badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40',
                isActualGoal: true,
            };
        }
        return {
            icon: '⚽',
            badge: null,
            badgeClass: '',
            isActualGoal: true,
        };
    }

    if (type === 'var') {
        return {
            icon: '📺',
            badge: detail ? detail.toUpperCase() : 'VAR',
            badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/40',
            isActualGoal: false,
        };
    }

    if (type === 'card') {
        if (combinedLower.includes('red')) {
            return {
                icon: '🟥',
                badge: 'CARTONAȘ ROȘU',
                badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40',
                isActualGoal: false,
            };
        }
        if (combinedLower.includes('second yellow')) {
            return {
                icon: '🟨🟥',
                badge: 'AL DOILEA GALBEN',
                badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40',
                isActualGoal: false,
            };
        }
        return {
            icon: '🟨',
            badge: null,
            badgeClass: '',
            isActualGoal: false,
        };
    }

    if (type === 'subst') {
        return {
            icon: '🔄',
            badge: null,
            badgeClass: '',
            isActualGoal: false,
        };
    }

    return {
        icon: 'ℹ️',
        badge: detail ? detail.toUpperCase() : (ev?.type ? String(ev.type).toUpperCase() : 'EVENIMENT'),
        badgeClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30',
        isActualGoal: false,
    };
};

function StandingsTable({ data, selectedMatchDetails, handleTeamClick }: { data: any[], selectedMatchDetails: any, handleTeamClick: any }) {
    const [sorting, setSorting] = useState<SortingState>([]);

    const columns = useMemo(() => [
        {
            accessorKey: 'liveRank',
            header: 'Loc',
            cell: (info: any) => <div className="text-center font-black text-slate-500">{info.getValue()}</div>,
        },
        {
            accessorKey: 'trend',
            header: '+/-',
            cell: (info: any) => {
                const trend = info.getValue();
                return (
                    <div className="text-center flex justify-center">
                        {trend === 'up' && <ArrowUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-500" />}
                        {trend === 'down' && <ArrowDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-500" />}
                        {trend === 'same' && <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-300 dark:text-slate-600" />}
                    </div>
                );
            }
        },
        {
            id: 'team',
            accessorFn: (row: any) => row.team?.name,
            header: 'Formație',
            cell: (info: any) => {
                const row = info.row.original;
                const isCurrentTeam = row.team?.id === selectedMatchDetails.home_team_id || row.team?.id === selectedMatchDetails.away_team_id;
                const isPlayingNow = row.isLivePlaying;
                return (
                    <div className="flex items-center gap-1.5 sm:gap-3">
                        <img src={row.team?.logo} alt="logo" className="w-4 h-4 sm:w-6 sm:h-6 object-contain bg-white rounded p-0.5 shrink-0" />
                        <span className={`font-black tracking-tight truncate max-w-[85px] sm:max-w-[200px] ${isCurrentTeam ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{row.team?.name}</span>
                        {isPlayingNow && <span className="ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0.5 bg-rose-600 text-white text-[6px] sm:text-[8px] font-black rounded uppercase animate-pulse">Live</span>}
                    </div>
                );
            }
        },
        {
            accessorKey: 'livePlayed',
            header: 'J',
            cell: (info: any) => <div className="text-center font-bold text-slate-500 dark:text-slate-400">{info.getValue()}</div>,
        },
        {
            id: 'goals',
            accessorFn: (row: any) => row.liveGoalsFor - row.liveGoalsAgainst,
            header: 'G',
            cell: (info: any) => {
                const row = info.row.original;
                return <div className="text-center font-bold text-slate-500 dark:text-slate-400 text-[9px] sm:text-[11px] whitespace-nowrap">{row.liveGoalsFor}:{row.liveGoalsAgainst}</div>;
            }
        },
        {
            accessorKey: 'livePoints',
            header: 'PCT',
            cell: (info: any) => {
                const points = info.getValue();
                const row = info.row.original;
                const isCurrentTeam = row.team?.id === selectedMatchDetails.home_team_id || row.team?.id === selectedMatchDetails.away_team_id;
                const isPlayingNow = row.isLivePlaying;
                return <div className={`text-center font-black text-xs sm:text-sm ${isPlayingNow ? 'text-amber-500' : isCurrentTeam ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{points}</div>;
            }
        }
    ], [selectedMatchDetails]);

    const table = useReactTable({
        data,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-[10px] sm:text-sm text-left min-w-[300px]">
                <thead className="bg-slate-900 text-slate-400 font-black tracking-widest text-[8px] sm:text-[9px] border-b sm:border-b-2 border-slate-700 uppercase">
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <th key={header.id} onClick={header.column.getToggleSortingHandler()} className="py-2 sm:py-4 px-1 sm:px-3 cursor-pointer select-none hover:text-white transition-colors">
                                    <div className="flex items-center justify-center gap-1">
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                        <span className="w-3 text-emerald-400">
                                            {header.column.getIsSorted() === 'asc' ? ' 🔼' : header.column.getIsSorted() === 'desc' ? ' 🔽' : ''}
                                        </span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {table.getRowModel().rows.map(row => {
                        const isCurrentTeam = row.original.team?.id === selectedMatchDetails.home_team_id || row.original.team?.id === selectedMatchDetails.away_team_id;
                        const isPlayingNow = row.original.isLivePlaying;
                        return (
                            <tr key={row.id} onClick={(e) => handleTeamClick(e, row.original.team?.name)} className={`cursor-pointer transition-colors ${isPlayingNow ? 'bg-amber-50 dark:bg-amber-900/10' : isCurrentTeam ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="py-2 sm:py-3.5 px-1 sm:px-3">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
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
    const contributionsPer90 = Number((goalsPer90 + assistsPer90).toFixed(2));
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
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 640 : false;
    const size = isMobile ? 190 : 240;
    const center = size / 2;
    const radius = isMobile ? 62 : 82;
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
                    return <polygon key={level} points={pts} fill="none" stroke="rgba(16, 185, 129, 0.35)" strokeWidth="1" strokeDasharray={level < 100 ? "3 3" : undefined} />;
                })}
                {axes.map((_, idx) => {
                    const end = getCoordinates(idx, 100);
                    return <line key={idx} x1={center} y1={center} x2={end.x} y2={end.y} stroke="rgba(16, 185, 129, 0.45)" strokeWidth="1" />;
                })}
                <polygon points={buildPolygonPoints(m1.radar)} fill="rgba(250, 204, 21, 0.4)" stroke="#facc15" strokeWidth="3" />
                {m1.radar.map((item, idx) => {
                    const pt1 = getCoordinates(idx, item.value);
                    const labelPos = getCoordinates(idx, 122);
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
        } catch {
            return { goals: true, matchStart: true, halfTime: false, fullTime: true, redCards: true };
        }
    });

    const notifPrefsRef = useRef(notifPrefs);
    useEffect(() => {
        notifPrefsRef.current = notifPrefs;
        localStorage.setItem('scout_notif_prefs', JSON.stringify(notifPrefs));
    }, [notifPrefs]);

    const [selectedTeam, setSelectedTeam] = useState<SquadData | null>(null);
    const [loadingRoster, setLoadingRoster] = useState(false);

    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [loadingPlayerCard, setLoadingPlayerCard] = useState(false);

    const resolvedPlayerCache = useRef<Record<string, Player | null>>({});
    const [, setNameResolveTick] = useState(0);

    const [compareList, setCompareList] = useState<Player[]>([]);
    const [showCompareModal, setShowCompareModal] = useState(false);
    const [watchlistIds, setWatchlistIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('scout_watchlist_ids');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [selectedMatchDetails, setSelectedMatchDetails] = useState<Match | null>(null);
    const [loadingMatchDetails, setLoadingMatchDetails] = useState(false);
    const [activeMatchTab, setActiveMatchTab] = useState<'events' | 'lineups' | 'stats' | 'standings' | 'h2h'>('events');
    const [standingsData, setStandingsData] = useState<any[]>([]);
    const [loadingStandings, setLoadingStandings] = useState(false);

    const [lineupViewMode, setLineupViewMode] = useState<'both' | 'home' | 'away'>('both');

    const findPlayerInDB = async (rawName: string, fallbackTeam?: string): Promise<Player | undefined> => {
        const cleanName = rawName.trim();
        const targetNorm = normalizeName(cleanName);
        const cleanFallbackTeam = sanitizeTeamName(fallbackTeam, '');
        const fallbackTeamNorm = normalizeName(cleanFallbackTeam);

        const cacheKey = `${targetNorm}__${fallbackTeamNorm}`;
        if (Object.prototype.hasOwnProperty.call(resolvedPlayerCache.current, cacheKey)) {
            return resolvedPlayerCache.current[cacheKey] || undefined;
        }

        const tokens = targetNorm.split(' ').filter(t => t.length >= 3);
        const queries = Array.from(new Set([cleanName, ...tokens].filter(Boolean)));

        let bestCandidate: Player | undefined;
        let bestScore = -1;

        for (const q of queries) {
            try {
                const res = await fetch(`${API_BASE}/api/sport/players?search=${encodeURIComponent(q)}&limit=30`);
                if (!res.ok) continue;

                const list: Player[] = await res.json();
                if (!Array.isArray(list) || list.length === 0) continue;

                for (const cand of list) {
                    const candNorm = normalizeName(cand.name);
                    const candTeam = normalizeName(sanitizeTeamName(cand, ''));
                    let score = 0;
                    let matchedTokens = 0;

                    if (candNorm === targetNorm) {
                        score += 1000;
                        matchedTokens = tokens.length || 1;
                    }

                    for (const tok of tokens) {
                        if (candNorm.includes(tok)) {
                            score += tok.length >= 5 ? 130 : 100;
                            matchedTokens += 1;
                        }
                    }

                    if (matchedTokens === 0 && candNorm !== targetNorm) continue;

                    if (fallbackTeamNorm && candTeam) {
                        const sameTeam = candTeam.includes(fallbackTeamNorm) || fallbackTeamNorm.includes(candTeam);
                        if (sameTeam) {
                            score += 150;
                        } else if (matchedTokens < 2) {
                            score -= 100;
                        }
                    }

                    if (score > bestScore && score >= 100) {
                        bestScore = score;
                        bestCandidate = {
                            ...cand,
                            name: cand.name || cleanName,
                            team_name: sanitizeTeamName(cand, cleanFallbackTeam),
                        };
                    }
                }

                if (bestScore >= 250) break;
            } catch {}
        }

        resolvedPlayerCache.current[cacheKey] = bestCandidate || null;
        return bestCandidate;
    };

    const getDisplayPlayerName = (rawName?: string, fallbackTeam?: string): string => {
        if (!rawName) return "";
        const targetNorm = normalizeName(rawName);
        const fallbackTeamNorm = normalizeName(sanitizeTeamName(fallbackTeam, ''));
        const cacheKey = `${targetNorm}__${fallbackTeamNorm}`;

        if (!Object.prototype.hasOwnProperty.call(resolvedPlayerCache.current, cacheKey)) {
            resolvedPlayerCache.current[cacheKey] = null;
            findPlayerInDB(rawName, fallbackTeam).then((found) => {
                if (found?.name && normalizeName(found.name) !== targetNorm) {
                    resolvedPlayerCache.current[cacheKey] = found;
                    setNameResolveTick((t) => t + 1);
                }
            }).catch(() => {});
        }

        const cached = resolvedPlayerCache.current[cacheKey];
        return cached?.name || rawName;
    };

    const subscribeToPushNotifications = async (email: string) => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        try {
            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                const publicVapidKey = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY;
                if (!publicVapidKey) return;
                const applicationServerKey = urlB64ToUint8Array(publicVapidKey);
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: applicationServerKey
                });
            }

            await fetch(`${API_BASE}/api/notifications/subscribe`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ email: email, subscription: subscription })
            });
        } catch (error) {
            console.error('Eroare la abonarea Push:', error);
        }
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
        const generatedDates = [];
        for (let i = -3; i <= 3; i++) {
            const d = new Date();
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
            fetch(`${API_BASE}/api/users/refresh`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ email: userEmail })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.user) {
                        if (data.user.favoriteMatches) setFavoriteMatches(data.user.favoriteMatches);
                        if (data.user.favoriteTeams) setFavoriteTeams(data.user.favoriteTeams);
                        if (data.user.scoutWatchlist) {
                            setWatchlistIds(data.user.scoutWatchlist);
                            localStorage.setItem('scout_watchlist_ids', JSON.stringify(data.user.scoutWatchlist));
                        }
                    }
                })
                .catch(() => {});
        }
    }, [userEmail]);

    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const localDateStr = `${y}-${m}-${d}`;

    const { data: matches = [], isLoading: loading } = useQuery({
        queryKey: ['matches', localDateStr],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/api/sport/matches?date=${localDateStr}`);
            if (!res.ok) throw new Error("Eroare preluare meciuri");
            return res.json();
        },
        staleTime: 60 * 1000,
        refetchInterval: 60 * 1000,
    });

    useEffect(() => {
        socket.on("live_match_update", (updatedMatch: Match) => {
            queryClient.setQueriesData<Match[]>({ queryKey: ['matches', localDateStr] }, (oldMatches) => {
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
    }, [favoriteMatches, favoriteTeams, queryClient, localDateStr]);

    const toggleNotifPref = (key: keyof NotificationPrefs) => {
        setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleFavoriteMatch = async (e: React.MouseEvent, fixtureId: number) => {
        e.stopPropagation();
        if (!userEmail) { toast.error("Trebuie să ai legitimație (cont) pentru a salva meciuri la favorite!"); return; }
        try {
            const res = await fetch(`${API_BASE}/api/users/favorite-matches/toggle`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ email: userEmail, fixtureId })
            });
            const data = await res.json();
            if (data.success) { setFavoriteMatches(data.favoriteMatches); }
        } catch (err) {
            console.error(err);
        }
    };

    const toggleWatchlist = async (e: React.MouseEvent, player: Player) => {
        e.stopPropagation();
        if (!userEmail) { toast.error("Conectează-te pentru a adăuga jucători în lista scurtă."); return; }
        const playerId = player._id;
        const exists = watchlistIds.includes(playerId);
        const updated = exists ? watchlistIds.filter(id => id !== playerId) : [...watchlistIds, playerId];
        setWatchlistIds(updated);
        localStorage.setItem('scout_watchlist_ids', JSON.stringify(updated));
        toast.success(exists ? "Eliminat din Lista de Scout." : "Adăugat în Lista de Scout!");

        try {
            await fetch(`${API_BASE}/api/users/watchlist/toggle`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ email: userEmail, playerId })
            });
        } catch (err) {
            console.error(err);
        }
    };

    const toggleComparePlayer = (e: React.MouseEvent, player: Player) => {
        e.stopPropagation();
        setCompareList(prev => {
            const exists = prev.some(p => p._id === player._id);
            if (exists) {
                toast("Eliminat din comparare.", { icon: '⚖️' });
                return prev.filter(p => p._id !== player._id);
            }
            if (prev.length >= 2) {
                toast.success(`${player.name} a înlocuit primul jucător la comparare.`);
                return [prev[1], player];
            }
            const next = [...prev, player];
            if (next.length === 2) {
                setShowCompareModal(true);
            } else {
                toast.success(`${player.name} adăugat la comparare (1/2). Alege încă un jucător.`);
            }
            return next;
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
                    const res = await fetch(`${API_BASE}/api/sport/teams/${encodeURIComponent(teamName)}/roster`);
                    if (!res.ok) throw new Error("Nu am putut prelua lotul.");
                    return res.json();
                },
                staleTime: 60 * 60 * 1000,
            });
            setSelectedTeam(data);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoadingRoster(false);
        }
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
                    const res = await fetch(`${API_BASE}/api/sport/matches/${match.fixture_id}/details`);
                    if (!res.ok) throw new Error("Eroare preluare foi de joc");
                    return res.json();
                },
                staleTime: 60 * 1000,
            });

            setSelectedMatchDetails(fullData);
            queryClient.setQueriesData<Match[]>({ queryKey: ['matches', localDateStr] }, (oldMatches) => {
                if (!oldMatches) return oldMatches;
                return oldMatches.map(m => (m.fixture_id === fullData.fixture_id ? { ...m, ...fullData } : m));
            });
        } catch (err) {
            console.error("Eroare detalii meci:", err);
        } finally {
            setLoadingMatchDetails(false);
        }
    };

    const fetchStandings = async (leagueId: number) => {
        const cachedStandings = queryClient.getQueryData(['standings', leagueId]);
        if (!cachedStandings) setLoadingStandings(true);
        try {
            const data: any = await queryClient.fetchQuery({
                queryKey: ['standings', leagueId],
                queryFn: async () => {
                    const res = await fetch(`${API_BASE}/api/sport/standings/${leagueId}`);
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

    const handleOpenPlayerProfile = async (playerOrName: Player | string, fallbackTeam?: string) => {
        if (!playerOrName) return;

        if (typeof playerOrName !== 'string') {
            const normalizedTeam = sanitizeTeamName(playerOrName, fallbackTeam || '');
            setSelectedPlayer({
                ...playerOrName,
                team_name: normalizedTeam,
            });
            return;
        }

        const cleanName = playerOrName.trim();
        const cleanFallbackTeam = sanitizeTeamName(fallbackTeam, '');

        setLoadingPlayerCard(true);
        setSelectedPlayer({
            _id: `temp_${cleanName}`,
            name: cleanName,
            position: 'Jucător',
            team_name: cleanFallbackTeam,
        });

        try {
            const matched = await findPlayerInDB(cleanName, cleanFallbackTeam);
            if (matched) {
                setSelectedPlayer(matched);
            }
        } catch (err) {
            console.error("Eroare la încărcarea profilului jucătorului:", err);
        } finally {
            setLoadingPlayerCard(false);
        }
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
                } else if (item?.player?.pos === 'D') { row = 2; col = 1;
                } else if (item?.player?.pos === 'M') { row = 3; col = 1;
                } else { row = 4; col = 1; }
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

        if (formationStr && /^\d+(-\d+)+$/.test(formationStr.trim())) {
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
        const targetNorm = normalizeName(playerName);

        events.forEach((ev: any) => {
            const evPlayerNorm = normalizeName(ev.player?.name);
            const isSamePlayer = (playerId && ev.player?.id === playerId) || (targetNorm && evPlayerNorm && evPlayerNorm === targetNorm);
            const evAssistNorm = normalizeName(ev.assist?.name);
            const isSubbedOut = ev.type === 'subst' && ((playerId && ev.assist?.id === playerId) || (targetNorm && evAssistNorm && evAssistNorm === targetNorm));
            if (isSamePlayer) {
                const pres = getEventPresentation(ev);
                if (pres.isActualGoal) goals += 1;
                if (ev.type === 'Card' && (ev.detail === 'Yellow Card' || ev.detail === 'Second Yellow card')) yellow = true;
                if (ev.type === 'Card' && ev.detail?.includes('Red')) red = true;
                if (ev.type === 'subst') subOut = true;
            }
            if (isSubbedOut) { subOut = true; }
        });
        return { goals, yellow, red, subOut };
    };

    const renderPitchPlayerNode = (item: any, isAwayTeam: boolean, idx: number, teamName?: string) => {
        const pName: string = item?.player?.name || "Jucător";
        const pNum = item?.player?.number ?? "-";
        const pPos = item?.player?.pos || "";
        const pRating = item?.player?.rating;
        const isGK = pPos === 'G';
        const badges = getPlayerMatchBadges(pName, item?.player?.id);
        const resolvedFullName = getDisplayPlayerName(pName, teamName);
        const shortName = resolvedFullName.includes(' ')
            ? `${resolvedFullName.split(' ')[0].charAt(0)}. ${resolvedFullName.split(' ').slice(-1)[0]}`
            : resolvedFullName;

        let shirtStyle = isAwayTeam ? "bg-slate-900 text-white border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-white text-slate-900 border-slate-300 shadow-[0_0_10px_rgba(255,255,255,0.5)]";
        if (isGK) { shirtStyle = isAwayTeam ? "bg-amber-500 text-slate-950 border-amber-300" : "bg-yellow-400 text-slate-950 border-white"; }

        const ratingNum = pRating ? parseFloat(pRating) : 0;
        const ratingBg = ratingNum >= 7.5 ? "bg-emerald-500" : ratingNum >= 6.8 ? "bg-emerald-600" : ratingNum > 0 ? "bg-amber-500" : "bg-slate-700";

        return (
            <div
                key={item?.player?.id || `${pName}-${idx}`}
                onClick={() => handleOpenPlayerProfile(pName, teamName)}
                className="cursor-pointer group flex flex-col items-center select-none w-auto sm:w-[85px] z-10 mx-0.5 sm:mx-1"
                title={`${resolvedFullName} (#${pNum}) - Apasă pentru profil`}
            >
                <div className="relative">
                    <div className={`w-7 h-7 sm:w-12 sm:h-12 rounded-full ${shirtStyle} font-black text-[9px] sm:text-base flex items-center justify-center border-2 sm:border-4 group-hover:scale-110 transition-transform`}>{pNum}</div>
                    {ratingNum > 0 && <span className={`absolute -top-1.5 -right-1 sm:-right-3 ${ratingBg} text-white text-[6px] sm:text-[9px] font-black px-1 sm:px-1.5 py-0.5 rounded shadow-sm border border-white/30`}>{ratingNum.toFixed(1)}</span>}
                    {badges.goals > 0 && <span className="absolute -bottom-1 -right-1 sm:-bottom-1.5 sm:-right-2 bg-white text-[7px] sm:text-[10px] rounded-full px-0.5 sm:px-1 shadow border border-slate-200 font-black text-slate-900">⚽{badges.goals > 1 ? badges.goals : ''}</span>}
                    {(badges.yellow || badges.red) && <span className={`absolute -top-1 -left-1 w-2 h-2.5 sm:w-3 sm:h-4 rounded-[1px] sm:rounded-sm shadow border border-white/50 ${badges.red ? 'bg-red-600' : 'bg-yellow-400'}`} />}
                    {badges.subOut && <span className="absolute -bottom-1 -left-1 sm:-bottom-1.5 sm:-left-2 bg-slate-900 text-white text-[6px] sm:text-[8px] rounded-full w-2.5 h-2.5 sm:w-4 sm:h-4 flex items-center justify-center shadow border border-white/50">🔄</span>}
                </div>
                <div className="mt-0.5 sm:mt-1 bg-slate-950/90 group-hover:bg-emerald-700 text-white text-[6px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded shadow-md max-w-full text-center border border-white/10 tracking-tight sm:tracking-wide leading-tight w-full break-words truncate transition-colors">{shortName}</div>
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
            const drawChance = Math.max(12, 30 - Math.floor(diff / 2));
            const remainingChance = 100 - drawChance;
            const homeChance = Math.round((homeTotal / matchTotal) * remainingChance);
            const awayChance = remainingChance - homeChance;

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

    const liveStandings = useMemo(() => {
        if (!standingsData || standingsData.length === 0) return [];

        return standingsData.map(groupTable => {
            const liveTable = groupTable.map((row: any) => ({
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

    const playerMetrics = selectedPlayer ? computeScoutingMetrics(selectedPlayer) : null;

    return (
        <div className="w-full max-w-5xl mx-auto py-6 sm:py-8 px-2 sm:px-4 min-h-[80vh] relative z-0 animate-in fade-in duration-500 pb-24 sm:pb-20 mt-4 sm:mt-0">
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none opacity-[0.03] dark:opacity-[0.05]">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,#000_20px,#000_22px)]"></div>
            </div>

            <div className="mb-6 sm:mb-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border-2 border-slate-800 p-4 rounded-2xl sm:rounded-3xl shadow-xl text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 sm:p-2.5 bg-emerald-500/20 rounded-xl sm:rounded-2xl border border-emerald-500/30 shrink-0">
                            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-xl font-black uppercase tracking-tight">Program Meciuri</h2>
                            <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest">{matches.length} Meciuri</p>
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
                                                    <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFav ? 'fill-current' : ''}`} />
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
                                );
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
                                                        const eventTeamName = isHome ? selectedMatchDetails.home_team_name : selectedMatchDetails.away_team_name;
                                                        const presentation = getEventPresentation(ev);
                                                        return (
                                                            <div key={idx} className={`flex items-center p-2.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors ${isHome ? 'flex-row' : 'flex-row-reverse text-right'}`}>
                                                                <div className="w-8 sm:w-16 font-black text-slate-900 dark:text-white text-center shrink-0 text-[10px] sm:text-base bg-slate-100 dark:bg-slate-800 py-0.5 sm:py-1 rounded">{ev.time?.elapsed}'</div>
                                                                <div className="text-sm sm:text-2xl mx-2 sm:mx-4 shrink-0 drop-shadow-md">{presentation.icon}</div>
                                                                <div className="flex-1 min-w-0">
                                                                    {ev.type === "subst" ? (
                                                                        <>
                                                                            <p className="font-black text-emerald-600 dark:text-emerald-500 tracking-tight text-[9px] sm:text-sm truncate uppercase">
                                                                                INTRĂ:{' '}
                                                                                {ev.assist?.name ? (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleOpenPlayerProfile(ev.assist.name, eventTeamName)}
                                                                                        className="underline decoration-emerald-500/40 hover:decoration-emerald-400 cursor-pointer font-black uppercase"
                                                                                    >
                                                                                        {getDisplayPlayerName(ev.assist.name, eventTeamName)}
                                                                                    </button>
                                                                                ) : (
                                                                                    "N/A"
                                                                                )}
                                                                            </p>
                                                                            <p className="text-[8px] sm:text-[10px] font-bold text-rose-600 dark:text-rose-500 tracking-widest truncate mt-0.5 uppercase">
                                                                                IESE:{' '}
                                                                                {ev.player?.name && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleOpenPlayerProfile(ev.player.name, eventTeamName)}
                                                                                        className="underline decoration-rose-500/40 hover:decoration-rose-400 cursor-pointer font-bold uppercase"
                                                                                    >
                                                                                        {getDisplayPlayerName(ev.player.name, eventTeamName)}
                                                                                    </button>
                                                                                )}
                                                                            </p>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <div className={`flex flex-wrap items-center gap-1.5 ${isHome ? 'justify-start' : 'justify-end'}`}>
                                                                                {ev.player?.name && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleOpenPlayerProfile(ev.player.name, eventTeamName)}
                                                                                        className="font-black text-slate-900 dark:text-white tracking-tight text-[10px] sm:text-sm hover:text-emerald-600 dark:hover:text-emerald-400 underline decoration-slate-300 dark:decoration-slate-700 hover:decoration-emerald-500 cursor-pointer"
                                                                                    >
                                                                                        {getDisplayPlayerName(ev.player.name, eventTeamName)}
                                                                                    </button>
                                                                                )}
                                                                                {presentation.badge && (
                                                                                    <span className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-wider border ${presentation.badgeClass}`}>
                                                                                        {presentation.badge}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {ev.assist?.name && (
                                                                                <p className="text-[8px] sm:text-[10px] font-bold text-slate-500 tracking-widest truncate mt-0.5">
                                                                                    Pasă:{' '}
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleOpenPlayerProfile(ev.assist.name, eventTeamName)}
                                                                                        className="hover:text-emerald-600 dark:hover:text-emerald-400 underline decoration-slate-400/40 cursor-pointer font-bold"
                                                                                    >
                                                                                        {getDisplayPlayerName(ev.assist.name, eventTeamName)}
                                                                                    </button>
                                                                                </p>
                                                                            )}
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
                                                        <div className="absolute top-1/2 inset-x-1.5 sm:inset-3 h-0.5 sm:h-1 bg-white/50 -translate-y-1/2 pointer-events-none"></div>
                                                        <div className="absolute top-1/2 left-1/2 w-16 h-16 sm:w-40 sm:h-40 border-2 sm:border-4 border-white/50 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                                                        <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 sm:w-3 sm:h-3 bg-white/70 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

                                                        {lineupViewMode === 'both' ? (
                                                            <>
                                                                <div className="flex-1 flex flex-col justify-around relative z-10 pb-2 sm:pb-4 pt-1">
                                                                    {homeRowsTopDown.map((rowItems, rIdx) => (
                                                                        <div key={`home-row-${rIdx}`} className="flex items-center justify-around px-1 sm:px-2">{rowItems.map((item: any, pIdx: number) => renderPitchPlayerNode(item, false, pIdx, homeTeamLineup?.team?.name))}</div>
                                                                    ))}
                                                                </div>
                                                                <div className="flex-1 flex flex-col justify-around relative z-10 pt-2 sm:pt-4 pb-1">
                                                                    {awayRowsBottomUp.map((rowItems, rIdx) => (
                                                                        <div key={`away-row-${rIdx}`} className="flex items-center justify-around px-1 sm:px-2">{rowItems.map((item: any, pIdx: number) => renderPitchPlayerNode(item, true, pIdx, awayTeamLineup?.team?.name))}</div>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="flex-1 flex flex-col justify-around relative z-10 py-2 sm:py-4">
                                                                {singleTeamRows.map((rowItems, rIdx) => (
                                                                    <div key={`single-row-${rIdx}`} className="flex items-center justify-around px-1 sm:px-2">{rowItems.map((item: any, pIdx: number) => renderPitchPlayerNode(item, lineupViewMode === 'away', pIdx, singleTeamLineup?.team?.name))}</div>
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
                                                            <StandingsTable
                                                                data={groupTable}
                                                                selectedMatchDetails={selectedMatchDetails}
                                                                handleTeamClick={handleTeamClick}
                                                            />
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

            {selectedTeam && createPortal(
                <div className="fixed inset-0 top-0 sm:top-16 z-[9999999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm transition-opacity p-2 sm:p-4">
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl sm:rounded-3xl w-full max-w-4xl h-[95vh] sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col shadow-2xl sm:border-4 border-emerald-600/30 animate-in fade-in zoom-in duration-300 mt-10 sm:mt-0">

                        <div className="bg-slate-950 text-white p-3 sm:p-6 flex items-start sm:items-center justify-between shrink-0 border-b-2 sm:border-b-4 border-slate-700 relative pt-safe">
                            <div className="flex items-center gap-3 sm:gap-6 min-w-0 pr-10 sm:pr-0">
                                <div className="w-12 h-12 sm:w-20 sm:h-20 bg-white p-1 sm:p-2 rounded-xl sm:rounded-2xl shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.2)] flex items-center justify-center">
                                    {hasValidImageUrl(selectedTeam.teamInfo.logo) ? (
                                        <img src={selectedTeam.teamInfo.logo} alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    ) : (
                                        <Trophy className="w-7 h-7 sm:w-10 sm:h-10 text-emerald-600" />
                                    )}
                                </div>
                                <div className="min-w-0 flex flex-col">
                                    <h2 className="text-lg sm:text-4xl font-black uppercase tracking-tighter truncate drop-shadow-md">{sanitizeTeamName(selectedTeam.teamInfo.name, "Echipă")}</h2>
                                    <p className="text-[9px] sm:text-base text-emerald-400 font-bold uppercase tracking-widest mt-0.5 truncate">
                                        ⚽ LOTUL OFICIAL • {selectedTeam.teamInfo.totalPlayers} Jucători
                                    </p>
                                </div>
                            </div>
                            <div className="absolute top-3 right-3 sm:static flex items-center gap-2">
                                <button onClick={() => setSelectedTeam(null)} className="p-1.5 sm:p-3 bg-white/10 hover:bg-rose-500 rounded-lg sm:rounded-full border border-white/20 hover:border-rose-600 transition-colors text-white shrink-0">
                                    <X className="w-4 h-4 sm:w-6 sm:h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-y-auto p-2 sm:p-6 bg-slate-100 dark:bg-slate-950 space-y-4 sm:space-y-6 flex-1 pb-safe-bottom pb-20">
                            {([
                                { title: "Portari", data: selectedTeam.squad.Goalkeepers, color: "text-amber-500 border-amber-500", bg: "bg-amber-500/10" },
                                { title: "Fundași", data: selectedTeam.squad.Defenders, color: "text-blue-500 border-blue-500", bg: "bg-blue-500/10" },
                                { title: "Mijlocași", data: selectedTeam.squad.Midfielders, color: "text-emerald-500 border-emerald-500", bg: "bg-emerald-500/10" },
                                { title: "Atacanți", data: selectedTeam.squad.Attackers, color: "text-rose-500 border-rose-500", bg: "bg-rose-500/10" }
                            ]).map((section, idx) => section.data.length > 0 && (
                                <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl shadow-md border-2 border-slate-200 dark:border-slate-800 overflow-hidden">
                                    <div className={`px-3 py-2 sm:px-4 sm:py-3 border-l-4 ${section.color} ${section.bg} border-b border-b-slate-100 dark:border-b-slate-800`}>
                                        <h3 className={`font-black uppercase tracking-wider text-xs sm:text-base ${section.color.split(' ')[0]}`}>{section.title}</h3>
                                    </div>
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {section.data.map(p => (
                                            <div key={p._id} onClick={() => handleOpenPlayerProfile(p, selectedTeam.teamInfo.name)} className="flex items-center justify-between p-2 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition gap-2 cursor-pointer">
                                                <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                                                    <img src={p.image || GENERIC_USER_IMAGE} alt={p.name} className="w-8 h-8 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shrink-0 bg-white" onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }} />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-base break-words uppercase tracking-tight" title={p.name}>{p.name}</p>
                                                        <div className="flex gap-1.5 text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate uppercase tracking-wider">
                                                            {p.age && <span className="shrink-0">{p.age} ani</span>}
                                                            {p.nationality && <span className="truncate">• {p.nationality}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {selectedPlayer && createPortal(
                <div
                    className="fixed inset-0 z-[99999999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedPlayer(null)}
                >
                    <div
                        className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[92dvh] overflow-hidden flex flex-col shadow-2xl border-2 sm:border-4 border-emerald-600/40"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-slate-950 text-white p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 sm:border-b-4 border-emerald-600 shrink-0 relative">
                            <button
                                type="button"
                                onClick={() => setSelectedPlayer(null)}
                                className="absolute top-3 right-3 sm:static p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-white border border-slate-700 transition-colors shrink-0 order-3 sm:order-none"
                                title="Închide"
                            >
                                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>

                            <div className="flex items-center gap-3 sm:gap-5 min-w-0 pr-10 sm:pr-0">
                                <img
                                    src={selectedPlayer.image || GENERIC_USER_IMAGE}
                                    alt={selectedPlayer.name}
                                    onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }}
                                    className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 sm:border-4 border-emerald-500 bg-white shrink-0 shadow-lg"
                                />
                                <div className="min-w-0">
                                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">
                                        Fișă Jucător • Scouting
                                    </span>
                                    <h3 className="text-xl sm:text-3xl font-black uppercase tracking-tight leading-none break-words">
                                        {selectedPlayer.name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm font-black text-emerald-400 uppercase tracking-wider">
                                        {hasValidImageUrl(selectedPlayer.team_logo) && (
                                            <img src={selectedPlayer.team_logo} alt="" className="w-4 h-4 sm:w-5 sm:h-5 object-contain bg-white rounded p-0.5 shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                        )}
                                        <span className="truncate">{sanitizeTeamName(selectedPlayer, 'Echipă necunoscută')}</span>
                                    </div>
                                </div>
                            </div>

                            {!selectedPlayer._id.startsWith('temp_') && (
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={(e) => toggleWatchlist(e, selectedPlayer)}
                                        className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl border text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                            watchlistIds.includes(selectedPlayer._id)
                                                ? 'bg-emerald-600 text-white border-emerald-500'
                                                : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        <Bookmark className={`w-3.5 h-3.5 ${watchlistIds.includes(selectedPlayer._id) ? 'fill-current' : ''}`} />
                                        {watchlistIds.includes(selectedPlayer._id) ? 'În Listă' : 'Listă'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => toggleComparePlayer(e, selectedPlayer)}
                                        className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl border text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                            compareList.some(p => p._id === selectedPlayer._id)
                                                ? 'bg-amber-500 text-slate-950 border-amber-400'
                                                : 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700'
                                        }`}
                                    >
                                        <Scale className="w-3.5 h-3.5" />
                                        Compară
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 bg-slate-50 dark:bg-slate-950 flex-1">
                            {loadingPlayerCard ? (
                                <div className="py-10 text-center text-xs font-black uppercase tracking-widest text-slate-400">
                                    Se încarcă datele complete ale jucătorului...
                                </div>
                            ) : selectedPlayer._id.startsWith('temp_') ? (
                                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs sm:text-sm space-y-2">
                                    <p className="font-black uppercase text-slate-900 dark:text-white">
                                        {selectedPlayer.name}
                                    </p>
                                    <p className="text-slate-500 dark:text-slate-400 font-bold">
                                        Echipă în meci: {sanitizeTeamName(selectedPlayer, '—')}
                                    </p>
                                    <p className="text-xs text-slate-400 pt-1">
                                        Acest jucător nu are încă o fișă completă în baza de date de scouting.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {selectedPlayer.nationality && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                                <Globe className="w-3.5 h-3.5 text-emerald-500" /> {selectedPlayer.nationality}
                                            </span>
                                        )}
                                        {selectedPlayer.age && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                                <Users className="w-3.5 h-3.5 text-blue-500" /> {selectedPlayer.age} ANI
                                            </span>
                                        )}
                                        {(selectedPlayer.height || selectedPlayer.weight) && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                                <Activity className="w-3.5 h-3.5 text-emerald-500" /> {selectedPlayer.height || '—'} / {selectedPlayer.weight || '—'}
                                            </span>
                                        )}
                                        {selectedPlayer.position && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                                {selectedPlayer.position}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                                            <Award className="w-4 h-4 text-amber-500" /> Cifrele Sezonului
                                        </h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
                                            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-center">
                                                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white block">{playerMetrics?.apps ?? 0}</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Meciuri</span>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border-2 border-emerald-500/40 text-center">
                                                <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 block">{playerMetrics?.goals ?? 0}</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Goluri</span>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border-2 border-blue-500/40 text-center">
                                                <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 block">{playerMetrics?.assists ?? 0}</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pase Decisive</span>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-center">
                                                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white block">{playerMetrics?.minutes ?? 0}&apos;</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Minute</span>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-900 p-3 rounded-2xl border-2 border-amber-500/50 text-center">
                                                <span className="text-xl sm:text-2xl font-black text-amber-500 block">
                                                    {playerMetrics && playerMetrics.rating > 0 ? playerMetrics.rating.toFixed(2) : '—'}
                                                </span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Rating SofaScore</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-6 border-2 border-slate-800 space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                            <div className="flex flex-col items-center">
                                                <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-1.5">
                                                    <Activity className="w-4 h-4" /> Analiza Scouter (Radar)
                                                </h4>
                                                <PlayerRadarChart primaryPlayer={selectedPlayer} />
                                            </div>

                                            <div className="space-y-3">
                                                <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                                                    <TrendingUp className="w-4 h-4" /> Randament / 90 Minute
                                                </h4>
                                                <div className="grid grid-cols-2 gap-2.5">
                                                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Goluri / 90&apos;</span>
                                                        <span className="text-base sm:text-lg font-black text-emerald-400">{playerMetrics?.goalsPer90 ?? 0}</span>
                                                    </div>
                                                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Assist / 90&apos;</span>
                                                        <span className="text-base sm:text-lg font-black text-blue-400">{playerMetrics?.assistsPer90 ?? 0}</span>
                                                    </div>
                                                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Contribuții / 90&apos;</span>
                                                        <span className="text-base sm:text-lg font-black text-amber-400">{playerMetrics?.contributionsPer90 ?? 0}</span>
                                                    </div>
                                                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Min / Contribuție</span>
                                                        <span className="text-base sm:text-lg font-black text-white">
                                                            {playerMetrics && playerMetrics.minsPerContribution > 0 ? `${playerMetrics.minsPerContribution}'` : '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {Array.isArray(selectedPlayer.detailed_stats) && selectedPlayer.detailed_stats.length > 0 && (
                                            <div className="pt-4 border-t border-slate-800 space-y-2">
                                                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    Statistici pe Competiții
                                                </h5>
                                                <div className="divide-y divide-slate-800/80 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden text-xs">
                                                    {selectedPlayer.detailed_stats.map((st, idx) => (
                                                        <div key={idx} className="flex items-center justify-between px-3.5 py-2.5 gap-2">
                                                            <div className="min-w-0">
                                                                <p className="font-black text-white truncate">{st.competition}</p>
                                                                <p className="text-[10px] text-slate-400 font-bold">{st.appearances} meciuri • {st.minutes}&apos;</p>
                                                            </div>
                                                            <div className="text-right font-black shrink-0 text-[11px]">
                                                                <span className="text-emerald-400">{st.goals}G</span>
                                                                <span className="text-slate-600 mx-1">/</span>
                                                                <span className="text-blue-400">{st.assists}A</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showCompareModal && compareList.length === 2 && createPortal(
                <div
                    className="fixed inset-0 z-[999999999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-3 sm:p-4"
                    onClick={() => setShowCompareModal(false)}
                >
                    <div
                        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl overflow-hidden border-2 sm:border-4 border-amber-500/50 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-slate-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
                            <h3 className="text-sm sm:text-base font-black uppercase tracking-widest flex items-center gap-2">
                                <Scale className="w-4 h-4 text-amber-400" /> Comparare Jucători
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowCompareModal(false)}
                                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
                            {(() => {
                                const [p1, p2] = compareList;
                                const m1 = computeScoutingMetrics(p1);
                                const m2 = computeScoutingMetrics(p2);
                                const rows = [
                                    { label: 'Meciuri', v1: m1.apps, v2: m2.apps },
                                    { label: 'Goluri', v1: m1.goals, v2: m2.goals },
                                    { label: 'Pase Decisive', v1: m1.assists, v2: m2.assists },
                                    { label: 'Minute', v1: m1.minutes, v2: m2.minutes },
                                    { label: 'Rating', v1: m1.rating, v2: m2.rating },
                                    { label: 'Goluri / 90\'', v1: m1.goalsPer90, v2: m2.goalsPer90 },
                                    { label: 'Assist / 90\'', v1: m1.assistsPer90, v2: m2.assistsPer90 },
                                ];
                                return (
                                    <>
                                        <div className="grid grid-cols-3 items-center gap-2 text-center font-black uppercase">
                                            <div className="truncate text-emerald-600 dark:text-emerald-400">{p1.name}</div>
                                            <div className="text-[10px] text-slate-400">Metrică</div>
                                            <div className="truncate text-blue-600 dark:text-blue-400">{p2.name}</div>
                                        </div>
                                        <div className="divide-y divide-slate-200 dark:divide-slate-800 border rounded-2xl border-slate-200 dark:border-slate-800 overflow-hidden">
                                            {rows.map((r, i) => (
                                                <div key={i} className="grid grid-cols-3 items-center px-3 py-2.5 text-center bg-slate-50 dark:bg-slate-950">
                                                    <span className={`font-black ${r.v1 > r.v2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>{r.v1}</span>
                                                    <span className="text-[10px] font-bold uppercase text-slate-500">{r.label}</span>
                                                    <span className={`font-black ${r.v2 > r.v1 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{r.v2}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}