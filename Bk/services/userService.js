// Nu mai avem nevoie de User, jwt sau bcrypt aici
// Ele sunt gestionate acum în Controller și Model
const Favorite = require('../models/favorite');
const Ad = require('../models/ad');

// --- NOTĂ: ---
// Funcțiile 'register' și 'login' au fost eliminate de aici.
// Ele sunt implementate acum direct în 'userController.js' pentru securitate maximă.

// ==========================================
// 1. FAVORITES LOGIC
// ==========================================

const addFavorite = async (userId, type, entityId) => {
  // Construim obiectul de date
  const favData = { 
    user_id: userId, 
    type 
  };

  // Verificăm tipul și asignăm ID-ul corect
  if (type === 'player') {
    favData.player_id = entityId;
  } else if (type === 'team') {
    favData.team_id = entityId;
  } else {
    throw new Error('Invalid type (must be player or team)');
  }
  
  // Verificăm dacă există deja (Opțional, dar recomandat)
  const existing = await Favorite.findOne(favData);
  if (existing) {
    throw new Error('Acest element este deja la favorite!');
  }

  return await Favorite.create(favData);
};

const getUserFavorites = async (userId) => {
  return await Favorite.find({ user_id: userId })
    .populate('player_id') // Va aduce detaliile jucătorului
    .populate('team_id');  // Va aduce detaliile echipei
};

// ==========================================
// 2. ADS LOGIC
// ==========================================

const createAd = async (userId, adData) => {
  // Adăugăm ID-ul utilizatorului care a creat anunțul
  return await Ad.create({ 
    ...adData, 
    user_id: userId 
  });
};

const getAllAds = async () => {
  // Returnăm anunțurile și populăm numele userului care a postat
  return await Ad.find().populate('user_id', 'name email'); 
};

// Exportăm doar ce a rămas
module.exports = { 
  addFavorite, 
  getUserFavorites, 
  createAd, 
  getAllAds 
};