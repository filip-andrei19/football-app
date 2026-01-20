const commerceService = require('../services/commerceService');

// --- SERVICES ---
exports.createService = async (req, res) => {
  try {
    const result = await commerceService.createService(req.body);
    res.status(201).json(result);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getAllServices = async (req, res) => {
  try {
    const result = await commerceService.getAllServices();
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- PRICING ---
exports.createPricing = async (req, res) => {
  try {
    const result = await commerceService.createPricing(req.body);
    res.status(201).json(result);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getAllPricing = async (req, res) => {
  try {
    const result = await commerceService.getAllPricing();
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- TRANSACTIONS ---
exports.createTransaction = async (req, res) => {
  try {
    const { amount, plan_id } = req.body;
    const result = await commerceService.createTransaction(req.user.id, amount, plan_id);
    res.status(201).json(result);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getUserHistory = async (req, res) => {
  try {
    const result = await commerceService.getUserHistory(req.user.id);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
};