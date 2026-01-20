const Joi = require('joi');

const createCoachSchema = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    nationality: Joi.string().required(),
    birth_year: Joi.number().integer().min(1940).max(new Date().getFullYear() - 18).required(), // Minim 18 ani
    bio: Joi.string().max(1000).allow('').optional(),
    photo_url: Joi.string().uri().allow('').optional()
});

const updateCoachSchema = Joi.object({
    name: Joi.string().min(3),
    nationality: Joi.string(),
    birth_year: Joi.number().integer(),
    bio: Joi.string().max(1000),
    photo_url: Joi.string().uri()
}).min(1);

module.exports = { createCoachSchema, updateCoachSchema };