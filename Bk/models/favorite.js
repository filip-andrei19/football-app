const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['player', 'team'], required: true },
  
  // Referințe dinamice (unul dintre ele va fi completat)
  player_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  team_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }, // <-- Asigură-te că ai adăugat asta!
  
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Favorite', favoriteSchema);