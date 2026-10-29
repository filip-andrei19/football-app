// Importăm corect modelele din fișierele lor specifice
const Player = require('../models/player');
const Team = require('../models/team');
const Competition = require('../models/competition');
const Coach = require('../models/coach');
const Match = require('../models/match');

// --- PLAYERS ---
const createPlayer = async (data) => await Player.create(data);

const getAllPlayers = async (query = {}) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 250; 
  const skip = (page - 1) * limit;

  let filter = {};

  // 1. Filtru dinamic pentru Diaspora: români care joacă în afara României (league_id diferit de 283)
  if (query.diaspora === 'true') {
      filter.nationality = { $regex: /romania/i };
      filter.league_id = { $ne: 283 }; 
  }

  // 2. Filtru dinamic pentru Future Stars (U21)
  if (query.u21 === 'true') {
      filter.age = { $lte: 21, $ne: null };
  }

  // 3. Căutare după nume
  if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' }; 
  }

  return await Player.find(filter)
    .sort({ _id: -1 })
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