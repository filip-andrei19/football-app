const axios = require('axios');
const mongoose = require('mongoose');

const API_KEY = process.env.API_KEY;
const BASE_URL = "https://v3.football.api-sports.io";
const SEASON = 2026;

// Am adăugat 2 (UCL), 3 (UEL) și 848 (UECL)
const TARGET_LEAGUES = [39, 140, 135, 78, 61, 283, 88, 94, 40, 2, 3, 848];

const LIVE_STATUSES = ["1H", "HT", "2H", "ET", "P", "BT", "LIVE"];
const FINISHED_STATUSES = ["FT", "AET", "PEN"];

// Cooldown pentru a nu interoga prea des meciurile "NS" amânate sau întârziate
let lastStuckNsCheck = 0;

// Set în memorie + control concurență pentru sincronizarea jucătorilor după meci
const syncedFinishedFixtures = new Set();
let isSyncingPostMatchPlayers = false;
let lastPostMatchCheck = 0;

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// 1. Funcția care aduce fereastra de 7 zile (rulează periodic și la cerere)
async function sync7DaysWindow() {
    const Fixture = mongoose.model('Fixture');
    const today = new Date();
    
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - 3);
    
    const toDate = new Date(today);
    toDate.setDate(today.getDate() + 3);

    const fromStr = formatDate(fromDate);
    const toStr = formatDate(toDate);

    console.log(`\n[MATCH SYNC] Descarc meciurile din ${fromStr} până în ${toStr}...`);

    for (const leagueId of TARGET_LEAGUES) {
        try {
            const res = await axios.get(`${BASE_URL}/fixtures`, {
                headers: { 'x-apisports-key': API_KEY },
                params: {
                    league: leagueId,
                    season: SEASON,
                    from: fromStr,
                    to: toStr
                }
            });

            const matches = res.data.response || [];
            for (const m of matches) {
                await updateOrInsertFixture(Fixture, m);
            }
        } catch (err) {
            console.error(`Eroare sync meciuri liga ${leagueId}:`, err.message);
        }
    }
    console.log(`[MATCH SYNC] Fereastra de 7 zile a fost actualizată!`);
}

// 2. Funcția care aduce DOAR meciurile LIVE, închide automat meciurile rămase în "NS"/LIVE și declanșează sync-ul de jucători după meci
async function syncLiveMatches(io) {
    const Fixture = mongoose.model('Fixture');
    try {
        const leaguesStr = TARGET_LEAGUES.join('-');
        
        const res = await axios.get(`${BASE_URL}/fixtures`, {
            headers: { 'x-apisports-key': API_KEY },
            params: { live: leaguesStr }
        });

        const liveMatches = res.data.response || [];
        const activeApiIds = [];

        if (liveMatches.length > 0) {
            for (const m of liveMatches) {
                activeApiIds.push(m.fixture.id);
                const savedMatch = await updateOrInsertFixture(Fixture, m);
                if (io) {
                    io.emit("live_match_update", savedMatch);
                }
            }
        }

        const nowSec = Math.floor(Date.now() / 1000);
        const shouldCheckStuckNs = (Date.now() - lastStuckNsCheck) > 2 * 60 * 1000; // verificăm NS-urile restante la fiecare 2 minute

        const stuckOrConditions = [
            { status_short: { $in: LIVE_STATUSES } }
        ];

        // Dacă un meci a trecut de ora de start cu cel puțin 3 minute dar încă figurează ca "NS", îl verificăm și îl actualizăm!
        if (shouldCheckStuckNs) {
            lastStuckNsCheck = Date.now();
            stuckOrConditions.push({
                status_short: "NS",
                timestamp: { $lte: nowSec - 180,$gte: nowSec - (3 * 86400) }
            });
        }

        const stuckLocalMatches = await Fixture.find({
            $or: stuckOrConditions,
            fixture_id: { $nin: activeApiIds }
        }).select('fixture_id');

        if (stuckLocalMatches.length > 0) {
            const idsToResolve = stuckLocalMatches.map(doc => doc.fixture_id);

            for (let i = 0; i < idsToResolve.length; i += 20) {
                const batchIds = idsToResolve.slice(i, i + 20).join('-');
                const finishedRes = await axios.get(`${BASE_URL}/fixtures`, {
                    headers: { 'x-apisports-key': API_KEY },
                    params: { ids: batchIds }
                });

                const resolvedMatches = finishedRes.data.response || [];
                for (const m of resolvedMatches) {
                    const updatedMatch = await updateOrInsertFixture(Fixture, m);
                    if (io) {
                        io.emit("live_match_update", updatedMatch);
                    }
                }
            }
            console.log(`[LIVE SYNC] Am închis/actualizat automat ${stuckLocalMatches.length} meciuri restante (LIVE/NS -> scor la zi).`);
        }

        // Declanșăm verificarea meciurilor recent încheiate pentru actualizarea jucătorilor (la fiecare 3 minute, în fundal)
        if (Date.now() - lastPostMatchCheck > 3 * 60 * 1000) {
            lastPostMatchCheck = Date.now();
            syncPlayersAfterFinishedMatches().catch(err =>
                console.error("[POST-MATCH PLAYER SYNC] Eroare:", err.message)
            );
        }

    } catch (err) {
        console.log(`[LIVE SYNC] Eroare interogare live:`, err.message);
    }
}

