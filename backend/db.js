/**
 * db.js - MongoDB data access layer
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'permission_firewall';
const AUTO_SEED = process.env.DB_AUTO_SEED !== 'false';

const COLLECTIONS = {
  tenants: 'tenants',
  roles: 'roles',
  users: 'users',
  role_inheritance: 'role_inheritance',
  audit_log: 'audit_log'
};

let clientPromise = null;
let seedPromise = null;

function getCollectionName(dataset) {
  const name = COLLECTIONS[dataset];
  if (!name) {
    throw new Error(`Unknown dataset: ${dataset}`);
  }
  return name;
}

function stripMongoId(document) {
  if (!document || typeof document !== 'object') {
    return document;
  }
  const { _id, ...rest } = document;
  return rest;
}

async function connect() {
  if (!clientPromise) {
    const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    clientPromise = client.connect();
  }

  const client = await clientPromise;
  const db = client.db(MONGO_DB_NAME);
  return { client, db };
}

async function ensureIndexes() {
  const { db } = await connect();
  await Promise.all([
    db.collection(COLLECTIONS.tenants).createIndex({ id: 1 }, { unique: true }),
    db.collection(COLLECTIONS.roles).createIndex({ id: 1 }, { unique: true }),
    db.collection(COLLECTIONS.users).createIndex({ id: 1 }, { unique: true }),
    db.collection(COLLECTIONS.role_inheritance).createIndex(
      { tenant_id: 1, child_role_id: 1, parent_role_id: 1 },
      { unique: true }
    ),
    db.collection(COLLECTIONS.audit_log).createIndex({ id: 1 }, { unique: true }),
    db.collection(COLLECTIONS.audit_log).createIndex({ timestamp: -1 })
  ]);
}

async function maybeSeedFromJson() {
  if (!AUTO_SEED) {
    return;
  }

  if (seedPromise) {
    await seedPromise;
    return;
  }

  seedPromise = (async () => {
    const { db } = await connect();
    const datasets = Object.keys(COLLECTIONS);

    for (const dataset of datasets) {
      const collectionName = getCollectionName(dataset);
      const collection = db.collection(collectionName);
      const existingCount = await collection.countDocuments();
      if (existingCount > 0) {
        continue;
      }

      const filePath = path.join(__dirname, 'data', `${dataset}.json`);
      if (!fs.existsSync(filePath)) {
        continue;
      }

      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        await collection.insertMany(parsed);
      }
    }
  })();

  await seedPromise;
}

async function read(dataset, filter = {}, options = {}) {
  await maybeSeedFromJson();
  const { db } = await connect();
  const collection = db.collection(getCollectionName(dataset));
  const docs = await collection.find(filter, options).toArray();
  return docs.map(stripMongoId);
}

async function findOne(dataset, filter = {}, options = {}) {
  await maybeSeedFromJson();
  const { db } = await connect();
  const collection = db.collection(getCollectionName(dataset));
  const doc = await collection.findOne(filter, options);
  return stripMongoId(doc);
}

async function append(dataset, document) {
  await maybeSeedFromJson();
  const { db } = await connect();
  const collection = db.collection(getCollectionName(dataset));
  await collection.insertOne(document);
  return document;
}

async function write(dataset, documents) {
  const normalized = Array.isArray(documents) ? documents : [];
  const { db } = await connect();
  const collection = db.collection(getCollectionName(dataset));
  await collection.deleteMany({});
  if (normalized.length > 0) {
    await collection.insertMany(normalized);
  }
  return normalized.length;
}

async function seedFromJson({ force = false } = {}) {
  const { db } = await connect();
  const datasets = Object.keys(COLLECTIONS);

  for (const dataset of datasets) {
    const collectionName = getCollectionName(dataset);
    const collection = db.collection(collectionName);
    const filePath = path.join(__dirname, 'data', `${dataset}.json`);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      continue;
    }

    if (force) {
      await collection.deleteMany({});
    } else {
      const count = await collection.countDocuments();
      if (count > 0) {
        continue;
      }
    }

    if (parsed.length > 0) {
      await collection.insertMany(parsed);
    }
  }
}

async function close() {
  if (!clientPromise) {
    return;
  }
  const client = await clientPromise;
  await client.close();
  clientPromise = null;
  seedPromise = null;
}

module.exports = {
  connect,
  ensureIndexes,
  read,
  findOne,
  append,
  write,
  seedFromJson,
  close
};
