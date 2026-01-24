const axios = require('axios');
const Player = require('../models/player');

// --- CONFIGURARE ---
const API_KEY = process.env.API_KEY;

// ⚠️ SCHIMBARE AICI: Punem 2025 pentru sezonul curent (2025-2026)
// Dacă API-ul nu are încă datele pe 2025 (rar), încearcă 2024.
const SEASON = 2024; 

// Ordinea priorităților: 
// 1. SuperLiga (ID 283) - O luăm prima ca să fim siguri că intră
// 2. Premier League (ID 39)
// 3. La Liga (ID 140)
const LEAGUE_PRIORITIES = [
    { id: 283, name: "SuperLiga (Romania)" }, 
    { id: 39, name: "Premier League (Anglia)" },
    { id: 140, name: "La Liga (Spania)" }
];

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const hardResetAndLoad = async () => {
    console.log(`☢️  [HARD RESET] Inițiez procedura pentru SEZONUL ${SEASON}...`);

    // 1. Verificăm API-ul cu un test mic
    try {
        console.log("🔍 Verific conexiunea API...");
        // Facem un call mic de test
        await axios.get('https://v3.football.api-sports.io/status', {
            headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' }
        });
    } catch (err) {
        console.error("❌ EROARE: Cheia API nu merge sau ai atins limita. NU șterg baza de date.");
        return;
    }

    // 2. ȘTERGEM TOT (Doar acum!)
    console.log("🗑️  Șterg toți jucătorii din baza de date...");
    await Player.deleteMany({});
    console.log("✅ Baza de date este goală.");

    // 3. Începem încărcarea pe rând
    for (const league of LEAGUE_PRIORITIES) {
        console.log(`🌍 Încep importul pentru: ${league.name} (Sezon ${SEASON})...`);
        
        try {
            // A. Luăm echipele din sezonul curent
            const teamsRes = await axios.get(`https://v3.football.api-sports.io/teams?league=${league.id}&season=${SEASON}`, {
                headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' }
            });
            
            const teams = teamsRes.data.response;
            
            if (!teams || teams.length === 0) {
                console.log(`⚠️  Nu am găsit echipe pentru ${league.name} în sezonul ${SEASON}.`);
                continue;
            }

            console.log(`   Găsite ${teams.length} echipe. Încep descărcarea jucătorilor...`);

            // B. Luăm jucătorii fiecărei echipe
            for (const t of teams) {
                console.log(`   👉 Procesez echipa: ${t.team.name}`);
                await processTeam(t.team.id, t.team.name, league.id);
                // Pauză mică să nu supărăm API-ul (important la contul free)
                await wait(1500); 
            }

        } catch (error) {
            console.error(`⚠️  Limită atinsă sau eroare la ${league.name}.`);
            console.log("💾  Ce s-a salvat până acum rămâne în bază. Mă opresc.");
            break; 
        }
    }
    console.log("🏁 [HARD RESET] Finalizat!");
};

// Funcție ajutătoare pentru paginarea jucătorilor
const processTeam = async (teamId, teamName, leagueId) => {
    let currentPage = 1;
    let totalPages = 1;

    do {
        try {
            const res = await axios.get(`https://v3.football.api-sports.io/players?team=${teamId}&season=${SEASON}&page=${currentPage}`, {
                headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' }
            });
            
            totalPages = res.data.paging.total;
            const playersList = res.data.response;

            for (const item of playersList) {
                const p = item.player;
                // Căutăm statisticile specifice ligii curente
                const stats = item.statistics.find(s => s.league.id === leagueId) || item.statistics[0];

                const newPlayer = new Player({
                    name: p.name,
                    age: p.age,
                    nationality: p.nationality,
                    birth_date: p.birth.date,
                    birth_place: p.birth.place,
                    height: p.height,
                    weight: p.weight,
                    position: stats.games.position,
                    image: p.photo,
                    team_name: teamName,
                    statistics_summary: {
                        team_name: teamName,
                        total_goals: stats.goals.total || 0,
                        total_assists: stats.goals.assists || 0,
                        total_appearances: stats.games.appearences || 0,
                        minutes_played: stats.games.minutes || 0,
                        rating: stats.games.rating || null
                    },
                    api_player_id: p.id
                });

                await newPlayer.save();
            }
            currentPage++;
        } catch (err) {
            if (err.response && (err.response.status === 403 || err.response.status === 429)) {
                throw err; // Aruncăm eroarea sus ca să oprim tot scriptul
            }
            console.log(`   Eroare mică la pagina ${currentPage}, trec mai departe.`);
            break;
        }
    } while (currentPage <= totalPages);
};

module.exports = { hardResetAndLoad };