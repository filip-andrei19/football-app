const Joi = require('joi');

const createServiceSchema = Joi.object({
    name: Joi.string().required(), // Ex: "Premium Stats Pack"
    
    // Feature flags (boolene)
    extended_details: Joi.boolean().default(false),
    hidden_ads: Joi.boolean().default(false),
    premium_badge: Joi.boolean().default(false),
    notifications: Joi.boolean().default(true),
    
    // "personalized_wat..." din poză - presupun că e personalized_watch sau content
    personalized_content: Joi.boolean().default(false)
});

const updateServiceSchema = Joi.object({
    name: Joi.string(),
    extended_details: Joi.boolean(),
    hidden_ads: Joi.boolean(),
    premium_badge: Joi.boolean(),
    notifications: Joi.boolean()
}).min(1);

module.exports = { createServiceSchema, updateServiceSchema };