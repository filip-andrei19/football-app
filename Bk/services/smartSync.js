const axios = require('axios');
const Player = require('../models/player');

// --- CONFIGURARE ---
const API_KEY = process.env.API_KEY;
const BASE_URL = "https://v3.football.api-sports.io";
const SEASON = 2026; // Anul corectat pentru sezonul curent

// Lista Ligilor Importante
const TARGET_LEAGUES = [
    { id: 39, name: "Premier League (Anglia)" },
    { id: 140, name: "La Liga (Spania)" },
    { id: 135, name: "Serie A (Italia)" },
    { id: 78, name: "Bundesliga (Germania)" },
    { id: 61, name: "Ligue 1 (Franta)" },
    { id: 283, name: "SuperLiga (Romania)" } 
];

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runDailySmartSync = async () => {
    console.log(`⏰ [SMART SYNC] Pornesc actualizarea completă pentru TOATE LIGILE...`);

    for (const targetLeague of TARGET_LEAGUES) {
        console.log(`\n🌍 Încep procesarea pentru: ${targetLeague.name}...`);

        try {
            const teamsRes = await axios.get(`${BASE_URL}/teams?league=${targetLeague.id}&season=${SEASON}`, {
                headers: { 'x-apisports-key': API_KEY }
            });
            
            const teams = teamsRes.data.response;
            if (!teams || teams.length === 0) {
                console.log(`⚠️ Nu am găsit echipe pentru ${targetLeague.name}. Trec mai departe.`);
                continue;
            }

            console.log(`📋 S-au găsit ${teams.length} echipe. Procesez...`);

            for (const t of teams) {
                const teamName = t.team.name;
                const teamId = t.team.id;
                const teamLogo = t.team.logo;

                console.log(` 👉 Verific Echipa: ${teamName}`);
                await processTeamAndUpdate(teamId, teamName, teamLogo, targetLeague.id);
                
                // Pauză de 3 secunde între echipe
                await wait(3000); 
            }

        } catch (error) {
            console.error(`❌ Eroare la liga ${targetLeague.name}:`, error.message);
        }
    }

    console.log(`\n✅ [SMART SYNC FULL] Baza de date a fost actualizată la zi pentru toate ligile!`);
};

const processTeamAndUpdate = async (teamId, teamName, teamLogo, leagueId) => {
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

                // MODIFICARE CRITICĂ PENTRU TRANSFERURI:
                // Forțăm echipa curentă să fie cea scanată (teamName, teamLogo)
                const currentTeamLogo = teamLogo; 

                const updateData = {
                    name: p.name,
                    firstname: p.firstname,
                    lastname: p.lastname,
                    age: p.age,
                    nationality: p.nationality,
                    birth_date: p.birth?.date,
                    birth_place: p.birth?.place,
                    height: p.height,
                    weight: p.weight,
                    image: p.photo,
                    position: stats?.games?.position,
                    
                    // Suprascriem forțat echipa veche cu echipa la care este găsit ACUM în roster
                    team_name: teamName,
                    team: teamName, 
                    team_logo: currentTeamLogo,
                    league_id: leagueId,
                    
                    statistics_summary: {
                        team_name: teamName,
                        total_goals: stats?.goals?.total || 0,
                        total_assists: stats?.goals?.assists || 0,
                        total_appearances: stats?.games?.appearences || 0,
                        minutes_played: stats?.games?.minutes || 0,
                        rating: stats?.games?.rating || null
                    }
                };

                const existingPlayer = await Player.findOne({ 
                    $or: [ { api_player_id: p.id }, { api_id: p.id } ] 
                });

                if (existingPlayer) {
                    if (existingPlayer.team_name !== teamName) {
                        console.log(`   🔄 TRANSFER DETECTAT ȘI REZOLVAT: ${p.name} s-a mutat la "${teamName}"!`);
                    }
                    await Player.updateOne({ _id: existingPlayer._id }, { $set: updateData });
                } else {
                    if (p.nationality === "Romania") {
                        console.log(`   ⭐ Jucător NOU Român adăugat: ${p.name}`);
                        const newPlayer = new Player({
                            api_player_id: p.id,
                            api_id: p.id,
                            ...updateData
                        });
                        await newPlayer.save();
                    }
                }
            }
            currentPage++;
            
            if (currentPage <= totalPages) await wait(1500); 
            
        } catch (err) {
            console.log(`   ❌ Eroare pagină: ${err.message}`);
            break;
        }
    } while (currentPage <= totalPages);
};

module.exports = { runDailySmartSync };