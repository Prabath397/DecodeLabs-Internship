import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase, resolveDbPath } from './connection.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export function initializeDatabase(db) {
  db.exec(fs.readFileSync(path.join(here, 'schema.sql'), 'utf8'));
  return db;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = resolveDbPath();
  const db = openDatabase(file);
  initializeDatabase(db);
  db.close();
  console.log(`Database initialized at ${file}`);
}
