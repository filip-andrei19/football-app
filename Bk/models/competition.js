const mongoose = require('mongoose');

const competitionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  country: String,
  current_season: Number, // ex: 2024
  level: String,          // ex: "First Division"
  logo_url: String
});

module.exports = mongoose.model('Competition', competitionSchema);