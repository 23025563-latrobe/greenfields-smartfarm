import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const databasePath = fileURLToPath(
  new URL('./data/smartfarm.db', import.meta.url)
);

export function openDatabase(path = databasePath) {
  const database = new DatabaseSync(path);

  database.exec(`
    CREATE TABLE IF NOT EXISTS crops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crop_name TEXT NOT NULL UNIQUE
        CHECK (crop_name IN ('Tomato', 'Lettuce', 'Wheat', 'Maize')),
      location TEXT NOT NULL,
      target_min REAL NOT NULL CHECK (target_min >= 0 AND target_min <= 100),
      target_max REAL NOT NULL CHECK (target_max >= 0 AND target_max <= 100),
      normal_water REAL NOT NULL CHECK (normal_water > 0 AND normal_water <= 10000),
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (target_min < target_max)
    );
  `);

  const { count } = database.prepare(
    'SELECT COUNT(*) AS count FROM crops'
  ).get();

  if (count === 0) {
    const insert = database.prepare(`
      INSERT INTO crops (
        crop_name, location, target_min, target_max, normal_water, notes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    database.exec('BEGIN');

    try {
      insert.run('Tomato', 'Greenhouse A', 55, 75, 500, '');
      insert.run('Lettuce', 'Greenhouse B', 60, 80, 400, '');
      insert.run('Wheat', 'North Field', 35, 55, 300, '');
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      database.close();
      throw error;
    }
  }

  return database;
}
