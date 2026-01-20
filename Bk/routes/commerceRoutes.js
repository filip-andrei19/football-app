const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../validators/validateHelper');

// --- Import Validatoare ---
const { createServiceSchema } = require('../validators/serviceValidator');
const { createPricingSchema } = require('../validators/pricingValidator');
const { createTransactionSchema } = require('../validators/transactionValidator');

// --- IMPORT CONTROLLER (AICI ERA PROBLEMA) ---
// Importăm un singur controller unificat
const commerceController = require('../controllers/commerceController'); 

// --- 9. SERVICES ---
router.post('/services', auth, validate(createServiceSchema), commerceController.createService);
router.get('/services', commerceController.getAllServices);

// --- 10. PRICING ---
router.post('/pricing', auth, validate(createPricingSchema), commerceController.createPricing);
router.get('/pricing', commerceController.getAllPricing); 

// --- 11. TRANSACTIONS ---
router.post('/transactions', auth, validate(createTransactionSchema), commerceController.createTransaction);
router.get('/transactions/history', auth, commerceController.getUserHistory);

module.exports = router;