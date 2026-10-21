const axios = require('axios');
const Player = require('../models/player');

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
    { id: 40, name: "Championship (Anglia L2)" },
    // ECHIPELE DIN CUPELE EUROPENE (Aduc automat jucătorii și stats-urile din campionatele lor)
    { id: 2, name: "UEFA Champions League" },
    { id: 3, name: "UEFA Europa League" },
    { id: 848, name: "UEFA Conference League" }
];

// Evidență în memorie pentru a evita dubla scanare a aceleiași echipe într-un interval scurt
const recentTeamSyncMap = new Map();

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateTotalStats(statisticsArray, targetTeamId) {
    let defaultStats = {
        total_appearances: 0, total_goals: 0, total_assists: 0, 
        minutes_played: 0, rating: null, position: "Unknown", 
        league_id: null, detailed_stats: []
    };

    if (!statisticsArray || !Array.isArray(statisticsArray)) {
        return defaultStats;
    }

    // --- VARIABILE PENTRU ALGORITMUL PROPRIU "SCOUT IQ" ---
    let totalGoals = 0;
    let totalAssists = 0;
    let totalMinutes = 0;
    let totalKeyPasses = 0;
    let totalTackles = 0;
    let totalInterceptions = 0;
    let totalSaves = 0;
    let yellowCards = 0;
    let redCards = 0;

    const clubStats = statisticsArray.filter(s => s && s.team && s.team.id === targetTeamId);
    
    for (const s of clubStats) {
        if (!s) continue;

        const apps = (s.games && s.games.appearences) ? s.games.appearences : 0;
        const mins = (s.games && s.games.minutes) ? s.games.minutes : 0;
        const goals = (s.goals && s.goals.total) ? s.goals.total : 0;
        const assists = (s.goals && s.goals.assists) ? s.goals.assists : 0;
        
        const compName = (s.league && s.league.name) ? s.league.name : "Competitie necunoscuta";
        const compType = (s.league && s.league.type) ? s.league.type : "Other";

        // Extragem date avansate DOAR din meciurile oficiale (Campionat / Cupă)
        if (compType === "League" || compType === "Cup") {
            totalKeyPasses += (s.passes && s.passes.key) ? s.passes.key : 0;
            totalTackles += (s.tackles && s.tackles.total) ? s.tackles.total : 0;
            totalInterceptions += (s.tackles && s.tackles.interceptions) ? s.tackles.interceptions : 0;
            totalSaves += (s.goals && s.goals.saves) ? s.goals.saves : 0;
            yellowCards += (s.cards && s.cards.yellow) ? s.cards.yellow : 0;
            redCards += (s.cards && s.cards.red) ? s.cards.red : 0;
        }

        // Adăugăm la totalurile generale
        defaultStats.total_appearances += apps;
        defaultStats.total_goals += goals;
        defaultStats.total_assists += assists;
        defaultStats.minutes_played += mins;

        totalGoals += goals;
        totalAssists += assists;
        totalMinutes += mins;
        
        if (s.games && s.games.position && defaultStats.position === "Unknown") {
            defaultStats.position = s.games.position;
        }
        if (!defaultStats.league_id && s.league && s.league.id && compType === "League") {
            defaultStats.league_id = s.league.id;
        }

        if (apps > 0 || goals > 0 || assists > 0) {
            defaultStats.detailed_stats.push({
                competition: compName,
                type: compType,
                appearances: apps,
                goals: goals,
                assists: assists,
                minutes: mins
            });
        }
    }

    // ========================================================
    // ALGORITMUL PROPRIU DE RATING ("Scout IQ Index")
    // ========================================================
    if (totalMinutes > 90) { 
        // 1. Stabilim o bază și calculăm "Meciuri Echivalente" (per 90 min)
        let baseRating = 6.0;
        let performanceScore = 0;
        const matchesEquivalent = totalMinutes / 90; 

        const pos = defaultStats.position.toLowerCase();

        // 2. Punctaj în funcție de Poziția Jucătorului
        if (pos.includes('attacker') || pos.includes('forward') || pos.includes('striker')) {
            performanceScore += (totalGoals * 1.5) + (totalAssists * 0.8) + (totalKeyPasses * 0.1);
        } else if (pos.includes('midfielder')) {
            performanceScore += (totalGoals * 1.2) + (totalAssists * 1.2) + (totalKeyPasses * 0.2) + (totalInterceptions * 0.1);
        } else if (pos.includes('defender') || pos.includes('back')) {
            performanceScore += (totalGoals * 2.5) + (totalAssists * 1.5) + (totalTackles * 0.15) + (totalInterceptions * 0.2);
        } else if (pos.includes('goalkeeper')) {
            performanceScore += (totalSaves * 0.3) + (totalInterceptions * 0.1);
        } else {
            performanceScore += (totalGoals * 1.0) + (totalAssists * 1.0) + (totalKeyPasses * 0.1) + (totalTackles * 0.1);
        }

        // 3. Penalizări disciplinare (Cartonașe)
        let disciplinePenalty = (yellowCards * 0.15) + (redCards * 0.6);

        // 4. Calculăm impactul mediu pe meci (Cât aduce jucătorul în 90 de min?)
        let impactPerMatch = performanceScore / matchesEquivalent;

        // 5. Bonus de consistență: titularii incontestabili primesc un mic boost (max +0.3)
        let consistencyBonus = Math.min((totalMinutes / 3000) * 0.3, 0.3);

        // 6. Formula Finală
        let finalRating = baseRating + impactPerMatch + consistencyBonus - (disciplinePenalty / matchesEquivalent);

        // 7. Normalizare: Ne asigurăm că nota nu sare de 10.0 și nu cade sub 4.0
        finalRating = Math.max(4.0, Math.min(10.0, finalRating));

        defaultStats.rating = finalRating.toFixed(2);
        
    } else if (totalMinutes > 0 && totalMinutes <= 90) {
        // A jucat prea puțin pentru ca algoritmul să fie precis
        defaultStats.rating = "6.00";
    } else {
        // Nu a jucat deloc
        defaultStats.rating = null;
    }

    return defaultStats;
}

