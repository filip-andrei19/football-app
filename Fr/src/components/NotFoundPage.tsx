import React from 'react';
import { Home, AlertCircle } from 'lucide-react';

export function NotFoundPage({ onGoHome }: { onGoHome: () => void }) {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 sm:px-8 animate-in zoom-in-95 duration-500 pb-20 mt-4 sm:mt-0">
      <div className="relative mb-2 sm:mb-4">
         <div className="text-7xl sm:text-9xl font-black text-slate-100 dark:text-slate-900 select-none">404</div>
         <div className="absolute inset-0 flex items-center justify-center">
            <AlertCircle className="w-16 h-16 sm:w-20 sm:h-20 text-rose-500 drop-shadow-xl animate-pulse" />
         </div>
      </div>
      
      <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mt-4 drop-shadow-sm">
        Ofsaid! Pagină negăsită.
      </h2>
      <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] sm:text-sm mt-2 sm:mt-3 max-w-xs sm:max-w-md mx-auto">
        Ai ajuns într-o zonă în afara terenului de joc. Această pagină nu există sau a fost eliminată de la centru.
      </p>

      <button 
        onClick={onGoHome}
        className="mt-6 sm:mt-8 bg-emerald-600 hover:bg-emerald-500 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-xs sm:text-sm flex items-center gap-2 shadow-[0_10px_20px_rgba(16,185,129,0.3)] transition-all border-b-4 border-emerald-800 hover:border-b-2 hover:translate-y-[2px]"
      >
        <Home className="w-4 h-4 sm:w-5 sm:h-5" /> Înapoi la Start
      </button>
    </div>
  );
}