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
router.get('/players', sportController.getPlayers);       
router.get('/players/:id', sportController.getPlayerById); 

// --- NOU: RUTA DE TRIGGER PENTRU POPULARE ---
router.get('/trigger-sync', sportController.triggerSmartSync);

router.post('/teams', auth, validate(createTeamSchema), sportController.addTeam);
router.get('/teams', sportController.getTeams);
router.get('/teams/:id', sportController.getTeamById);

router.post('/competitions', auth, validate(createCompetitionSchema), sportController.addCompetition);
router.get('/competitions', sportController.getCompetitions);

router.post('/coaches', auth, validate(createCoachSchema), sportController.addCoach);
router.get('/coaches', sportController.getCoaches);

router.post('/matches', auth, validate(createMatchSchema), sportController.addMatch);
router.get('/matches', sportController.getMatches); 

module.exports = router;