async function getRealClubInfoAndStats(playerId, nationalTeamId) {
    try {
        const res = await axios.get(`${BASE_URL}/players?id=${playerId}&season=${SEASON}`, {
            headers: { 'x-apisports-key': API_KEY }
        });
        
        if (!res.data || !res.data.response || res.data.response.length === 0) return null;
        
        const statsArray = res.data.response[0].statistics;
        if (!statsArray || !Array.isArray(statsArray)) return null;

        const clubStatBlock = statsArray.find(s => s && s.team && s.team.id !== nationalTeamId);
        if (!clubStatBlock || !clubStatBlock.team) return null;
        
        const realClub = clubStatBlock.team;
        const aggregatedStats = calculateTotalStats(statsArray, realClub.id);

        return { 
            name: realClub.name || "Unknown", 
            logo: realClub.logo || "",
            league_id: aggregatedStats.league_id,
            stats: aggregatedStats
        }; 
    } catch (err) { 
        return null; 
    }
}

async function processNationalTeam(teamId, teamName, teamLogo) {
    let currentPage = 1;
    let totalPages = 1;

    do {
        try {
            const res = await axios.get(`${BASE_URL}/players?team=${teamId}&season=${SEASON}&page=${currentPage}`, {
                headers: { 'x-apisports-key': API_KEY }
            });
            
            if (!res.data || !res.data.response || res.data.response.length === 0) break;
            
            totalPages = res.data.paging ? res.data.paging.total : 1;
            const playersList = res.data.response;

            for (const item of playersList) {
                try {
                    if (!item || !item.player) continue;
                    const p = item.player;
                    await wait(2000); 
                    
                    const realClubInfo = await getRealClubInfoAndStats(p.id, teamId);
                    
                    let finalTeamName = teamName; 
                    let finalTeamLogo = teamLogo;
                    let leagueId = null;
                    let finalStats = calculateTotalStats(item.statistics, teamId); 

                    if (realClubInfo) {
                        finalTeamName = realClubInfo.name; 
                        finalTeamLogo = realClubInfo.logo;
                        leagueId = realClubInfo.league_id;
                        finalStats = realClubInfo.stats; 
                    }

                    if (!p.id) continue;

                    await Player.deleteMany({ api_id: p.id });

                    const newPlayerData = {
                        api_id: p.id,
                        api_player_id: p.id,
                        name: p.name || "Unknown",
                        firstname: p.firstname || "",
                        lastname: p.lastname || "",
                        age: p.age || null,
                        nationality: "Romania",
                        birth_date: (p.birth && p.birth.date) ? p.birth.date : null,
                        birth_place: (p.birth && p.birth.place) ? p.birth.place : null,
                        height: p.height || null,
                        weight: p.weight || null,
                        position: finalStats.position || "Unknown",
                        image: p.photo || "",
                        team: finalTeamName,
                        team_name: finalTeamName,
                        team_logo: finalTeamLogo,
                        league_id: leagueId || null,
                        detailed_stats: finalStats.detailed_stats || [],
                        statistics_summary: {
                            team: finalTeamName,
                            team_name: finalTeamName,
                            total_goals: finalStats.total_goals || 0,
                            total_assists: finalStats.total_assists || 0,
                            total_appearances: finalStats.total_appearances || 0,
                            minutes_played: finalStats.minutes_played || 0,
                            rating: finalStats.rating || null
                        }
                    };

                    const playerDoc = new Player(newPlayerData);
                    await playerDoc.save();
                    console.log(`   [NATIONALA] Salvat: ${p.name}`);
                } catch (innerErr) {
                    console.log(`Eroare izolata jucator (Nationala): ${innerErr.message}`);
                }
            }
            currentPage++;
            await wait(3000); 

        } catch (err) {
            console.log(`Eroare Nationala pag: ${err.message}`);
            break;
        }
    } while (currentPage <= totalPages);
}

