const axios = require('axios');
const Player = require('../models/player');

// --- CONFIGURARE ---
const API_KEY = process.env.API_KEY; // Token-ul de la Sportmonks

// Sportmonks V3 Base URL
const BASE_URL = "https://api.sportmonks.com/v3/football";

// Numele ligii exact cum apare în Sportmonks (Trebuie să căutăm ID-ul dinamic)
const TARGET_LEAGUE_NAME = "SuperLiga"; 

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const hardResetAndLoad = async () => {
    console.log(`☢️  [HARD RESET - SPORTMONKS] Inițiez procedura...`);

    // 1. Verificăm Conexiunea (Căutăm Liga ca test)
    let leagueId = null;
    let currentSeasonId = null;

    try {
        console.log("🔍 Caut Liga 'SuperLiga' în Sportmonks...");
        const searchRes = await axios.get(`${BASE_URL}/leagues/search/${TARGET_LEAGUE_NAME}`, {
            headers: { 'Authorization': API_KEY }
        });

        // Găsim liga din România
        const league = searchRes.data.data.find(l => l.country && l.country.name === "Romania");
        
        if (!league) {
            console.error("❌ Nu am găsit SuperLiga (Romania). Verifică numele sau abonamentul.");
            return;
        }

        leagueId = league.id;
        console.log(`✅ Liga găsită: ${league.name} (ID: ${leagueId})`);

        // Găsim sezonul curent (Sportmonks folosește ID-uri, nu ani)
        // Trebuie să luăm sezoanele ligii
        const seasonsRes = await axios.get(`${BASE_URL}/leagues/${leagueId}`, {
            headers: { 'Authorization': API_KEY },
            params: { include: 'currentSeason' }
        });
        
        const currentSeason = seasonsRes.data.data.currentSeason;
        if (!currentSeason) {
            console.error("❌ Nu am găsit un sezon activ pentru această ligă.");
            return;
        }
        currentSeasonId = currentSeason.id;
        console.log(`📅 Sezon Curent ID: ${currentSeasonId} (${currentSeason.name})`);

    } catch (err) {
        console.error("❌ EROARE Conexiune/Auth:", err.message);
        if(err.response) console.error("Detalii:", err.response.data);
        return;
    }

    // 2. ȘTERGEM TOT (Dacă am ajuns aici, conexiunea e bună)
    console.log("🗑️  Șterg toți jucătorii din baza de date...");
    await Player.deleteMany({});
    console.log("✅ Baza de date este goală.");

    // 3. Începem încărcarea ECHIPELOR din sezonul curent
    try {
        console.log(`🌍 Descarc echipele pentru Sezonul ID ${currentSeasonId}...`);
        
        // Endpoint Sportmonks: /teams/seasons/{ID}
        const teamsRes = await axios.get(`${BASE_URL}/teams/seasons/${currentSeasonId}`, {
            headers: { 'Authorization': API_KEY }
        });

        const teams = teamsRes.data.data;
        if (!teams || teams.length === 0) {
            console.log("⚠️ Nu am găsit echipe. Posibil limitare plan free.");
            return;
        }

        console.log(`✅ Găsite ${teams.length} echipe. Încep descărcarea jucătorilor...`);

        // 4. Luăm SQUAD-ul (Lotul) pentru fiecare echipă
        for (const t of teams) {
            console.log(`   👉 Procesez echipa: ${t.name}`);
            await processTeamSquad(t.id, t.name, currentSeasonId);
            await wait(1500); // Pauză respectuoasă
        }

    } catch (error) {
        console.error(`⚠️ Eroare generală:`, error.message);
    }
    
    console.log("🏁 [HARD RESET] Finalizat!");
};

// Funcție pentru a lua jucătorii (Squads)
const processTeamSquad = async (teamId, teamName, seasonId) => {
    try {
        // Endpoint: /squads/teams/{teamId}/seasons/{seasonId}
        // Include: player (datele lui), position (poziția)
        const res = await axios.get(`${BASE_URL}/squads/teams/${teamId}/seasons/${seasonId}`, {
            headers: { 'Authorization': API_KEY },
            params: { include: 'player;position' }
        });
        
        const squad = res.data.data;
        if (!squad) return;

        for (const item of squad) {
            const p = item.player;
            if (!p) continue;

            // MAPPING SPORTMONKS -> MONGO DB
            // Atenție: Sportmonks are câmpuri diferite (common_name, date_of_birth, etc.)
            
            const newPlayer = new Player({
                name: p.common_name || p.display_name, // Sportmonks: common_name
                age: calculateAge(p.date_of_birth),    // Trebuie calculată
                nationality: p.nationality_id ? "Romania" : "-", // Simplificare (ar trebui alt request pt naționalitate)
                birth_date: p.date_of_birth,
                birth_place: p.birthplace,
                height: p.height ? `${p.height} cm` : "-",
                weight: p.weight ? `${p.weight} kg` : "-",
                
                position: item.position ? item.position.name : "Unknown",
                image: p.image_path, // Sportmonks: image_path
                team_name: teamName,
                
                statistics_summary: {
                    team_name: teamName,
                    // Sportmonks cere request separat pentru statistici detaliate,
                    // punem 0 momentan ca să nu complicăm scriptul cu sute de requesturi extra
                    total_goals: 0, 
                    total_assists: 0,
                    total_appearances: item.matches_played || 0,
                    minutes_played: item.minutes_played || 0,
                    rating: null
                },
                api_player_id: p.id
            });

            await newPlayer.save();
        }
    } catch (err) {
        console.log(`   Eroare la echipa ${teamName}: ${err.message}`);
    }
};

// Funcție ajutătoare pt vârstă
function calculateAge(dateString) {
    if(!dateString) return null;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

module.exports = { hardResetAndLoad };