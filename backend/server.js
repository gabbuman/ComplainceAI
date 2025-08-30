const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Import routes with error handling
let authRoutes, analysisRoutes, paymentRoutes, initDatabase, errorHandler;

try {
  authRoutes = require('./routes/auth');
  analysisRoutes = require('./routes/analysis');
  paymentRoutes = require('./routes/payment');
  const dbUtils = require('./utils/database');
  initDatabase = dbUtils.initDatabase;
  const middleware = require('./middleware/errorHandler');
  errorHandler = middleware.errorHandler;
} catch (error) {
  console.error('Error loading modules:', error.message);
  console.log('Some routes may not be available yet');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['chrome-extension://*'],
  credentials: true
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const analysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 analysis requests per hour
  message: 'Analysis rate limit exceeded. Please try again later or upgrade your plan.'
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes at full speed
  delayMs: 500 // slow down subsequent requests by 500ms
});

app.use(generalLimiter);
app.use(speedLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check (both root and API)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Routes (with safety checks)
if (authRoutes) {
  app.use('/api/auth', authRoutes);
} else {
  console.log('Auth routes not loaded');
}

if (analysisRoutes) {
  app.use('/api/analysis', analysisLimiter, analysisRoutes);
} else {
  console.log('Analysis routes not loaded');
}

if (paymentRoutes) {
  app.use('/api/payment', paymentRoutes);
} else {
  console.log('Payment routes not loaded');
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    if (initDatabase) {
      await initDatabase();
      console.log('Database initialized successfully');
    } else {
      console.log('Database initialization skipped (module not loaded)');
    }
    
    app.listen(PORT, () => {
      console.log(`ComplianceAI Backend Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nGracefully shutting down...');
  process.exit(0);
});

startServer();