const express = require('express');
const router = express.Router();
const {
  createTeamRecruitment,
  getTeamRecruitments,
  getTeamRecruitment,
  updateTeamRecruitment,
  deleteTeamRecruitment,
  createPlayerProfile,
  getPlayerProfiles,
  getPlayerProfile,
  updatePlayerProfile,
  deletePlayerProfile,
  applyToRecruitment,
  showInterestInProfile,
  getUserApplications,
  getTeamApplications,
  updateApplicationStatus
} = require('../controllers/recruitmentController');
const { protect: auth } = require('../middleware/auth');
const { validateRecruitment, validatePlayerProfile, validateApplication } = require('../middleware/validation');

// Team Recruitment Routes
router.post('/team-recruitments', auth, ...validateRecruitment, createTeamRecruitment);
router.get('/team-recruitments', getTeamRecruitments);
router.get('/team-recruitments/:id', getTeamRecruitment);
router.put('/team-recruitments/:id', auth, updateTeamRecruitment);
router.delete('/team-recruitments/:id', auth, deleteTeamRecruitment);

// Player Profile Routes
router.post('/player-profiles', auth, ...validatePlayerProfile, createPlayerProfile);
router.get('/player-profiles', getPlayerProfiles);
router.get('/player-profiles/:id', getPlayerProfile);
router.put('/player-profiles/:id', auth, updatePlayerProfile);
router.delete('/player-profiles/:id', auth, deletePlayerProfile);

// Application Routes
router.post('/team-recruitments/:recruitmentId/apply', auth, ...validateApplication, applyToRecruitment);
router.post('/player-profiles/:profileId/interest', auth, showInterestInProfile);
router.get('/applications/my', auth, getUserApplications);
router.get('/applications/team', auth, getTeamApplications);
router.get('/team-applications', auth, getTeamApplications);
router.put('/applications/:applicationId/status', auth, updateApplicationStatus);

module.exports = router;
