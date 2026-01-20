const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../validators/validateHelper');

// --- Importăm schemele de validare ---
// Asigură-te că fișierele există în folderul ../validators/
const { 
  registerSchema, 
  loginSchema, 
  updateUserSchema 
} = require('../validators/userValidator'); 

const { addFavoriteSchema } = require('../validators/favoriteValidator');
const { createAdSchema } = require('../validators/adValidator');

// --- Importăm Controllerul ---
const userController = require('../controllers/userController');

// ==================================================
// 1. ZONA AUTH (Autentificare)
// ==================================================

// POST /api/users/register - Înregistrare cont nou
router.post('/register', validate(registerSchema), userController.register);

// POST /api/users/login - Logare în cont existent
router.post('/login', validate(loginSchema), userController.login);

// ==================================================
// 2. ZONA PROFIL (Date utilizator curent)
// ==================================================

// GET /api/users/profile - Vezi datele tale (trebuie token)
router.get('/profile', auth, userController.getMe);

// PATCH /api/users/profile - Actualizează datele (trebuie token + validare)
router.patch('/profile', auth, validate(updateUserSchema), userController.updateProfile);

// ==================================================
// 3. ZONA FAVORITES (Jucători favoriți)
// ==================================================

// POST /api/users/favorites - Adaugă un jucător la favorite
router.post('/favorites', auth, validate(addFavoriteSchema), userController.addFavorite);

// GET /api/users/favorites - Vezi lista ta de favorite
router.get('/favorites', auth, userController.getUserFavorites);

// ==================================================
// 4. ZONA ADS (Anunțuri / Vânzări tricouri etc.)
// ==================================================

// POST /api/users/ads - Creează un anunț (doar useri logați)
router.post('/ads', auth, validate(createAdSchema), userController.createAd);

// GET /api/users/ads - Vezi toate anunțurile (Public)
router.get('/ads', userController.getAllAds); 

module.exports = router;