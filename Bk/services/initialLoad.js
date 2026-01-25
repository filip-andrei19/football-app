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
    console.log(`🛡️ [UPDATE v3] Încep actualizarea (Fix Națională)...`);

    // 1. Verificăm API-ul
    try {
        await axios.get(`${BASE_URL}/status`, { headers: { 'x-apisports-key': API_KEY } });
    } catch (err) {
        console.error("❌ EROARE CONEXIUNE: Verifică cheia.");
        return;
    }

    // ---------------------------------------------------------
    // ETAPA 1: ECHIPELE DE CLUB (Rămâne neschimbată)
    // ---------------------------------------------------------
    // (O sărim rapid dacă există deja, grație verificării exists)
    for (const league of LEAGUE_PRIORITIES) {
        console.log(`\n🌍 [ETAPA 1] Verific Liga: ${league.name}...`);
        try {
            const teamsRes = await axios.get(`${BASE_URL}/teams?league=${league.id}&season=${SEASON}`, {
                headers: { 'x-apisports-key': API_KEY }
            });
            const teams = teamsRes.data.response;
            if (!teams) continue;

            for (const t of teams) {
                const teamName = t.team.name;
                const exists = await Player.findOne({ team_name: teamName });
                if (exists) {
                    // console.log(`   ⏭️  [SKIP] ${teamName} există deja.`);
                    continue; 
                }
                console.log(`   📥 [DESCARC] ${teamName} lipsește.`);
                await processTeam(t.team.id, teamName, league.id, false);
                await wait(6000); 
            }
        } catch (error) { console.error(`⚠️ Eroare Liga:`, error.message); }
    }

    // ---------------------------------------------------------
    // ETAPA 2: ECHIPA NAȚIONALĂ (LOGICĂ NOUĂ - CĂUTARE LARGĂ)
    // ---------------------------------------------------------
    console.log(`\n🇷🇴 [ETAPA 2] Caut Naționala (Metoda "Brute Force")...`);
    
    try {
        // 1. Cerem TOATE echipele din țara "Romania"
        const allTeamsRes = await axios.get(`${BASE_URL}/teams`, {
            headers: { 'x-apisports-key': API_KEY },
            params: { country: 'Romania' } 
        });

        const allTeams = allTeamsRes.data.response;

        if (allTeams && allTeams.length > 0) {
            // 2. Căutăm manual în listă echipa care are 'national: true'
            const nationalTeamObj = allTeams.find(item => item.team.national === true);

            if (nationalTeamObj) {
                const romaniaTeam = nationalTeamObj.team;
                console.log(`✅ GĂSITĂ! Nume: ${romaniaTeam.name} (ID: ${romaniaTeam.id})`);
                console.log(`   ⏳ Încep descărcarea lotului național...`);
                
                await processTeam(romaniaTeam.id, "Romania (Nationala)", null, true);
            } else {
                console.log("⚠️ Ciudat. Am găsit echipe din România, dar niciuna marcată ca 'Națională'.");
            }
        } else {
            console.log("⚠️ Nu am găsit nicio echipă pentru țara 'Romania'.");
        }

    } catch (error) {
        console.error("⚠️ Eroare Națională:", error.message);
    }

    console.log("\n🏁 [FINALIZAT] Baza de date este la zi!");
};

// Funcție universală de procesare
const processTeam = async (teamId, teamName, leagueId, isNationalTeam) => {
    let currentPage = 1;
    let totalPages = 1;

    do {
        try {
            const res = await axios.get(`${BASE_URL}/players?team=${teamId}&season=${SEASON}&page=${currentPage}`, {
                headers: { 'x-apisports-key': API_KEY }
            });
            
            if (!res.data.response || res.data.response.length === 0) break;
            
            totalPages = res.data.paging.total;
            const playersList = res.data.response;

            for (const item of playersList) {
                const p = item.player;
                const stats = item.statistics[0]; 

                // --- LOGICA PENTRU STRANIERI ---
                if (isNationalTeam) {
                    const existingPlayer = await Player.findOne({ api_player_id: p.id });
                    
                    if (existingPlayer) {
                        // Îl ignorăm dacă e deja la un club din SuperLigă
                        continue; 
                    }
                    console.log(`      ⭐ [STRANIER] Adaug: ${p.name}`);
                }

                await Player.updateOne(
                    { api_player_id: p.id },
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
                    { upsert: true }
                );
            }
            currentPage++;
            if (isNationalTeam) await wait(3000); // Pauză

        } catch (err) {
            console.log(`      ❌ Eroare pagină: ${err.message}`);
            break;
        }
    } while (currentPage <= totalPages);
};

module.exports = { hardResetAndLoad };