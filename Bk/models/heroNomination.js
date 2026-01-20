// models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nume: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  parola: { type: String, required: true }, // Notă: În producție parolele se criptează, dar pentru proiect didactic e ok așa
  bio: { type: String, default: "" },
  dataInregistrare: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);