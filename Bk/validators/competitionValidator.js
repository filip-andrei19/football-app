const Joi = require('joi');

const createCompetitionSchema = Joi.object({
    name: Joi.string().required(), // Ex: Premier League
    country: Joi.string().required(), // Ex: England (sau "International")
    level: Joi.string().valid('1', '2', '3', 'cup', 'friendly').required(), // Nivelul ligii
    current_season: Joi.number().integer().min(2000).max(2100).required(), // Ex: 2024
    logo_url: Joi.string().uri().allow('')
});

const updateCompetitionSchema = Joi.object({
    name: Joi.string(),
    level: Joi.string(),
    current_season: Joi.number().integer(),
    logo_url: Joi.string().uri()
}).min(1);

module.exports = { createCompetitionSchema, updateCompetitionSchema };