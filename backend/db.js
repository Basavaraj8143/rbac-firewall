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

/**
 * Read a JSON data file by name (without extension).
 * @param {string} collection - e.g. 'users', 'roles'
 * @returns {Array|Object}
 */
function read(collection) {
  const filePath = path.join(DATA_DIR, `${collection}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Collection not found: ${collection}`);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Write (overwrite) a JSON data file.
 * @param {string} collection
 * @param {Array|Object} data
 */
function write(collection, data) {
  const filePath = path.join(DATA_DIR, `${collection}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
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
