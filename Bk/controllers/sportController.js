const sportService = require('../services/sportService');

// Helper pentru request-uri
const handleRequest = async (res, serviceFunction, ...args) => {
  try {
    const result = await serviceFunction(...args);
    if (!result) return res.status(404).json({ error: "Not Found" }); // Verificare extra
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// --- PLAYERS ---
exports.addPlayer = async (req, res) => {
  const data = { ...req.body, team: req.body.teamId };
  await handleRequest(res, sportService.createPlayer, data);
};
exports.getPlayers = async (req, res) => await handleRequest(res, sportService.getAllPlayers);
// ADAUGĂ ASTA:
exports.getPlayerById = async (req, res) => await handleRequest(res, sportService.getPlayerById, req.params.id);

// --- TEAMS ---
exports.addTeam = async (req, res) => await handleRequest(res, sportService.createTeam, req.body);
exports.getTeams = async (req, res) => await handleRequest(res, sportService.getAllTeams);
// ADAUGĂ ASTA:
exports.getTeamById = async (req, res) => await handleRequest(res, sportService.getTeamById, req.params.id);

// --- COMPETITIONS ---
exports.addCompetition = async (req, res) => await handleRequest(res, sportService.createCompetition, req.body);
exports.getCompetitions = async (req, res) => await handleRequest(res, sportService.getAllCompetitions);

// --- COACHES ---
exports.addCoach = async (req, res) => await handleRequest(res, sportService.createCoach, req.body);
exports.getCoaches = async (req, res) => await handleRequest(res, sportService.getAllCoaches);

// --- MATCHES ---
exports.addMatch = async (req, res) => await handleRequest(res, sportService.createMatch, req.body);
exports.getMatches = async (req, res) => await handleRequest(res, sportService.getAllMatches);