const axios = require('axios');
const mongoose = require('mongoose');
const Player = require('../models/player'); 
// const Team = require('../models/team'); // Decomentează dacă folosești și echipe

// --- CONFIGURARE ---
// 1. Pune aici URL-ul API-ului tău nou
const NEW_API_URL = "https://v3.football.api-sports.io/players?league=283&season=2023"; 

// 2. Luăm cheia direct din .env (deja ai actualizat-o)
const API_KEY = process.env.API_KEY; 

const resetAndSyncPlayers = async () => {
  console.log("🚀 [SYNC] Începe procesul de ACTUALIZARE TOTALĂ...");

  try {
    // --- FAZA 1: CURĂȚENIE (Ștergem tot ce e vechi) ---
    console.log("🗑️  [1/3] Șterg datele vechi din baza de date...");
    await Player.deleteMany({}); 
    console.log("✅ Baza de date este acum goală.");

    // --- FAZA 2: DESCĂRCARE (Folosind cheia din .env) ---
    console.log("🌍 [2/3] Conectare la API-ul nou...");
    
    // Configurare Header pentru API Key (Majoritatea API-urilor cer asta)
    const config = {
      headers: {
        'x-rapidapi-key': API_KEY,  // Sau 'Authorization': API_KEY (depinde de API)
        'x-rapidapi-host': 'v3.football.api-sports.io' // Dacă folosești API-Sports
      }
    };

    const response = await axios.get(NEW_API_URL, config);

    // Verificăm unde sunt datele (unele API-uri le pun în .response, altele direct in .data)
    const playersList = response.data.response || response.data; 

    if (!playersList || playersList.length === 0) {
      console.log("⚠️  ATENȚIE: API-ul nu a returnat niciun jucător! Verifică URL-ul sau Cheia.");
      console.log("Răspuns API:", response.data);
      return;
    }

    console.log(`📦 Am primit ${playersList.length} jucători. Încep salvarea...`);

    // --- FAZA 3: SALVARE ÎN MONGO ---
    let savedCount = 0;
    
    for (const item of playersList) {
      // ADAPTARE: Aici trebuie să potrivești ce îți dă API-ul cu ce vrei tu
      // Exemplu pentru API-Football (structura standard):
      const p = item.player; 
      const stats = item.statistics[0];

      const newPlayer = new Player({
        // Date Generale
        name: p.name,
        age: p.age,
        nationality: p.nationality,
        position: stats.games.position,
        image: p.photo,

        // Echipă & Statistici (Important pentru Frontend-ul tău!)
        team_name: stats.team.name, 
        
        // Salvăm tot obiectul de statistici ca să avem de unde alege (goluri etc)
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

    console.log(`✅ [3/3] SUCCES! S-au salvat ${savedCount} jucători noi.`);

  } catch (error) {
    console.error("❌ EROARE LA SINCRONIZARE:", error.message);
    if (error.response) console.error("Detalii API:", error.response.data);
  }
};

module.exports = { syncPlayers: resetAndSyncPlayers };