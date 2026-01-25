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
    console.log(`🛡️ [UPDATE v5] Încep actualizarea (Corecție Cluburi Stranieri)...`);

    // 1. Verificăm API-ul
    try {
        await axios.get(`${BASE_URL}/status`, { headers: { 'x-apisports-key': API_KEY } });
    } catch (err) {
        console.error("❌ EROARE CONEXIUNE: Verifică cheia sau limita zilnică.");
        return;
    }

    // ---------------------------------------------------------
    // ETAPA 1: ECHIPELE DE CLUB DIN ROMÂNIA
    // ---------------------------------------------------------
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
                if (exists) continue; // Sărim peste cluburile deja existente

                console.log(`   📥 [DESCARC] ${teamName} lipsește.`);
                await processTeam(t.team.id, teamName, league.id, false);
                await wait(6000); 
            }
        } catch (error) { console.error(`⚠️ Eroare Liga:`, error.message); }
    }

    // ---------------------------------------------------------
    // ETAPA 2: STRANIERII DE LA NAȚIONALĂ
    // ---------------------------------------------------------
    console.log(`\n🇷🇴 [ETAPA 2] Caut Naționala și REPAR numele cluburilor...`);
    
    try {
        const allTeamsRes = await axios.get(`${BASE_URL}/teams`, {
            headers: { 'x-apisports-key': API_KEY },
            params: { country: 'Romania' } 
        });

        const nationalTeamObj = allTeamsRes.data.response.find(item => item.team.national === true);

        if (nationalTeamObj) {
            const romaniaTeam = nationalTeamObj.team;
            console.log(`✅ GĂSITĂ: ${romaniaTeam.name}. Încep procesarea...`);
            
            // Procesăm lotul cu logica de actualizare forțată
            await processTeam(romaniaTeam.id, "Romania (Nationala)", null, true);
        } else {
            console.log("⚠️ Nu am găsit echipa națională.");
        }

    } catch (error) {
        console.error("⚠️ Eroare Națională:", error.message);
    }

    console.log("\n🏁 [FINALIZAT] Baza de date este completă!");
};

// --- FUNCȚIE AJUTĂTOARE: AFLĂ CLUBUL REAL ---
const getRealClubName = async (playerId, nationalTeamId) => {
    try {
        const res = await axios.get(`${BASE_URL}/players?id=${playerId}&season=${SEASON}`, {
            headers: { 'x-apisports-key': API_KEY }
        });

        if (!res.data.response || res.data.response.length === 0) return null;

        const statsList = res.data.response[0].statistics;
        
        // Căutăm prima echipă care NU este naționala
        const clubStat = statsList.find(s => s.team.id !== nationalTeamId);

        if (clubStat) {
            return clubStat.team.name; 
        }
        return null;
    } catch (err) {
        console.error("   Eroare la aflarea clubului:", err.message);
        return null;
    }
};

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

                let finalTeamName = teamName; 
                let shouldUpdate = true;

                // --- LOGICA SPECIALĂ PENTRU STRANIERI (MODIFICATĂ) ---
                if (isNationalTeam) {
                    const existingPlayer = await Player.findOne({ api_player_id: p.id });
                    
                    if (existingPlayer) {
                        // 1. Dacă joacă la un club din SuperLigă (ex: Olaru la FCSB), îl lăsăm în pace.
                        if (existingPlayer.team_name !== "Romania (Nationala)") {
                             shouldUpdate = false;
                        } 
                        // 2. Dacă e salvat ca "Romania (Nationala)", ÎL ACTUALIZĂM!
                        else {
                             console.log(`      🔄 Actualizez clubul pentru: ${p.name}...`);
                             shouldUpdate = true;
                        }
                    } else {
                        // 3. Dacă nu există deloc, îl adăugăm.
                        console.log(`      ⭐ Jucător nou: ${p.name}...`);
                        shouldUpdate = true;
                    }

                    if (shouldUpdate) {
                        // Aflăm clubul real doar dacă trebuie să actualizăm/adăugăm
                        await wait(2000); // Pauză rate limit
                        const realClub = await getRealClubName(p.id, teamId);
                        
                        if (realClub) {
                            console.log(`         ✅ Club găsit: ${realClub}`);
                            finalTeamName = realClub; 
                        } else {
                            console.log(`         ⚠️ Rămâne la Națională.`);
                        }
                    }
                }

                if (shouldUpdate) {
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
                                team_name: finalTeamName, // Numele corect (Club sau Romania)
                                statistics_summary: {
                                    team_name: finalTeamName,
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
            }
            currentPage++;
            if (isNationalTeam) await wait(4000); 

        } catch (err) {
            console.log(`      ❌ Eroare: ${err.message}`);
            break;
        }
    } while (currentPage <= totalPages);
};

module.exports = { hardResetAndLoad };