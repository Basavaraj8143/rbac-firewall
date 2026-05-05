/**
 * api.js — Centralized Axios API Layer
 * All backend calls go through this module.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const getUsers      = ()           => api.get('/auth/users');
export const loginAsUser   = (userId)     => api.post('/auth/login', { userId });

// ── Simulator ─────────────────────────────────────────────────────────────────
export const getScenarios  = ()           => api.get('/simulate/scenarios');
export const runSimulation = (payload)    => api.post('/simulate', payload);

// ── Admin ─────────────────────────────────────────────────────────────────────
export const getAuditLogs  = (page = 1)  => api.get(`/admin/logs?page=${page}&limit=50`);
export const getStats      = ()          => api.get('/admin/stats');
export const getRoleGraph  = (tenantId)  => api.get(`/admin/graph/${tenantId}`);
export const getAllRoles    = ()          => api.get('/admin/roles');
export const clearLogs     = ()          => api.delete('/admin/logs');

// ── Health ────────────────────────────────────────────────────────────────────
export const healthCheck   = ()          => api.get('/health');

export default api;
