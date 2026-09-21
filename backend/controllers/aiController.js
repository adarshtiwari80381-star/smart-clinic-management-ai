// backend/controllers/aiController.js
// AI Health Assistant Controller
// Leverages general-purpose healthKnowledgeEngine for symptom analysis,
// emergency triage, OTC general guidance, and specialist appointment recommendations.
// 100% offline & zero external API dependency.

const healthKnowledgeEngine = require('../services/healthKnowledgeEngine');

// @desc    Ask AI Health Assistant
// @route   POST /api/ai/ask
// @access  Public / Authenticated (Patient Facing)
exports.askHealthAssistant = async (req, res, next) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a health-related question.'
      });
    }

    // Process through scalable health knowledge and dynamic triage engine
    const analysisResult = healthKnowledgeEngine.analyzeHealthQuery(question);

    return res.status(200).json(analysisResult);
  } catch (err) {
    next(err);
  }
};
