require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const Player = require('./models/player'); 

// --- CONFIGURARE ---
const CURRENT_SEASON = 2024; 
const ROMANIA_LEAGUE_ID = 283;       // SuperLiga
const ROMANIA_NATIONAL_TEAM_ID = 119; // Echipa Națională

// Cele mai tari 5 ligi din Europa (Top 5 Leagues)
const TOP_LEAGUES = [
  { id: 39, name: "Premier League (Anglia)" },
  { id: 140, name: "La Liga (Spania)" },
  { id: 135, name: "Serie A (Italia)" },
  { id: 78, name: "Bundesliga (Germania)" },
  { id: 61, name: "Ligue 1 (Franța)" }
];

const API_HEADERS = {
  'x-rapidapi-key': process.env.API_KEY,
  'x-rapidapi-host': 'v3.football.api-sports.io'
};

// Pauză de siguranță (4 secunde)
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Funcția de salvare inteligentă
const savePlayers = async (playersList, leagueId, isPriority = false) => {
  let savedCount = 0;
  
  for (const item of playersList) {
    const p = item.player;
    
    // Căutăm statistica potrivită
    let stats = item.statistics[0];
    if (leagueId) {
        stats = item.statistics.find(s => s.league.id === leagueId) || item.statistics[0];
    }

    const app = stats.games.appearences || 0;

    // --- FILTRU DE CALITATE ---
    // Păstrăm jucătorul DOAR DACĂ:
    // 1. Este "Prioritate" (Națională sau Top Scorer internațional).
    // 2. SAU are măcar 1 meci jucat (pentru SuperLigă).
    // 3. SAU este portar (portarii de rezervă merită păstrați).
    if (!isPriority && app < 1 && p.position !== "Goalkeeper") {
        continue; // Sărim peste juniorii fără meciuri
    }

    // UPSERT: Actualizăm sau Adăugăm
    await Player.updateOne(
      { api_player_id: p.id },
      {
          name: p.name,
          age: p.age,
          nationality: p.nationality,
          position: stats.games.position,
          image: p.photo,
          team_name: stats.team.name,
          statistics_summary: {
            team_name: stats.team.name,
            total_goals: stats.goals.total || 0,
            total_assists: stats.goals.assists || 0,
            total_appearances: app
          },
          api_player_id: p.id
      },
      { upsert: true }
    );
    savedCount++;
  }
  return savedCount;
};

// Funcție pentru echipe (paginare)
const fetchTeamPlayers = async (teamId, season, contextName) => {
    let allPlayers = [];
    let currentPage = 1;
    let hasNext = true;

    while (hasNext) {
        await wait(4000); // Pauză protectivă

        try {
            const url = `https://v3.football.api-sports.io/players?team=${teamId}&season=${season}&page=${currentPage}`;
            const response = await axios.get(url, { headers: API_HEADERS });
            
            if (response.data.errors && Object.keys(response.data.errors).length > 0) {
                console.log(`⚠️ Rate Limit la ${contextName}.`);
                break; 
            }

            const list = response.data.response;
            if (list && list.length > 0) {
                allPlayers = [...allPlayers, ...list];
                if (response.data.paging.current < response.data.paging.total) {
                    currentPage++;
                } else {
                    hasNext = false;
                }
            } else {
                hasNext = false;
            }
        } catch (err) { hasNext = false; }
    }
    return allPlayers;
};

const runImport = async () => {
  try {
    console.log("🔌 Conectare la MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("ℹ️  Nu șterg baza de date, doar adaug/actualizez.");

    // --- 1. ECHIPA NAȚIONALĂ (VIP) ---
    console.log(`\n🇹🇩 Pasul 1: ECHIPA NAȚIONALĂ...`);
    const natPlayers = await fetchTeamPlayers(ROMANIA_NATIONAL_TEAM_ID, CURRENT_SEASON, "Romania");
    if (natPlayers.length > 0) {
        // isPriority = true -> Îi luăm pe toți, nu filtrăm
        const count = await savePlayers(natPlayers, null, true); 
        console.log(`✅ ${count} tricolori actualizați.`);
    }

    // --- 2. SUPERLIGA (Filtru Activ) ---
    console.log(`\n🇷🇴 Pasul 2: SuperLiga (Echipe)...`);
    const teamsResponse = await axios.get(`https://v3.football.api-sports.io/teams?league=${ROMANIA_LEAGUE_ID}&season=${CURRENT_SEASON}`, { headers: API_HEADERS });
    
    for (const t of teamsResponse.data.response) {
        process.stdout.write(`⚽ ${t.team.name}: `);
        const players = await fetchTeamPlayers(t.team.id, CURRENT_SEASON, t.team.name);
        
        if (players.length > 0) {
            // isPriority = false -> Aplicăm filtrul (fără jucători cu 0 meciuri)
            const count = await savePlayers(players, ROMANIA_LEAGUE_ID, false);
            console.log(`✅ ${count} jucători.`);
        } else {
            console.log(`-`);
        }
    }

    // --- 3. VEDETELE INTERNAȚIONALE (Top Scorers) ---
    console.log(`\n⭐ Pasul 3: Top 20 din Marile Ligi...`);
    
    for (const league of TOP_LEAGUES) {
        await wait(4000); // Pauză înainte de fiecare ligă
        try {
            console.log(`🌍 Descarc Top Scorers din ${league.name}...`);
            const url = `https://v3.football.api-sports.io/players/topscorers?league=${league.id}&season=${CURRENT_SEASON}`;
            const response = await axios.get(url, { headers: API_HEADERS });
            
            if (response.data.response && response.data.response.length > 0) {
                // isPriority = true -> Îi luăm pe toți, sunt vedete
                const count = await savePlayers(response.data.response, league.id, true);
                console.log(`   ✅ Adăugați ${count} jucători de top.`);
            }
        } catch (err) { 
            console.error(`   ❌ Eroare la ${league.name}: ${err.message}`); 
        }
    }

    console.log(`\n🎉 GATA! Baza de date e completă.`);
    process.exit(0);

  } catch (error) {
    console.error("Eroare fatală:", error);
    process.exit(1);
  }
};

runImport();