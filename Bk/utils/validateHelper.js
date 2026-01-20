const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    // Validăm req.body implicit. 
    // Poți extinde să valideze și req.params sau req.query dacă e nevoie.
    const { error } = schema.validate(req.body, {
      abortEarly: false, // Returnează toate erorile, nu doar prima găsită
      allowUnknown: true, // Permite câmpuri extra (dacă nu e setat strict în schemă)
      stripUnknown: true // Elimină câmpurile care nu sunt în schemă (pentru siguranță)
    });

    if (error) {
      // Formatează mesajul de eroare într-un singur string
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      return res.status(400).json({ error: errorMessage });
    }

    next();
  };
};

module.exports = validate;