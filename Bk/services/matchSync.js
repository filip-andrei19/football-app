const axios = require('axios');
const mongoose = require('mongoose');

const API_KEY = process.env.API_KEY;
const BASE_URL = "https://v3.football.api-sports.io";
const SEASON = 2026;

// Am adăugat 2 (UCL), 3 (UEL) și 848 (UECL)
const TARGET_LEAGUES = [39, 140, 135, 78, 61, 283, 88, 94, 40, 2, 3, 848];

// Funcție utilitară pentru a formata data în YYYY-MM-DD
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// 1. Funcția care aduce fereastra de 7 zile (rulează o dată pe zi)
async function sync7DaysWindow() {
    const Fixture = mongoose.model('Fixture');
    const today = new Date();
    
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - 3); // 3 zile în urmă
    
    const toDate = new Date(today);
    toDate.setDate(today.getDate() + 3);   // 3 zile înainte

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

// 2. Funcția care aduce DOAR meciurile LIVE (rulează din 2 în 2 minute)
async function syncLiveMatches(io) {
    const Fixture = mongoose.model('Fixture');
    try {
        const leaguesStr = TARGET_LEAGUES.join('-'); // ex: "39-140-135..."
        
        const res = await axios.get(`${BASE_URL}/fixtures`, {
            headers: { 'x-apisports-key': API_KEY },
            params: { live: leaguesStr }
        });

        const liveMatches = res.data.response || [];
        if (liveMatches.length > 0) {
            for (const m of liveMatches) {
                const savedMatch = await updateOrInsertFixture(Fixture, m);
                
                // Trimitem scorul live instantaneu către Frontend (dacă utilizatorul are aplicația deschisă)
                if (io) {
                    io.emit("live_match_update", savedMatch);
                }
            }
        }
    } catch (err) {
        console.log(`[LIVE SYNC] Eroare interogare live:`, err.message);
    }
}

// Funcție internă care salvează meciul în Baza de Date
async function updateOrInsertFixture(FixtureModel, m) {
    const matchData = {
        fixture_id: m.fixture.id,
        date: m.fixture.date,
        timestamp: m.fixture.timestamp,
        league_id: m.league.id,
        league_name: m.league.name,
        league_logo: m.league.logo,
        home_team_id: m.teams.home.id,
        home_team_name: m.teams.home.name,
        home_team_logo: m.teams.home.logo,
        away_team_id: m.teams.away.id,
        away_team_name: m.teams.away.name,
        away_team_logo: m.teams.away.logo,
        home_goals: m.goals.home,
        away_goals: m.goals.away,
        status_short: m.fixture.status.short, // (NS = Neînceput, FT = Terminat, 1H/2H = Live)
        elapsed: m.fixture.status.elapsed     // Minutul meciului
    };

    return await FixtureModel.findOneAndUpdate(
        { fixture_id: m.fixture.id },
        { $set: matchData },
        { upsert: true, new: true } // Dacă nu există îl creează, dacă există îl actualizează
    );
}

module.exports = { sync7DaysWindow, syncLiveMatches };