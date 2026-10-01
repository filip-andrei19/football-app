require('dotenv').config();
const axios = require('axios');

const API_TOKEN = process.env.SPORTMONKS_API_KEY;

async function runDiscovery() {
    console.log("🔍 [DISCOVERY] Pornesc verificarea accesului pentru Sportmonks...");

    if (!API_TOKEN) {
        console.error("❌ EROARE: Nu am găsit SPORTMONKS_API_KEY în fișierul .env!");
        return;
    }

    try {
        // 1. Verificăm Ligile la care ai acces
        console.log("📡 Interoghez lista de ligi...");
        const response = await axios.get('https://api.sportmonks.com/v3/football/leagues', {
            headers: { 'Authorization': API_TOKEN }
        });

        const leagues = response.data.data;

        console.log("\n🏆 LIGI GĂSITE PE CONTUL TĂU:");
        console.log("------------------------------------");
        
        leagues.forEach(league => {
            console.log(`ID: ${league.id} | Nume: ${league.name} | Cod: ${league.short_code || 'N/A'}`);
        });

        console.log("------------------------------------");

        // 2. Verificăm dacă Superliga (632) este printre ele
        const hasSuperliga = leagues.find(l => l.id === 632);
        if (hasSuperliga) {
            console.log("✅ Superliga României (ID 632) este DISPONIBILĂ!");
        } else {
            console.log("⚠️ Superliga României NU apare în lista ta. Verifică planul de abonament.");
        }

    } catch (error) {
        if (error.response) {
            console.error(`❌ Eroare API (${error.response.status}):`, error.response.data.message);
        } else {
            console.error("❌ Eroare de rețea:", error.message);
        }
    }
}

runDiscovery();