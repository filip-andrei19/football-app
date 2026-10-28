const sportService = require('../services/sportService');
const smartSync = require('../services/smartSync'); // Adăugat pentru sincronizarea bazei de date

// Helper pentru request-uri
const handleRequest = async (res, serviceFunction, ...args) => {
  try {
    const result = await serviceFunction(...args);
    if (!result) return res.status(404).json({ error: "Not Found" });
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

exports.getPlayers = async (req, res) => await handleRequest(res, sportService.getAllPlayers, req.query);

exports.getPlayerById = async (req, res) => await handleRequest(res, sportService.getPlayerById, req.params.id);

// --- TEAMS ---
exports.addTeam = async (req, res) => await handleRequest(res, sportService.createTeam, req.body);
exports.getTeams = async (req, res) => await handleRequest(res, sportService.getAllTeams);
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

// --- NOU: TRIGGER SMART SYNC PENTRU POPULAREA BAZEI DE DATE ---
exports.triggerSmartSync = async (req, res) => {
  try {
    // Pornește procesul în fundal ca să nu blocheze browserul
    smartSync.runDailySmartSync().catch(err => console.error("Eroare Sync:", err));
    
    res.status(200).json({ 
      message: "Sincronizarea bazei de date a început! Verifică terminalul de la backend pentru progres." 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};