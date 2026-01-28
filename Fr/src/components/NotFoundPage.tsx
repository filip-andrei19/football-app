import React from 'react';
import { Home, AlertCircle } from 'lucide-react';

export function NotFoundPage({ onGoHome }: { onGoHome: () => void }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 animate-in zoom-in-95 duration-500">
      <div className="relative">
         <div className="text-9xl font-black text-gray-100 select-none">404</div>
         <div className="absolute inset-0 flex items-center justify-center">
            <AlertCircle className="w-20 h-20 text-red-500 drop-shadow-xl" />
         </div>
      </div>
      
      <h2 className="text-3xl font-bold text-gray-900 mt-4">Ofsaid! Pagină negăsită.</h2>
      <p className="text-gray-500 mt-2 max-w-md">
        Se pare că ai ajuns într-o zonă în afara terenului de joc. Această pagină nu există sau a fost eliminată.
      </p>

      <button 
        onClick={onGoHome}
        className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all hover:-translate-y-1"
      >
        <Home className="w-5 h-5" /> Înapoi la Start
      </button>
    </div>
  );
}