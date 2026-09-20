const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorMiddleware');

// Load env variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'Clinic Management System AI Backend is running smoothly.',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/doctors', require('./routes/doctorRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/medical-records', require('./routes/medicalRecordRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// Serve Frontend static files optionally if opened via backend
app.use('/static', express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => res.redirect('/static/index.html'));

// Error handling middleware
app.use(errorHandler);

// 404 handler for undefined API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found on this server.`
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`==============================================`);
  console.log(`🏥 Clinic Management System AI Backend Server`);
  console.log(`📡 Listening on http://localhost:${PORT}`);
  console.log(`🩺 Healthcheck: http://localhost:${PORT}/api/health`);
  console.log(`==============================================`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
});

module.exports = app;
