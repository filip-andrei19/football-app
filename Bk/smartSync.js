const axios = require('axios');
const mongoose = require('mongoose');
const Player = require('../models/player'); // Asigură-te că calea e corectă

// --- CONFIGURARE ---
const API_KEY = process.env.API_KEY;
const CURRENT_SEASON = 2023; // Schimbă la 2024 când apare sezonul nou

// Harta Ligilor pe Zile (0 = Duminică, 1 = Luni, etc.)
const SCHEDULE = {
    1: { name: "Premier League (Anglia)", id: 39 },
    2: { name: "La Liga (Spania)", id: 140 },
    3: { name: "Serie A (Italia)", id: 135 },
    4: { name: "Bundesliga (Germania)", id: 78 },
    5: { name: "Ligue 1 (Franța)", id: 61 },
    6: { name: "SuperLiga (România)", id: 283 }, // Sâmbăta e pentru noi!
    0: { name: "Echipe Naționale & Altele", id: null } // Duminica - zi de odihnă sau curățenie
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchAndSaveLeague = async (leagueId, leagueName) => {
    console.log(`\n🌍 [ZIUA ${new Date().getDay()}] Încep importul pentru: ${leagueName}...`);
    
    try {
        // 1. Luăm toate ECHIPELE din acea ligă
        const teamsUrl = `https://v3.football.api-sports.io/teams?league=${leagueId}&season=${CURRENT_SEASON}`;
        const teamsRes = await axios.get(teamsUrl, {
            headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' }
        });

        const teams = teamsRes.data.response;
        console.log(`📋 Am găsit ${teams.length} echipe în ${leagueName}.`);

        // 2. Luăm jucătorii pentru FIECARE echipă
        for (const t of teams) {
            const teamId = t.team.id;
            const teamName = t.team.name;
            
            console.log(`   ⚽ Procesez echipa: ${teamName}...`);
            await processTeamPlayers(teamId, teamName, leagueId);
            
            // Pauză mică să nu supărăm API-ul
            await wait(2000); 
        }

    } catch (error) {
        console.error(`❌ Eroare la liga ${leagueName}:`, error.message);
    }
};

// Funcția care descarcă pagină cu pagină jucătorii unei echipe
const processTeamPlayers = async (teamId, teamName, leagueId) => {
    let currentPage = 1;
    let totalPages = 1; // Presupunem 1 inițial

    do {
        try {
            const url = `https://v3.football.api-sports.io/players?team=${teamId}&season=${CURRENT_SEASON}&page=${currentPage}`;
            const res = await axios.get(url, {
                headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' }
            });

            // Actualizăm nr total de pagini
            totalPages = res.data.paging.total;
            const playersList = res.data.response;

            // SALVARE ÎN BAZA DE DATE
            for (const item of playersList) {
                const p = item.player;
                // Căutăm statistica relevantă pentru liga curentă
                const stats = item.statistics.find(s => s.league.id === leagueId) || item.statistics[0];

                // --- LOGICA DE "DOAR CEI NOI" ---
                // Upsert face exact asta: Dacă nu există, îl creează. Dacă există, îl lasă (sau actualizează).
                // Aici actualizăm datele ca să fie proaspete, dar nu dublăm.
                
                await Player.updateOne(
                    { api_player_id: p.id }, // Condiția: Îl cauți după ID
                    {
                        $set: {
                            name: p.name,
                            age: p.age,
                            nationality: p.nationality,
                            position: stats.games.position,
                            image: p.photo,
                            team_name: teamName,
                            statistics_summary: {
                                team_name: teamName,
                                total_goals: stats.goals.total || 0,
                                total_assists: stats.goals.assists || 0
                            },
                            api_player_id: p.id
                        }
                    },
                    { upsert: true } // <--- ASTA E CHEIA (Inserează dacă nu există)
                );
            }
            
            currentPage++;
            // Pauză între pagini
            await wait(1000);

        } catch (err) {
            console.error(`Eroare la echipa ${teamName} pg ${currentPage}:`, err.message);
            break;
        }
    } while (currentPage <= totalPages);
};

const runDailyJob = async () => {
    const todayIndex = new Date().getDay(); // 0-6
    const target = SCHEDULE[todayIndex];

    if (!target || !target.id) {
        console.log("☕ Azi e Duminică (sau zi liberă). Nu rulăm importuri masive.");
        return;
    }

    console.log(`🚀 [DAILY JOB] Pornire sincronizare pentru: ${target.name}`);
    await fetchAndSaveLeague(target.id, target.name);
    console.log(`✅ [DAILY JOB] Finalizat pentru azi.`);
};

module.exports = { runDailyJob };