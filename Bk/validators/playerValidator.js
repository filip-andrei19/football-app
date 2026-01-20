const Joi = require('joi');
const { objectId } = require('./customSchemes');

const createPlayerSchema = Joi.object({
    name: Joi.string().min(2).required(),
    nationality: Joi.string().required(),
    position: Joi.string().valid('Goalkeeper', 'Defender', 'Midfielder', 'Forward').required(),
    age: Joi.number().integer().min(15).max(50).required(),
    height_cm: Joi.number().integer().min(100).max(250).required(),
    weight_kg: Joi.number().integer().min(30).max(150).required(),
    
    current_team_id: objectId.required(), // Folosim helper-ul creat
    
    // Validare array de obiecte (career_history)
    career_history: Joi.array().items(
        Joi.object({
            team_name: Joi.string().required(),
            start_date: Joi.date().required(),
            end_date: Joi.date().allow(null), // Poate fi null dacă încă joacă
            team_id: objectId.optional()
        })
    ).optional(),

    bio: Joi.string().max(500).allow(''),
    profile_image: Joi.string().uri().allow('')
});

const updatePlayerSchema = Joi.object({
    name: Joi.string().min(2),
    current_team_id: objectId,
    height_cm: Joi.number(),
    weight_kg: Joi.number(),
    // ... restul câmpurilor opționale
}).min(1);

module.exports = { createPlayerSchema, updatePlayerSchema };