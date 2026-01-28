import React from 'react';

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-full flex flex-col animate-pulse">
      {/* Zona Imagine */}
      <div className="h-64 bg-gray-200 w-full relative">
        <div className="absolute top-3 right-3 h-6 w-16 bg-gray-300 rounded-full"></div>
      </div>

      {/* Zona Conținut */}
      <div className="p-5 flex-1 flex flex-col space-y-3">
        <div className="flex justify-between items-center">
             <div className="h-6 bg-gray-200 rounded w-1/2"></div>
             <div className="h-6 bg-gray-200 rounded w-16"></div>
        </div>
        
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>

        <div className="pt-4 mt-auto flex items-center justify-between border-t border-gray-50">
             <div className="flex items-center gap-2">
                 <div className="h-8 w-8 rounded-full bg-gray-200"></div>
                 <div className="h-4 w-20 bg-gray-200 rounded"></div>
             </div>
        </div>
      </div>
    </div>
  );
}