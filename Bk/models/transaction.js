const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
  
  // Cine a plătit
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Ce plan a cumpărat
  plan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Pricing' }
});

module.exports = mongoose.model('Transaction', transactionSchema);