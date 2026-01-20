const mongoose = require('mongoose');

// 1. Schema pentru JUCĂTORI (Players)
const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nationality: String,
  age: Number,
  height_cm: String,
  weight_kg: String,
  position: String,
  
  // --- MODIFICARE 1: Redenumit în 'team' pentru populate() ---
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }, 
  // ----------------------------------------------------------
  
  team_name: String, 
  
  // Array pentru istoricul carierei
  career_history: [{
    team_name: String,
    start_date: Date,
    end_date: Date,
    active: Boolean
  }],

  // Obiect pentru statistici
  statistics_summary: {
    total_appearances: { type: Number, default: 0 },
    total_goals: { type: Number, default: 0 },
    total_assists: { type: Number, default: 0 }
  },

  api_player_id: { type: Number, unique: true } 
});

// 2. Schema pentru ECHIPE (Teams)
const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo_url: String,
  league: String,
  api_team_id: { type: Number, unique: true }
});

// --- MODIFICARE 2: Protecție pentru a nu compila modelul de două ori ---
const Player = mongoose.models.Player || mongoose.model('Player', playerSchema);
const Team = mongoose.models.Team || mongoose.model('Team', teamSchema);

module.exports = { Player, Team };