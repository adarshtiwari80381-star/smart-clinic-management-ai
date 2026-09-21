// backend/controllers/aiController.js
// AI Health Assistant Controller
// Features first-stage intent classification & routing:
// Emergency -> Health Query Engine -> Casual/Greeting -> Unclear/Clarification
// Enforces strict Patient-Only RBAC (Doctor & Admin blocked with HTTP 403).
// 100% offline & zero external API dependency.

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const intentClassifier = require('../services/intentClassifier');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_clinic_jwt_key_2026';

// @desc    Ask AI Health Assistant
// @route   POST /api/ai/ask
// @access  Public / Authenticated (Patient Facing Only)
exports.askHealthAssistant = async (req, res, next) => {
  try {
    // 1. RBAC SECURITY CHECK: Block Doctors and Admins from accessing Patient AI endpoint
    let token;
    if (req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (user && (user.role === 'Doctor' || user.role === 'Admin')) {
          return res.status(403).json({
            success: false,
            message: `Access denied: AI Health Assistant is strictly reserved for patients. Users with role '${user.role}' cannot access this patient triage endpoint.`
          });
        }
      } catch (authErr) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized to access this route. Invalid or expired token.'
        });
      }
    }

    // Also check if req.user was set by upstream middleware
    if (req.user && (req.user.role === 'Doctor' || req.user.role === 'Admin')) {
      return res.status(403).json({
        success: false,
        message: `Access denied: AI Health Assistant is strictly reserved for patients. Users with role '${req.user.role}' cannot access this patient triage endpoint.`
      });
    }

    // 2. Validate input question
    const { question } = req.body;
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a health-related question.'
      });
    }

    // 3. Process through First-Stage Intent Classifier & Router
    const analysisResult = intentClassifier.routeAndProcess(question);

    return res.status(200).json(analysisResult);
  } catch (err) {
    next(err);
  }
};
