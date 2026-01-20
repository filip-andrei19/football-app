import React from 'react';

// URL-ul pentru imaginea standard de user (Siluetă Gri)
const GENERIC_USER_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

const DIASPORA_PLAYERS = [
  {
    id: 1,
    name: "Radu Drăgușin",
    team: "Tottenham Hotspur",
    league: "Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    position: "Defender",
    image: GENERIC_USER_IMAGE,
    stats: { matches: 9, goals: 0, assists: 0 }
  },
  {
    id: 2,
    name: "Dennis Man",
    team: "Parma",
    league: "Serie A 🇮🇹",
    position: "Attacker",
    image: GENERIC_USER_IMAGE,
    stats: { matches: 13, goals: 3, assists: 4 }
  },
  {
    id: 3,
    name: "Nicolae Stanciu",
    team: "Damac FC",
    league: "Saudi Pro League 🇸🇦",
    position: "Midfielder",
    image: GENERIC_USER_IMAGE,
    stats: { matches: 18, goals: 5, assists: 6 }
  },
  {
    id: 4,
    name: "Denis Drăguș",
    team: "Trabzonspor",
    league: "Süper Lig 🇹🇷",
    position: "Attacker",
    image: GENERIC_USER_IMAGE,
    stats: { matches: 14, goals: 6, assists: 1 }
  },
  {
    id: 5,
    name: "Andrei Rațiu",
    team: "Rayo Vallecano",
    league: "La Liga 🇪🇸",
    position: "Defender",
    image: GENERIC_USER_IMAGE,
    stats: { matches: 10, goals: 1, assists: 1 }
  },
  {
    id: 6,
    name: "Răzvan Marin",
    team: "Cagliari",
    league: "Serie A 🇮🇹",
    position: "Midfielder",
    image: GENERIC_USER_IMAGE,
    stats: { matches: 12, goals: 2, assists: 0 }
  },
  {
    id: 7,
    name: "Valentin Mihăilă",
    team: "Parma",
    league: "Serie A 🇮🇹",
    position: "Attacker",
    image: GENERIC_USER_IMAGE,
    stats: { matches: 11, goals: 0, assists: 2 }
  },
  {
    id: 8,
    name: "Andrei Burcă",
    team: "Baniyas",
    league: "UAE Pro League 🇦🇪",
    position: "Defender",
    image: GENERIC_USER_IMAGE,
    stats: { matches: 15, goals: 3, assists: 0 }
  },
  {
    id: 9,
    name: "Ianis Hagi",
    team: "Rangers / Alaves",
    league: "Premiership 🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    position: "Midfielder",
    image: GENERIC_USER_IMAGE,
    stats: { matches: 8, goals: 1, assists: 1 }
  },
  {
    id: 10,
    name: "Olimpiu Moruțan",
    team: "Pisa",
    league: "Serie B 🇮🇹",
    position: "Midfielder",
    image: GENERIC_USER_IMAGE,
    stats: { matches: 20, goals: 2, assists: 5 }
  },
  {
    id: 11,
    name: "George Pușcaș",
    team: "Bodrum FK",
    league: "Süper Lig 🇹🇷",
    position: "Attacker",
    image: GENERIC_USER_IMAGE,
    stats: { matches: 10, goals: 4, assists: 0 }
  },
  {
    id: 12,
    name: "Horațiu Moldovan",
    team: "Sassuolo",
    league: "Serie B 🇮🇹",
    position: "Goalkeeper",
    image: GENERIC_USER_IMAGE,
    stats: { matches: 8, goals: 0, assists: 0 }
  },
  {
    id: 13,
    name: "Marius Marin",
    team: "Pisa",
    league: "Serie B 🇮🇹",
    position: "Midfielder",
    image: GENERIC_USER_IMAGE,
    stats: { matches: 16, goals: 0, assists: 1 }
  },
  {
    id: 14,
    name: "Deian Sorescu",
    team: "Gaziantep",
    league: "Süper Lig 🇹🇷",
    position: "Midfielder",
    image: GENERIC_USER_IMAGE,
    stats: { matches: 12, goals: 2, assists: 1 }
  },
  {
    id: 15,
    name: "Alexandru Cicâldău",
    team: "Universitatea Craiova",
    league: "SuperLiga 🇷🇴",
    position: "Midfielder",
    image: GENERIC_USER_IMAGE,
    stats: { matches: 11, goals: 1, assists: 2 }
  },
  {
    id: 16,
    name: "Bogdan Racovițan",
    team: "Raków Częstochowa",
    league: "Ekstraklasa 🇵🇱",
    position: "Defender",
    image: GENERIC_USER_IMAGE,
    stats: { matches: 14, goals: 2, assists: 0 }
  },
  {
    id: 17,
    name: "Ionuț Nedelcearu",
    team: "Palermo",
    league: "Serie B 🇮🇹",
    position: "Defender",
    image: GENERIC_USER_IMAGE,
    stats: { matches: 9, goals: 1, assists: 0 }
  },
  {
    id: 18,
    name: "Adrian Rus",
    team: "Pafos",
    league: "Cyprus League 🇨🇾",
    position: "Defender",
    image: GENERIC_USER_IMAGE,
    stats: { matches: 13, goals: 0, assists: 0 }
  }
];

