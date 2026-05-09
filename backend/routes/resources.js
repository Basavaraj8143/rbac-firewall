/**
 * routes/resources.js — Protected Demo Resources
 *
 * Each route is guarded by the Permission Firewall middleware.
 * These simulate real SaaS resources that require authorization.
 */

'use strict';

const express  = require('express');
const firewall = require('../middleware/permissionFirewall');
const router   = express.Router();

// GET /api/resources/reports  — requires read:reports
router.get('/reports', firewall('read:reports'), (req, res) => {
  res.json({
    resource:   'reports',
    data:       [{ id: 1, title: 'Q1 Revenue Report' }, { id: 2, title: 'Q2 Revenue Report' }],
    accessedBy: req.auth?.userId || null,
    auditId:    req.auditId
  });
});

// POST /api/resources/reports — requires write:reports
router.post('/reports', firewall('write:reports'), (req, res) => {
  res.json({ resource: 'reports', action: 'write', status: 'success', auditId: req.auditId });
});

// DELETE /api/resources/users/:id — requires delete:users (SENSITIVE)
router.delete('/users/:id', firewall('delete:users'), (req, res) => {
  res.json({
    resource:  'users',
    action:    'delete',
    targetId:  req.params.id,
    status:    'success',
    auditId:   req.auditId
  });
});

// GET /api/resources/billing — requires manage:billing (SENSITIVE)
router.get('/billing', firewall('manage:billing'), (req, res) => {
  res.json({ resource: 'billing', data: { plan: 'Enterprise', seats: 50 }, auditId: req.auditId });
});

// GET /api/resources/export — requires export:data (SENSITIVE)
router.get('/export', firewall('export:data'), (req, res) => {
  res.json({ resource: 'export', status: 'export initiated', auditId: req.auditId });
});

module.exports = router;
