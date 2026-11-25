import React from 'react';

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-[#11161D] rounded-xl border border-slate-200 dark:border-white/[0.07] overflow-hidden h-[360px] flex flex-col animate-pulse">
      {/* Zona Imagine */}
      <div className="h-48 sm:h-52 bg-slate-200 dark:bg-white/[0.05] w-full relative border-b border-slate-200 dark:border-white/[0.06]">
        <div className="absolute bottom-2.5 right-2.5 h-5 w-16 bg-slate-300 dark:bg-white/[0.08] rounded-md" />
      </div>

      {/* Zona Conținut */}
      <div className="p-4 flex-1 flex flex-col space-y-2.5">
        <div className="h-4 bg-slate-200 dark:bg-white/[0.06] rounded w-3/4" />
        <div className="h-5 bg-emerald-500/15 rounded w-1/3" />

        <div className="space-y-1.5 flex-1 pt-1">
          <div className="h-2.5 bg-slate-100 dark:bg-white/[0.04] rounded w-full" />
          <div className="h-2.5 bg-slate-100 dark:bg-white/[0.04] rounded w-4/5" />
        </div>

        {/* Footer Vânzător */}
        <div className="pt-3 mt-auto flex items-center justify-between border-t border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-slate-200 dark:bg-white/[0.06]" />
            <div className="h-3 w-20 bg-slate-200 dark:bg-white/[0.06] rounded" />
          </div>

          <div className="flex gap-1.5">
            <div className="h-7 w-7 bg-slate-100 dark:bg-white/[0.04] rounded-lg" />
            <div className="h-7 w-7 bg-slate-100 dark:bg-white/[0.04] rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}