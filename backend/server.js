const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Import Supabase client
const { supabase } = require('./config/supabase');

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/api/health', async (req, res) => {
  let dbStatus = 'not_configured';
  
  // Check Supabase connection if configured
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    try {
      // Use departments table which has public RLS policy
      const { error } = await supabase.from('departments').select('id').limit(1);
      dbStatus = error ? 'error' : 'connected';
    } catch (e) {
      dbStatus = 'error';
    }
  }
  
  res.status(200).json({
    success: true,
    message: 'Hospital Management System API is running successfully',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus
  });
});

// API routes
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/users', require('./routes/userRoutes'));
// app.use('/api/appointments', require('./routes/appointmentRoutes'));
// app.use('/api/doctors', require('./routes/doctorRoutes'));
// app.use('/api/patients', require('./routes/patientRoutes'));

// Queue Management System Routes
app.use('/api/queue', require('./routes/queue'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/branches', require('./routes/branches'));

// Phase 1: Critical Features Routes
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/medical-records', require('./routes/medicalRecords'));
app.use('/api/mediator', require('./routes/mediator'));

// Phase 2: Important Features Routes
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/availability', require('./routes/availability'));

// Phase 3: Enhancement Features Routes
app.use('/api/notifications', require('./routes/notifications'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
