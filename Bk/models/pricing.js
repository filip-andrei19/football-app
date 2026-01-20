const mongoose = require('mongoose');

const pricingSchema = new mongoose.Schema({
  duration_months: { type: Number, required: true },     // ex: 12 luni
  monthly_payment_usd: { type: Number, required: true }, // ex: 10.00
  payment_total_usd: { type: Number, required: true },   // ex: 120.00
  
  // Relația cu tabela Services (conform diagramei)
  unlocked_service_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true }
});

module.exports = mongoose.model('Pricing', pricingSchema);