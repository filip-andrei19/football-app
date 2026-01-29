import React, { useState } from 'react';
import { Heart, Quote, Calendar, ChevronDown, ChevronUp, Eye, Users, Lightbulb, Send, Activity, Shirt } from 'lucide-react';

export function UnsungHeroesSection() {
  const [expandedInterview, setExpandedInterview] = useState<number | null>(null);

  // --- DATELE STATICE ---
  const interviews = [
    {
      name: 'Gheorghe "Gică" Popescu',
      role: 'Șef Departament Scouting',
      organization: 'Academia FC Viitorul / Farul',
      date: 'Decembrie 2025',
      excerpt: 'După 30 de ani de descoperit talente, ne împărtășește secretele prin care identifică viitoarele stele ale României.',
      fullInterview: `Î: Faci scouting de trei decenii. Ce s-a schimbat?\n\nR: Totul și nimic. Tehnologia ne oferă date, dar inima nu o poți măsura cu un computer. Când văd un copil cum lovește mingea, știu în 5 minute dacă are "acel ceva".\n\nÎ: Care e cel mai greu lucru?\n\nR: Să convingi părinții să aibă răbdare. Toți vor rezultate ieri. Campionii se cresc în ani de zile, nu peste noapte.`
    },
    {
      name: 'Ion "Nea Nelu" Barbu',
      role: 'Magazioner & Specialist Echipament',
      organization: 'Rapid București',
      date: 'Octombrie 2025',
      excerpt: 'Omul care se asigură că fiecare detaliu este perfect, de la crampoane până la pregătirea vestiarului.',
      fullInterview: `Î: Lumea nu realizează importanța unui magazioner.\n\nR: Sunt responsabil de tot ce înseamnă echipament. Dar e mai mult de atât - sunt adesea prima persoană pe care o văd jucătorii dimineața. Dacă eu sunt posomorât, le stric ziua. Așa că îi întâmpin mereu cu o glumă.\n\nÎ: O amintire specială?\n\nR: Promovarea din 2021. Am plâns cu toții în vestiar. Tricourile alea pline de șampanie le-am spălat cu cea mai mare bucurie.`
    },
  ];

  const staffSpotlights = [
    { name: 'Cristian Vasile', role: 'Analist Video', club: 'Univ. Craiova', contribution: 'Analize detaliate ale adversarilor care au dus la 3 victorii tactice cruciale în acest sezon.', icon: Eye },
    { name: 'Elena Radu', role: 'Nutriționist', club: 'FCSB', contribution: 'A revoluționat planurile alimentare, reducând accidentările musculare cu 40% în ultimul an.', icon: Users },
  ];

  return (
    <div className="space-y-16 py-12 min-h-[60vh] max-w-7xl mx-auto px-4 bg-gradient-to-b from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
      
      {/* HEADER */}
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-red-100 text-red-600 mb-4 shadow-lg shadow-red-100/50">
          <Heart className="h-8 w-8 fill-current" />
        </div>
        <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tight">
          Eroii din <span className="text-red-600">Umbră</span>
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-medium">
          Sărbătorim oamenii care fac posibil fotbalul românesc, dincolo de lumina reflectoarelor.
        </p>
      </div>

      {/* 1. STAFF SPOTLIGHTS (Carduri Moderne) */}
      <div>
        <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-1 bg-blue-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Spotlight Staff Tehnic</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {staffSpotlights.map((person, index) => (
            <div key={index} className="group bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start gap-5">
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <person.icon className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-1">{person.name}</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded-full font-bold uppercase tracking-wide">{person.role}</span>
                    <span className="px-3 py-1 border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 text-xs rounded-full font-medium">{person.club}</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">{person.contribution}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. ȘTIAȚI CĂ? (Secțiune Nouă) */}
      <div className="bg-amber-50 dark:bg-amber-900/10 rounded-3xl p-8 border border-amber-100 dark:border-amber-800/30">
        <div className="flex items-center gap-2 mb-6">
            <Lightbulb className="h-6 w-6 text-amber-500" />
            <h3 className="text-xl font-bold text-amber-900 dark:text-amber-100">Știați că?</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-amber-100/50 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                    <Shirt className="h-5 w-5 text-amber-500" />
                    <span className="text-3xl font-black text-slate-800 dark:text-white">15.000+</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Articole de echipament spălate și împăturite de un magazioner într-un singur sezon competițional.</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-amber-100/50 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-5 w-5 text-red-500" />
                    <span className="text-3xl font-black text-slate-800 dark:text-white">8 km</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Distanța medie alergată de un kinetoterapeut intrând pe teren și asistând jucătorii în timpul meciurilor.</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-amber-100/50 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-5 w-5 text-blue-500" />
                    <span className="text-3xl font-black text-slate-800 dark:text-white">40 ore</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Timpul petrecut săptămânal de un analist video vizionând meciuri pentru a pregăti un singur raport tactic.</p>
            </div>
        </div>
      </div>

      {/* 3. INTERVIURI (Stilizare Îmbunătățită) */}
      <div>
        <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-1 bg-green-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Povești din Culise</h2>
        </div>
        <div className="space-y-6">
          {interviews.map((interview, index) => (
            <div key={index} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="p-8">
                <div className="flex flex-col md:flex-row md:items-start justify-between mb-6">
                    <div className="flex gap-4">
                        <div className="hidden md:flex h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center text-green-600">
                            <Quote className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{interview.name}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-sm font-bold text-green-600 dark:text-green-400">{interview.role}</span>
                                <span className="text-gray-300">•</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{interview.organization}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 bg-gray-50 dark:bg-slate-700 px-3 py-1 rounded-lg mt-4 md:mt-0 w-fit">
                        <Calendar className="h-3.5 w-3.5" /> {interview.date}
                    </div>
                </div>
                
                <div className="relative pl-6 border-l-4 border-green-200 dark:border-green-800 my-6">
                    <p className="text-lg text-gray-700 dark:text-gray-300 italic">"{interview.excerpt}"</p>
                </div>

                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedInterview === index ? 'max-h-[1000px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
                    <div className="bg-green-50/50 dark:bg-slate-700/30 p-6 rounded-xl text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed border border-green-100/50 dark:border-slate-600">
                        {interview.fullInterview}
                    </div>
                </div>

                <button
                  className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-slate-700 text-sm font-bold text-gray-500 hover:text-green-600 transition-colors uppercase tracking-wider"
                  onClick={() => setExpandedInterview(expandedInterview === index ? null : index)}
                >
                  <span>{expandedInterview === index ? 'Ascunde Interviul' : 'Citește Povestea Completă'}</span>
                  {expandedInterview === index ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. CTA SECTION (Nou!) */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-10 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-red-500/10 rounded-full blur-3xl"></div>
          
          <h3 className="text-2xl font-bold text-white mb-3">Cunoști un Erou Necunoscut?</h3>
          <p className="text-slate-300 max-w-xl mx-auto mb-8 text-lg">
              Fie că este antrenorul de la juniori care nu renunță niciodată sau omul care are grijă de gazon pe ploaie și vânt, vrem să-i aflăm povestea.
          </p>
          <button className="bg-white text-slate-900 hover:bg-gray-100 px-8 py-3 rounded-xl font-bold inline-flex items-center gap-2 transition-transform hover:scale-105 shadow-xl">
              <Send className="w-4 h-4" /> Trimite o Nominalizare
          </button>
      </div>

    </div>
  );
}