// 2.1. NOU: Sincronizează automat statisticile jucătorilor și detaliile meciului după ce un meci trece în FT / AET / PEN
async function syncPlayersAfterFinishedMatches() {
    if (isSyncingPostMatchPlayers) return;
    isSyncingPostMatchPlayers = true;

    try {
        const Fixture = mongoose.model('Fixture');
        const nowSec = Math.floor(Date.now() / 1000);

        // Căutăm meciuri terminate în ultimele 12 ore, dar al căror start a fost acum cel puțin 110 minute (~5 min după fluierul final)
        const recentFinishedMatches = await Fixture.find({
            status_short: { $in: FINISHED_STATUSES },
            timestamp: {
                $lte: nowSec - (110 * 60),$gte: nowSec - (12 * 3600)
            }
        }).limit(10);

        for (const matchDoc of recentFinishedMatches) {
            // Verificăm dacă am sincronizat deja jucătorii pentru acest meci (în DB sau în memorie)
            if (matchDoc.players_synced === true || syncedFinishedFixtures.has(matchDoc.fixture_id)) {
                continue;
            }

            console.log(`[POST-MATCH SYNC] Actualizez detaliile finale și jucătorii după meciul: ${matchDoc.home_team_name} vs ${matchDoc.away_team_name} (#${matchDoc.fixture_id})`);

            // 1. Asigurăm că meciul are descărcate formațiile, notele finale și statisticile complete
            await getFixtureDetailsOnDemand(matchDoc.fixture_id, true);

            // 2. Actualizăm statisticile de sezon ale jucătorilor celor două echipe
            await syncTeamsPlayersStatsAfterMatch(
                matchDoc.home_team_id,
                matchDoc.away_team_id,
                matchDoc.league_id,
                matchDoc.home_team_name,
                matchDoc.away_team_name,
                matchDoc.home_team_logo,
                matchDoc.away_team_logo
            );

            // 3. Marcăm meciul ca sincronizat (în memorie + în colecția Fixture, chiar dacă schema e strictă folosim collection.updateOne)
            syncedFinishedFixtures.add(matchDoc.fixture_id);
            await Fixture.collection.updateOne(
                { fixture_id: matchDoc.fixture_id },
                { $set: { players_synced: true, players_synced_at: new Date() } }
            );
        }
    } catch (err) {
        console.error("[POST-MATCH SYNC] Eroare procesare:", err.message);
    } finally {
        isSyncingPostMatchPlayers = false;
    }
}

