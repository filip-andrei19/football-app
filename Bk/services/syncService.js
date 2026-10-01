const axios = require('axios');
const Player = require('../models/player'); 

// --- CONFIGURARE API-FOOTBALL ---
const CURRENT_SEASON = 2026; // Sezonul curent actualizat
const LEAGUES = [
  { id: 283, name: "SuperLiga (Romania)" },
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

// Pauză de siguranță pentru a respecta Rate Limit-ul (4 secunde între cereri)
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runDailySmartSync = async () => {
  console.log("🚀 [SYNC] Începe sincronizarea inteligentă cu API-Football...");
  
  try {
    let savedCount = 0;

    for (const league of LEAGUES) {
      console.log(`🌍 [LIGĂ] Procesez ${league.name}...`);
      
      // 1. Preluăm echipele din ligă pentru sezonul curent
      await wait(4000);
      const teamsRes = await axios.get(`https://v3.football.api-sports.io/teams?league=${league.id}&season=${CURRENT_SEASON}`, {
        headers: API_HEADERS
      });

      const teams = teamsRes.data?.response || [];

      // 2. Parcurgem fiecare echipă pentru a lua lotul de jucători prin paginare
      for (const t of teams) {
        let currentPage = 1;
        let hasNext = true;

        while (hasNext) {
          await wait(4000); // Pauză protectivă

          const url = `https://v3.football.api-sports.io/players?team=${t.team.id}&season=${CURRENT_SEASON}&page=${currentPage}`;
          const response = await axios.get(url, { headers: API_HEADERS });

          if (response.data.errors && Object.keys(response.data.errors).length > 0) {
            console.log(`⚠️ Rate Limit atins pentru echipa ${t.team.name}.`);
            break;
          }

          const playersList = response.data.response;
          if (!playersList || playersList.length === 0) {
            break;
          }

          // 3. Salvare atomică (Upsert) în MongoDB
          for (const item of playersList) {
            const p = item.player;
            const stats = item.statistics && item.statistics[0];

            if (p) {
              const app = stats?.games?.appearences || 0;
              
              await Player.findOneAndUpdate(
                { api_id: p.id }, // Căutăm după ID-ul unic din API-Football
                {
                  api_id: p.id,
                  name: p.name,
                  firstname: p.firstname,
                  lastname: p.lastname,
                  age: p.age,
                  nationality: p.nationality,
                  position: stats?.games?.position || p.position || "N/A",
                  image: p.photo,
                  team: stats?.team?.name || t.team.name,
                  team_logo: stats?.team?.logo || t.team.logo,
                  statistics_summary: {
                    team_name: stats?.team?.name || t.team.name,
                    total_goals: stats?.goals?.total || 0,
                    total_assists: stats?.goals?.assists || 0,
                    total_appearances: app
                  },
                  updatedAt: new Date()
                },
                { upsert: true, new: true }
              );
              savedCount++;
            }
          }

          // Verificăm dacă mai sunt pagini pentru această echipă
          if (response.data.paging && response.data.paging.current < response.data.paging.total) {
            currentPage++;
          } else {
            hasNext = false;
          }
        }
      }
    }

    console.log(`✅ [SYNC COMPLET] S-au sincronizat ${savedCount} jucători prin API-Football.`);

  } catch (error) {
    if (error.response && error.response.status === 429) {
        console.error("❌ RATE LIMIT: API-Football te-a blocat temporar. Mărește timpul de pauză sau verifică planul.");
    } else {
        console.error("❌ EROARE CRITICĂ LA SINCRONIZARE:", error.message);
    }
  }
};

module.exports = { runDailySmartSync };