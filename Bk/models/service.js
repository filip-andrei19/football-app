const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true }, // ex: "Gold Package"
  extended_details: { type: Boolean, default: false },
  hidden_ads: { type: Boolean, default: false },
  notifications: { type: Boolean, default: false },
  personalized_watch: { type: Boolean, default: false },
  premium_badge: { type: Boolean, default: false }
});

module.exports = mongoose.model('Service', serviceSchema);