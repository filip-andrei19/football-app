const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  position: String,
  age: Number,
  nationality: String,
  image: String,

  // --- SOLUȚIA PENTRU ECHIPĂ ---
  // Definim simplu, exact ce ai în poză
  team_name: String, 
  current_team_id: mongoose.Schema.Types.ObjectId, // Păstrăm ID-ul, dar fără ref complicat momentan

  // --- SOLUȚIA PENTRU GOLURI (WILDCARD) ---
  // "Mixed" îi spune lui Mongoose: "Nu valida nimic, ia tot ce găsești aici!"
  statistics_summary: { type: mongoose.Schema.Types.Mixed },

  api_player_id: Number
}, { strict: false }); // Permitem orice alte câmpuri extra

module.exports = mongoose.models.Player || mongoose.model('Player', playerSchema);