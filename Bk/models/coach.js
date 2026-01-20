const mongoose = require('mongoose');

const coachSchema = new mongoose.Schema({
  name: String,
  bio: String,
  nationality: String,
  birth_year: Number,
  photo_url: String
});

module.exports = mongoose.model('Coach', coachSchema);