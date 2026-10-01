const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    api_id: { type: Number, unique: true, sparse: true },
    name: { type: String, required: true },
    firstname: String,
    lastname: String,
    age: Number,
    position: String,
    team: String,
    team_logo: String,
    image: String,
    statistics_summary: {
        total_appearances: { type: Number, default: 0 },
        total_goals: { type: Number, default: 0 },
        total_assists: { type: Number, default: 0 }
    },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Player', playerSchema);