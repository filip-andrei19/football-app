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
    console.log(`🛡️ [UPDATE v4] Încep actualizarea (Cluburi Reale pentru Stranieri)...`);

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
                if (exists) {
                    continue; // Sărim peste echipele deja existente
                }
                console.log(`   📥 [DESCARC] ${teamName} lipsește.`);
                await processTeam(t.team.id, teamName, league.id, false);
                await wait(6000); 
            }
        } catch (error) { console.error(`⚠️ Eroare Liga:`, error.message); }
    }

    // ---------------------------------------------------------
    // ETAPA 2: STRANIERII DE LA NAȚIONALĂ
    // ---------------------------------------------------------
    console.log(`\n🇷🇴 [ETAPA 2] Caut Naționala și aflu cluburile stranierilor...`);
    
    try {
        // Căutăm echipa națională
        const allTeamsRes = await axios.get(`${BASE_URL}/teams`, {
            headers: { 'x-apisports-key': API_KEY },
            params: { country: 'Romania' } 
        });

        const nationalTeamObj = allTeamsRes.data.response.find(item => item.team.national === true);

        if (nationalTeamObj) {
            const romaniaTeam = nationalTeamObj.team;
            console.log(`✅ GĂSITĂ: ${romaniaTeam.name}. Verific jucătorii...`);
            
            // Procesăm lotul, activând logica specială (isNationalTeam = true)
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
        // Facem un request special pentru profilul complet al jucătorului
        const res = await axios.get(`${BASE_URL}/players?id=${playerId}&season=${SEASON}`, {
            headers: { 'x-apisports-key': API_KEY }
        });

        if (!res.data.response || res.data.response.length === 0) return null;

        const statsList = res.data.response[0].statistics;
        
        // Căutăm prima echipă din listă care NU este echipa națională
        const clubStat = statsList.find(s => s.team.id !== nationalTeamId);

        if (clubStat) {
            return clubStat.team.name; // Returnăm numele clubului (ex: Tottenham)
        }
        return null;
    } catch (err) {
        console.error("   Eroare la aflarea clubului:", err.message);
        return null;
    }
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

                let finalTeamName = teamName; // Implicit: numele echipei curente (sau Romania)

                // --- LOGICA SPECIALĂ PENTRU STRANIERI ---
                if (isNationalTeam) {
                    const existingPlayer = await Player.findOne({ api_player_id: p.id });
                    
                    if (existingPlayer) {
                        // Dacă e deja în bază (ex: Olaru), îl lăsăm la clubul lui din RO
                        continue; 
                    }

                    // Dacă e jucător NOU (Stranier), trebuie să aflăm clubul real
                    console.log(`      🔎 Caut clubul pentru: ${p.name}...`);
                    
                    // Pauză mică înainte de request-ul extra (foarte important pt rate limit)
                    await wait(2000); 

                    const realClub = await getRealClubName(p.id, teamId);
                    
                    if (realClub) {
                        console.log(`         ✅ Joacă la: ${realClub}`);
                        finalTeamName = realClub; // Înlocuim "Romania" cu "Tottenham", etc.
                    } else {
                        console.log(`         ⚠️ Nu am găsit club, rămâne la Națională.`);
                    }
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
                            
                            team_name: finalTeamName, // Aici punem clubul real!
                            
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
            currentPage++;
            
            // Dacă suntem la națională, pauza e mai mare pentru că facem multe request-uri interne
            if (isNationalTeam) await wait(5000); 

        } catch (err) {
            console.log(`      ❌ Eroare pagină: ${err.message}`);
            break;
        }
    } while (currentPage <= totalPages);
};

module.exports = { hardResetAndLoad };