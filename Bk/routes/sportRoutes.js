const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../validators/validateHelper');

// Validatoare 
const { createPlayerSchema } = require('../validators/playerValidator');
const { createTeamSchema } = require('../validators/teamValidator');
const { createCompetitionSchema } = require('../validators/competitionValidator');
const { createCoachSchema } = require('../validators/coachValidator');
const { createMatchSchema } = require('../validators/matchValidator');

const sportController = require('../controllers/sportController'); 

// --- RUTE ---
router.post('/players', auth, validate(createPlayerSchema), sportController.addPlayer);
// ❌ OPRITE: Aceste rute blocau filtrele avansate din server.js!
// router.get('/players', sportController.getPlayers);       
// router.get('/players/:id', sportController.getPlayerById); 

// --- NOU: RUTA DE TRIGGER PENTRU POPULARE ---
router.get('/trigger-sync', sportController.triggerSmartSync);

router.post('/teams', auth, validate(createTeamSchema), sportController.addTeam);
// ❌ OPRITE: Aceste rute blocau căutarea echipelor (teams/search) din server.js!
// router.get('/teams', sportController.getTeams);
// router.get('/teams/:id', sportController.getTeamById);

router.post('/competitions', auth, validate(createCompetitionSchema), sportController.addCompetition);
router.get('/competitions', sportController.getCompetitions);

router.post('/coaches', auth, validate(createCoachSchema), sportController.addCoach);
router.get('/coaches', sportController.getCoaches);

router.post('/matches', auth, validate(createMatchSchema), sportController.addMatch);

// ❌ OPRITĂ AICI ERA PROBLEMA: Această rută bloca sistemul de fixtures (meciuri live) din server.js!
// router.get('/matches', sportController.getMatches); 

// --- NOU: RUTE PENTRU STARTING XI (PRIMUL 11) ---
router.post('/starting-xi', sportController.addStartingXI);
router.get('/starting-xi', sportController.getStartingXIs);
router.delete('/starting-xi/:id', sportController.deleteStartingXI);

// --- NOU: RUTE PENTRU LEADERBOARD HI-LO ---
router.post('/leaderboard', sportController.addLeaderboardEntry);
router.get('/leaderboard', sportController.getLeaderboard);

module.exports = router;