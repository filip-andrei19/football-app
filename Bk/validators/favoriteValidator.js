const Joi = require('joi');
const { objectId } = require('./customSchemes');

const addFavoriteSchema = Joi.object({
    // Câmpul 'type' din diagramă
    type: Joi.string().valid('player').required(), 
    
    // Câmpul 'player_id' din diagramă
    player_id: objectId.required()
    
    // NOTĂ: Am eliminat 'team_id' sau 'entity_id' pentru că NU apar în poză.
});

module.exports = { addFavoriteSchema };