// 2.2. NOU: Actualizează jucătorii din baza de date pentru cele două echipe care tocmai au terminat meciul
async function syncTeamsPlayersStatsAfterMatch(homeTeamId, awayTeamId, leagueId, homeTeamName, awayTeamName, homeTeamLogo, awayTeamLogo) {
    // Dacă există o funcție dedicată în smartSync.js, o apelăm și pe aceea
    try {
        const smartSync = require('./smartSync');
        if (typeof smartSync.syncTeamPlayersAfterMatch === 'function') {
            await smartSync.syncTeamPlayersAfterMatch(homeTeamId, leagueId);
            await smartSync.syncTeamPlayersAfterMatch(awayTeamId, leagueId);
            return;
        }
    } catch (_) {
        // Dacă smartSync nu exportă funcția, folosim actualizarea directă în modelul Player de mai jos
    }

    let Player;
    try {
        Player = mongoose.model('Player');
    } catch (_) {
        return;
    }

    const teamsToSync = [
        { id: homeTeamId, name: homeTeamName, logo: homeTeamLogo },
        { id: awayTeamId, name: awayTeamName, logo: awayTeamLogo }
    ];

    for (const teamObj of teamsToSync) {
        if (!teamObj.id) continue;
        try {
            // Preluăm prima pagină de jucători ai echipei pentru sezonul curent de la API-Football
            const res = await axios.get(`${BASE_URL}/players`, {
                headers: { 'x-apisports-key': API_KEY },
                params: {
                    team: teamObj.id,
                    season: SEASON,
                    page: 1
                }
            });

            const apiPlayers = res.data?.response || [];
            for (const item of apiPlayers) {
                const pInfo = item.player;
                const statsArr = item.statistics || [];
                if (!pInfo || statsArr.length === 0) continue;

                let totalGoals = 0;
                let totalAssists = 0;
                let totalApps = 0;
                let totalMinutes = 0;
                let ratingSum = 0;
                let ratingCount = 0;

                const detailedStats = statsArr.map(st => {
                    const apps = st.games?.appearences || 0;
                    const goals = st.goals?.total || 0;
                    const assists = st.goals?.assists || 0;
                    const mins = st.games?.minutes || 0;
                    const r = st.games?.rating ? parseFloat(st.games.rating) : 0;

                    totalApps += apps;
                    totalGoals += goals;
                    totalAssists += assists;
                    totalMinutes += mins;
                    if (r > 0) {
                        ratingSum += r;
                        ratingCount += 1;
                    }

                    return {
                        competition: st.league?.name || "Competiție",
                        type: st.league?.type || "League",
                        appearances: apps,
                        goals: goals,
                        assists: assists,
                        minutes: mins
                    };
                });

                const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(2) : "0";
                const primaryPos = statsArr[0]?.games?.position || "Unknown";

                await Player.findOneAndUpdate(
                    { name: pInfo.name },
                    {
                        $set: {
                            name: pInfo.name,
                            age: pInfo.age || undefined,
                            nationality: pInfo.nationality || undefined,
                            height: pInfo.height || undefined,
                            weight: pInfo.weight || undefined,
                            image: pInfo.photo || undefined,
                            position: primaryPos,
                            team: teamObj.name,
                            team_name: teamObj.name,
                            team_logo: teamObj.logo,
                            league_id: leagueId,
                            detailed_stats: detailedStats,
                            statistics_summary: {
                                team_name: teamObj.name,
                                total_goals: totalGoals,
                                total_assists: totalAssists,
                                total_appearances: totalApps,
                                minutes_played: totalMinutes,
                                rating: avgRating
                            },
                            updated_at: new Date()
                        }
                    },
                    { upsert: true }
                );
            }
            console.log(`[POST-MATCH SYNC] Jucătorii echipei ${teamObj.name} au fost actualizați la zi!`);
        } catch (err) {
            console.error(`[POST-MATCH SYNC] Eroare actualizare echipă ${teamObj.name}:`, err.message);
        }
    }
}

