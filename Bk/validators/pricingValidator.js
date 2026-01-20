const Joi = require('joi');
const { objectId } = require('./customSchemes'); // Asigură-te că ai acest helper

const createPricingSchema = Joi.object({
    // Durata trebuie să fie cel puțin 1 lună
    duration_months: Joi.number().integer().min(1).required(),
    
    // Plățile trebuie să fie pozitive (min 0)
    monthly_payment_usd: Joi.number().min(0).required(),
    payment_total_usd: Joi.number().min(0).required(),
    
    // ID-ul serviciului pe care îl deblochează acest preț
    unlocked_service_id: objectId.required()
});

module.exports = { createPricingSchema };