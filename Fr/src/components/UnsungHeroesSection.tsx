import React, { useState, useEffect } from 'react';
import { Heart, ChevronDown, Calendar, Loader2, Shield, MapPin } from 'lucide-react'; 

interface Story {
  _id: string;
  title: string;
  role: string;
  organization: string;
  excerpt: string;
  content: string;
  date: string;
}

const API_URL = 'https://football-backend-m2a4.onrender.com/api/stories';

export function UnsungHeroesSection() {
  const [stories, setStories] = useState<Story[]>([]);
  const [expandedStory, setExpandedStory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setStories(data);
    } catch (error) {
      console.error("Nu s-au putut încărca poveștile:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[80vh] py-10 overflow-hidden bg-transparent z-0">
      
      {/* FUNDAL ANIMAT - STADION / LUMINILE ARENEI (Pasiune / Roșu) */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none">
          <div className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 w-[50vw] h-[50vw] rounded-full bg-rose-600/10 dark:bg-rose-600/15 blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-0 left-0 -translate-x-1/4 translate-y-1/4 w-[40vw] h-[40vw] rounded-full bg-red-600/10 dark:bg-red-700/15 blur-[120px] animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full bg-orange-600/5 dark:bg-orange-600/10 blur-[150px] animate-pulse delay-2000"></div>
      </div>

      {/* HEADER TACTIC (HALL OF FAME) */}
      <section className="text-center space-y-4 px-4 relative z-10 mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-slate-900 border-2 border-rose-500 shadow-md">
          <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 fill-current animate-pulse" />
          <span className="text-white font-black uppercase tracking-widest text-xs sm:text-sm">Eroii din Spatele Cortinei</span> 
        </div>
        
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter text-slate-900 dark:text-white drop-shadow-sm flex flex-col sm:flex-row items-center justify-center gap-3">
          Legendele <span className="text-rose-600">Nevăzute</span>
        </h2>
        
        <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-300 text-sm sm:text-base font-bold uppercase tracking-widest border-b-2 border-rose-500/20 pb-4 inline-block">
          Oamenii care construiesc fotbalul românesc departe de lumina reflectoarelor.
        </p>
      </section>

      {/* ZONA DE CONȚINUT */}
      <section className="px-4 sm:px-6 container mx-auto max-w-4xl relative z-10 pb-20">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20 gap-4">
                <div className="w-16 h-16 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-black uppercase tracking-widest text-slate-500">Deschidem Arhiva...</p>
            </div>
          ) : stories.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 max-w-2xl mx-auto shadow-xl">
                <div className="bg-rose-100 dark:bg-rose-900/30 p-5 rounded-full mb-4 inline-block shadow-sm">
                    <Heart className="w-10 h-10 text-rose-500 fill-current opacity-50" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-widest text-slate-900 dark:text-white mb-2">Vitrina este goală</h3>
                <p className="text-slate-500 font-bold uppercase tracking-wide">Nu există povești publicate momentan în arhivă.</p>
            </div>
          ) : (
            <div className="grid gap-8">
              {stories.map((story) => (
                <div 
                  key={story._id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl hover:shadow-[0_20px_40px_rgba(225,29,72,0.15)] transition-all duration-300 border-4 border-slate-200 dark:border-slate-800 hover:border-rose-500 flex flex-col relative overflow-hidden group"
                >
                  {/* Accent vizual lateral */}
                  <div className="absolute top-0 left-0 w-2 h-full bg-rose-600 group-hover:w-3 transition-all"></div>

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b-2 border-slate-100 dark:border-slate-800 pb-6 ml-2">
                    <div className="flex-1">
                      <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">
                        {story.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-black uppercase tracking-widest">
                        <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                          <Shield className="w-4 h-4" /> {story.role}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          <MapPin className="w-4 h-4 text-rose-500" /> {story.organization}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-950 px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-800 shrink-0">
                      <Calendar className="w-4 h-4 text-rose-500" />
                      {story.date}
                    </div>
                  </div>

                  <div className="relative pl-6 sm:pl-8 border-l-4 border-rose-500 mb-2 ml-2">
                    <div className="absolute top-[-10px] left-[-16px] text-4xl text-rose-200 dark:text-rose-900/50 font-serif leading-none">"</div>
                    <p className="text-lg sm:text-xl text-slate-700 dark:text-slate-300 italic font-bold">
                      {story.excerpt}
                    </p>
                  </div>

                  {expandedStory === story._id && (
                    <div className="mt-6 pt-6 border-t-2 border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap animate-in fade-in slide-in-from-top-4 font-medium ml-2 text-sm sm:text-base">
                      {/* Fundal subtil de arhivă / document */}
                      <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                        {story.content || "CONȚINUTUL DETALIAT VA FI ADĂUGAT ÎN CURÂND."}
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => setExpandedStory(expandedStory === story._id ? null : story._id)}
                    className={`w-full mt-6 flex items-center justify-center gap-2 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all border-2 ml-2 ${
                        expandedStory === story._id 
                        ? 'bg-rose-600 border-rose-500 text-white shadow-[0_4px_15px_rgba(225,29,72,0.3)]' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:border-rose-500'
                    }`}
                  >
                    {expandedStory === story._id ? 'Închide Dosarul' : 'Citește Povestea Completă'}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expandedStory === story._id ? 'rotate-180' : 'group-hover:translate-y-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}
      </section>
    </div>
  );
}