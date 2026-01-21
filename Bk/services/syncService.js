const axios = require('axios');
const mongoose = require('mongoose');
const Player = require('../models/player'); 

// --- CONFIGURARE ---
const NEW_API_URL = "https://v3.football.api-sports.io/players?league=283&season=2023"; 
const API_KEY = process.env.API_KEY; 

const resetAndSyncPlayers = async () => {
  console.log("🚀 [SYNC] Începe verificarea API-ului...");

  try {
    // --- PASUL 1: DESCĂRCARE (Mai întâi vedem dacă avem ce descărca!) ---
    console.log("🌍 [1/3] Contactez API-ul extern...");
    
    const config = {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    };

    const response = await axios.get(NEW_API_URL, config);
    // API-Football returnează datele în .response
    const playersList = response.data.response; 

    // --- VERIFICARE DE SIGURANȚĂ (CRITIC!) ---
    if (!playersList || playersList.length === 0) {
      console.error("⚠️  STOP! API-ul nu a returnat niciun jucător.");
      console.error("MOTIV POSIBIL: Limita de cereri atinsă sau cheie greșită.");
      console.log("🛡️  Datele vechi NU au fost șterse. Baza de date este în siguranță.");
      
      // Dacă vrei să vezi eroarea de la API (ex: limit reached):
      if (response.data.errors && Object.keys(response.data.errors).length > 0) {
          console.log("Erori API:", response.data.errors);
      }
      return; // Ieșim din funcție, nu ștergem nimic!
    }

    console.log(`📦 API-ul a răspuns corect cu ${playersList.length} jucători.`);

    // --- PASUL 2: CURĂȚENIE (Doar acum e sigur să ștergem) ---
    console.log("🗑️  [2/3] Șterg datele vechi pentru a face loc celor noi...");
    await Player.deleteMany({}); 
    console.log("✅ Baza de date a fost curățată.");

    // --- PASUL 3: SALVARE ÎN MONGO ---
    console.log("💾 [3/3] Salvez noile date...");
    let savedCount = 0;
    
    for (const item of playersList) {
      const p = item.player; 
      const stats = item.statistics[0];

      // Verificăm dacă există datele minime (ca să nu crape aplicația)
      if (p && stats) {
          const newPlayer = new Player({
            name: p.name,
            age: p.age,
            nationality: p.nationality,
            position: stats.games.position,
            image: p.photo,
            team_name: stats.team.name, 
            statistics_summary: {
                team_name: stats.team.name,
                total_goals: stats.goals.total || 0,
                total_assists: stats.goals.assists || 0
            },
            api_player_id: p.id
          });

          await newPlayer.save();
          savedCount++;
      }
    }

    console.log(`✅ [SYNC COMPLET] S-au salvat ${savedCount} jucători noi.`);

  } catch (error) {
    console.error("❌ EROARE CRITICĂ LA SINCRONIZARE:", error.message);
    console.log("🛡️  Operațiunea a fost anulată. Datele vechi au rămas pe loc (dacă existau).");
  }
};

module.exports = { syncPlayers: resetAndSyncPlayers };