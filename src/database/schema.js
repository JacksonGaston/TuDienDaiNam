const logger = require('../utils/logger');

class DatabaseSchema {
  constructor() {
    this.tables = {
      words: `
        CREATE TABLE IF NOT EXISTS words (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          word TEXT NOT NULL UNIQUE,
          normalized_word TEXT NOT NULL,
          pronunciation TEXT,
          word_type TEXT,
          meaning TEXT,
          ancient_char TEXT,
          is_dainamese INTEGER DEFAULT 0,
          source_file TEXT,
          text_quality REAL DEFAULT 1.0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `,

      compounds: `
        CREATE TABLE IF NOT EXISTS compounds (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          word_id INTEGER NOT NULL,
          phrase TEXT,
          compound TEXT,
          meaning TEXT,
          ancient_chars TEXT,
          FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
        )
      `,

      related_words: `
        CREATE TABLE IF NOT EXISTS related_words (
          word_id INTEGER NOT NULL,
          related_word_id INTEGER NOT NULL,
          score REAL DEFAULT 0,
          PRIMARY KEY (word_id, related_word_id),
          FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
          FOREIGN KEY (related_word_id) REFERENCES words(id) ON DELETE CASCADE
        )
      `,

      search_index: `
        CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
          word, normalized_word, meaning
        )
      `,

      processing_log: `
        CREATE TABLE IF NOT EXISTS processing_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          operation TEXT NOT NULL,
          status TEXT NOT NULL,
          message TEXT,
          details TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    };

    this.indexes = {
      word_index: 'CREATE INDEX IF NOT EXISTS idx_word ON words(word)',
      normalized_word_index: 'CREATE INDEX IF NOT EXISTS idx_normalized_word ON words(normalized_word)',
      word_type_index: 'CREATE INDEX IF NOT EXISTS idx_word_type ON words(word_type)',
      is_dainamese_index: 'CREATE INDEX IF NOT EXISTS idx_is_dainamese ON words(is_dainamese)',
      quality_index: 'CREATE INDEX IF NOT EXISTS idx_text_quality ON words(text_quality)',
      source_file_index: 'CREATE INDEX IF NOT EXISTS idx_source_file ON words(source_file)',
      compounds_word_index: 'CREATE INDEX IF NOT EXISTS idx_compounds_word_id ON compounds(word_id)',
      related_word_index: 'CREATE INDEX IF NOT EXISTS idx_related_word_id ON related_words(word_id)',
      related_score_index: 'CREATE INDEX IF NOT EXISTS idx_related_score ON related_words(word_id, score DESC)'
    };

    this.triggers = {};
  }

  async createTables(db) {
    try {
      await logger.info('Creating database tables...');
      for (const [tableName, createSQL] of Object.entries(this.tables)) {
        await this.runQuery(db, createSQL);
        await logger.debug(`Created table: ${tableName}`);
      }
      await logger.info('All tables created successfully');
    } catch (error) {
      await logger.error('Failed to create tables', { error: error.message });
      throw error;
    }
  }

  async createIndexes(db) {
    try {
      await logger.info('Creating database indexes...');
      for (const [indexName, indexSQL] of Object.entries(this.indexes)) {
        await this.runQuery(db, indexSQL);
        await logger.debug(`Created index: ${indexName}`);
      }
      await logger.info('All indexes created successfully');
    } catch (error) {
      await logger.error('Failed to create indexes', { error: error.message });
      throw error;
    }
  }

  async createTriggers(db) {
    try {
      await logger.info('Creating database triggers...');
      for (const [triggerName, triggerSQL] of Object.entries(this.triggers)) {
        await this.runQuery(db, triggerSQL);
        await logger.debug(`Created trigger: ${triggerName}`);
      }
      await logger.info('All triggers created successfully');
    } catch (error) {
      await logger.error('Failed to create triggers', { error: error.message });
      throw error;
    }
  }

  async initializeDatabase(db) {
    try {
      await logger.info('Initializing database schema...');
      await this.createTables(db);
      await this.createIndexes(db);
      await this.createTriggers(db);
      await this.logOperation(db, 'database_initialization', 'success', 'Database schema initialized');
      await logger.info('Database schema initialized successfully');
    } catch (error) {
      await this.logOperation(db, 'database_initialization', 'error', `Failed to initialize: ${error.message}`);
      await logger.error('Database initialization failed', { error: error.message });
      throw error;
    }
  }

  async dropAllTables(db) {
    try {
      await logger.info('Dropping all tables...');
      const dropTables = [
        'DROP TABLE IF EXISTS search_index',
        'DROP TABLE IF EXISTS related_words',
        'DROP TABLE IF EXISTS compounds',
        'DROP TABLE IF EXISTS processing_log',
        'DROP TABLE IF EXISTS words'
      ];
      for (const dropSQL of dropTables) {
        await this.runQuery(db, dropSQL);
      }
      await logger.info('All tables dropped successfully');
    } catch (error) {
      await logger.error('Failed to drop tables', { error: error.message });
      throw error;
    }
  }

  async clearAllData(db) {
    try {
      await logger.info('Clearing all data...');
      const tables = ['related_words', 'compounds', 'search_index', 'processing_log', 'words'];
      for (const table of tables) {
        await this.runQuery(db, `DELETE FROM ${table}`);
      }
      await logger.info('All data cleared');
    } catch (error) {
      await logger.error('Failed to clear data', { error: error.message });
      throw error;
    }
  }

  async rebuildSearchIndex(db) {
    try {
      await logger.info('Rebuilding search index...');
      await this.runQuery(db, 'DELETE FROM search_index');
      await this.runQuery(db, `
        INSERT INTO search_index(rowid, word, normalized_word, meaning)
        SELECT id, word, normalized_word, meaning FROM words
      `);
      const countResult = await this.getQuery(db, 'SELECT COUNT(*) as count FROM search_index');
      await logger.info(`Search index rebuilt with ${countResult.count} entries`);
      return { indexedEntries: countResult.count };
    } catch (error) {
      await logger.error('Failed to rebuild search index', { error: error.message });
      throw error;
    }
  }

  async getSchemaInfo(db) {
    try {
      const tables = await this.allQuery(db, "SELECT name FROM sqlite_master WHERE type='table'");
      const indexes = await this.allQuery(db, "SELECT name FROM sqlite_master WHERE type='index'");
      const triggers = await this.allQuery(db, "SELECT name FROM sqlite_master WHERE type='trigger'");
      return {
        tables: tables.map(t => t.name),
        indexes: indexes.map(i => i.name),
        triggers: triggers.map(t => t.name),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      await logger.error('Failed to get schema info', { error: error.message });
      throw error;
    }
  }

  async logOperation(db, operation, status, message, details = null) {
    try {
      const logSQL = `
        INSERT INTO processing_log (operation, status, message, details)
        VALUES (?, ?, ?, ?)
      `;
      await this.runQuery(db, logSQL, [operation, status, message, details ? JSON.stringify(details) : null]);
    } catch (error) {
      await logger.error('Failed to log operation', { error: error.message });
    }
  }

  async optimizeDatabase(db) {
    try {
      await logger.info('Optimizing database...');
      await this.runQuery(db, 'VACUUM');
      await this.runQuery(db, 'ANALYZE');
      await logger.info('Database optimization completed');
    } catch (error) {
      await logger.error('Database optimization failed', { error: error.message });
      throw error;
    }
  }

  getTableSchema(tableName) {
    return this.tables[tableName];
  }

  async runQuery(db, sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes, lastID: this.lastID });
        }
      });
    });
  }

  async getQuery(db, sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async allQuery(db, sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  getAllSchemas() {
    return {
      tables: this.tables,
      indexes: this.indexes,
      triggers: this.triggers
    };
  }
}

module.exports = DatabaseSchema;