async function processTeamAndUpdate(teamId, teamName, teamLogo, leagueId) {
    let currentPage = 1;
    let totalPages = 1;

    do {
        try {
            const res = await axios.get(`${BASE_URL}/players?team=${teamId}&season=${SEASON}&page=${currentPage}`, {
                headers: { 'x-apisports-key': API_KEY }
            });

            if (!res.data || !res.data.response || res.data.response.length === 0) break;
            
            totalPages = res.data.paging ? res.data.paging.total : 1;
            const playersList = res.data.response;

            for (const item of playersList) {
                try {
                    if (!item || !item.player) continue;

                    const p = item.player;
                    const totalStats = calculateTotalStats(item.statistics, teamId);

                    const updateData = {
                        api_id: p.id,
                        api_player_id: p.id,
                        name: p.name || "",
                        firstname: p.firstname || "",
                        lastname: p.lastname || "",
                        age: p.age || null,
                        nationality: p.nationality || "Necunoscut",
                        birth_date: (p.birth && p.birth.date) ? p.birth.date : null,
                        birth_place: (p.birth && p.birth.place) ? p.birth.place : null,
                        height: p.height || null,
                        weight: p.weight || null,
                        image: p.photo || "",
                        position: totalStats.position || "Unknown",
                        team_name: teamName,
                        team: teamName, 
                        team_logo: teamLogo,
                        // Păstrăm liga internă (dacă există în statistici) pentru a nu strica filtrul Diaspora
                        league_id: totalStats.league_id || leagueId || null,
                        detailed_stats: totalStats.detailed_stats || [],
                        statistics_summary: {
                            team_name: teamName,
                            team: teamName,
                            total_goals: totalStats.total_goals || 0,
                            total_assists: totalStats.total_assists || 0,
                            total_appearances: totalStats.total_appearances || 0,
                            minutes_played: totalStats.minutes_played || 0,
                            rating: totalStats.rating || null
                        }
                    };

                    if (!p.id) continue;

                    const existingPlayer = await Player.findOne({ api_id: p.id });

                    if (existingPlayer) {
                        // Forțăm ca un jucător să nu primească naționalitatea României decât dacă API-ul o zice clar sau e la Națională
                        if (!p.nationality && existingPlayer.nationality === "Romania" && teamName !== "Romania (Nationala)") {
                            updateData.nationality = "Necunoscut";
                        }
                        if (!totalStats.league_id && existingPlayer.league_id && ![2, 3, 848].includes(existingPlayer.league_id)) {
                            updateData.league_id = existingPlayer.league_id;
                        }
                        await Player.updateOne({ _id: existingPlayer._id }, { $set: updateData });
                    } else {
                        const newPlayer = new Player(updateData);
                        await newPlayer.save();
                    }
                } catch (innerErr) {
                    console.log(`Eroare izolata jucator (Liga): ${innerErr.message}`);
                }
            }
            currentPage++;
            if (currentPage <= totalPages) await wait(1500); 
            
        } catch (err) { 
            console.log(`Eroare Liga pag: ${err.message}`);
            break; 
        }
    } while (currentPage <= totalPages);
}

