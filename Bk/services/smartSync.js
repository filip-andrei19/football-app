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

// --- Procesare dedicată pentru Națională (Ștergere + Reintroducere cu naționalitate completă) ---
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

                // 1. ȘTERGEM înregistrarea veche/incompletă doar după criterii valide
                const deleteFilters = [];
                if (p.id) deleteFilters.push({ api_id: p.id }, { api_player_id: p.id });
                if (p.name) deleteFilters.push({ name: p.name });
                if (p.lastname && p.firstname) deleteFilters.push({ lastname: p.lastname, firstname: p.firstname });

                if (deleteFilters.length > 0) {
                    await Player.deleteMany({ $or: deleteFilters });
                }

                // 2. REINTRODUCEM jucătorul de la zero cu fiecare câmp complet
                const newPlayerData = {
                    api_id: p.id,
                    api_player_id: p.id,
                    name: p.name || "",
                    firstname: p.firstname || "",
                    lastname: p.lastname || "",
                    age: p.age || null,
                    nationality: "Romania", // Naționalitatea este garantată direct
                    birth_date: p.birth?.date || null,
                    birth_place: p.birth?.place || null,
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

// --- Funcția apelabilă separat DOAR pentru Națională ---
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

// --- Funcția de actualizare ZILNICĂ COMPLETĂ (toate ligile + naționala) ---
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

            console.log(`📋 S-au găsit ${teams.length} echipe. Procesez...`);

            for (const t of teams) {
                await processTeamAndUpdate(t.team.id, t.team.name, t.team.logo, targetLeague.id);
                await wait(3000); 
            }
        } catch (error) {
            console.error(`❌ Eroare la liga ${targetLeague.name}:`, error.message);
        }
    }

    // ACTUALIZĂM ECHIPA NAȚIONALĂ LA FINAL
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

                const updateData = {
                    api_id: p.id,
                    api_player_id: p.id,
                    name: p.name || "",
                    firstname: p.firstname || "",
                    lastname: p.lastname || "",
                    age: p.age || null,
                    nationality: p.nationality || "Romania",
                    birth_date: p.birth?.date || null,
                    birth_place: p.birth?.place || null,
                    height: p.height || null,
                    weight: p.weight || null,
                    image: p.photo,
                    position: stats?.games?.position || "Unknown",
                    team_name: teamName,
                    team: teamName, 
                    team_logo: teamLogo,
                    league_id: leagueId || null,
                    statistics_summary: {
                        team_name: teamName,
                        team: teamName,
                        total_goals: stats?.goals?.total || 0,
                        total_assists: stats?.goals?.assists || 0,
                        total_appearances: stats?.games?.appearences || 0,
                        minutes_played: stats?.games?.minutes || 0,
                        rating: stats?.games?.rating || null
                    }
                };

                const existingPlayer = await Player.findOne({ 
                    $or: [ { api_id: p.id }, { api_player_id: p.id }, { name: p.name } ] 
                });

                if (existingPlayer) {
                    const existingMinutes = existingPlayer.statistics_summary?.minutes_played || 0;
                    const newMinutes = stats?.games?.minutes || 0;

                    // Păstrăm naționalitatea existentă dacă API-ul nu returnează una validă
                    if (!p.nationality && existingPlayer.nationality) {
                        updateData.nationality = existingPlayer.nationality;
                    }

                    if (existingPlayer.team_name !== teamName) {
                        if (newMinutes >= existingMinutes) {
                             console.log(`   🔄 TRANSFER ACTUALIZAT CORECT: ${p.name} -> "${teamName}"!`);
                             await Player.updateOne({ _id: existingPlayer._id }, { $set: updateData });
                        } else {
                             await Player.updateOne({ _id: existingPlayer._id }, { 
                                 $set: { 
                                     "statistics_summary.total_goals": (existingPlayer.statistics_summary?.total_goals || 0) + (stats?.goals?.total || 0)
                                 } 
                             });
                        }
                    } else {
                        await Player.updateOne({ _id: existingPlayer._id }, { $set: updateData });
                    }
                } else {
                    if (p.nationality === "Romania" || leagueId === 283 || leagueId === 284) {
                        console.log(`   ⭐ Jucător NOU adăugat în DB: ${p.name}`);
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