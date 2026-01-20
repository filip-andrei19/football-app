const Joi = require('joi');

// Validare pentru ID de MongoDB (24 caractere hex)
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).message('ID-ul furnizat nu este valid.');

module.exports = { objectId };