// ============================================================================
// NOU: SINCRONIZARE AUTOMATĂ A JUCĂTORILOR UNEI ECHIPE IMEDIAT DUPĂ MECI (FT)
// Folosește direct processTeamAndUpdate și algoritmul tău "Scout IQ Index"
// ============================================================================
async function syncTeamPlayersAfterMatch(teamId, teamName, teamLogo, leagueId) {
    if (!teamId) return;

    const now = Date.now();
    const lastSync = recentTeamSyncMap.get(Number(teamId)) || 0;

    // Dacă echipa a fost deja sincronizată în ultimele 30 de minute, o sărim pentru a economisi request-uri
    if (now - lastSync < 30 * 60 * 1000) {
        console.log(`   [POST-MATCH SMART SYNC] Echipa ${teamName} (#${teamId}) a fost deja actualizată recent.`);
        return;
    }

    recentTeamSyncMap.set(Number(teamId), now);
    console.log(`   [POST-MATCH SMART SYNC] Actualizez lotul și Scout IQ pentru: ${teamName} (#${teamId})...`);
    await processTeamAndUpdate(teamId, teamName || "Unknown", teamLogo || "", leagueId || null);
}

async function syncMatchTeamsPlayers(matchDoc) {
    if (!matchDoc) return;

    await syncTeamPlayersAfterMatch(
        matchDoc.home_team_id,
        matchDoc.home_team_name,
        matchDoc.home_team_logo,
        matchDoc.league_id
    );

    await wait(2000);

    await syncTeamPlayersAfterMatch(
        matchDoc.away_team_id,
        matchDoc.away_team_name,
        matchDoc.away_team_logo,
        matchDoc.league_id
    );
}

async function runNationalTeamSync() {
    try {
        const allTeamsRes = await axios.get(`${BASE_URL}/teams`, {
            headers: { 'x-apisports-key': API_KEY },
            params: { country: 'Romania' } 
        });

        if (!allTeamsRes.data || !allTeamsRes.data.response) return;

        const nationalTeamObj = allTeamsRes.data.response.find(item => item.team && item.team.national === true);

        if (nationalTeamObj) {
            const romaniaTeam = nationalTeamObj.team;
            await processNationalTeam(romaniaTeam.id, "Romania (Nationala)", romaniaTeam.logo);
        }
    } catch (error) { 
        console.error("Eroare Nationala API:", error.message); 
    }
}

async function runDailySmartSync() {
    console.log(`\n [SMART SYNC] Pornesc actualizarea completa...`);

    const EUROPEAN_CUPS = [2, 3, 848];

    for (const targetLeague of TARGET_LEAGUES) {
        console.log(`\n Incep procesarea pentru: ${targetLeague.name}...`);
        try {
            let teams = [];

            if (EUROPEAN_CUPS.includes(targetLeague.id)) {
                // PENTRU CUPELE EUROPENE: Luăm DOAR echipele din faza grupelor (League Phase) folosind /standings
                const standingsRes = await axios.get(`${BASE_URL}/standings?league=${targetLeague.id}&season=${SEASON}`, {
                    headers: { 'x-apisports-key': API_KEY }
                });

                const standingsList = standingsRes.data?.response?.[0]?.league?.standings;
                if (standingsList && Array.isArray(standingsList)) {
                    const allRows = standingsList.flat();
                    teams = allRows.filter(row => row && row.team).map(row => ({ team: row.team }));
                }
                console.log(` -> Am extras ${teams.length} echipe calificate în faza grupelor pentru ${targetLeague.name}.`);
            } else {
                // PENTRU CAMPIONATELE INTERNE: Metoda clasică
                const teamsRes = await axios.get(`${BASE_URL}/teams?league=${targetLeague.id}&season=${SEASON}`, {
                    headers: { 'x-apisports-key': API_KEY }
                });
                if (teamsRes.data && teamsRes.data.response) {
                    teams = teamsRes.data.response;
                }
            }

            if (!teams || teams.length === 0) continue;

            let count = 1;
            for (const t of teams) {
                if (t && t.team) {
                    console.log(`   [${count}/${teams.length}] Procesez echipa: ${t.team.name} (${targetLeague.name})...`);
                    await processTeamAndUpdate(t.team.id, t.team.name, t.team.logo, targetLeague.id);
                    count++;
                    await wait(3000); 
                }
            }
        } catch (error) { 
            console.log(`Eroare la liga ${targetLeague.name}: ${error.message}`);
        }
    }

    await runNationalTeamSync();
    console.log(`\n [SMART SYNC FULL] Baza de date actualizata!`);
}

module.exports = {
    runDailySmartSync,
    runNationalTeamSync,
    processTeamAndUpdate,
    syncTeamPlayersAfterMatch,
    syncMatchTeamsPlayers
};