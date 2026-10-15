const axios = require('axios');
const mongoose = require('mongoose');

const API_KEY = process.env.API_KEY;
const BASE_URL = "https://v3.football.api-sports.io";
const SEASON = 2026;

// Am adăugat 2 (UCL), 3 (UEL) și 848 (UECL)
const TARGET_LEAGUES = [39, 140, 135, 78, 61, 283, 88, 94, 40, 2, 3, 848];

const LIVE_STATUSES = ["1H", "HT", "2H", "ET", "P", "BT", "LIVE"];
const FINISHED_STATUSES = ["FT", "AET", "PEN"];

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// 1. Funcția care aduce fereastra de 7 zile (rulează o dată pe zi)
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

// 2. Funcția care aduce DOAR meciurile LIVE și închide automat meciurile care s-au terminat
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

        const stuckLocalMatches = await Fixture.find({
            status_short: { $in: LIVE_STATUSES },
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
            console.log(`[LIVE SYNC] Am închis/actualizat automat ${stuckLocalMatches.length} meciuri care s-au terminat.`);
        }

    } catch (err) {
        console.log(`[LIVE SYNC] Eroare interogare live:`, err.message);
    }
}

// 3. NOU: Preia Detaliile Meciului (Formații, Evenimente, Statistici) cu Caching Inteligent
async function getFixtureDetailsOnDemand(fixtureId) {
    const Fixture = mongoose.model('Fixture');
    let matchDoc = await Fixture.findOne({ fixture_id: Number(fixtureId) });

    const now = Date.now();
    const lastSync = matchDoc?.details_updated_at ? new Date(matchDoc.details_updated_at).getTime() : 0;
    const hasDetails = matchDoc && (
        (matchDoc.lineups && matchDoc.lineups.length > 0) ||
        (matchDoc.events && matchDoc.events.length > 0) ||
        (matchDoc.statistics && matchDoc.statistics.length > 0)
    );

    if (matchDoc) {
        // A. Dacă meciul e terminat și avem deja detaliile în DB, 0 request-uri!
        if (FINISHED_STATUSES.includes(matchDoc.status_short) && hasDetails) {
            return matchDoc;
        }
        // B. Dacă meciul e LIVE și am descărcat deja detaliile în ultimele 2 minute, 0 request-uri!
        if (LIVE_STATUSES.includes(matchDoc.status_short) && (now - lastSync < 2 * 60 * 1000) && hasDetails) {
            return matchDoc;
        }
        // C. Dacă meciul nu a început (NS)
        if (matchDoc.status_short === "NS") {
            const timeUntilKickoff = (matchDoc.timestamp * 1000) - now;
            // Dacă mai e mai mult de 60 min până la start, nu facem request (formațiile nu sunt publicate încă)
            if (timeUntilKickoff > 60 * 60 * 1000) {
                return matchDoc;
            }
            // Dacă suntem în ultima oră înainte de start, verificăm maxim o dată la 10 minute
            if (now - lastSync < 10 * 60 * 1000) {
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
            matchDoc = await updateOrInsertFixture(Fixture, fullMatch, true);
        }
    } catch (err) {
        console.error(`Eroare preluare detalii meci ${fixtureId}:`, err.message);
    }

    return matchDoc;
}

// 4. NOU: Preia Clasamentul Ligii cu Caching (maxim 1 request la 3 ore per ligă)
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
        status_short: m.fixture.status.short,
        elapsed: m.fixture.status.elapsed
    };

    if (includeDetails || m.events || m.lineups || m.statistics) {
        if (m.events) matchData.events = m.events;
        if (m.lineups) matchData.lineups = m.lineups;
        if (m.statistics) matchData.statistics = m.statistics;
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
    getLeagueStandingsOnDemand
};