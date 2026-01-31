import React, { useState, useEffect } from 'react';
import { Newspaper, ChevronDown, Calendar, User, Loader2 } from 'lucide-react';

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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-3">
          <Newspaper className="w-10 h-10 text-blue-600" />
          Eroii din Spatele Cortinei
        </h2>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          Poveștile oamenilor care construiesc fotbalul românesc departe de lumina reflectoarelor.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600"/>
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center text-gray-500 py-10">Nu există povești publicate momentan.</div>
      ) : (
        <div className="grid gap-8">
          {stories.map((story) => (
            <div 
              key={story._id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-gray-100 dark:border-slate-700"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{story.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-bold text-green-600 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full">
                      {story.role}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500 dark:text-gray-300">{story.organization}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium bg-gray-50 dark:bg-slate-900 px-3 py-2 rounded-lg border border-gray-100 dark:border-slate-700">
                  <Calendar className="w-4 h-4" />
                  {story.date}
                </div>
              </div>

              <div className="relative pl-6 border-l-4 border-green-500 mb-6">
                <p className="text-xl text-gray-600 dark:text-gray-300 italic font-medium">
                  "{story.excerpt}"
                </p>
              </div>

              {expandedStory === story._id && (
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700 text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap animate-in fade-in slide-in-from-top-4">
                  {story.content || "Conținutul detaliat va fi adăugat în curând."}
                </div>
              )}

              <button 
                onClick={() => setExpandedStory(expandedStory === story._id ? null : story._id)}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-gray-500 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all group"
              >
                {expandedStory === story._id ? 'Ascunde Povestea' : 'Citește Povestea Completă'}
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expandedStory === story._id ? 'rotate-180 text-blue-600' : 'group-hover:translate-y-1'}`} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}