// Importăm corect modelele din fișierele lor specifice
const Player = require('../models/player');
const Team = require('../models/team');
const Competition = require('../models/competition');
const Coach = require('../models/coach');
const Match = require('../models/match');

// Importăm noile modele pentru jocuri (asigură-te că creezi aceste fișiere în folderul models)
const StartingXI = require('../models/StartingXI');
const Leaderboard = require('../models/Leaderboard');

// --- PLAYERS ---
const createPlayer = async (data) => await Player.create(data);

const getAllPlayers = async (query = {}) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 250; 
  const skip = (page - 1) * limit;

  let filter = {};

  // 1. Filtru dinamic pentru Diaspora
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

const getPlayerById = async (id) => await Player.findById(id);

// --- TEAMS & ALTELE ---
const createTeam = async (data) => await Team.create(data);
const getAllTeams = async () => await Team.find();

const getTeamById = async (id) => await Team.findById(id);

const createCompetition = async (data) => await Competition.create(data);
const getAllCompetitions = async () => await Competition.find();

const createCoach = async (data) => await Coach.create(data);
const getAllCoaches = async () => await Coach.find();

const createMatch = async (data) => await Match.create(data);
const getAllMatches = async () => await Match.find();

// ==========================================================
// --- NOU: STARTING XI (PRIMUL 11) ---
// ==========================================================
const createStartingXI = async (data) => await StartingXI.create(data);
const getAllStartingXIs = async () => await StartingXI.find().sort({ _id: -1 }); // Cele mai noi meciuri primele
const deleteStartingXI = async (id) => await StartingXI.findByIdAndDelete(id);

// ==========================================================
// --- NOU: LEADERBOARD HI-LO ---
// ==========================================================
const createLeaderboardEntry = async (data) => {
    // Verificăm dacă numele există deja pentru a actualiza scorul
    const existingEntry = await Leaderboard.findOne({ name: { $regex: new RegExp(`^${data.name}$`, 'i') } });
    
    if (existingEntry) {
        if (data.score > existingEntry.score) {
            existingEntry.score = data.score;
            existingEntry.date = new Date();
            return await existingEntry.save();
        }
        return existingEntry;
    }
    
    return await Leaderboard.create(data);
};

const getLeaderboard = async () => {
    // Returnăm primele 50 de rezultate, sortate descrescător după scor
    return await Leaderboard.find().sort({ score: -1 }).limit(50);
};

module.exports = {
  createPlayer, getAllPlayers, getPlayerById,
  createTeam, getAllTeams, getTeamById,
  createCompetition, getAllCompetitions,
  createCoach, getAllCoaches,
  createMatch, getAllMatches,
  createStartingXI, getAllStartingXIs, deleteStartingXI,
  createLeaderboardEntry, getLeaderboard
};