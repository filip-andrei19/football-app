const { Player, Team } = require('../models/models'); // Verifică să imporți corect modelul

// --- PLAYERS ---
const createPlayer = async (data) => await Player.create(data);

// --- MODIFICARE AICI ---
const getAllPlayers = async (query = {}) => {
  // 1. Preluăm page și limit din query (cu valori default de siguranță)
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 250; 
  const skip = (page - 1) * limit;

  // 2. Interogăm baza de date cu sortare obligatorie pentru o paginare stabilă
  return await Player.find()
    .sort({ _id: -1 }) // Ordonăm descrescător după ID (cei mai noi primii)
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