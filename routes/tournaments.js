const express = require('express');
const router = express.Router();
const {
  createTournament,
  getTournaments,
  getTournament,
  updateTournament,
  joinTournament,
  leaveTournament,
  autoAssignGroups,
  sendBroadcast,
  startTournament,
  deleteTournament
} = require('../controllers/tournamentController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Tournament CRUD operations
router.route('/')
  .get(getTournaments)
  .post(createTournament);

router.route('/:id')
  .get(getTournament)
  .put(updateTournament)
  .delete(deleteTournament);

// Tournament participation
router.post('/:id/join', joinTournament);
router.post('/:id/leave', leaveTournament);

// Tournament management (host only)
router.post('/:id/assign-groups', autoAssignGroups);
router.post('/:id/broadcast', sendBroadcast);
router.post('/:id/start', startTournament);

module.exports = router;
