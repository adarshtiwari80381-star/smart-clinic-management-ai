const express = require('express');
const router = express.Router();
const { askHealthAssistant } = require('../controllers/aiController');

// POST /api/ai/ask
router.post('/ask', askHealthAssistant);

module.exports = router;
