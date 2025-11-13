import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = path.join(__dirname, 'users.db');
const sqlite3Verbose = sqlite3.verbose();
const db = new sqlite3Verbose.Database(dbPath);

console.log('🔄 Starting alert_metadata table migration...');
console.log('📁 Database path:', dbPath);

db.serialize(() => {
  // Drop existing alert_metadata table
  db.run('DROP TABLE IF EXISTS alert_metadata', (err) => {
    if (err) {
      console.error('❌ Error dropping alert_metadata table:', err);
    } else {
      console.log('✅ Dropped existing alert_metadata table');
    }
  });

  // Create alert_metadata table with correct schema
  db.run(`
    CREATE TABLE IF NOT EXISTS alert_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id TEXT NOT NULL UNIQUE,
      classification TEXT,
      status TEXT,
      tags TEXT,
      triageLevel TEXT,
      notes TEXT,
      severity INTEGER,
      archived INTEGER DEFAULT 0,
      archiveReason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating alert_metadata table:', err);
    } else {
      console.log('✅ Created alert_metadata table with correct schema');
      console.log('✅ Migration complete! Your users and configurations are preserved.');
    }

    db.close();
  });
});