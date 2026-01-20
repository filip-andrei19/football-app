const Joi = require('joi');

const createAdSchema = Joi.object({
    // User ID-ul vine de obicei din token, dar dacă îl trimiți din body, îl poți valida:
    // user_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),

    title: Joi.string().min(5).max(100).required(),
    content: Joi.string().min(10).max(1000).required(),
    
    // Validare date calendaristice
    start_date: Joi.date().iso().required(),
    end_date: Joi.date().iso().greater(Joi.ref('start_date')).required()
        .messages({ 'date.greater': 'Data de final trebuie să fie după data de început!' }),
    
    price_paid: Joi.number().min(0).required(),
    active: Joi.boolean().default(true)
});

// Schema pentru update (toate opționale)
const updateAdSchema = Joi.object({
    title: Joi.string().min(5),
    content: Joi.string().min(10),
    start_date: Joi.date().iso(),
    end_date: Joi.date().iso().greater(Joi.ref('start_date')),
    price_paid: Joi.number().min(0),
    active: Joi.boolean()
}).min(1);

module.exports = { createAdSchema, updateAdSchema };