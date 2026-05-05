/**
 * Permission Firewall — Express Server Entry Point
 *
 * Architecture:
 *   Client → Express Router → 🚧 Permission Firewall Middleware
 *          → Role Graph Analyzer (DFS/BFS) → JSON Data Store → Response
 */

'use strict';

const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const authRoutes      = require('./routes/auth');
const resourceRoutes  = require('./routes/resources');
const adminRoutes     = require('./routes/admin');
const simulateRoutes  = require('./routes/simulate');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'operational', engine: 'Permission Firewall v1.0', timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/simulate',  simulateRoutes);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🔥 Permission Firewall Engine running on http://localhost:${PORT}`);
  console.log(`   Graph Analyzer  : DFS/BFS Role Traversal Engine`);
  console.log(`   Tenant Isolation: STRICT`);
  console.log(`   Audit Logging   : ENABLED\n`);
});
