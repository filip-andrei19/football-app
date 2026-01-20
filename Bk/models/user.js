const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { // Revenim la 'name'
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: { // Revenim la 'password'
    type: String,
    required: true
  }
});

// Fix pentru eroarea de "Overwrite"
module.exports = mongoose.models.User || mongoose.model('User', userSchema);