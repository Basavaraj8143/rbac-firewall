/**
 * db.js — JSON Flat-File Data Access Layer
 *
 * Provides synchronous read/write helpers over JSON files.
 * Designed as a drop-in swap point: replace read/write with
 * MongoDB/PostgreSQL calls without changing business logic.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const memoryStore = new Map();

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Read a JSON data file by name (without extension).
 * @param {string} collection - e.g. 'users', 'roles'
 * @returns {Array|Object}
 */
function read(collection) {
  if (memoryStore.has(collection)) {
    return clone(memoryStore.get(collection));
  }

  const filePath = path.join(DATA_DIR, `${collection}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Collection not found: ${collection}`);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return clone(JSON.parse(raw));
}

/**
 * Write (overwrite) a JSON data file.
 * @param {string} collection
 * @param {Array|Object} data
 */
function write(collection, data) {
  const filePath = path.join(DATA_DIR, `${collection}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    memoryStore.delete(collection);
  } catch (error) {
    const code = error && error.code;
    // Serverless hosts like Vercel use read-only deployments. Keep runtime-only writes in memory.
    if (code === 'EROFS' || code === 'EPERM' || code === 'EACCES') {
      memoryStore.set(collection, clone(data));
      return;
    }
    throw error;
  }
}

/**
 * Append a single record to a JSON array collection.
 * @param {string} collection
 * @param {Object} record
 */
function append(collection, record) {
  const existing = read(collection);
  existing.push(record);
  write(collection, existing);
}

module.exports = { read, write, append };
