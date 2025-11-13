// Migration script to recreate alert_metadata table without affecting other tables
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Starting alert_metadata table migration...');

db.serialize(() => {
  // Drop the existing alert_metadata table
  db.run('DROP TABLE IF EXISTS alert_metadata', (err) => {
    if (err) {
      console.error('❌ Error dropping alert_metadata table:', err);
    } else {
      console.log('✅ Dropped existing alert_metadata table');
    }
  });

  // Recreate the table with correct schema
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

    // Close the database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('🎉 Database migration finished successfully!');
      }
    });
  });
});
