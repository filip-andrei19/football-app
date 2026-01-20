const Joi = require('joi');

// Schema pentru CREARE (Register)
const registerSchema = Joi.object({
    // MODIFICAT: 'name' în loc de 'username'
    name: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    // NOU: passwordConfirm este obligatoriu și trebuie să fie egal cu password
    passwordConfirm: Joi.ref('password'), 
    role: Joi.string().valid('user', 'admin', 'coach').default('user')
});

// NOU: Schema pentru LOGIN (lipsea înainte)
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

// Schema pentru UPDATE
const updateUserSchema = Joi.object({
    // MODIFICAT: 'name' în loc de 'username'
    name: Joi.string().min(3),
    email: Joi.string().email(),
    role: Joi.string().valid('user', 'admin', 'coach')
}).min(1);

module.exports = { registerSchema, loginSchema, updateUserSchema };