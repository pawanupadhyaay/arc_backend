const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  joinQueue,
  leaveQueue,
  getCurrentConnection,
  disconnectConnection,
  sendMessage,
  getConnectionHistory,
  cleanupUserConnections
} = require('../controllers/randomConnectionController');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Validation middleware
const joinQueueValidation = [
  body('selectedGame')
    .notEmpty()
    .withMessage('Game selection is required'),
  body('videoEnabled')
    .optional()
    .isBoolean()
    .withMessage('Video enabled must be a boolean')
];

const sendMessageValidation = [
  body('roomId')
    .notEmpty()
    .withMessage('Room ID is required'),
  body('message')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be between 1 and 500 characters')
];

const disconnectValidation = [
  body('roomId')
    .notEmpty()
    .withMessage('Room ID is required')
];

// Routes
router.post('/join-queue', joinQueueValidation, joinQueue);
router.delete('/leave-queue', leaveQueue);
router.get('/current-connection', getCurrentConnection);
router.post('/disconnect', disconnectValidation, disconnectConnection);
router.post('/send-message', sendMessageValidation, sendMessage);
router.get('/history', getConnectionHistory);
router.post('/cleanup', cleanupUserConnections);

module.exports = router;
