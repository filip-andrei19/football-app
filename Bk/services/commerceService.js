const ServiceModel = require('../models/service');
const Pricing = require('../models/pricing');
const Transaction = require('../models/transaction');

// --- SERVICES (CATALOG) ---
const createService = async (data) => await ServiceModel.create(data);
const getAllServices = async () => await ServiceModel.find();

// --- PRICING ---
const createPricing = async (data) => await Pricing.create(data);
const getAllPricing = async () => await Pricing.find().populate('unlocked_service_id');

// --- TRANSACTIONS ---
const createTransaction = async (userId, amount, planId) => {
  // 1. Înregistrăm tranzacția
  const transaction = await Transaction.create({
    user_id: userId,
    amount,
    plan_id: planId
  });

  // 2. Aici ai adăuga logica pentru a debloca serviciul userului
  // Ex: const plan = await Pricing.findById(planId);
  // await User.findByIdAndUpdate(userId, { premiumUntil: calculateNewDate(...) });

  return transaction;
};

const getUserHistory = async (userId) => {
  return await Transaction.find({ user_id: userId }).populate('plan_id');
};

module.exports = { 
  createService, getAllServices, 
  createPricing, getAllPricing, 
  createTransaction, getUserHistory 
};