const mongoose = require('mongoose'); // <--- ACEASTĂ LINIE LIPSEȘTE

const adSchema = new mongoose.Schema({
  title: String,
  content: String,
  active: { type: Boolean, default: true },
  start_date: Date,
  end_date: Date,
  price_paid: Number,
  // User-ul care a creat reclama
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Ad', adSchema);