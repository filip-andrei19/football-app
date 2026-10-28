const { Player, Team } = require('../models/models'); // Verifică să imporți corect modelul

// --- PLAYERS ---
const createPlayer = async (data) => await Player.create(data);

// --- MODIFICARE AICI ---
const getAllPlayers = async (query = {}) => {
  // 1. Preluăm page și limit din query (cu valori default de siguranță)
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 250; 
  const skip = (page - 1) * limit;

  // 2. Construim filtrul dinamic
  let filter = {};
  
  if (query.diaspora === 'true') {
      // Ajustează acest câmp dacă folosești altă structură în DB pentru stranieri 
      // (ex: { 'league_id': { $nin: [283, 284] } } pentru ligi externe)
      filter.diaspora = true; 
  }
  
  if (query.u21 === 'true') {
      filter.age = { $lte: 21 }; // Filtru pentru Future Stars
  }
  
  if (query.search) {
      // Căutare case-insensitive după nume (pentru HomeSection)
      filter.name = { $regex: query.search, $options: 'i' }; 
  }

  // 3. Interogăm baza de date cu filtru, sortare și paginare
  return await Player.find(filter)
    .sort({ _id: -1 }) // Ordonăm descrescător după ID pentru o paginare stabilă
    .skip(skip)
    .limit(limit); 
};

// --- TEAMS & ALTELE ---
const createTeam = async (data) => await Team.create(data);
const getAllTeams = async () => await Team.find();

const createCompetition = async (data) => await Competition.create(data);
const getAllCompetitions = async () => await Competition.find();

const createCoach = async (data) => await Coach.create(data);
const getAllCoaches = async () => await Coach.find();

const createMatch = async (data) => await Match.create(data);
const getAllMatches = async () => await Match.find();

module.exports = {
  createPlayer, getAllPlayers,
  createTeam, getAllTeams,
  createCompetition, getAllCompetitions,
  createCoach, getAllCoaches,
  createMatch, getAllMatches
};