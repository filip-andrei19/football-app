import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { io } from 'socket.io-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, SortingState } from '@tanstack/react-table';
import {
    Calendar, Trophy, X, Globe,
    Users, BarChart2, ListOrdered, Clock, Bookmark,
    Swords, History, ArrowUp, ArrowDown, Minus,
    Heart, Bell, Scale, Activity, Award, TrendingUp,
    CheckCircle2, Ban, Radio
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

const playNotificationSound = () => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(740, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(980, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
    } catch {}
};

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

// ==========================================
// INTERPRETARE EVENIMENTE MECI
// ==========================================
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
            icon: '✕',
            iconClass: 'bg-rose-500/15 text-rose-500 border-rose-500/25',
            badge: 'Penalty ratat',
            badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/25',
            isActualGoal: false,
        };
    }

    if (type === 'goal') {
        if (combinedLower.includes('cancelled') || combinedLower.includes('disallowed') || combinedLower.includes('var')) {
            return {
                icon: 'VAR',
                iconClass: 'bg-amber-500/15 text-amber-500 border-amber-500/25 text-[9px] font-semibold',
                badge: detail || 'Gol anulat',
                badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/25',
                isActualGoal: false,
            };
        }
        if (combinedLower.includes('own')) {
            return {
                icon: '●',
                iconClass: 'bg-rose-500/15 text-rose-500 border-rose-500/25',
                badge: 'Autogol',
                badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/25',
                isActualGoal: true,
            };
        }
        if (combinedLower.includes('penalty')) {
            return {
                icon: '●',
                iconClass: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25',
                badge: 'Penalty',
                badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25',
                isActualGoal: true,
            };
        }
        return {
            icon: '●',
            iconClass: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25',
            badge: null,
            badgeClass: '',
            isActualGoal: true,
        };
    }

    if (type === 'var') {
        return {
            icon: 'VAR',
            iconClass: 'bg-purple-500/15 text-purple-400 border-purple-500/25 text-[9px] font-semibold',
            badge: detail || 'VAR',
            badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
            isActualGoal: false,
        };
    }

    if (type === 'card') {
        if (combinedLower.includes('red')) {
            return {
                icon: '■',
                iconClass: 'bg-rose-500/15 text-rose-500 border-rose-500/25',
                badge: 'Cartonaș roșu',
                badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/25',
                isActualGoal: false,
            };
        }
        if (combinedLower.includes('second yellow')) {
            return {
                icon: '■',
                iconClass: 'bg-amber-500/15 text-amber-500 border-amber-500/25',
                badge: 'Al doilea galben',
                badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/25',
                isActualGoal: false,
            };
        }
        return {
            icon: '■',
            iconClass: 'bg-amber-400/15 text-amber-400 border-amber-400/25',
            badge: null,
            badgeClass: '',
            isActualGoal: false,
        };
    }

    if (type === 'subst') {
        return {
            icon: '⇄',
            iconClass: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
            badge: null,
            badgeClass: '',
            isActualGoal: false,
        };
    }

    return {
        icon: '•',
        iconClass: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
        badge: detail || ev?.type || 'Eveniment',
        badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        isActualGoal: false,
    };
};

