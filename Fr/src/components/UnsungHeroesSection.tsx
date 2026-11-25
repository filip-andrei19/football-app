import React, { useState, useEffect } from 'react';
import { Heart, ChevronDown, Calendar, Shield, MapPin } from 'lucide-react';

interface Story {
  _id: string;
  title: string;
  role: string;
  organization: string;
  excerpt: string;
  content: string;
  date: string;
}

const API_URL =
  ((import.meta as any).env?.VITE_API_URL || 'https://football-backend-m2a4.onrender.com') + '/api/stories';

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
      setStories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Nu s-au putut încărca poveștile:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto min-h-[75vh] pb-16 space-y-5">
      {/* Header Bento */}
      <section className="bg-white dark:bg-[#101726] border border-slate-200/80 dark:border-white/[0.07] rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">
              Legendele Nevăzute
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Oamenii care construiesc fotbalul românesc departe de lumina reflectoarelor.
            </p>
          </div>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-[#090D16] border border-slate-200/80 dark:border-white/[0.06] text-center shrink-0 self-start sm:self-auto font-mono-stats">
          <span className="block text-sm font-semibold text-rose-500">{stories.length}</span>
          <span className="text-[10px] font-sans text-slate-500">Articole</span>
        </div>
      </section>

      {/* Conținut */}
      <section>
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-3">
            <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Se încarcă poveștile...</p>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-14 bg-white dark:bg-[#101726] rounded-2xl border border-slate-200/80 dark:border-white/[0.07] max-w-md mx-auto px-6">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-3">
              <Heart className="w-5 h-5 text-rose-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Nicio poveste publicată</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Arhiva nu conține articole momentan.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {stories.map((story) => {
              const isExpanded = expandedStory === story._id;
              return (
                <article
                  key={story._id}
                  className="bg-white dark:bg-[#101726] rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/[0.07] hover:border-slate-300 dark:hover:border-white/[0.14] transition-colors"
                >
                  {/* Header Articol */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
                    <div className="min-w-0 space-y-2">
                      <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white leading-snug">
                        {story.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg font-medium">
                          <Shield className="w-3 h-3 shrink-0" />
                          <span>{story.role}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#090D16] border border-slate-200/80 dark:border-white/[0.07] px-2.5 py-0.5 rounded-lg">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{story.organization}</span>
                        </span>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs shrink-0 font-mono-stats bg-slate-50 dark:bg-[#090D16] px-2.5 py-1 rounded-lg border border-slate-200/70 dark:border-white/[0.06]">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {story.date}
                    </div>
                  </div>

                  {/* Excerpt */}
                  <blockquote className="border-l-2 border-rose-500/60 pl-4 py-0.5 text-sm sm:text-base text-slate-700 dark:text-slate-300 italic leading-relaxed">
                    „{story.excerpt}”
                  </blockquote>

                  {/* Conținut complet */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                      <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#090D16] rounded-xl border border-slate-200/80 dark:border-white/[0.06] text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {story.content || "Conținutul detaliat va fi adăugat în curând."}
                      </div>
                    </div>
                  )}

                  {/* Acțiune */}
                  <button
                    type="button"
                    onClick={() => setExpandedStory(isExpanded ? null : story._id)}
                    className={`w-full mt-4 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-colors border cursor-pointer ${
                      isExpanded
                        ? 'bg-slate-900 dark:bg-[#182235] border-slate-900 dark:border-white/[0.12] text-white'
                        : 'bg-slate-50 dark:bg-[#090D16] border-slate-200 dark:border-white/[0.07] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/[0.15]'
                    }`}
                  >
                    {isExpanded ? 'Restrânge articolul' : 'Citește povestea completă'}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}