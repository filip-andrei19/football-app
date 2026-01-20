const Joi = require('joi');
const { objectId } = require('./customSchemes');

const createTransactionSchema = Joi.object({
    // ID-ul planului de preț (Pricing) cumpărat
    plan_id: objectId.required(),
    
    // Suma plătită (trebuie să fie număr pozitiv, minim 0.01)
    amount: Joi.number().min(0.01).required(),
    
    // Data poate fi opțională (se pune automat created_at), 
    // dar dacă o trimiți, trebuie să fie validă.
    created_at: Joi.date().iso().optional()
});

module.exports = { createTransactionSchema };