// 3. Preia Detaliile Meciului (Formații, Evenimente, Statistici) cu Caching Inteligent (Reparat pentru Formații & Statistici complete)
async function getFixtureDetailsOnDemand(fixtureId, forceRefresh = false) {
    const Fixture = mongoose.model('Fixture');
    let matchDoc = await Fixture.findOne({ fixture_id: Number(fixtureId) });

    const now = Date.now();
    const lastSync = matchDoc?.details_updated_at ? new Date(matchDoc.details_updated_at).getTime() : 0;

    // IMPORTANT: Verificăm dacă avem ATÂT formațiile (lineups), CÂT ȘI statisticile (statistics), nu doar evenimentele!
    const hasLineups = Boolean(matchDoc?.lineups && matchDoc.lineups.length > 0);
    const hasStats = Boolean(matchDoc?.statistics && matchDoc.statistics.length > 0);
    const hasFullDetails = hasLineups && hasStats;

    if (matchDoc && !forceRefresh) {
        // A. Dacă meciul e terminat și avem deja AMBELE (formații + statistici) în DB, 0 request-uri!
        // Dacă însă îi lipsesc formațiile sau statisticile și nu am mai încercat în ultimele 15 minute, reîncercăm descărcarea!
        if (FINISHED_STATUSES.includes(matchDoc.status_short)) {
            if (hasFullDetails) {
                return matchDoc;
            }
            if (lastSync > 0 && (now - lastSync < 15 * 60 * 1000)) {
                return matchDoc;
            }
        }

        // B. Dacă meciul e LIVE și am descărcat deja detaliile complete în ultimele 2 minute, 0 request-uri!
        if (LIVE_STATUSES.includes(matchDoc.status_short) && (now - lastSync < 2 * 60 * 1000) && hasFullDetails) {
            return matchDoc;
        }

        // C. Dacă meciul nu a început (NS), verificăm DOAR dacă într-adevăr ora de start este în viitor
        if (matchDoc.status_short === "NS") {
            const timeUntilKickoff = (matchDoc.timestamp * 1000) - now;
            // Dacă mai e mai mult de 60 min până la start, nu facem request (formațiile nu sunt publicate încă)
            if (timeUntilKickoff > 60 * 60 * 1000) {
                return matchDoc;
            }
            // Dacă meciul este încă în viitor (0 - 60 min până la start), verificăm maxim o dată la 5 minute dacă au apărut formațiile
            if (timeUntilKickoff > 0 && (now - lastSync < 5 * 60 * 1000) && hasLineups) {
                return matchDoc;
            }
        }
    }

    // Facem 1 singur request la API-Football care aduce simultan: events + lineups + statistics
    try {
        const res = await axios.get(`${BASE_URL}/fixtures`, {
            headers: { 'x-apisports-key': API_KEY },
            params: { id: fixtureId }
        });

        const fullMatch = res.data?.response?.[0];
        if (fullMatch) {
            // Dacă în obiectul principal nu au venit lineups sau statistics, le cerem punctual doar dacă lipsesc
            if (!fullMatch.lineups || fullMatch.lineups.length === 0) {
                try {
                    const lRes = await axios.get(`${BASE_URL}/fixtures/lineups`, {
                        headers: { 'x-apisports-key': API_KEY },
                        params: { fixture: fixtureId }
                    });
                    if (lRes.data?.response?.length > 0) {
                        fullMatch.lineups = lRes.data.response;
                    }
                } catch (_) {}
            }

            if (!fullMatch.statistics || fullMatch.statistics.length === 0) {
                try {
                    const sRes = await axios.get(`${BASE_URL}/fixtures/statistics`, {
                        headers: { 'x-apisports-key': API_KEY },
                        params: { fixture: fixtureId }
                    });
                    if (sRes.data?.response?.length > 0) {
                        fullMatch.statistics = sRes.data.response;
                    }
                } catch (_) {}
            }

            matchDoc = await updateOrInsertFixture(Fixture, fullMatch, true);
        }
    } catch (err) {
        console.error(`Eroare preluare detalii meci ${fixtureId}:`, err.message);
    }

    return matchDoc;
}

