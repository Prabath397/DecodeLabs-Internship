import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const defaultDbPath = path.resolve(here, '../data/stockpilot.sqlite');

export function resolveDbPath(value = process.env.DB_PATH) {
  return value ? path.resolve(process.cwd(), value) : defaultDbPath;
}

export function openDatabase(filePath = resolveDbPath()) {
  if (filePath !== ':memory:') fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const db = new DatabaseSync(filePath);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  return db;
}
