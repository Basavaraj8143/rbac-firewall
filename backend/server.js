/**
 * Permission Firewall - Express Server Entry Point
 */

'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./db');

const authRoutes = require('./routes/auth');
const resourceRoutes = require('./routes/resources');
const adminRoutes = require('./routes/admin');
const simulateRoutes = require('./routes/simulate');
const requireAuth = require('./middleware/requireAuth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'operational',
    engine: 'Permission Firewall v1.0',
    storage: 'mongodb',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/resources', requireAuth, resourceRoutes);
app.use('/api/admin', requireAuth, adminRoutes);
app.use('/api/simulate', requireAuth, simulateRoutes);

app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

if (require.main === module) {
  db.connect()
    .then(() => db.ensureIndexes())
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Permission Firewall API running on http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error('[BOOT] Failed to connect to MongoDB:', error.message);
      process.exit(1);
    });
}

module.exports = app;
