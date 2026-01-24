const axios = require('axios');
const mongoose = require('mongoose');
const Player = require('../models/player'); 

// --- CONFIGURARE ---
const NEW_API_URL = "https://v3.football.api-sports.io/players?league=283&season=2023"; 
const API_KEY = process.env.API_KEY; 

const resetAndSyncPlayers = async () => {
  console.log("🚀 [SYNC] Începe verificarea API-ului...");

  try {
    // --- PASUL 1: DESCĂRCARE ---
    console.log("🌍 [1/3] Contactez API-ul extern...");
    
    const config = {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    };

    const response = await axios.get(NEW_API_URL, config);
    const playersList = response.data.response; 

    // --- VERIFICARE DE SIGURANȚĂ ---
    if (!playersList || playersList.length === 0) {
      console.error("⚠️  STOP! API-ul nu a returnat niciun jucător.");
      console.log("🛡️  Datele vechi NU au fost șterse.");
      
      if (response.data.errors && Object.keys(response.data.errors).length > 0) {
          console.log("Erori API:", response.data.errors);
      }
      return; 
    }

    console.log(`📦 API-ul a răspuns corect cu ${playersList.length} jucători.`);

    // --- PASUL 2: CURĂȚENIE ---
    console.log("🗑️  [2/3] Șterg datele vechi...");
    await Player.deleteMany({}); 
    console.log("✅ Baza de date a fost curățată.");

    // --- PASUL 3: SALVARE ÎN MONGO ---
    console.log("💾 [3/3] Salvez noile date extinse...");
    let savedCount = 0;
    
    for (const item of playersList) {
      const p = item.player; 
      const stats = item.statistics[0];

      if (p && stats) {
          const newPlayer = new Player({
            // 1. Date Personale de bază
            name: p.name,
            age: p.age,
            nationality: p.nationality,
            
            // 2. DETALII FIZICE & BIO (NOI)
            birth_date: p.birth.date,      // ex: "1998-05-22"
            birth_place: p.birth.place,    // ex: "București"
            height: p.height,              // ex: "185 cm"
            weight: p.weight,              // ex: "78 kg"

            // 3. Poziție & Echipă
            position: stats.games.position,
            image: p.photo,
            team_name: stats.team.name, 
            
            // 4. Statistici Extinse
            statistics_summary: {
                team_name: stats.team.name,
                total_goals: stats.goals.total || 0,
                total_assists: stats.goals.assists || 0,
                
                // Câmpuri noi pentru Frontend:
                total_appearances: stats.games.appearences || 0, // Meciuri
                minutes_played: stats.games.minutes || 0,        // Minute
                rating: stats.games.rating || null               // Nota (poate fi null)
            },
            api_player_id: p.id
          });

          await newPlayer.save();
          savedCount++;
      }
    }

    console.log(`✅ [SYNC COMPLET] S-au salvat ${savedCount} jucători cu detalii complete.`);

  } catch (error) {
    console.error("❌ EROARE CRITICĂ LA SINCRONIZARE:", error.message);
  }
};

module.exports = { syncPlayers: resetAndSyncPlayers };