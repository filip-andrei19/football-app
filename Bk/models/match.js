const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  match_date: { type: Date, required: true },
  competition_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition' }, // Presupunând că faci și modelul Competition
  
  // Echipele (Embedded Objects conform diagramei pentru acces rapid la nume/scor)
  home_team: {
    team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    name: String,
    score: Number
  },
  away_team: {
    team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    name: String,
    score: Number
  },

  // Statistici detaliate per jucător în acest meci
  player_stats: [{
    player_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    player_name: String,
    team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    minutes_played: Number,
    goals: Number,
    assists: Number,
    yellow_cards: Number,
    red_cards: Number,
    is_starter: Boolean
  }]
});

module.exports = mongoose.model('Match', matchSchema);