const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    score: { type: Number, required: true, default: 0 },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Leaderboard', leaderboardSchema);