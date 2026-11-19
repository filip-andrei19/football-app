export interface ScoutRankInfo {
  title: string;
  badge: string;
  minXp: number;
  nextXp: number | null;
  progressPercent: number;
}

const RANKS = [
  { title: 'Junior Scout', badge: '🌱', minXp: 0 },
  { title: 'Regional Scout', badge: '🔍', minXp: 100 },
  { title: 'Chief Scout', badge: '🎯', minXp: 300 },
  { title: 'Director Sportiv', badge: '🏆', minXp: 700 },
  { title: 'Legendă FRF', badge: '👑', minXp: 1500 },
];

export function getScoutRank(xp: number): ScoutRankInfo {
  let currentIdx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].minXp) currentIdx = i;
  }

  const current = RANKS[currentIdx];
  const next = RANKS[currentIdx + 1] || null;
  const progressPercent = next
    ? Math.min(100, Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100))
    : 100;

  return {
    title: current.title,
    badge: current.badge,
    minXp: current.minXp,
    nextXp: next ? next.minXp : null,
    progressPercent,
  };
}