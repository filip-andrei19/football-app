const mongoose = require('mongoose');

const xiPlayerSchema = new mongoose.Schema({
    id: { type: String },
    dbId: { type: String },
    name: { type: String, required: true },
    gridRow: { type: Number, required: true }
});

const startingXISchema = new mongoose.Schema({
    teamName: { type: String, required: true },
    opponent: { type: String, required: true },
    date: { type: String, required: true },
    score: { type: String, required: true },
    formation: { type: String, required: true, default: '4-3-3' },
    players: [xiPlayerSchema]
}, { timestamps: true });

module.exports = mongoose.model('StartingXI', startingXISchema);