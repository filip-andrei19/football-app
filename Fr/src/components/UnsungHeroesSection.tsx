import React, { useState } from 'react';
import { Heart, Quote, Calendar, ChevronDown, ChevronUp, Eye, Users, User } from 'lucide-react';

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
      image: 'https://img.a.transfermarkt.technology/portrait/header/3129-1664873752.jpg?lm=1',
      fullInterview: `Î: Faci scouting de trei decenii. Ce s-a schimbat?\n\nR: Totul și nimic. Tehnologia ne oferă date, dar inima nu o poți măsura cu un computer.`
    },
     {
      name: 'Ion "Nea Nelu" Barbu',
      role: 'Magazioner & Specialist Echipament',
      organization: 'Rapid București',
      date: 'Octombrie 2025',
      excerpt: 'Omul care se asigură că fiecare detaliu este perfect, de la crampoane până la pregătirea vestiarului.',
      image: 'https://images.unsplash.com/photo-1511886929837-354d827aae26?q=80&w=1000&auto=format&fit=crop',
      fullInterview: `Î: Lumea nu realizează importanța unui magazioner.\n\nR: Sunt responsabil de tot ce înseamnă echipament. Dar e mai mult de atât - sunt adesea prima persoană pe care o văd jucătorii dimineața.`
    },
  ];

  const staffSpotlights = [
    { name: 'Cristian Vasile', role: 'Analist Video', club: 'Univ. Craiova', contribution: 'Analize detaliate ale adversarilor.', icon: Eye },
    { name: 'Elena Radu', role: 'Nutriționist', club: 'FCSB', contribution: 'A revoluționat planurile alimentare.', icon: Users },
  ];

  return (
    <div className="space-y-12 py-10 min-h-[60vh] max-w-6xl mx-auto px-4">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
        <div className="p-4 rounded-2xl bg-red-100 text-red-600 shadow-sm">
          <Heart className="h-10 w-10" />
        </div>
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Eroii din Umbră</h1>
          <p className="text-lg text-gray-500 max-w-2xl">
            Sărbătorim oamenii care fac posibil fotbalul românesc, dar ale căror nume nu apar pe tabelă.
          </p>
        </div>
      </div>

      {/* STAFF SPOTLIGHTS */}
      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
           <Users className="h-6 w-6 text-blue-600" />
           Spotlight Staff Tehnic
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {staffSpotlights.map((person, index) => (
            <div key={index} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                  <person.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg text-gray-900 mb-1">{person.name}</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md font-medium">{person.role}</span>
                    <span className="px-2 py-1 border border-gray-200 text-gray-500 text-xs rounded-md">{person.club}</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{person.contribution}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* INTERVIURI */}
      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
           <Quote className="h-6 w-6 text-green-600" />
           Povești din Culise
        </h2>
        <div className="space-y-8">
          {interviews.map((interview, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300">
              <div className="md:flex">
                {/* Imagine */}
                <div className="md:w-1/3 h-64 md:h-auto relative">
                    <img src={interview.image} alt={interview.name} className="w-full h-full object-cover" />
                </div>
                
                {/* Text */}
                <div className="p-6 md:w-2/3 flex flex-col justify-between">
                  <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{interview.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                        <Calendar className="h-3 w-3" /> {interview.date}
                      </div>
                      <p className="text-gray-600 mb-4 italic border-l-4 border-green-500 pl-3">"{interview.excerpt}"</p>
                  </div>
                  <button
                    className="w-full mt-2 flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedInterview(expandedInterview === index ? null : index)}
                  >
                    <span>{expandedInterview === index ? 'Ascunde Interviul' : 'Citește Interviul Complet'}</span>
                    {expandedInterview === index ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {/* Expandare */}
              {expandedInterview === index && (
                <div className="border-t border-gray-100 bg-gray-50/50 p-6 whitespace-pre-line text-gray-800">
                    {interview.fullInterview}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* PARTEA CU BUTONUL A FOST ștearsă COMPLET */}
    </div>
  );
}