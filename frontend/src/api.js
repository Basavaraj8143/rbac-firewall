/**
 * api.js - Centralized Axios API Layer
 * All backend calls go through this module.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  try {
    const authMetaRaw = localStorage.getItem('fw_auth_meta');
    if (!authMetaRaw) {
      return config;
    }

    const authMeta = JSON.parse(authMetaRaw);
    if (!authMeta?.token) {
      return config;
    }

    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${authMeta.token}`;
    }
  } catch (_error) {}

  return config;
});

// Auth
export const getUsers = () => api.get('/auth/users');
export const loginAsUser = (userId) => api.post('/auth/login', { userId });
export const loginSecure = (email, password) => api.post('/auth/login/secure', { email, password });

// Simulator
export const getScenarios = () => api.get('/simulate/scenarios');
export const runSimulation = (payload) => api.post('/simulate', payload);

// Admin
export const getAuditLogs = (page = 1) => api.get(`/admin/logs?page=${page}&limit=50`);
export const getStats = () => api.get('/admin/stats');
export const getRoleGraph = (tenantId) => api.get(`/admin/graph/${tenantId}`);
export const getAllRoles = () => api.get('/admin/roles');
export const getBackupSnapshot = () => api.get('/admin/backup');
export const clearLogs = () => api.delete('/admin/logs');
export const createTenant = (payload) => api.post('/admin/tenants', payload);
export const createRole = (payload) => api.post('/admin/roles', payload);
export const createInheritance = (payload) => api.post('/admin/inheritance', payload);

// Health
export const healthCheck = () => api.get('/health');

export default api;
