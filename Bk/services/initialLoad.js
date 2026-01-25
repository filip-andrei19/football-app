const axios = require('axios');
const Player = require('../models/player');

// --- CONFIGURARE ---
const API_KEY = process.env.API_KEY;

// ⚠️ MODIFICARE MAJORA: ADRESA DIRECTA API-SPORTS
const BASE_URL = "https://v3.football.api-sports.io";

// Sezonul curent 2024-2025
const SEASON = 2024; 

const LEAGUE_PRIORITIES = [
    { id: 283, name: "SuperLiga (Romania)" }, 
    { id: 39, name: "Premier League (Anglia)" },
    { id: 140, name: "La Liga (Spania)" }
];

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const hardResetAndLoad = async () => {
    console.log(`☢️  [HARD RESET] Inițiez procedura DIRECTĂ pentru SEZONUL ${SEASON}...`);
    console.log(`🔌 Folosesc endpoint Oficial: ${BASE_URL}`);

    // 1. Verificăm API-ul (folosind header-ul corect x-apisports-key)
    try {
        console.log("🔍 Verific conexiunea API...");
        await axios.get(`${BASE_URL}/status`, {
            headers: { 
                'x-apisports-key': API_KEY 
            }
        });
    } catch (err) {
        console.error("❌ EROARE: Cheia API nu merge sau ai atins limita.");
        if (err.response) console.error("Detalii eroare:", err.response.data);
        return;
    }

    // 2. ȘTERGEM TOT
    console.log("🗑️  Șterg toți jucătorii din baza de date...");
    await Player.deleteMany({});
    console.log("✅ Baza de date este goală.");

    // 3. Începem încărcarea
    for (const league of LEAGUE_PRIORITIES) {
        console.log(`🌍 Încep importul pentru: ${league.name} (Sezon ${SEASON})...`);
        
        try {
            // A. Luăm echipele
            const teamsRes = await axios.get(`${BASE_URL}/teams?league=${league.id}&season=${SEASON}`, {
                headers: { 
                    'x-apisports-key': API_KEY 
                }
            });
            
            const teams = teamsRes.data.response;
            
            if (!teams || teams.length === 0) {
                console.log(`⚠️  Nu am găsit echipe pentru ${league.name}. Verifică abonamentul.`);
                continue;
            }

            console.log(`   ✅ Găsite ${teams.length} echipe. Încep descărcarea jucătorilor...`);

            // B. Luăm jucătorii fiecărei echipe
            for (const t of teams) {
                console.log(`   👉 Procesez echipa: ${t.team.name}`);
                await processTeam(t.team.id, t.team.name, league.id);
                await wait(1000); // Pauză de respect
            }

        } catch (error) {
            console.error(`⚠️  Eroare la ${league.name}:`, error.message);
            break; 
        }
    }
    console.log("🏁 [HARD RESET] Finalizat!");
};

// Funcție ajutătoare pentru paginare
const processTeam = async (teamId, teamName, leagueId) => {
    let currentPage = 1;
    let totalPages = 1;

    do {
        try {
            const res = await axios.get(`${BASE_URL}/players?team=${teamId}&season=${SEASON}&page=${currentPage}`, {
                headers: { 
                    'x-apisports-key': API_KEY 
                }
            });
            
            if (!res.data.response || res.data.response.length === 0) break;
            
            totalPages = res.data.paging.total;
            const playersList = res.data.response;

            for (const item of playersList) {
                const p = item.player;
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
            console.log(`   Eroare la pagina ${currentPage}, trec mai departe.`);
            break;
        }
    } while (currentPage <= totalPages);
};

module.exports = { hardResetAndLoad };