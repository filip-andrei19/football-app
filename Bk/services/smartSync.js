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

// --- Funcție pentru a găsi clubul real al unui stranier ---
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

// --- Procesare dedicată pentru Națională ---
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
                
                await wait(2000); // Pauză rate limit pentru siguranță
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

                const updateData = {
                    name: p.name,
                    firstname: p.firstname,
                    lastname: p.lastname,
                    age: p.age,
                    nationality: "Romania", // Asigurăm naționalitatea pentru toți
                    birth_date: p.birth?.date,
                    birth_place: p.birth?.place,
                    height: p.height,
                    weight: p.weight,
                    position: activeStats?.games?.position,
                    image: p.photo,
                    team_name: finalTeamName, 
                    team: finalTeamName,
                    team_logo: finalTeamLogo,
                    league_id: leagueId,
                    statistics_summary: {
                        team_name: finalTeamName,
                        total_goals: activeStats?.goals?.total || 0,
                        total_assists: activeStats?.goals?.assists || 0,
                        total_appearances: activeStats?.games?.appearences || 0,
                        minutes_played: activeStats?.games?.minutes || 0,
                        rating: activeStats?.games?.rating || null
                    },
                    api_player_id: p.id,
                    api_id: p.id
                };

                await Player.updateOne(
                    { $or: [ { api_player_id: p.id }, { api_id: p.id } ] },
                    { $set: updateData },
                    { upsert: true }
                );
                console.log(`   ⭐ [NAȚIONALĂ] Actualizat stranier: ${p.name} -> Club: ${finalTeamName}`);
            }
            currentPage++;
            await wait(3000); 

        } catch (err) {
            console.log(`      ❌ Eroare Națională: ${err.message}`);
            break;
        }
    } while (currentPage <= totalPages);
};

// --- NOU: Funcția apelabilă separat DOAR pentru Națională ---
const runNationalTeamSync = async () => {
    console.log(`\n🇷🇴 [SMART SYNC] Caut Naționala României pentru a adăuga Jucătorii...`);
    try {
        const allTeamsRes = await axios.get(`${BASE_URL}/teams`, {
            headers: { 'x-apisports-key': API_KEY },
            params: { country: 'Romania' } 
        });

        const nationalTeamObj = allTeamsRes.data.response.find(item => item.team.national === true);

        if (nationalTeamObj) {
            const romaniaTeam = nationalTeamObj.team;
            console.log(`✅ GĂSITĂ: ${romaniaTeam.name}. Încep procesarea lotului...`);
            await processNationalTeam(romaniaTeam.id, "Romania (Nationala)", romaniaTeam.logo);
            console.log(`✅ [NAȚIONALĂ ACTUALIZATĂ CU SUCCES]`);
        }
    } catch (error) { console.error("⚠️ Eroare Națională:", error.message); }
};

// --- Funcția de actualizare ZILNICĂ COMPLETĂ (toate ligile + naționala) ---
const runDailySmartSync = async () => {
    console.log(`⏰ [SMART SYNC] Pornesc actualizarea completă...`);

    // 1. ACTUALIZĂM LIGILE (inclusiv cele noi adăugate)
    for (const targetLeague of TARGET_LEAGUES) {
        console.log(`\n🌍 Încep procesarea pentru: ${targetLeague.name}...`);
        try {
            const teamsRes = await axios.get(`${BASE_URL}/teams?league=${targetLeague.id}&season=${SEASON}`, {
                headers: { 'x-apisports-key': API_KEY }
            });
            
            const teams = teamsRes.data.response;
            if (!teams || teams.length === 0) continue;

            console.log(`📋 S-au găsit ${teams.length} echipe. Procesez...`);

            for (const t of teams) {
                await processTeamAndUpdate(t.team.id, t.team.name, t.team.logo, targetLeague.id);
                await wait(3000); 
            }
        } catch (error) {
            console.error(`❌ Eroare la liga ${targetLeague.name}:`, error.message);
        }
    }

    // 2. ACTUALIZĂM ECHIPA NAȚIONALĂ LA FINAL
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
                
                const leagueStats = item.statistics.find(s => s.team.id === teamId && s.league.id === leagueId);
                const fallbackStats = item.statistics.find(s => s.team.id === teamId) || item.statistics[0];
                const stats = leagueStats || fallbackStats;

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
                    const existingMinutes = existingPlayer.statistics_summary?.minutes_played || 0;
                    const newMinutes = stats?.games?.minutes || 0;

                    if (existingPlayer.team_name !== teamName) {
                        if (newMinutes >= existingMinutes) {
                             console.log(`   🔄 TRANSFER ACTUALIZAT CORECT: ${p.name} -> "${teamName}"!`);
                             await Player.updateOne({ _id: existingPlayer._id }, { $set: updateData });
                        } else {
                             await Player.updateOne({ _id: existingPlayer._id }, { 
                                 $set: { 
                                     "statistics_summary.total_goals": existingPlayer.statistics_summary.total_goals + (stats?.goals?.total || 0)
                                 } 
                             });
                        }
                    } else {
                        await Player.updateOne({ _id: existingPlayer._id }, { $set: updateData });
                    }
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
            
        } catch (err) { break; }
    } while (currentPage <= totalPages);
};

module.exports = { runDailySmartSync, runNationalTeamSync };