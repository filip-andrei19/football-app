const { Player, Team } = require('../models/models'); // SAU require('../models/player') depinde cum ai fișierele
// Verifică să imporți corect modelul Player definit mai sus!
// Dacă ai fișiere separate, folosește: const Player = require('../models/player');

// --- PLAYERS ---
const createPlayer = async (data) => await Player.create(data);

// --- MODIFICARE AICI ---
// Am scos .populate('team'). Luăm datele "raw", exact cum sunt în MongoDB.
const getAllPlayers = async () => {
  return await Player.find(); 
};

// ... Restul funcțiilor rămân la fel ...
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