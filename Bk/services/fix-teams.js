require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const axios = require('axios');
const Player = require('../models/player'); 

const API_KEY = process.env.API_KEY;
const BASE_URL = "https://v3.football.api-sports.io";
const SEASON = 2026;

async function fixPlayersTeams() {
    try {
        console.log("🟡 Ne conectăm la baza de date...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🟢 Conectat!\n");

        // 1. Căutăm toți jucătorii care au cifre (ex: "140", "39") salvate la numele echipei
        const badPlayers = await Player.find({ 
            $or: [
                { team: { $regex: /^\d+$/ } },
                { team_name: { $regex: /^\d+$/ } }
            ] 
        });
        
        if (badPlayers.length === 0) {
            console.log("✅ Nu s-au găsit jucători asociați greșit la numere!");
            process.exit(0);
        }

        // 2. Extragem ID-urile ligilor afectate (ex: extrage 140 pentru La Liga)
        const badLeagueIds = [...new Set(badPlayers.map(p => parseInt(p.team_name || p.team)))];
        console.log(`🔍 S-au găsit ${badPlayers.length} jucători afectați. Se vor repara ligile cu ID-urile:`, badLeagueIds);

        for (const leagueId of badLeagueIds) {
            console.log(`\n🏆 Descarc cluburile oficiale pentru liga cu ID-ul ${leagueId}...`);
            
            const teamsRes = await axios.get(`${BASE_URL}/teams?league=${leagueId}&season=${SEASON}`, {
                headers: { 'x-apisports-key': API_KEY }
            });

            const teams = teamsRes.data?.response || [];
            console.log(`✅ Am găsit ${teams.length} cluburi. Încep alocarea jucătorilor...\n`);

            for (const t of teams) {
                const teamId = t.team.id;
                const teamName = t.team.name;
                const teamLogo = t.team.logo;

                console.log(`   📡 Caut lotul pentru: ${teamName}...`);
                const squadRes = await axios.get(`${BASE_URL}/players/squads?team=${teamId}`, {
                    headers: { 'x-apisports-key': API_KEY }
                });

                const playersList = squadRes.data?.response?.[0]?.players || [];
                if (playersList.length > 0) {
                    const apiIds = playersList.map(p => p.id);
                    
                    // 3. Mutăm toți jucătorii la clubul lor real printr-o singură comandă
                    const updateResult = await Player.updateMany(
                        { api_id: { $in: apiIds } },
                        { 
                            $set: { 
                                team: teamName, 
                                team_name: teamName, 
                                team_logo: teamLogo,
                                league_id: leagueId,
                                "statistics_summary.team": teamName,
                                "statistics_summary.team_name": teamName
                            } 
                        }
                    );
                    
                    if (updateResult.modifiedCount > 0) {
                        console.log(`      ✅ ${updateResult.modifiedCount} jucători au fost readuși cu succes la ${teamName}!`);
                    }
                }

                // Pauză de 2 secunde pentru a proteja limita API-Sports
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.log("\n🎉 REPARARE COMPLETĂ! Toți jucătorii sunt acum asociați la cluburile lor reale!");
    } catch (error) {
        console.error("🔴 Eroare:", error.message);
    } finally {
        mongoose.disconnect();
        process.exit(0);
    }
}

fixPlayersTeams();