// 4. Preia Clasamentul Ligii cu Caching (maxim 1 request la 3 ore per ligă)
async function getLeagueStandingsOnDemand(leagueId) {
    const Standing = mongoose.model('Standing');
    const numericLeagueId = Number(leagueId);

    let standingDoc = await Standing.findOne({ league_id: numericLeagueId, season: SEASON });
    const now = Date.now();
    const lastSync = standingDoc?.updated_at ? new Date(standingDoc.updated_at).getTime() : 0;

    // Dacă avem clasamentul în baza de date și e mai nou de 3 ore, îl returnăm direct (0 request-uri)
    if (standingDoc && standingDoc.table && standingDoc.table.length > 0 && (now - lastSync < 3 * 3600 * 1000)) {
        return standingDoc;
    }

    try {
        const res = await axios.get(`${BASE_URL}/standings`, {
            headers: { 'x-apisports-key': API_KEY },
            params: { league: numericLeagueId, season: SEASON }
        });

        const leagueData = res.data?.response?.[0]?.league;
        if (leagueData && leagueData.standings) {
            standingDoc = await Standing.findOneAndUpdate(
                { league_id: numericLeagueId, season: SEASON },
                {
                    $set: {
                        league_id: numericLeagueId,
                        season: SEASON,
                        league_name: leagueData.name,
                        league_logo: leagueData.logo,
                        table: leagueData.standings, // Poate conține 1 tabel sau mai multe grupe
                        updated_at: new Date()
                    }
                },
                { upsert: true, new: true }
            );
        }
    } catch (err) {
        console.error(`Eroare preluare clasament liga ${leagueId}:`, err.message);
    }

    return standingDoc;
}

// Funcție internă care salvează meciul în Baza de Date
async function updateOrInsertFixture(FixtureModel, m, includeDetails = false) {
    const matchData = {
        fixture_id: m.fixture.id,
        date: m.fixture.date,
        timestamp: m.fixture.timestamp,
        league_id: m.league.id,
        league_name: m.league.name,
        league_logo: m.league.logo,
        league_round: m.league.round || "",
        venue_name: m.fixture.venue?.name || "",
        venue_city: m.fixture.venue?.city || "",
        referee: m.fixture.referee || "",
        home_team_id: m.teams.home.id,
        home_team_name: m.teams.home.name,
        home_team_logo: m.teams.home.logo,
        away_team_id: m.teams.away.id,
        away_team_name: m.teams.away.name,
        away_team_logo: m.teams.away.logo,
        home_goals: m.goals.home,
        away_goals: m.goals.away,
        ht_home_goals: m.score?.halftime?.home ?? null,
        ht_away_goals: m.score?.halftime?.away ?? null,
        status_short: m.fixture.status.short,
        elapsed: m.fixture.status.elapsed
    };

    if (includeDetails || (m.events && m.events.length > 0) || (m.lineups && m.lineups.length > 0) || (m.statistics && m.statistics.length > 0)) {
        if (m.events && m.events.length > 0) matchData.events = m.events;
        if (m.lineups && m.lineups.length > 0) matchData.lineups = m.lineups;
        if (m.statistics && m.statistics.length > 0) matchData.statistics = m.statistics;
        matchData.details_updated_at = new Date();
    }

    return await FixtureModel.findOneAndUpdate(
        { fixture_id: m.fixture.id },
        { $set: matchData },
        { upsert: true, new: true }
    );
}

module.exports = {
    sync7DaysWindow,
    syncLiveMatches,
    getFixtureDetailsOnDemand,
    getLeagueStandingsOnDemand,
    syncPlayersAfterFinishedMatches
};