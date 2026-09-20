const express = require('express');
const router = express.Router();
const {
  getMedicalRecords,
  getMedicalRecord,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord
} = require('../controllers/medicalRecordController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.use(protect);

router
  .route('/')
  .get(getMedicalRecords)
  .post(authorizeRoles('Admin', 'Doctor'), createMedicalRecord);

router
  .route('/:id')
  .get(getMedicalRecord)
  .put(authorizeRoles('Admin', 'Doctor'), updateMedicalRecord)
  .delete(authorizeRoles('Admin', 'Doctor'), deleteMedicalRecord);

module.exports = router;
