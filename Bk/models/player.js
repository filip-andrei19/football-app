const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    api_id: { type: Number, unique: true, sparse: true },
    name: { type: String, required: true },
    firstname: String,
    lastname: String,
    age: Number,
    nationality: { type: String, default: "Romania" },
    position: String,
    height: String,
    weight: String,
    birth_date: String,
    birth_place: String,
    team: String,
    team_name: String,
    team_logo: String,
    league_id: Number,
    image: String,
    statistics_summary: {
        team_name: String,
        total_appearances: { type: Number, default: 0 },
        total_goals: { type: Number, default: 0 },
        total_assists: { type: Number, default: 0 },
        minutes_played: { type: Number, default: 0 },
        rating: { type: String, default: null }
    },
    updatedAt: { type: Date, default: Date.now }
}, {
    strict: false // Esențial: împiedică Mongoose să șteargă pe ascuns orice câmp salvat
});

module.exports = mongoose.models.Player || mongoose.model('Player', playerSchema);