export function DiasporaSection() {
  return (
    <div className="space-y-12 py-10 min-h-[60vh]">
      
      {/* HEADER SECTION */}
      <section className="text-center space-y-6 px-4">
        <div className="inline-block px-4 py-1.5 rounded-full bg-yellow-100 text-yellow-800 text-sm font-semibold mb-2">
          🇷🇴 Tricolorii peste hotare
        </div>
        
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-yellow-500 to-red-600">
          Ambasadorii Fotbalului Românesc
        </h1>
        
        <div className="max-w-2xl mx-auto space-y-4 text-muted-foreground text-lg">
          <p>
            Ei sunt cei care duc faima României pe marile stadioane ale Europei. 
            De la Londra la Roma, și de la Madrid până la Milano, inima tricoloră bate puternic.
          </p>
          <blockquote className="italic border-l-4 border-yellow-400 pl-4 py-2 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            "Să joci pentru echipa ta de club e o meserie, dar să reprezinți România în lume e o onoare."
          </blockquote>
        </div>
      </section>

      {/* PLAYER GRID */}
      <section className="px-6 container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {DIASPORA_PLAYERS.map((player) => (
            <div 
              key={player.id} 
              className="border rounded-xl bg-card shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group overflow-hidden"
            >
              {/* Image Container */}
              <div className="relative h-48 bg-gray-50 flex justify-center items-center pt-4">
                 <img 
                    src={player.image} 
                    alt={player.name}
                    className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg group-hover:scale-105 transition-transform duration-300"
                 />
                 <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm border">
                    {player.league}
                 </div>
              </div>

              {/* Player Details */}
              <div className="p-5 text-center">
                <div className="mb-4">
                  <h3 className="text-xl font-bold group-hover:text-blue-700 transition-colors">
                    {player.name}
                  </h3>
                  <p className="text-sm font-medium text-gray-500">
                    {player.team}
                  </p>
                  <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-semibold border border-blue-100">
                    {player.position}
                  </span>
                </div>

                {/* Stats Table */}
                <div className="grid grid-cols-3 gap-2 border-t pt-4 bg-gray-50/50 -mx-5 -mb-5 pb-5 px-5">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-gray-400 font-bold">Meciuri</span>
                    <span className="text-lg font-bold text-gray-800">{player.stats.matches}</span>
                  </div>
                  <div className="flex flex-col border-l border-r border-gray-200">
                    <span className="text-[10px] uppercase text-gray-400 font-bold">Goluri</span>
                    <span className="text-lg font-bold text-green-600">{player.stats.goals}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-gray-400 font-bold">Pase</span>
                    <span className="text-lg font-bold text-blue-600">{player.stats.assists}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Message */}
      <section className="text-center pt-8 pb-4 opacity-70">
        <p className="text-sm">🇷🇴 Susținem românii, oriunde ar fi!</p>
      </section>
    </div>
  );
}