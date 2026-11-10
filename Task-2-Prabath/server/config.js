const path = require('node:path');

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function createConfig(overrides = {}) {
  const rootDirectory = path.resolve(__dirname, '..');
  return {
    port: positiveInteger(process.env.PORT, 3000),
    host: process.env.HOST || '127.0.0.1',
    bodyLimit: process.env.BODY_LIMIT || '100kb',
    rateLimitWindowMs: positiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 60000),
    rateLimitMax: positiveInteger(process.env.RATE_LIMIT_MAX, 300),
    dataFile: path.resolve(rootDirectory, process.env.TASK_DATA_FILE || 'server/data/tasks.json'),
    publicDirectory: rootDirectory,
    ...overrides
  };
}

module.exports = { createConfig };
