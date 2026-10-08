const axios = require('axios');
const Player = require('../models/player');

// --- CONFIGURARE ---
const API_KEY = process.env.API_KEY;
const BASE_URL = "https://v3.football.api-sports.io";
const SEASON = 2026; 

const TARGET_LEAGUES = [
    { id: 39, name: "Premier League (Anglia)" },
    { id: 140, name: "La Liga (Spania)" },
    { id: 135, name: "Serie A (Italia)" },
    { id: 78, name: "Bundesliga (Germania)" },
    { id: 61, name: "Ligue 1 (Franta)" },
    { id: 283, name: "SuperLiga (Romania)" },
    { id: 88, name: "Eredivisie (Olanda)" },
    { id: 94, name: "Primeira Liga (Portugalia)" },
    { id: 40, name: "Championship (Anglia L2)" }
];

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getRealClubNameAndLogo = async (playerId, nationalTeamId) => {
    try {
        const res = await axios.get(`${BASE_URL}/players?id=${playerId}&season=${SEASON}`, {
            headers: { 'x-apisports-key': API_KEY }
        });
        if (!res.data.response || res.data.response.length === 0) return null;
        
        const statsList = res.data.response[0].statistics;
        const clubStat = statsList.find(s => s.team.id !== nationalTeamId);
        
        if (clubStat) {
            return { 
                name: clubStat.team.name, 
                logo: clubStat.team.logo,
                league_id: clubStat.league?.id,
                stats: clubStat
            }; 
        }
        return null;
    } catch (err) { return null; }
};

const processNationalTeam = async (teamId, teamName, teamLogo) => {
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
                
                await wait(2000); 
                const realClubInfo = await getRealClubNameAndLogo(p.id, teamId);
                
                let finalTeamName = teamName; 
                let finalTeamLogo = teamLogo;
                let leagueId = null;
                let activeStats = item.statistics[0];

                if (realClubInfo) {
                    finalTeamName = realClubInfo.name; 
                    finalTeamLogo = realClubInfo.logo;
                    leagueId = realClubInfo.league_id;
                    activeStats = realClubInfo.stats;
                }

                // 1. ȘTERGEM documentul vechi/incomplet dacă există deja în baza de date
                await Player.deleteMany({
                    $or: [
                        { api_id: p.id },
                        { name: p.name },
                        { lastname: p.lastname, firstname: p.firstname }
                    ]
                });

                // 2. REINTRODUCEM jucătorul complet de la zero cu naționalitatea pusă
                const newPlayerData = {
                    api_id: p.id,
                    name: p.name || "",
                    firstname: p.firstname || "",
                    lastname: p.lastname || "",
                    age: p.age || null,
                    nationality: "Romania", // Naționalitatea este garantată
                    height: p.height || null,
                    weight: p.weight || null,
                    position: activeStats?.games?.position || "Unknown",
                    image: p.photo,
                    team: finalTeamName,
                    team_name: finalTeamName,
                    team_logo: finalTeamLogo,
                    league_id: leagueId || null,
                    statistics_summary: {
                        team: finalTeamName,
                        team_name: finalTeamName,
                        total_goals: activeStats?.goals?.total || 0,
                        total_assists: activeStats?.goals?.assists || 0,
                        total_appearances: activeStats?.games?.appearences || 0,
                        minutes_played: activeStats?.games?.minutes || 0,
                        rating: activeStats?.games?.rating || null
                    }
                };

                const playerDoc = new Player(newPlayerData);
                await playerDoc.save();

                console.log(`   ⭐ [Șters & Reintrodus] ${p.name} | Naționalitate: Romania | Club: ${finalTeamName}`);
            }
            currentPage++;
            await wait(3000); 

        } catch (err) {
            console.log(`      ❌ Eroare Națională: ${err.message}`);
            break;
        }
    } while (currentPage <= totalPages);
};

const runNationalTeamSync = async () => {
    console.log(`\n🇷🇴 [SMART SYNC] Reintroducere curată a lotului Naționalei...`);
    try {
        const allTeamsRes = await axios.get(`${BASE_URL}/teams`, {
            headers: { 'x-apisports-key': API_KEY },
            params: { country: 'Romania' } 
        });

        const nationalTeamObj = allTeamsRes.data.response.find(item => item.team.national === true);

        if (nationalTeamObj) {
            const romaniaTeam = nationalTeamObj.team;
            console.log(`✅ GĂSITĂ: ${romaniaTeam.name}. Încep ștergerea și reintroducerea jucătorilor...`);
            await processNationalTeam(romaniaTeam.id, "Romania (Nationala)", romaniaTeam.logo);
            console.log(`✅ [NAȚIONALĂ REINTRODUSĂ COMPLET CU SUCCES]`);
        }
    } catch (error) { console.error("⚠️ Eroare Națională:", error.message); }
};

const runDailySmartSync = async () => {
    console.log(`⏰ [SMART SYNC] Pornesc actualizarea completă...`);

    for (const targetLeague of TARGET_LEAGUES) {
        console.log(`\n🌍 Încep procesarea pentru: ${targetLeague.name}...`);
        try {
            const teamsRes = await axios.get(`${BASE_URL}/teams?league=${targetLeague.id}&season=${SEASON}`, {
                headers: { 'x-apisports-key': API_KEY }
            });
            
            const teams = teamsRes.data.response;
            if (!teams || teams.length === 0) continue;

            for (const t of teams) {
                await processTeamAndUpdate(t.team.id, t.team.name, t.team.logo, targetLeague.id);
                await wait(3000); 
            }
        } catch (error) {
            console.error(`❌ Eroare la liga ${targetLeague.name}:`, error.message);
        }
    }

    await runNationalTeamSync();
    console.log(`\n✅ [SMART SYNC FULL] Baza de date a fost actualizată la zi!`);
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

                const updateData = {
                    api_id: p.id,
                    name: p.name || "",
                    firstname: p.firstname || "",
                    lastname: p.lastname || "",
                    age: p.age || null,
                    nationality: p.nationality || "Unknown",
                    height: p.height || null,
                    weight: p.weight || null,
                    image: p.photo,
                    position: stats?.games?.position || "Unknown",
                    team: teamName,
                    team_name: teamName, 
                    team_logo: teamLogo,
                    league_id: leagueId || null,
                    statistics_summary: {
                        team: teamName,
                        team_name: teamName,
                        total_goals: stats?.goals?.total || 0,
                        total_assists: stats?.goals?.assists || 0,
                        total_appearances: stats?.games?.appearences || 0,
                        minutes_played: stats?.games?.minutes || 0,
                        rating: stats?.games?.rating || null
                    }
                };

                const existingPlayer = await Player.findOne({ 
                    $or: [ { api_id: p.id }, { name: p.name } ] 
                });

                if (existingPlayer) {
                    await Player.updateOne({ _id: existingPlayer._id }, { $set: updateData });
                } else {
                    if (p.nationality === "Romania") {
                        const newPlayer = new Player(updateData);
                        await newPlayer.save();
                    }
                }
            }
            currentPage++;
            if (currentPage <= totalPages) await wait(1500); 
        } catch (err) { break; }
    } while (currentPage <= totalPages);
};

module.exports = { runDailySmartSync, runNationalTeamSync };