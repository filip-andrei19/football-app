const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  short_name: String,
  league: String,
  country: String,
  founded_year: Number,
  stadium: String,
  website: String,
  // Relație către Coach
  coach_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach' },
  // Opțional: embedded object
  current_coach: { 
    name: String, 
    nationality: String 
  }
});

module.exports = mongoose.models.Team || mongoose.model('Team', teamSchema);