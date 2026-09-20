const express = require('express');
const router = express.Router();
const {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient
} = require('../controllers/patientController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.use(protect);

router
  .route('/')
  .get(getPatients)
  .post(authorizeRoles('Admin', 'Doctor'), createPatient);

router
  .route('/:id')
  .get(getPatient)
  .put(updatePatient)
  .delete(authorizeRoles('Admin'), deletePatient);

module.exports = router;
