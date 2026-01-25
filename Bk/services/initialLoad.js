const axios = require('axios');
const Player = require('../models/player');

// --- CONFIGURARE ---
const API_KEY = process.env.API_KEY;
const BASE_URL = "https://v3.football.api-sports.io"; 
const SEASON = 2024; 

const LEAGUE_PRIORITIES = [
    { id: 283, name: "SuperLiga (Romania)" }
];

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const hardResetAndLoad = async () => {
    console.log(`🛡️ [FILL MISSING] Încep completarea datelor lipsă...`);
    console.log(`   (NU voi șterge jucătorii existenți)`);

    // 1. Verificăm API-ul
    try {
        await axios.get(`${BASE_URL}/status`, { headers: { 'x-apisports-key': API_KEY } });
    } catch (err) {
        console.error("❌ EROARE CONEXIUNE: Verifică cheia sau limita zilnică.");
        return;
    }

    // 2. NU MAI ȘTERGEM BAZA DE DATE (Am scos deleteMany)
    
    // 3. Iterăm prin ligi
    for (const league of LEAGUE_PRIORITIES) {
        console.log(`🌍 Verific Liga: ${league.name}...`);
        
        try {
            // Luăm lista tuturor echipelor din API
            const teamsRes = await axios.get(`${BASE_URL}/teams?league=${league.id}&season=${SEASON}`, {
                headers: { 'x-apisports-key': API_KEY }
            });
            const teams = teamsRes.data.response;

            if (!teams || teams.length === 0) {
                console.log("⚠️ Nu am găsit echipe."); 
                continue;
            }

            console.log(`📋 Am găsit ${teams.length} echipe în API. Verific care lipsesc din DB...`);

            for (const t of teams) {
                const teamName = t.team.name;
                const teamId = t.team.id;

                // --- VERIFICARE SMART ---
                // Căutăm dacă avem DEJA cel puțin un jucător de la această echipă în bază
                const exists = await Player.findOne({ team_name: teamName });

                if (exists) {
                    console.log(`   ⏭️  [SKIP] ${teamName} există deja. Trec mai departe.`);
                    continue; // Sărim peste echipa asta, nu consumăm API
                }

                // Dacă am ajuns aici, echipa NU există în bază. O descărcăm.
                console.log(`   📥 [DESCARC] ${teamName} lipsește. O adaug acum...`);
                await processTeam(teamId, teamName, league.id);
                
                // Pauză de siguranță doar când descărcăm efectiv
                console.log("      ⏳ Aștept 6 secunde...");
                await wait(6000); 
            }

        } catch (error) {
            console.error(`⚠️ Eroare:`, error.message);
        }
    }
    console.log("🏁 [FILL MISSING] Finalizat! Toate echipele ar trebui să fie acum în DB.");
};

const processTeam = async (teamId, teamName, leagueId) => {
    let currentPage = 1;
    let totalPages = 1;

    do {
        try {
            const res = await axios.get(`${BASE_URL}/players?team=${teamId}&season=${SEASON}&page=${currentPage}`, {
                headers: { 'x-apisports-key': API_KEY }
            });
            
            if (res.data.errors && Object.keys(res.data.errors).length > 0) {
                console.log(`      ❌ Eroare API:`, JSON.stringify(res.data.errors));
                return; 
            }

            if (!res.data.response || res.data.response.length === 0) break;
            
            totalPages = res.data.paging.total;
            const playersList = res.data.response;

            for (const item of playersList) {
                const p = item.player;
                const stats = item.statistics.find(s => s.league.id === leagueId) || item.statistics[0];

                // Folosim updateOne cu upsert: true pentru a nu duplica jucătorii dacă rulăm de mai multe ori
                await Player.updateOne(
                    { api_player_id: p.id }, // Caută după ID
                    {
                        $set: {
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
                        }
                    },
                    { upsert: true } // Dacă nu există, îl creează. Dacă există, îl actualizează.
                );
            }
            currentPage++;
        } catch (err) {
            console.log(`      ❌ Eroare Request: ${err.message}`);
            break;
        }
    } while (currentPage <= totalPages);
};

module.exports = { hardResetAndLoad };