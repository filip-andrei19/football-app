const axios = require('axios');
const Player = require('../models/player'); 

// --- CONFIGURARE SPORTMONKS ---
// ID-uri: 632 (Superliga), 8 (Premier League), 564 (La Liga), 384 (Serie A), 82 (Bundesliga), 301 (Ligue 1)
const LEAGUES = "632,8,564,384,82,301";
const API_TOKEN = process.env.SPORTMONKS_API_KEY; // Schimbă în .env din API_KEY în SPORTMONKS_API_KEY pentru claritate

const syncPlayers = async () => {
  console.log("🚀 [SYNC] Începe sincronizarea cu Sportmonks...");

  // Construim URL-ul inițial cu include-urile necesare pentru statisticile sezonului curent
  let url = `https://api.sportmonks.com/v3/football/players?filter=league_ids:${LEAGUES}&include=statistics.season;teams`;
  
  try {
    let savedCount = 0;
    let page = 1;

    // --- PASUL 1 & 2: LOOP PENTRU PAGINARE ---
    while (url) {
      console.log(`🌍 [PAGINA ${page}] Contactez Sportmonks...`);
      
      const response = await axios.get(url, {
        headers: { 'Authorization': API_TOKEN }
      });

      const playersList = response.data.data; 
      const pagination = response.data.pagination;

      if (!playersList || playersList.length === 0) {
        console.warn("⚠️ API-ul nu a returnat jucători pe această pagină.");
        break;
      }

      // --- PASUL 3: SALVARE ATOMICĂ (UPSERT) ---
      // Nu mai ștergem baza de date (deleteMany). Modificăm doar ce s-a schimbat.
      for (const p of playersList) {
        // Luăm statisticile primului sezon găsit în include (cel curent)
        const stats = p.statistics && p.statistics[0];
        const team = p.teams && p.teams[0];

        if (p) {
          await Player.findOneAndUpdate(
            { api_player_id: p.id }, // Căutăm după ID-ul unic de la API
            {
              // Date Personale
              name: p.display_name || p.name,
              age: p.date_of_birth ? calculateAge(p.date_of_birth) : null,
              nationality: p.nationality?.name || "Unknown",
              
              // Detalii Fizice
              birth_date: p.date_of_birth,
              height: p.height ? `${p.height} cm` : "N/A",
              weight: p.weight ? `${p.weight} kg` : "N/A",

              // Poziție & Echipă
              position: mapPosition(p.position_id), // Sportmonks folosește ID-uri pt poziții
              image: p.image_path,
              team_name: team ? team.name : "N/A", 
              
              // Statistici Extinse
              statistics_summary: {
                  team_name: team ? team.name : "N/A",
                  total_goals: stats?.goals || 0,
                  total_assists: stats?.assists || 0,
                  total_appearances: stats?.appearances || 0,
                  minutes_played: stats?.minutes_played || 0,
                  rating: stats?.rating || null
              },
              last_sync: new Date()
            },
            { upsert: true, new: true } // Creează dacă nu există, update dacă există
          );
          savedCount++;
        }
      }

      console.log(`✅ Pagina ${page} procesată. (${savedCount} jucători în total)`);

      // Trecem la pagina următoare dacă există
      if (pagination && pagination.has_more) {
        url = pagination.next_page;
        page++;
        // Mică pauză pentru a respecta Rate Limit-ul (ex: 30 req/min)
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        url = null; // Am terminat toate paginile
      }
    }

    console.log(`✅ [SYNC COMPLET] S-au sincronizat ${savedCount} jucători.`);

  } catch (error) {
    if (error.response && error.response.status === 429) {
        console.error("❌ RATE LIMIT: Sportmonks te-a blocat temporar. Mărește timpul de pauză între pagini.");
    } else {
        console.error("❌ EROARE CRITICĂ LA SINCRONIZARE:", error.message);
    }
  }
};

// Funcții Ajutătoare (Helper Functions)
function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function mapPosition(id) {
    const positions = { 1: "Goalkeeper", 2: "Defender", 3: "Midfielder", 4: "Forward" };
    return positions[id] || "N/A";
}

module.exports = { syncPlayers };