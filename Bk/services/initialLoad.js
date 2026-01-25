const axios = require('axios');
const Player = require('../models/player');

// --- CONFIGURARE ---
const API_KEY = process.env.API_KEY;
const BASE_URL = "https://v3.football.api-sports.io"; 
const SEASON = 2024; 

// Lista ligilor prioritare (SuperLiga)
const LEAGUE_PRIORITIES = [
    { id: 283, name: "SuperLiga (Romania)" }
];

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const hardResetAndLoad = async () => {
    // ⚠️ Mesaj nou ca să știi că rulează versiunea corectă
    console.log(`🛡️ [UPDATE + NATIONALA] Încep actualizarea (Cluburi + Stranieri)...`);

    // 1. Verificăm API-ul
    try {
        await axios.get(`${BASE_URL}/status`, { headers: { 'x-apisports-key': API_KEY } });
    } catch (err) {
        console.error("❌ EROARE CONEXIUNE: Verifică cheia sau limita zilnică.");
        return;
    }

    // ---------------------------------------------------------
    // ETAPA 1: ECHIPELE DE CLUB (SuperLiga)
    // ---------------------------------------------------------
    for (const league of LEAGUE_PRIORITIES) {
        console.log(`\n🌍 [ETAPA 1] Verific Liga: ${league.name}...`);
        
        try {
            const teamsRes = await axios.get(`${BASE_URL}/teams?league=${league.id}&season=${SEASON}`, {
                headers: { 'x-apisports-key': API_KEY }
            });
            const teams = teamsRes.data.response;

            if (!teams || teams.length === 0) continue;

            console.log(`📋 Găsite ${teams.length} echipe de club.`);

            for (const t of teams) {
                const teamName = t.team.name;
                
                // Verificăm dacă avem deja jucători de la această echipă
                const exists = await Player.findOne({ team_name: teamName });
                if (exists) {
                    console.log(`   ⏭️  [SKIP] ${teamName} există deja.`);
                    continue; 
                }

                console.log(`   📥 [DESCARC] ${teamName} lipsește. O adaug...`);
                await processTeam(t.team.id, teamName, league.id, false); // false = nu e națională
                
                console.log("      ⏳ Aștept 6 secunde (protecție API)...");
                await wait(6000); 
            }
        } catch (error) {
            console.error(`⚠️ Eroare Liga:`, error.message);
        }
    }

    // ---------------------------------------------------------
    // ETAPA 2: ECHIPA NAȚIONALĂ (Stranierii)
    // ---------------------------------------------------------
    console.log(`\n🇷🇴 [ETAPA 2] Caut Echipa Națională a României...`);
    
    try {
        // Căutăm ID-ul echipei "Romania"
        const natRes = await axios.get(`${BASE_URL}/teams`, {
            headers: { 'x-apisports-key': API_KEY },
            params: { name: 'Romania', country: 'Romania', national: 'true' }
        });

        // Verificăm dacă am primit răspuns
        const romaniaTeam = natRes.data.response && natRes.data.response[0] ? natRes.data.response[0].team : null;

        if (romaniaTeam) {
            console.log(`✅ Găsită: ${romaniaTeam.name} (ID: ${romaniaTeam.id}). Verific stranierii...`);
            
            // Descărcăm jucătorii naționalei
            // Parametrul 'true' activează logica specială (nu suprascrie jucătorii de la cluburi)
            await processTeam(romaniaTeam.id, "Romania (Nationala)", null, true); 

        } else {
            console.log("⚠️ Nu am găsit echipa națională în API (verifică manual pe dashboard).");
        }

    } catch (error) {
        console.error("⚠️ Eroare Națională:", error.message);
    }

    console.log("\n🏁 [FINALIZAT] Baza de date conține acum SuperLiga + Stranierii!");
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
                    // Căutăm jucătorul în baza noastră
                    const existingPlayer = await Player.findOne({ api_player_id: p.id });
                    
                    if (existingPlayer) {
                        // Dacă există, înseamnă că joacă în SuperLiga (l-am descărcat la Etapa 1)
                        // Îl lăsăm acolo, nu îi schimbăm echipa în "Romania"
                        // console.log(`      • [SKIP] ${p.name} joacă deja la ${existingPlayer.team_name}`);
                        continue; 
                    }
                    // Dacă NU există, înseamnă că joacă afară (Tottenham, Parma, etc.)
                    console.log(`      ⭐ [STRANIER] Adaug: ${p.name}`);
                }

                // Salvare / Actualizare
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
                            
                            // Dacă e stranier, va primi "Romania (Nationala)". 
                            // Dacă e din SuperLigă, primește numele clubului.
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
            
            // Pauză mică între paginile naționalei
            if (isNationalTeam) await wait(3000);

        } catch (err) {
            console.log(`      ❌ Eroare pagină: ${err.message}`);
            break;
        }
    } while (currentPage <= totalPages);
};

module.exports = { hardResetAndLoad };