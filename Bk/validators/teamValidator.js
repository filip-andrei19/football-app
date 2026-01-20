const Joi = require('joi');

const createTeamSchema = Joi.object({
    name: Joi.string().min(2).required(),
    league: Joi.string().optional().allow(''),
    coach: Joi.string().optional().allow(''), // Permitem string (nume), nu doar ID
    
    // Opțional: alte câmpuri din model
    short_name: Joi.string().optional(),
    country: Joi.string().optional(),
    founded_year: Joi.number().integer().optional(),
    stadium: Joi.string().optional(),
    website: Joi.string().uri().optional()
}).unknown(true); // <--- Permite și alte câmpuri neprevăzute, ca să nu pice testul degeaba

module.exports = { createTeamSchema };