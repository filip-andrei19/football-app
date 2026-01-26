const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Player = require('../models/player');

// --- CONFIGURARE ---
const API_KEY = process.env.API_KEY;
const BASE_URL = "https://v3.football.api-sports.io";
const SEASON = 2024;
const STATE_FILE = path.join(__dirname, 'syncState.json');

// Lista Ligilor Importante prin care vom roti (Câte una pe zi)
const TARGET_LEAGUES = [
    { id: 39, name: "Premier League (Anglia)" },
    { id: 140, name: "La Liga (Spania)" },
    { id: 135, name: "Serie A (Italia)" },
    { id: 78, name: "Bundesliga (Germania)" },
    { id: 61, name: "Ligue 1 (Franta)" },
    { id: 283, name: "SuperLiga (Romania)" } // O re-verificăm și pe aceasta periodic
];

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Funcție pentru citirea stării (Ce ligă urmează?)
const getNextLeagueIndex = () => {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const data = fs.readFileSync(STATE_FILE);
            const state = JSON.parse(data);
            // Trecem la următoarea ligă (index + 1). Dacă ajungem la final, o luăm de la 0.
            let nextIndex = state.lastIndex + 1;
            if (nextIndex >= TARGET_LEAGUES.length) nextIndex = 0;
            return nextIndex;
        }
    } catch (err) { console.error("Eroare citire state:", err); }
    return 0; // Default: Începem cu prima
};

// Funcție pentru salvarea stării
const saveLeagueIndex = (index) => {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify({ lastIndex: index, lastRun: new Date() }));
    } catch (err) { console.error("Eroare salvare state:", err); }
};

const runDailySmartSync = async () => {
    console.log(`⏰ [SMART SYNC 15:57] Pornesc actualizarea zilnică...`);

    // 1. Aflăm ce ligă este programată pentru azi
    const leagueIndex = getNextLeagueIndex();
    const targetLeague = TARGET_LEAGUES[leagueIndex];

    console.log(`🌍 Liga Programată Azi: ${targetLeague.name}`);

    try {
        // 2. Luăm echipele din acea ligă
        const teamsRes = await axios.get(`${BASE_URL}/teams?league=${targetLeague.id}&season=${SEASON}`, {
            headers: { 'x-apisports-key': API_KEY }
        });
        
        const teams = teamsRes.data.response;
        if (!teams) {
            console.log("⚠️ Nu am putut lua echipele. Mă opresc.");
            return;
        }

        console.log(`📋 Procesez ${teams.length} echipe din ${targetLeague.name}...`);

        // 3. Iterăm prin echipe
        for (const t of teams) {
            const teamName = t.team.name;
            const teamId = t.team.id;

            console.log(`   👉 Verific: ${teamName}`);
            await processTeamAndUpdate(teamId, teamName, targetLeague.id);
            
            // Pauză de siguranță (4 secunde) pentru a nu depăși limita API
            await wait(4000); 
        }

        // 4. Dacă totul a mers bine, salvăm indexul pentru mâine
        saveLeagueIndex(leagueIndex);
        console.log(`✅ [SMART SYNC] Finalizat pentru azi! Mâine urmează liga următoare.`);

    } catch (error) {
        console.error(`❌ Eroare critică Smart Sync:`, error.message);
    }
};

const processTeamAndUpdate = async (teamId, teamName, leagueId) => {
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

                // --- LOGICA DE ACTUALIZARE INTELIGENTĂ ---
                // Căutăm dacă jucătorul există deja în baza noastră
                const existingPlayer = await Player.findOne({ api_player_id: p.id });

                if (existingPlayer) {
                    // CAZ 1: Există. Verificăm dacă trebuie "reparat" numele echipei.
                    // Dacă la noi apare ca "Romania" sau "Romania (Nationala)", dar API-ul zice că e la un Club (ex: Tottenham)
                    // Atunci facem UPDATE la numele clubului.
                    const isGenericTeam = existingPlayer.team_name.includes("Romania") || existingPlayer.team_name.includes("Nationala");
                    
                    if (isGenericTeam) {
                        console.log(`      🔄 UPDATE: ${p.name} mutat de la "${existingPlayer.team_name}" la "${teamName}"`);
                        
                        existingPlayer.team_name = teamName;
                        existingPlayer.statistics_summary = {
                            team_name: teamName, // Actualizăm și în stats
                            total_goals: stats.goals.total || 0,
                            total_assists: stats.goals.assists || 0,
                            total_appearances: stats.games.appearences || 0,
                            minutes_played: stats.games.minutes || 0,
                            rating: stats.games.rating || null
                        };
                        await existingPlayer.save();
                    } 
                    // Altfel, dacă e deja la clubul corect, putem actualiza doar statistici (opțional), 
                    // dar NU îl ștergem și nu îl duplicăm.
                } else {
                    // CAZ 2: Nu există. Îl adăugăm (doar dacă vrei să adaugi și străini).
                    // Dacă vrei să adaugi DOAR români noi:
                    if (p.nationality === "Romania") {
                        console.log(`      ⭐ Jucător NOU Român găsit: ${p.name}`);
                        const newPlayer = new Player({
                            name: p.name,
                            age: p.age,
                            nationality: p.nationality,
                            // ... restul câmpurilor ...
                            team_name: teamName,
                            api_player_id: p.id,
                            image: p.photo,
                             statistics_summary: {
                                team_name: teamName,
                                total_goals: stats.goals.total || 0,
                                total_assists: stats.goals.assists || 0,
                                total_appearances: stats.games.appearences || 0,
                                minutes_played: stats.games.minutes || 0,
                                rating: stats.games.rating || null
                            }
                        });
                        await newPlayer.save();
                    }
                }
            }
            currentPage++;
        } catch (err) {
            console.log(`      ❌ Eroare pagină: ${err.message}`);
            break;
        }
    } while (currentPage <= totalPages);
};

module.exports = { runDailySmartSync };