const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database file path
const DB_PATH = process.env.DATABASE_PATH || './database/users.db';

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Initialize database tables
async function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          extensionId TEXT NOT NULL,
          plan TEXT DEFAULT 'free',
          analysesUsed INTEGER DEFAULT 0,
          analysesLimit INTEGER DEFAULT 3,
          subscriptionStatus TEXT DEFAULT 'active',
          billingCycle TEXT DEFAULT NULL,
          nextBillingDate TEXT DEFAULT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
          return reject(err);
        }
      });

      // Analysis logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS analysis_logs (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          url TEXT NOT NULL,
          title TEXT,
          contentLength INTEGER,
          tokensUsed INTEGER,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating analysis_logs table:', err);
          return reject(err);
        }
      });

      // Usage tracking table (for rate limiting)
      db.run(`
        CREATE TABLE IF NOT EXISTS daily_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          date TEXT NOT NULL,
          analysesCount INTEGER DEFAULT 0,
          tokensUsed INTEGER DEFAULT 0,
          FOREIGN KEY (userId) REFERENCES users (id),
          UNIQUE(userId, date)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating daily_usage table:', err);
          return reject(err);
        }
        resolve();
      });

      // Create indexes for better performance
      db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      db.run('CREATE INDEX IF NOT EXISTS idx_users_extension ON users(extensionId)');
      db.run('CREATE INDEX IF NOT EXISTS idx_analysis_user ON analysis_logs(userId)');
      db.run('CREATE INDEX IF NOT EXISTS idx_daily_usage ON daily_usage(userId, date)');
    });
  });
}

// User management functions
function createUser(userData) {
  return new Promise((resolve, reject) => {
    const { id, email, extensionId, plan, analysesUsed, analysesLimit, createdAt } = userData;
    
    db.run(`
      INSERT INTO users (id, email, extensionId, plan, analysesUsed, analysesLimit, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, email, extensionId, plan, analysesUsed, analysesLimit, createdAt], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id, email, extensionId, plan, analysesUsed, analysesLimit, createdAt });
      }
    });
  });
}

function getUser(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function getUserByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function updateUserAnalysesUsed(userId, newCount) {
  return new Promise((resolve, reject) => {
    db.run(`
      UPDATE users 
      SET analysesUsed = ?, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [newCount, userId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.changes);
      }
    });
  });
}

function upgradeUserPlan(userId, plan, newLimit) {
  return new Promise((resolve, reject) => {
    db.run(`
      UPDATE users 
      SET plan = ?, analysesLimit = ?, analysesUsed = 0, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [plan, newLimit, userId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.changes);
      }
    });
  });
}

// Analysis logging functions
function logAnalysis(analysisData) {
  return new Promise((resolve, reject) => {
    const { id, userId, url, title, contentLength, tokensUsed, createdAt } = analysisData;
    
    db.run(`
      INSERT INTO analysis_logs (id, userId, url, title, contentLength, tokensUsed, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, userId, url, title, contentLength, tokensUsed, createdAt], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

function getUserAnalyses(userId, limit = 10, offset = 0) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT * FROM analysis_logs 
      WHERE userId = ? 
      ORDER BY createdAt DESC 
      LIMIT ? OFFSET ?
    `, [userId, limit, offset], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Usage tracking functions
function updateDailyUsage(userId, date, analysesCount, tokensUsed) {
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT OR REPLACE INTO daily_usage (userId, date, analysesCount, tokensUsed)
      VALUES (?, ?, 
        COALESCE((SELECT analysesCount FROM daily_usage WHERE userId = ? AND date = ?), 0) + ?,
        COALESCE((SELECT tokensUsed FROM daily_usage WHERE userId = ? AND date = ?), 0) + ?
      )
    `, [userId, date, userId, date, analysesCount, userId, date, tokensUsed], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.changes);
      }
    });
  });
}

function getDailyUsage(userId, date) {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT * FROM daily_usage 
      WHERE userId = ? AND date = ?
    `, [userId, date], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || { analysesCount: 0, tokensUsed: 0 });
      }
    });
  });
}

// Clean up old data (for maintenance)
function cleanupOldData(daysOld = 90) {
  return new Promise((resolve, reject) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    db.run(`
      DELETE FROM analysis_logs 
      WHERE createdAt < ?
    `, [cutoffStr], function(err) {
      if (err) {
        reject(err);
      } else {
        console.log(`Cleaned up ${this.changes} old analysis logs`);
        resolve(this.changes);
      }
    });
  });
}

// Close database connection
function closeDatabase() {
  return new Promise((resolve) => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
      resolve();
    });
  });
}

module.exports = {
  db,
  initDatabase,
  createUser,
  getUser,
  getUserByEmail,
  updateUserAnalysesUsed,
  upgradeUserPlan,
  logAnalysis,
  getUserAnalyses,
  updateDailyUsage,
  getDailyUsage,
  cleanupOldData,
  closeDatabase
};