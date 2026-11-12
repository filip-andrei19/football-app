import React from 'react';

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-slate-200 dark:border-slate-800 overflow-hidden h-[380px] sm:h-[420px] flex flex-col animate-pulse shadow-sm">
      {/* Zona Imagine */}
      <div className="h-48 sm:h-60 bg-slate-200 dark:bg-slate-800 w-full relative border-b-2 sm:border-b-4 border-slate-200 dark:border-slate-800">
        <div className="absolute bottom-2.5 sm:bottom-3 right-2.5 sm:right-3 h-5 sm:h-6 w-16 sm:w-20 bg-slate-300 dark:bg-slate-700 rounded-lg"></div>
      </div>

      {/* Zona Conținut */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col space-y-3 sm:space-y-4 bg-slate-50 dark:bg-slate-950">
        <div className="flex justify-between items-center gap-4">
             <div className="h-5 sm:h-7 bg-slate-300 dark:bg-slate-700 rounded-lg w-2/3"></div>
        </div>
        
        <div className="h-6 sm:h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg w-1/3"></div>
        
        <div className="space-y-1.5 sm:space-y-2 flex-1 mt-1 sm:mt-2">
            <div className="h-2.5 sm:h-3 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
            <div className="h-2.5 sm:h-3 bg-slate-200 dark:bg-slate-800 rounded w-4/5"></div>
        </div>

        {/* Zona Footer Vânzător */}
        <div className="pt-3 sm:pt-4 mt-auto flex items-center justify-between border-t-2 border-slate-200 dark:border-slate-800">
             <div className="flex items-center gap-2.5 sm:gap-3">
                 <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-slate-300 dark:bg-slate-700 border border-slate-200 dark:border-slate-800"></div>
                 <div className="space-y-1.5 sm:space-y-2">
                     <div className="h-2 w-10 sm:w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
                     <div className="h-2.5 sm:h-3 w-16 sm:w-20 bg-slate-300 dark:bg-slate-700 rounded"></div>
                 </div>
             </div>
             
             <div className="flex gap-1.5 sm:gap-2">
                 <div className="h-8 w-8 sm:h-9 sm:w-9 bg-slate-200 dark:bg-slate-800 rounded-lg sm:rounded-xl"></div>
                 <div className="h-8 w-8 sm:h-9 sm:w-9 bg-slate-200 dark:bg-slate-800 rounded-lg sm:rounded-xl"></div>
             </div>
        </div>
      </div>
    </div>
  );
}