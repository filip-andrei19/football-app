const Joi = require('joi');
const { objectId } = require('./customSchemes');

const createMatchSchema = Joi.object({
    competition_id: objectId.required(),
    match_date: Joi.date().iso().required(), // ISO 8601 date format
    
    home_team: Joi.object({
        team_id: objectId.required(),
        name: Joi.string().required(),
        score: Joi.number().integer().min(0).default(0)
    }).required(),

    away_team: Joi.object({
        team_id: objectId.required(),
        name: Joi.string().required(),
        score: Joi.number().integer().min(0).default(0)
    }).required(),

    // Array de statistici (cine a dat gol, cartonașe)
    player_stats: Joi.array().items(
        Joi.object({
            player_id: objectId.required(),
            minutes_played: Joi.number().max(130),
            goals: Joi.number().min(0),
            assists: Joi.number().min(0),
            yellow_cards: Joi.number().min(0).max(2),
            red_cards: Joi.number().min(0).max(1),
            is_starter: Joi.boolean()
        })
    ).optional()
});

module.exports = { createMatchSchema };