function StandingsTable({ data, selectedMatchDetails, handleTeamClick }: { data: any[], selectedMatchDetails: any, handleTeamClick: any }) {
    const [sorting, setSorting] = useState<SortingState>([]);

    const columns = useMemo(() => [
        {
            accessorKey: 'liveRank',
            header: '#',
            cell: (info: any) => <div className="text-center font-medium text-slate-500 font-mono-stats">{info.getValue()}</div>,
        },
        {
            accessorKey: 'trend',
            header: '',
            cell: (info: any) => {
                const trend = info.getValue();
                return (
                    <div className="text-center flex justify-center">
                        {trend === 'up' && <ArrowUp className="w-3 h-3 text-emerald-500" />}
                        {trend === 'down' && <ArrowDown className="w-3 h-3 text-rose-500" />}
                        {trend === 'same' && <Minus className="w-3 h-3 text-slate-300 dark:text-slate-600" />}
                    </div>
                );
            }
        },
        {
            id: 'team',
            accessorFn: (row: any) => row.team?.name,
            header: 'Echipă',
            cell: (info: any) => {
                const row = info.row.original;
                const isCurrentTeam = row.team?.id === selectedMatchDetails.home_team_id || row.team?.id === selectedMatchDetails.away_team_id;
                const isPlayingNow = row.isLivePlaying;
                return (
                    <div className="flex items-center gap-2.5">
                        <img src={row.team?.logo} alt="logo" className="w-5 h-5 object-contain shrink-0" />
                        <span className={`font-medium truncate max-w-[110px] sm:max-w-[220px] ${isCurrentTeam ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-900 dark:text-slate-100'}`}>
                            {row.team?.name}
                        </span>
                        {isPlayingNow && (
                            <span className="px-1.5 py-0.5 bg-rose-500/15 text-rose-500 border border-rose-500/25 text-[9px] font-semibold rounded">
                                Live
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            accessorKey: 'livePlayed',
            header: 'MJ',
            cell: (info: any) => <div className="text-center text-slate-500 dark:text-slate-400 font-mono-stats">{info.getValue()}</div>,
        },
        {
            id: 'goals',
            accessorFn: (row: any) => row.liveGoalsFor - row.liveGoalsAgainst,
            header: 'Golaveraj',
            cell: (info: any) => {
                const row = info.row.original;
                return <div className="text-center text-slate-500 dark:text-slate-400 text-xs font-mono-stats whitespace-nowrap">{row.liveGoalsFor}:{row.liveGoalsAgainst}</div>;
            }
        },
        {
            accessorKey: 'livePoints',
            header: 'Pct',
            cell: (info: any) => {
                const points = info.getValue();
                const row = info.row.original;
                const isCurrentTeam = row.team?.id === selectedMatchDetails.home_team_id || row.team?.id === selectedMatchDetails.away_team_id;
                const isPlayingNow = row.isLivePlaying;
                return (
                    <div className={`text-center font-semibold font-mono-stats ${isPlayingNow ? 'text-amber-500' : isCurrentTeam ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                        {points}
                    </div>
                );
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
            <table className="w-full text-xs sm:text-[13px] text-left min-w-[320px]">
                <thead className="bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 font-medium text-[11px] border-b border-slate-200 dark:border-white/[0.07]">
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <th
                                    key={header.id}
                                    onClick={header.column.getToggleSortingHandler()}
                                    className="py-2.5 px-2 sm:px-3 cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                    <div className={`flex items-center gap-1 ${header.id === 'team' ? 'justify-start' : 'justify-center'}`}>
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                        {header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                    {table.getRowModel().rows.map(row => {
                        const isCurrentTeam = row.original.team?.id === selectedMatchDetails.home_team_id || row.original.team?.id === selectedMatchDetails.away_team_id;
                        const isPlayingNow = row.original.isLivePlaying;
                        return (
                            <tr
                                key={row.id}
                                onClick={(e) => handleTeamClick(e, row.original.team?.name)}
                                className={`cursor-pointer transition-colors ${
                                    isPlayingNow
                                        ? 'bg-amber-500/[0.05]'
                                        : isCurrentTeam
                                        ? 'bg-emerald-500/[0.06]'
                                        : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                                }`}
                            >
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="py-2.5 px-2 sm:px-3">
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
    const size = isMobile ? 190 : 230;
    const center = size / 2;
    const radius = isMobile ? 60 : 78;
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
            <svg width={size} height={size} className="overflow-visible">
                {[25, 50, 75, 100].map((level) => {
                    const pts = axes.map((_, idx) => {
                        const { x, y } = getCoordinates(idx, level);
                        return `${x},${y}`;
                    }).join(" ");
                    return <polygon key={level} points={pts} fill="none" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="1" strokeDasharray={level < 100 ? "3 3" : undefined} />;
                })}
                {axes.map((_, idx) => {
                    const end = getCoordinates(idx, 100);
                    return <line key={idx} x1={center} y1={center} x2={end.x} y2={end.y} stroke="rgba(148, 163, 184, 0.2)" strokeWidth="1" />;
                })}
                <polygon points={buildPolygonPoints(m1.radar)} fill="rgba(16, 185, 129, 0.22)" stroke="#10b981" strokeWidth="2" />
                {m1.radar.map((item, idx) => {
                    const pt1 = getCoordinates(idx, item.value);
                    const labelPos = getCoordinates(idx, 124);
                    return (
                        <g key={idx}>
                            <circle cx={pt1.x} cy={pt1.y} r={isMobile ? "3" : "3.5"} fill="#10b981" stroke="#090D16" strokeWidth="1.5" />
                            <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="middle" className="text-[9px] sm:text-[10px] font-medium fill-slate-500 dark:fill-slate-400">
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
    const [notifPermission, setNotifPermission] = useState<string>(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            return Notification.permission;
        }
        return 'unsupported';
    });

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

    // Ascultă mesajul PLAY_NOTIF_SOUND de la Service Worker când vine un push în fundal cu tab-ul deschis
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;
        const handleSwMessage = (event: MessageEvent) => {
            if (event.data?.type === 'PLAY_NOTIF_SOUND') {
                playNotificationSound();
            }
        };
        navigator.serviceWorker.addEventListener('message', handleSwMessage);
        return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    }, []);

    const [selectedTeam, setSelectedTeam] = useState<SquadData | null>(null);
    const [loadingRoster, setLoadingRoster] = useState(false);

    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [loadingPlayerCard, setLoadingPlayerCard] = useState(false);

    const resolvedPlayerCache = useRef<Record<string, Player | null>>({});
    const inFlightPlayerRequests = useRef(new Map());

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

    const getPlayerCacheKey = (rawName: string, fallbackTeam?: string, apiPlayerId?: number) => {
        if (apiPlayerId) return `id_${apiPlayerId}`;
        return `${normalizeName(rawName)}__${normalizeName(sanitizeTeamName(fallbackTeam, ''))}`;
    };

    const findPlayerInDB = (
        rawName: string,
        fallbackTeam?: string,
        apiPlayerId?: number
    ): Promise<Player | undefined> => {
        const cleanName = rawName.trim();
        const targetNorm = normalizeName(cleanName);
        const cleanFallbackTeam = sanitizeTeamName(fallbackTeam, '');
        const fallbackTeamNorm = normalizeName(cleanFallbackTeam);
        const cacheKey = getPlayerCacheKey(cleanName, cleanFallbackTeam, apiPlayerId);

        if (Object.prototype.hasOwnProperty.call(resolvedPlayerCache.current, cacheKey)) {
            return Promise.resolve(resolvedPlayerCache.current[cacheKey] || undefined);
        }

        const existingReq = inFlightPlayerRequests.current.get(cacheKey);
        if (existingReq) return existingReq;

        const requestPromise = (async (): Promise<Player | undefined> => {
            try {
                if (apiPlayerId) {
                    try {
                        const resById = await fetch(`${API_BASE}/api/sport/players/by-api-id/${apiPlayerId}`);
                        if (resById.ok) {
                            const exactPlayer: Player = await resById.json();
                            const resolved: Player = {
                                ...exactPlayer,
                                name: exactPlayer.name || cleanName,
                                team_name: sanitizeTeamName(exactPlayer, cleanFallbackTeam),
                            };
                            resolvedPlayerCache.current[cacheKey] = resolved;
                            return resolved;
                        }
                    } catch {}
                }

                const tokens = targetNorm.split(' ').filter(t => t.length >= 2);
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

                            if (candNorm === targetNorm) score += 500;

                            for (const tok of tokens) {
                                if (candNorm.includes(tok)) {
                                    score += tok.length >= 3 ? 110 : 60;
                                }
                            }

                            if (fallbackTeamNorm && candTeam) {
                                if (candTeam.includes(fallbackTeamNorm) || fallbackTeamNorm.includes(candTeam)) {
                                    score += 140;
                                }
                            }

                            if (score > bestScore && score >= 60) {
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
            } finally {
                inFlightPlayerRequests.current.delete(cacheKey);
            }
        })();

        inFlightPlayerRequests.current.set(cacheKey, requestPromise);
        return requestPromise;
    };

    const getDisplayPlayerName = (rawName?: string, fallbackTeam?: string, apiPlayerId?: number): string => {
        if (!rawName || typeof rawName !== 'string') return "";
        const cacheKey = getPlayerCacheKey(rawName, fallbackTeam, apiPlayerId);
        return resolvedPlayerCache.current[cacheKey]?.name || rawName;
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

    const handleEnablePushNotifications = async () => {
        if (!('Notification' in window)) {
            toast.error("Browserul tău nu suportă notificări.");
            return;
        }
        if (!userEmail) {
            toast.error("Conectează-te în cont pentru a activa notificările.");
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            setNotifPermission(permission);

            if (permission === 'granted') {
                await subscribeToPushNotifications(userEmail);
                playNotificationSound();
                toast.success("Notificările în bară au fost activate.");

                if (navigator.serviceWorker) {
                    navigator.serviceWorker.ready
                        .then((reg) => {
                            reg.showNotification("România Scout • Alerte Live", {
                                body: "Vei primi notificări pentru meciurile tale favorite.",
                                icon: "/icon-192.png",
                                badge: "/icon-192.png",
                                vibrate: [200, 100, 200],
                                silent: false,
                            } as any);
                        })
                        .catch(() => {});
                }
            } else if (permission === 'denied') {
                toast.error("Notificările sunt blocate din setările browserului.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Nu am putut activa notificările.");
        }
    };

    useEffect(() => {
        if ("Notification" in window) {
            setNotifPermission(Notification.permission);
            if (Notification.permission === "granted" && userEmail) {
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
            let label = d.toLocaleDateString('ro-RO', { weekday: 'short' });
            if (i === 0) label = "Azi";
            if (i === -1) label = "Ieri";
            if (i === 1) label = "Mâine";
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
                            playNotificationSound();
                            if (!("Notification" in window) || Notification.permission !== "granted") return;

                            const options: any = {
                                body,
                                icon: '/icon-192.png',
                                badge: '/icon-192.png',
                                vibrate: [200, 100, 200],
                                silent: false,
                                renotify: true,
                                tag: `match-${updatedMatch.fixture_id}`,
                                data: { fixtureId: updatedMatch.fixture_id }
                            };

                            if (navigator.serviceWorker) {
                                navigator.serviceWorker.ready
                                    .then(reg => reg.showNotification(`România Scout • ${title}`, options))
                                    .catch(() => new Notification(`România Scout • ${title}`, options));
                            } else {
                                new Notification(`România Scout • ${title}`, options);
                            }
                        };

                        if ((homeGoal || awayGoal) && prefs.goals) triggerNotification("Gol!", matchTitleStr);
                        else if (justStarted && prefs.matchStart) triggerNotification("A început meciul", matchTitleStr);
                        else if (justHalfTime && prefs.halfTime) triggerNotification("Pauză", matchTitleStr);
                        else if (justFinished && prefs.fullTime) triggerNotification("Final de meci", matchTitleStr);
                        else if (newRedCard && prefs.redCards) triggerNotification("Cartonaș roșu", matchTitleStr);
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
        if (!userEmail) { toast.error("Conectează-te pentru a salva meciuri la favorite."); return; }
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
        if (!userEmail) { toast.error("Conectează-te pentru a adăuga jucători în lista de scouting."); return; }
        const playerId = player._id;
        const exists = watchlistIds.includes(playerId);
        const updated = exists ? watchlistIds.filter(id => id !== playerId) : [...watchlistIds, playerId];
        setWatchlistIds(updated);
        localStorage.setItem('scout_watchlist_ids', JSON.stringify(updated));
        toast.success(exists ? "Eliminat din lista de scouting." : "Adăugat în lista de scouting.");

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
                toast("Eliminat din comparare.");
                return prev.filter(p => p._id !== player._id);
            }
            if (prev.length >= 2) {
                toast.success(`${player.name} a înlocuit primul jucător.`);
                return [prev[1], player];
            }
            const next = [...prev, player];
            if (next.length === 2) {
                setShowCompareModal(true);
            } else {
                toast.success(`${player.name} adăugat (1/2). Alege încă un jucător.`);
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
                    if (!res.ok) throw new Error("Eroare preluare detalii meci");
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
            setStandingsData(Array.isArray(data?.table) ? data.table : []);
        } catch (err) {
            console.error("Eroare clasament:", err);
        } finally {
            setLoadingStandings(false);
        }
    };

    const handleOpenPlayerProfile = async (
        playerOrName: Player | string,
        fallbackTeam?: string,
        apiPlayerId?: number
    ) => {
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
            const matched = await findPlayerInDB(cleanName, cleanFallbackTeam, apiPlayerId);
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
        if (liveStatuses.includes(status)) {
            return (
                <span className="inline-flex items-center gap-1 text-rose-500 font-semibold text-[11px] font-mono-stats">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    {match.elapsed ? `${match.elapsed}'` : status}
                </span>
            );
        }
        if (status === "FT" || status === "AET" || status === "PEN") {
            return <span className="text-slate-400 dark:text-slate-500 font-medium text-[11px]">Final</span>;
        }
        return <span className="text-amber-500 font-medium text-[11px]">{status}</span>;
    };

    const translateStatLabel = (type: string) => {
        const map: Record<string, string> = {
            "Shots on Goal": "Șuturi pe poartă", "Shots off Goal": "Șuturi pe lângă", "Total Shots": "Total șuturi",
            "Blocked Shots": "Șuturi blocate", "Shots insidebox": "Din careu", "Shots outsidebox": "Din afara careului",
            "Fouls": "Faulturi", "Corner Kicks": "Cornere", "Offsides": "Ofsaiduri", "Ball Possession": "Posesie",
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
        const pId: number | undefined = item?.player?.id;
        const pNum = item?.player?.number ?? "-";
        const pPos = item?.player?.pos || "";
        const pRating = item?.player?.rating;
        const isGK = pPos === 'G';
        const badges = getPlayerMatchBadges(pName, pId);
        const resolvedFullName = getDisplayPlayerName(pName, teamName, pId);
        const shortName = resolvedFullName.includes(' ')
            ? `${resolvedFullName.split(' ')[0].charAt(0)}. ${resolvedFullName.split(' ').slice(-1)[0]}`
            : resolvedFullName;

        let shirtStyle = isAwayTeam
            ? "bg-[#101726] text-slate-100 border-cyan-400/70"
            : "bg-slate-100 text-slate-900 border-white/80";
        if (isGK) {
            shirtStyle = isAwayTeam
                ? "bg-amber-500/90 text-slate-950 border-amber-300"
                : "bg-amber-400 text-slate-950 border-amber-200";
        }

        const ratingNum = pRating ? parseFloat(pRating) : 0;
        const ratingBg = ratingNum >= 7.5 ? "bg-emerald-600" : ratingNum >= 6.8 ? "bg-emerald-700" : ratingNum > 0 ? "bg-amber-600" : "bg-slate-700";

        return (
            <div
                key={pId || `${pName}-${idx}`}
                onClick={() => handleOpenPlayerProfile(pName, teamName, pId)}
                className="cursor-pointer group flex flex-col items-center select-none w-auto sm:w-[82px] z-10 mx-0.5"
                title={`${resolvedFullName} (#${pNum})`}
            >
                <div className="relative">
                    <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full ${shirtStyle} font-semibold text-[10px] sm:text-xs flex items-center justify-center border-2 group-hover:scale-105 transition-transform font-mono-stats shadow-sm`}>
                        {pNum}
                    </div>
                    {ratingNum > 0 && (
                        <span className={`absolute -top-1.5 -right-2 ${ratingBg} text-white text-[8px] sm:text-[9px] font-semibold px-1 py-0.5 rounded font-mono-stats`}>
                            {ratingNum.toFixed(1)}
                        </span>
                    )}
                    {badges.goals > 0 && (
                        <span className="absolute -bottom-1 -right-1.5 bg-emerald-500 text-slate-950 text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                            {badges.goals > 1 ? badges.goals : '●'}
                        </span>
                    )}
                    {(badges.yellow || badges.red) && (
                        <span className={`absolute -top-1 -left-1 w-2 h-2.5 rounded-[1px] ${badges.red ? 'bg-rose-500' : 'bg-amber-400'}`} />
                    )}
                    {badges.subOut && (
                        <span className="absolute -bottom-1 -left-1.5 bg-[#090D16] text-slate-300 text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center border border-white/20">
                            ⇄
                        </span>
                    )}
                </div>
                <div className="mt-1 bg-[#090D16]/85 group-hover:bg-emerald-600 text-slate-100 text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded max-w-full text-center border border-white/10 truncate transition-colors">
                    {shortName}
                </div>
            </div>
        );
    };

    const renderH2HSection = () => {
        let rawHomeForm = selectedMatchDetails?.form?.home;
        let rawAwayForm = selectedMatchDetails?.form?.away;

        if ((!rawHomeForm || !rawAwayForm) && Array.isArray(standingsData) && standingsData.length > 0) {
            standingsData.forEach(groupTable => {
                if (!Array.isArray(groupTable)) return;
                groupTable.forEach((row: any) => {
                    if (row.team?.id === selectedMatchDetails?.home_team_id && row.form) rawHomeForm = row.form;
                    if (row.team?.id === selectedMatchDetails?.away_team_id && row.form) rawAwayForm = row.form;
                });
            });
        }

        const parseForm = (formObj: any): string[] => {
            let formArr: string[] = [];
            if (Array.isArray(formObj)) formArr = formObj;
            else if (typeof formObj === 'string') formArr = formObj.split('');
            const result = formArr.slice(0, 5);
            while (result.length < 5) result.push('-');
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

            const calculateFormPoints = (formArray: string[]) =>
                formArray.reduce((total, result) => total + (result === 'W' ? 3 : result === 'D' ? 1 : 0), 0);

            const homePrestige = getTeamPrestige(selectedMatchDetails?.home_team_name || "");
            const awayPrestige = getTeamPrestige(selectedMatchDetails?.away_team_name || "");
            const homeTotal = homePrestige + calculateFormPoints(realFormHome) + 5;
            const awayTotal = awayPrestige + calculateFormPoints(realFormAway);
            const matchTotal = homeTotal + awayTotal;

            const diff = Math.abs(homeTotal - awayTotal);
            const drawChance = Math.max(12, 30 - Math.floor(diff / 2));
            const remainingChance = 100 - drawChance;
            const homeChance = Math.round((homeTotal / matchTotal) * remainingChance);
            const awayChance = remainingChance - homeChance;

            matchPredictions = { home: homeChance, draw: drawChance, away: awayChance };
        }

        const formColor = (res: string) => {
            if (res === 'W') return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25';
            if (res === 'D') return 'bg-slate-500/15 text-slate-400 border-slate-500/25';
            if (res === 'L') return 'bg-rose-500/15 text-rose-500 border-rose-500/25';
            return 'bg-slate-200 dark:bg-white/[0.04] text-slate-400 border-slate-300 dark:border-white/[0.08]';
        };

        return (
            <div className="space-y-4">
                <div className="bg-white dark:bg-[#101726] rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-white/[0.07]">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <Swords className="w-3.5 h-3.5 text-emerald-500" /> Probabilitate rezultat
                    </h4>
                    <div className="flex items-center justify-between text-xs font-medium mb-2 font-mono-stats">
                        <span className="text-emerald-600 dark:text-emerald-400 truncate max-w-[35%]">
                            {matchPredictions.home}% <span className="hidden sm:inline font-sans text-slate-500 font-normal">{selectedMatchDetails?.home_team_name}</span>
                        </span>
                        <span className="text-slate-500">{matchPredictions.draw}% Egal</span>
                        <span className="text-cyan-500 truncate max-w-[35%] text-right">
                            <span className="hidden sm:inline font-sans text-slate-500 font-normal">{selectedMatchDetails?.away_team_name} </span>{matchPredictions.away}%
                        </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden flex">
                        <div style={{ width: `${matchPredictions.home}%` }} className="bg-emerald-500 h-full transition-all" />
                        <div style={{ width: `${matchPredictions.draw}%` }} className="bg-slate-400 dark:bg-slate-600 h-full transition-all" />
                        <div style={{ width: `${matchPredictions.away}%` }} className="bg-cyan-500 h-full transition-all" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { name: selectedMatchDetails?.home_team_name, form: realFormHome },
                        { name: selectedMatchDetails?.away_team_name, form: realFormAway },
                    ].map((team, tIdx) => (
                        <div key={tIdx} className="bg-white dark:bg-[#101726] rounded-xl p-4 border border-slate-200 dark:border-white/[0.07]">
                            <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 text-center truncate">
                                Formă {team.name}
                            </h4>
                            <div className="flex justify-center gap-1.5 font-mono-stats">
                                {team.form.map((res, i) => (
                                    <div key={i} className={`w-7 h-7 rounded-lg border flex items-center justify-center font-semibold text-xs ${formColor(res)}`}>
                                        {res}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
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
        if (!Array.isArray(standingsData) || standingsData.length === 0) return [];

        return standingsData.filter(Array.isArray).map(groupTable => {
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

                    if (hGoals > aGoals) homeRow.livePoints += 3;
                    else if (hGoals < aGoals) awayRow.livePoints += 3;
                    else { homeRow.livePoints += 1; awayRow.livePoints += 1; }
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
        <div className="w-full max-w-5xl mx-auto min-h-[75vh] pb-16 space-y-5">
            {/* Header & Filtre Bento */}
            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#101726] border border-slate-200/80 dark:border-white/[0.07] p-4 rounded-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <Calendar className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-tight">
                                Program Meciuri
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-stats flex items-center gap-1.5 mt-0.5">
                                <span>{matches.length} meciuri</span>
                                <span>•</span>
                                <span className={liveCount > 0 ? 'text-rose-500 font-semibold inline-flex items-center gap-1' : ''}>
                                    {liveCount > 0 && <Radio className="w-3 h-3 animate-pulse" />}
                                    {liveCount} live
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#090D16] p-1 rounded-xl border border-slate-200/80 dark:border-white/[0.07] overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'all', label: 'Toate' },
                            { id: 'live', label: `Live (${liveCount})` },
                            { id: 'finished', label: 'Terminate' },
                            { id: 'favorites', label: `Favorite (${favoriteMatches.length})` }
                        ].map((fil) => (
                            <button
                                key={fil.id}
                                onClick={() => setSubFilter(fil.id as any)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                                    subFilter === fil.id
                                        ? 'bg-white dark:bg-[#182235] text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                            >
                                {fil.label}
                            </button>
                        ))}
                        <button
                            onClick={() => setShowNotifSettings(true)}
                            className="px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors ml-auto flex items-center gap-1.5 shrink-0 cursor-pointer"
                            title="Setări Notificări"
                        >
                            <Bell className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium hidden sm:inline">Alerte</span>
                        </button>
                    </div>
                </div>

                {/* Selector Date */}
                <div className="grid grid-cols-7 gap-1.5">
                    {dates.map((item, idx) => {
                        const isSelected = item.date.toDateString() === selectedDate.toDateString();
                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedDate(item.date)}
                                className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition-colors cursor-pointer ${
                                    isSelected
                                        ? 'bg-slate-900 dark:bg-emerald-600 border-slate-900 dark:border-emerald-500 text-white'
                                        : 'bg-white dark:bg-[#101726] border-slate-200/80 dark:border-white/[0.07] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/[0.15]'
                                }`}
                            >
                                <span className="text-[10px] font-medium capitalize opacity-80">{item.label}</span>
                                <span className="text-xs font-semibold font-mono-stats mt-0.5">
                                    {item.date.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' })}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Lista de meciuri */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Se încarcă meciurile...</p>
                </div>
            ) : filteredMatches.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[#101726] rounded-2xl border border-slate-200 dark:border-white/[0.07] max-w-md mx-auto p-6">
                    <Trophy className="w-8 h-8 text-slate-400 mx-auto mb-3 opacity-50" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Niciun meci disponibil</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Nu există meciuri pentru filtrul sau data selectată.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedLeagueNames.map((leagueName) => {
                        const leagueData = groupedMatches[leagueName];
                        return (
                            <div key={leagueName} className="bg-white dark:bg-[#101726] rounded-2xl border border-slate-200/80 dark:border-white/[0.07] overflow-hidden">
                                <div className="bg-slate-50 dark:bg-[#090D16]/60 px-4 py-2.5 border-b border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        {leagueData.logo ? (
                                            <img src={leagueData.logo} alt={leagueName} className="w-4 h-4 object-contain shrink-0" />
                                        ) : (
                                            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                                        )}
                                        <h3 className="font-semibold text-xs text-slate-700 dark:text-slate-200 truncate">{leagueName}</h3>
                                    </div>
                                    <span className="text-[10px] font-mono-stats text-slate-400 shrink-0">
                                        {leagueData.items.length}
                                    </span>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                                    {leagueData.items.map((match: Match) => {
                                        const isFav = favoriteMatches.includes(match.fixture_id);
                                        const isLive = ["1H", "HT", "2H", "ET", "P", "BT", "LIVE"].includes(match.status_short);
                                        return (
                                            <div
                                                key={match.fixture_id}
                                                onClick={() => handleMatchClick(match)}
                                                className="flex items-center justify-between px-3 sm:px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer gap-2"
                                            >
                                                <button
                                                    onClick={(e) => toggleFavoriteMatch(e, match.fixture_id)}
                                                    className={`p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
                                                        isFav
                                                            ? 'text-amber-500 bg-amber-500/10'
                                                            : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                                                    }`}
                                                    title="Favorite"
                                                >
                                                    <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                                                </button>

                                                <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 min-w-0">
                                                    <div className="flex items-center justify-end gap-2 text-right min-w-0">
                                                        <span className="font-medium text-xs sm:text-[13px] text-slate-900 dark:text-slate-100 truncate" title={match.home_team_name}>
                                                            {match.home_team_name}
                                                        </span>
                                                        <img src={match.home_team_logo} alt="home" className="w-5 h-5 object-contain shrink-0" />
                                                    </div>

                                                    <div className="flex flex-col items-center justify-center shrink-0 min-w-[72px]">
                                                        {match.status_short === "NS" ? (
                                                            <span className="text-slate-500 dark:text-slate-400 font-medium text-xs font-mono-stats bg-slate-100 dark:bg-[#090D16] border border-slate-200/70 dark:border-white/[0.06] px-2.5 py-1 rounded-lg">
                                                                {new Date(match.timestamp * 1000).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        ) : (
                                                            <div className="flex flex-col items-center">
                                                                <span className={`font-semibold text-sm font-mono-stats px-2.5 py-0.5 rounded-lg ${
                                                                    isLive
                                                                        ? 'bg-rose-500/15 text-rose-500 border border-rose-500/25'
                                                                        : 'bg-slate-100 dark:bg-[#090D16] text-slate-900 dark:text-white border border-slate-200/70 dark:border-white/[0.06]'
                                                                }`}>
                                                                    {match.home_goals ?? 0} - {match.away_goals ?? 0}
                                                                </span>
                                                                <div className="mt-0.5">{renderStatus(match)}</div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 text-left min-w-0">
                                                        <img src={match.away_team_logo} alt="away" className="w-5 h-5 object-contain shrink-0" />
                                                        <span className="font-medium text-xs sm:text-[13px] text-slate-900 dark:text-slate-100 truncate" title={match.away_team_name}>
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

            {/* Loading Lot */}
            {loadingRoster && createPortal(
                <div className="fixed inset-0 z-[999999] bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-medium text-slate-300">Se încarcă lotul echipei...</span>
                </div>,
                document.body
            )}

            {/* Modal Alerte Live */}
            {showNotifSettings && createPortal(
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={() => setShowNotifSettings(false)}>
                    <div className="bg-white dark:bg-[#101726] rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-white/[0.08]" onClick={e => e.stopPropagation()}>
                        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-white/[0.07] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-emerald-500" />
                                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Alerte Live</h2>
                            </div>
                            <button onClick={() => setShowNotifSettings(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Configurează notificările pentru meciurile adăugate la favorite.
                            </p>

                            <div>
                                {notifPermission === 'granted' ? (
                                    <div className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center justify-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Notificări active pe acest dispozitiv
                                    </div>
                                ) : notifPermission === 'denied' ? (
                                    <div className="w-full py-2 px-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-medium flex items-center justify-center gap-1.5 text-center">
                                        <Ban className="w-3.5 h-3.5 shrink-0" /> Blocate din browser (activează din setările site-ului)
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleEnablePushNotifications}
                                        className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer"
                                    >
                                        Activează notificările în bară
                                    </button>
                                )}
                            </div>

                            <div className="divide-y divide-slate-100 dark:divide-white/[0.05] border border-slate-200 dark:border-white/[0.07] rounded-xl overflow-hidden">
                                {[
                                    { id: 'goals', label: 'Goluri marcate' },
                                    { id: 'matchStart', label: 'Fluier de start' },
                                    { id: 'halfTime', label: 'Pauză' },
                                    { id: 'fullTime', label: 'Final de meci' },
                                    { id: 'redCards', label: 'Cartonașe roșii' },
                                ].map((setting) => (
                                    <div key={setting.id} className="flex items-center justify-between px-3 py-2.5 bg-slate-50/50 dark:bg-white/[0.02]">
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{setting.label}</span>
                                        <button
                                            onClick={() => toggleNotifPref(setting.id as keyof NotificationPrefs)}
                                            className={`w-9 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                                                notifPrefs[setting.id as keyof NotificationPrefs] ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                                            }`}
                                        >
                                            <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-transform ${
                                                notifPrefs[setting.id as keyof NotificationPrefs] ? 'translate-x-[19px]' : 'translate-x-[3px]'
                                            }`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal Detalii Meci */}
            {selectedMatchDetails && createPortal(
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedMatchDetails(null)}>
                    <div className="bg-white dark:bg-[#090D16] sm:rounded-2xl w-full h-[100dvh] sm:h-auto sm:max-w-3xl sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl sm:border border-slate-200 dark:border-white/[0.08]" onClick={e => e.stopPropagation()}>
                        {/* Header Meci */}
                        <div className="bg-slate-50 dark:bg-[#101726] border-b border-slate-200 dark:border-white/[0.07] p-4 sm:p-5 shrink-0 relative">
                            <button
                                onClick={() => setSelectedMatchDetails(null)}
                                className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium mb-4 pr-6 sm:pr-0">
                                {selectedMatchDetails.league_logo && <img src={selectedMatchDetails.league_logo} alt="league" className="w-4 h-4 object-contain" />}
                                <span className="truncate max-w-[180px] sm:max-w-none">{selectedMatchDetails.league_name}</span>
                                {selectedMatchDetails.league_round && <span className="hidden sm:inline opacity-60">• {selectedMatchDetails.league_round}</span>}
                            </div>

                            <div className="flex items-center justify-between gap-2 sm:gap-6 max-w-xl mx-auto">
                                <div onClick={e => handleTeamClick(e, selectedMatchDetails.home_team_name)} className="flex-1 flex flex-col items-center text-center cursor-pointer group">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white dark:bg-[#090D16] border border-slate-200 dark:border-white/[0.08] p-2 mb-2 group-hover:border-emerald-500/50 transition-colors flex items-center justify-center">
                                        <img src={selectedMatchDetails.home_team_logo} alt={selectedMatchDetails.home_team_name} className="w-full h-full object-contain" />
                                    </div>
                                    <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-emerald-500 transition-colors line-clamp-2">
                                        {selectedMatchDetails.home_team_name}
                                    </span>
                                </div>

                                <div className="flex flex-col items-center justify-center shrink-0 px-2">
                                    <div className="text-2xl sm:text-4xl font-bold tracking-tight font-mono-stats text-slate-900 dark:text-white">
                                        {selectedMatchDetails.status_short === "NS" ? (
                                            <span className="text-slate-400">vs</span>
                                        ) : (
                                            `${selectedMatchDetails.home_goals ?? 0} - ${selectedMatchDetails.away_goals ?? 0}`
                                        )}
                                    </div>
                                    <div className="mt-1">{renderStatus(selectedMatchDetails)}</div>
                                </div>

                                <div onClick={e => handleTeamClick(e, selectedMatchDetails.away_team_name)} className="flex-1 flex flex-col items-center text-center cursor-pointer group">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white dark:bg-[#090D16] border border-slate-200 dark:border-white/[0.08] p-2 mb-2 group-hover:border-emerald-500/50 transition-colors flex items-center justify-center">
                                        <img src={selectedMatchDetails.away_team_logo} alt={selectedMatchDetails.away_team_name} className="w-full h-full object-contain" />
                                    </div>
                                    <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-emerald-500 transition-colors line-clamp-2">
                                        {selectedMatchDetails.away_team_name}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Tab-uri Meci */}
                        <div className="flex border-b border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#101726] shrink-0 overflow-x-auto scrollbar-hide">
                            {[
                                { id: 'events', label: 'Evenimente', icon: Clock },
                                { id: 'lineups', label: 'Tactică', icon: Users },
                                { id: 'stats', label: 'Statistici', icon: BarChart2 },
                                { id: 'standings', label: 'Clasament', icon: ListOrdered },
                                { id: 'h2h', label: 'Formă & H2H', icon: History }
                            ].map(tab => {
                                const isActive = activeMatchTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveMatchTab(tab.id as any);
                                            if (tab.id === 'standings') fetchStandings(selectedMatchDetails.league_id);
                                        }}
                                        className={`flex-1 py-2.5 px-3 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors whitespace-nowrap min-w-fit cursor-pointer ${
                                            isActive
                                                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Conținut Tab */}
                        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-[#F3F5F8] dark:bg-[#090D16]">
                            {loadingMatchDetails ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-xs font-medium text-slate-500">Se încarcă detaliile meciului...</p>
                                </div>
                            ) : (
                                <>
                                    {activeMatchTab === 'h2h' && renderH2HSection()}

                                    {activeMatchTab === 'events' && (
                                        <div>
                                            {!selectedMatchDetails.events || selectedMatchDetails.events.length === 0 ? (
                                                <div className="text-center py-14 bg-white dark:bg-[#101726] rounded-xl border border-slate-200 dark:border-white/[0.07] text-slate-500 text-xs">
                                                    Niciun eveniment înregistrat până acum.
                                                </div>
                                            ) : (
                                                <div className="bg-white dark:bg-[#101726] rounded-xl border border-slate-200 dark:border-white/[0.07] divide-y divide-slate-100 dark:divide-white/[0.05] overflow-hidden">
                                                    {selectedMatchDetails.ht_home_goals !== null && selectedMatchDetails.ht_home_goals !== undefined && (
                                                        <div className="bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 font-medium text-center py-2 text-xs font-mono-stats">
                                                            Pauză: <span className="text-slate-900 dark:text-white font-semibold">{selectedMatchDetails.ht_home_goals} - {selectedMatchDetails.ht_away_goals}</span>
                                                        </div>
                                                    )}
                                                    {selectedMatchDetails.events.map((ev: any, idx: number) => {
                                                        const isHome = ev.team?.id === selectedMatchDetails.home_team_id;
                                                        const eventTeamName = isHome ? selectedMatchDetails.home_team_name : selectedMatchDetails.away_team_name;
                                                        const presentation = getEventPresentation(ev);
                                                        return (
                                                            <div key={idx} className={`flex items-center px-3 sm:px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors ${isHome ? 'flex-row' : 'flex-row-reverse text-right'}`}>
                                                                <div className="w-10 text-center shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono-stats">
                                                                    {ev.time?.elapsed}'
                                                                </div>
                                                                <div className={`w-6 h-6 rounded-md border flex items-center justify-center text-xs mx-2.5 shrink-0 ${presentation.iconClass}`}>
                                                                    {presentation.icon}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    {ev.type === "subst" ? (
                                                                        <div className="space-y-0.5">
                                                                            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 truncate">
                                                                                Intră:{' '}
                                                                                {ev.assist?.name ? (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleOpenPlayerProfile(ev.assist.name, eventTeamName, ev.assist?.id)}
                                                                                        className="hover:underline cursor-pointer font-semibold"
                                                                                    >
                                                                                        {getDisplayPlayerName(ev.assist.name, eventTeamName, ev.assist?.id)}
                                                                                    </button>
                                                                                ) : "N/A"}
                                                                            </p>
                                                                            <p className="text-[11px] text-rose-500/90 truncate">
                                                                                Iese:{' '}
                                                                                {ev.player?.name && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleOpenPlayerProfile(ev.player.name, eventTeamName, ev.player?.id)}
                                                                                        className="hover:underline cursor-pointer"
                                                                                    >
                                                                                        {getDisplayPlayerName(ev.player.name, eventTeamName, ev.player?.id)}
                                                                                    </button>
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <div className={`flex flex-wrap items-center gap-1.5 ${isHome ? 'justify-start' : 'justify-end'}`}>
                                                                                {ev.player?.name && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleOpenPlayerProfile(ev.player.name, eventTeamName, ev.player?.id)}
                                                                                        className="font-medium text-slate-900 dark:text-slate-100 text-xs sm:text-[13px] hover:text-emerald-500 hover:underline cursor-pointer"
                                                                                    >
                                                                                        {getDisplayPlayerName(ev.player.name, eventTeamName, ev.player?.id)}
                                                                                    </button>
                                                                                )}
                                                                                {presentation.badge && (
                                                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${presentation.badgeClass}`}>
                                                                                        {presentation.badge}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {ev.assist?.name && (
                                                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                                                    Pasă:{' '}
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleOpenPlayerProfile(ev.assist.name, eventTeamName, ev.assist?.id)}
                                                                                        className="hover:text-emerald-500 hover:underline cursor-pointer"
                                                                                    >
                                                                                        {getDisplayPlayerName(ev.assist.name, eventTeamName, ev.assist?.id)}
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
                                                        <div className="bg-slate-50 dark:bg-white/[0.02] text-slate-600 dark:text-slate-300 font-medium text-center py-2.5 text-xs font-mono-stats">
                                                            Final de meci • <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{selectedMatchDetails.home_goals} - {selectedMatchDetails.away_goals}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeMatchTab === 'lineups' && (
                                        <div>
                                            {!selectedMatchDetails.lineups || selectedMatchDetails.lineups.length === 0 ? (
                                                <div className="text-center py-14 bg-white dark:bg-[#101726] rounded-xl border border-slate-200 dark:border-white/[0.07] text-slate-500 text-xs">
                                                    Formațiile de start nu sunt disponibile încă.
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-center gap-1 bg-slate-200/70 dark:bg-[#101726] p-1 rounded-xl max-w-md mx-auto border border-slate-200 dark:border-white/[0.07]">
                                                        <button
                                                            onClick={() => setLineupViewMode('both')}
                                                            className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                                                lineupViewMode === 'both'
                                                                    ? 'bg-white dark:bg-[#182235] text-slate-900 dark:text-white shadow-sm'
                                                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                            }`}
                                                        >
                                                            Ambele
                                                        </button>
                                                        <button
                                                            onClick={() => setLineupViewMode('home')}
                                                            className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                                                                lineupViewMode === 'home'
                                                                    ? 'bg-white dark:bg-[#182235] text-slate-900 dark:text-white shadow-sm'
                                                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                            }`}
                                                        >
                                                            {homeTeamLineup?.team?.logo && <img src={homeTeamLineup.team.logo} className="w-3.5 h-3.5 object-contain shrink-0" />}
                                                            <span className="truncate max-w-[85px]">{homeTeamLineup?.team?.name || 'Gazde'}</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setLineupViewMode('away')}
                                                            className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                                                                lineupViewMode === 'away'
                                                                    ? 'bg-white dark:bg-[#182235] text-slate-900 dark:text-white shadow-sm'
                                                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                            }`}
                                                        >
                                                            {awayTeamLineup?.team?.logo && <img src={awayTeamLineup.team.logo} className="w-3.5 h-3.5 object-contain shrink-0" />}
                                                            <span className="truncate max-w-[85px]">{awayTeamLineup?.team?.name || 'Oaspeți'}</span>
                                                        </button>
                                                    </div>

                                                    <div
                                                        className={`relative w-full ${lineupViewMode === 'both' ? 'h-[680px] sm:h-[820px]' : 'h-[460px] sm:h-[600px]'} rounded-xl overflow-hidden border border-white/10 flex flex-col justify-between p-2 sm:p-4 select-none`}
                                                        style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #11241d 0px, #11241d 44px, #0e1e18 44px, #0e1e18 88px)' }}
                                                    >
                                                        <div className="absolute inset-2.5 border border-white/15 rounded-lg pointer-events-none" />
                                                        <div className="absolute top-1/2 inset-x-2.5 h-px bg-white/15 -translate-y-1/2 pointer-events-none" />
                                                        <div className="absolute top-1/2 left-1/2 w-20 h-20 sm:w-32 sm:h-32 border border-white/15 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                                                        <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white/30 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                                                        {lineupViewMode === 'both' ? (
                                                            <>
                                                                <div className="flex-1 flex flex-col justify-around relative z-10 pb-2 pt-1">
                                                                    {homeRowsTopDown.map((rowItems, rIdx) => (
                                                                        <div key={`home-row-${rIdx}`} className="flex items-center justify-around px-1">
                                                                            {rowItems.map((item: any, pIdx: number) => renderPitchPlayerNode(item, false, pIdx, homeTeamLineup?.team?.name))}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <div className="flex-1 flex flex-col justify-around relative z-10 pt-2 pb-1">
                                                                    {awayRowsBottomUp.map((rowItems, rIdx) => (
                                                                        <div key={`away-row-${rIdx}`} className="flex items-center justify-around px-1">
                                                                            {rowItems.map((item: any, pIdx: number) => renderPitchPlayerNode(item, true, pIdx, awayTeamLineup?.team?.name))}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="flex-1 flex flex-col justify-around relative z-10 py-2">
                                                                {singleTeamRows.map((rowItems, rIdx) => (
                                                                    <div key={`single-row-${rIdx}`} className="flex items-center justify-around px-1">
                                                                        {rowItems.map((item: any, pIdx: number) => renderPitchPlayerNode(item, lineupViewMode === 'away', pIdx, singleTeamLineup?.team?.name))}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeMatchTab === 'stats' && (
                                        <div>
                                            {!selectedMatchDetails.statistics || selectedMatchDetails.statistics.length < 2 ? (
                                                <div className="text-center py-14 bg-white dark:bg-[#101726] rounded-xl border border-slate-200 dark:border-white/[0.07] text-slate-500 text-xs">
                                                    Statisticile nu sunt disponibile încă.
                                                </div>
                                            ) : (
                                                <div className="bg-white dark:bg-[#101726] rounded-xl border border-slate-200 dark:border-white/[0.07] p-4 sm:p-6 space-y-4">
                                                    {(() => {
                                                        const homeStats = selectedMatchDetails.statistics[0]?.statistics || [];
                                                        const awayStats = selectedMatchDetails.statistics[1]?.statistics || [];
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
                                                                <div key={statItem.type} className="space-y-1.5">
                                                                    <div className="flex justify-between text-xs font-medium font-mono-stats">
                                                                        <span className="text-slate-900 dark:text-slate-100 w-10 text-left font-semibold">{homeValRaw}</span>
                                                                        <span className="text-slate-500 dark:text-slate-400 font-sans text-center flex-1 truncate px-2">{translateStatLabel(statItem.type)}</span>
                                                                        <span className="text-slate-900 dark:text-slate-100 w-10 text-right font-semibold">{awayValRaw}</span>
                                                                    </div>
                                                                    <div className="w-full h-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden flex">
                                                                        <div style={{ width: `${homePercent}%` }} className="bg-emerald-500 h-full transition-all" />
                                                                        <div style={{ width: `${awayPercent}%` }} className="bg-cyan-500 h-full transition-all" />
                                                                    </div>
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeMatchTab === 'standings' && (
                                        <div>
                                            {loadingStandings ? (
                                                <div className="flex flex-col items-center justify-center py-14 gap-3">
                                                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                                    <span className="text-xs text-slate-500">Se încarcă clasamentul...</span>
                                                </div>
                                            ) : !standingsData || standingsData.length === 0 ? (
                                                <div className="text-center py-14 bg-white dark:bg-[#101726] rounded-xl border border-slate-200 dark:border-white/[0.07] text-slate-500 text-xs">
                                                    Clasamentul nu este disponibil.
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {liveStandings.map((groupTable: any[], gIdx: number) => (
                                                        <div key={gIdx} className="bg-white dark:bg-[#101726] rounded-xl border border-slate-200 dark:border-white/[0.07] overflow-hidden">
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

            {/* Modal Lot Echipă */}
            {selectedTeam && createPortal(
                <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4" onClick={() => setSelectedTeam(null)}>
                    <div className="bg-white dark:bg-[#090D16] rounded-2xl w-full max-w-3xl max-h-[88vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-white/[0.08]" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-50 dark:bg-[#101726] px-4 py-4 flex items-center justify-between shrink-0 border-b border-slate-200 dark:border-white/[0.07]">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-11 h-11 bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] p-1.5 rounded-xl shrink-0 flex items-center justify-center">
                                    {hasValidImageUrl(selectedTeam.teamInfo.logo) ? (
                                        <img src={selectedTeam.teamInfo.logo} alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    ) : (
                                        <Trophy className="w-5 h-5 text-emerald-500" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white truncate">
                                        {sanitizeTeamName(selectedTeam.teamInfo.name, "Echipă")}
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-stats">
                                        Lot oficial • {selectedTeam.teamInfo.totalPlayers} jucători
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedTeam(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-3 sm:p-5 space-y-4 flex-1">
                            {([
                                { title: "Portari", data: selectedTeam.squad.Goalkeepers, accent: "text-amber-500" },
                                { title: "Fundași", data: selectedTeam.squad.Defenders, accent: "text-cyan-500" },
                                { title: "Mijlocași", data: selectedTeam.squad.Midfielders, accent: "text-emerald-500" },
                                { title: "Atacanți", data: selectedTeam.squad.Attackers, accent: "text-rose-500" }
                            ]).map((section, idx) => section.data.length > 0 && (
                                <div key={idx} className="bg-white dark:bg-[#101726] rounded-xl border border-slate-200 dark:border-white/[0.07] overflow-hidden">
                                    <div className="px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]">
                                        <h3 className={`font-semibold text-xs ${section.accent}`}>{section.title}</h3>
                                    </div>
                                    <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                                        {section.data.map(p => (
                                            <div key={p._id} onClick={() => handleOpenPlayerProfile(p, selectedTeam.teamInfo.name)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer">
                                                <img src={p.image || GENERIC_USER_IMAGE} alt={p.name} className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-white/[0.1] shrink-0 bg-white" onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate">{p.name}</p>
                                                    <div className="flex gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                                        {p.age && <span className="font-mono-stats">{p.age} ani</span>}
                                                        {p.nationality && <span className="truncate">• {p.nationality}</span>}
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

            {/* Modal Fișă Jucător */}
            {selectedPlayer && createPortal(
                <div className="fixed inset-0 z-[99999999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4" onClick={() => setSelectedPlayer(null)}>
                    <div className="bg-white dark:bg-[#090D16] rounded-2xl w-full max-w-2xl max-h-[90dvh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-white/[0.08]" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-50 dark:bg-[#101726] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/[0.07] shrink-0 relative">
                            <button
                                type="button"
                                onClick={() => setSelectedPlayer(null)}
                                className="absolute top-3 right-3 sm:static p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors shrink-0 order-3 sm:order-none cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-3.5 min-w-0 pr-8 sm:pr-0">
                                <img
                                    src={selectedPlayer.image || GENERIC_USER_IMAGE}
                                    alt={selectedPlayer.name}
                                    onError={(e) => { e.currentTarget.src = GENERIC_USER_IMAGE; }}
                                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-200 dark:border-white/[0.1] bg-white shrink-0"
                                />
                                <div className="min-w-0">
                                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block">
                                        Fișă Scouting
                                    </span>
                                    <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white leading-tight truncate">
                                        {selectedPlayer.name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        {hasValidImageUrl(selectedPlayer.team_logo) && (
                                            <img src={selectedPlayer.team_logo} alt="" className="w-4 h-4 object-contain shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
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
                                        className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                            watchlistIds.includes(selectedPlayer._id)
                                                ? 'bg-emerald-600 text-white border-emerald-600'
                                                : 'bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/[0.08] hover:border-emerald-500/50'
                                        }`}
                                    >
                                        <Bookmark className={`w-3.5 h-3.5 ${watchlistIds.includes(selectedPlayer._id) ? 'fill-current' : ''}`} />
                                        {watchlistIds.includes(selectedPlayer._id) ? 'Salvat' : 'Listă'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => toggleComparePlayer(e, selectedPlayer)}
                                        className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                            compareList.some(p => p._id === selectedPlayer._id)
                                                ? 'bg-amber-500 text-slate-950 border-amber-500'
                                                : 'bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/[0.08] hover:border-amber-500/50'
                                        }`}
                                    >
                                        <Scale className="w-3.5 h-3.5" />
                                        Compară
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="overflow-y-auto p-4 sm:p-5 space-y-5 flex-1">
                            {loadingPlayerCard ? (
                                <div className="py-10 text-center text-xs text-slate-500">
                                    Se încarcă datele jucătorului...
                                </div>
                            ) : selectedPlayer._id.startsWith('temp_') ? (
                                <div className="bg-slate-50 dark:bg-[#101726] p-4 rounded-xl border border-slate-200 dark:border-white/[0.07] text-xs space-y-1.5">
                                    <p className="font-semibold text-slate-900 dark:text-white">{selectedPlayer.name}</p>
                                    <p className="text-slate-500 dark:text-slate-400">Echipă în meci: {sanitizeTeamName(selectedPlayer, '—')}</p>
                                    <p className="text-slate-400 pt-1">Acest jucător nu are încă o fișă completă în baza de date de scouting.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {selectedPlayer.nationality && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.07] text-xs text-slate-700 dark:text-slate-300">
                                                <Globe className="w-3.5 h-3.5 text-slate-400" /> {selectedPlayer.nationality}
                                            </span>
                                        )}
                                        {selectedPlayer.age && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.07] text-xs text-slate-700 dark:text-slate-300 font-mono-stats">
                                                {selectedPlayer.age} ani
                                            </span>
                                        )}
                                        {(selectedPlayer.height || selectedPlayer.weight) && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.07] text-xs text-slate-700 dark:text-slate-300 font-mono-stats">
                                                {selectedPlayer.height || '—'} / {selectedPlayer.weight || '—'}
                                            </span>
                                        )}
                                        {selectedPlayer.position && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                                {selectedPlayer.position}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-2.5">
                                        <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                            <Award className="w-3.5 h-3.5 text-emerald-500" /> Cifrele sezonului
                                        </h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono-stats">
                                            <div className="bg-slate-50 dark:bg-[#101726] p-3 rounded-xl border border-slate-200 dark:border-white/[0.07] text-center">
                                                <span className="text-lg font-semibold text-slate-900 dark:text-white block">{playerMetrics?.apps ?? 0}</span>
                                                <span className="text-[11px] font-sans text-slate-500">Meciuri</span>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-[#101726] p-3 rounded-xl border border-slate-200 dark:border-white/[0.07] text-center">
                                                <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 block">{playerMetrics?.goals ?? 0}</span>
                                                <span className="text-[11px] font-sans text-slate-500">Goluri</span>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-[#101726] p-3 rounded-xl border border-slate-200 dark:border-white/[0.07] text-center">
                                                <span className="text-lg font-semibold text-cyan-500 block">{playerMetrics?.assists ?? 0}</span>
                                                <span className="text-[11px] font-sans text-slate-500">Pase decisive</span>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-[#101726] p-3 rounded-xl border border-slate-200 dark:border-white/[0.07] text-center">
                                                <span className="text-lg font-semibold text-slate-900 dark:text-white block">{playerMetrics?.minutes ?? 0}'</span>
                                                <span className="text-[11px] font-sans text-slate-500">Minute</span>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1 bg-slate-50 dark:bg-[#101726] p-3 rounded-xl border border-slate-200 dark:border-white/[0.07] text-center">
                                                <span className="text-lg font-semibold text-amber-500 block">
                                                    {playerMetrics && playerMetrics.rating > 0 ? playerMetrics.rating.toFixed(2) : '—'}
                                                </span>
                                                <span className="text-[11px] font-sans text-slate-500">Rating</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-[#101726] rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-white/[0.07] space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                                            <div className="flex flex-col items-center">
                                                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                                                    <Activity className="w-3.5 h-3.5 text-emerald-500" /> Profil radar
                                                </h4>
                                                <PlayerRadarChart primaryPlayer={selectedPlayer} />
                                            </div>

                                            <div className="space-y-2.5">
                                                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Randament / 90 min
                                                </h4>
                                                <div className="grid grid-cols-2 gap-2 font-mono-stats">
                                                    <div className="bg-white dark:bg-[#090D16] p-3 rounded-xl border border-slate-200 dark:border-white/[0.06]">
                                                        <span className="text-[11px] font-sans text-slate-500 block">Goluri / 90'</span>
                                                        <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400">{playerMetrics?.goalsPer90 ?? 0}</span>
                                                    </div>
                                                    <div className="bg-white dark:bg-[#090D16] p-3 rounded-xl border border-slate-200 dark:border-white/[0.06]">
                                                        <span className="text-[11px] font-sans text-slate-500 block">Assist / 90'</span>
                                                        <span className="text-base font-semibold text-cyan-500">{playerMetrics?.assistsPer90 ?? 0}</span>
                                                    </div>
                                                    <div className="bg-white dark:bg-[#090D16] p-3 rounded-xl border border-slate-200 dark:border-white/[0.06]">
                                                        <span className="text-[11px] font-sans text-slate-500 block">Contribuții / 90'</span>
                                                        <span className="text-base font-semibold text-amber-500">{playerMetrics?.contributionsPer90 ?? 0}</span>
                                                    </div>
                                                    <div className="bg-white dark:bg-[#090D16] p-3 rounded-xl border border-slate-200 dark:border-white/[0.06]">
                                                        <span className="text-[11px] font-sans text-slate-500 block">Min / Contribuție</span>
                                                        <span className="text-base font-semibold text-slate-900 dark:text-white">
                                                            {playerMetrics && playerMetrics.minsPerContribution > 0 ? `${playerMetrics.minsPerContribution}'` : '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {Array.isArray(selectedPlayer.detailed_stats) && selectedPlayer.detailed_stats.length > 0 && (
                                            <div className="pt-4 border-t border-slate-200 dark:border-white/[0.07] space-y-2">
                                                <h5 className="text-xs font-medium text-slate-500">Statistici pe competiții</h5>
                                                <div className="divide-y divide-slate-100 dark:divide-white/[0.05] bg-white dark:bg-[#090D16] rounded-xl border border-slate-200 dark:border-white/[0.06] overflow-hidden text-xs">
                                                    {selectedPlayer.detailed_stats.map((st, idx) => (
                                                        <div key={idx} className="flex items-center justify-between px-3 py-2 gap-2">
                                                            <div className="min-w-0">
                                                                <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{st.competition}</p>
                                                                <p className="text-[11px] text-slate-500 font-mono-stats">{st.appearances} meciuri • {st.minutes}'</p>
                                                            </div>
                                                            <div className="text-right font-semibold shrink-0 font-mono-stats">
                                                                <span className="text-emerald-600 dark:text-emerald-400">{st.goals}G</span>
                                                                <span className="text-slate-400 mx-1">/</span>
                                                                <span className="text-cyan-500">{st.assists}A</span>
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

            {/* Modal Comparare */}
            {showCompareModal && compareList.length === 2 && createPortal(
                <div className="fixed inset-0 z-[999999999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4" onClick={() => setShowCompareModal(false)}>
                    <div className="bg-white dark:bg-[#101726] rounded-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-white/[0.08] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="px-4 py-3.5 flex items-center justify-between border-b border-slate-200 dark:border-white/[0.07]">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <Scale className="w-4 h-4 text-emerald-500" /> Comparare jucători
                            </h3>
                            <button type="button" onClick={() => setShowCompareModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-5 space-y-4 text-xs sm:text-[13px]">
                            {(() => {
                                const [p1, p2] = compareList;
                                const m1 = computeScoutingMetrics(p1);
                                const m2 = computeScoutingMetrics(p2);
                                const rows = [
                                    { label: 'Meciuri', v1: m1.apps, v2: m2.apps },
                                    { label: 'Goluri', v1: m1.goals, v2: m2.goals },
                                    { label: 'Pase decisive', v1: m1.assists, v2: m2.assists },
                                    { label: 'Minute', v1: m1.minutes, v2: m2.minutes },
                                    { label: 'Rating', v1: m1.rating, v2: m2.rating },
                                    { label: 'Goluri / 90\'', v1: m1.goalsPer90, v2: m2.goalsPer90 },
                                    { label: 'Assist / 90\'', v1: m1.assistsPer90, v2: m2.assistsPer90 },
                                ];
                                return (
                                    <>
                                        <div className="grid grid-cols-3 items-center gap-2 text-center font-semibold">
                                            <div className="truncate text-emerald-600 dark:text-emerald-400">{p1.name}</div>
                                            <div className="text-[11px] font-medium text-slate-400">Metrică</div>
                                            <div className="truncate text-cyan-500">{p2.name}</div>
                                        </div>
                                        <div className="divide-y divide-slate-100 dark:divide-white/[0.05] border rounded-xl border-slate-200 dark:border-white/[0.07] overflow-hidden font-mono-stats">
                                            {rows.map((r, i) => (
                                                <div key={i} className="grid grid-cols-3 items-center px-3 py-2.5 text-center bg-slate-50/50 dark:bg-white/[0.02]">
                                                    <span className={`font-semibold ${r.v1 > r.v2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>{r.v1}</span>
                                                    <span className="text-[11px] font-sans text-slate-500">{r.label}</span>
                                                    <span className={`font-semibold ${r.v2 > r.v1 ? 'text-cyan-500' : 'text-slate-700 dark:text-slate-300'}`}>{r.v2}</span>
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