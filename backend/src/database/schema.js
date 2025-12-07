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
          definition TEXT NOT NULL,
          word_type TEXT,
          examples TEXT,
          is_dainamese BOOLEAN DEFAULT 0,
          source_file TEXT,
          text_quality REAL DEFAULT 1.0,
          processing_status TEXT DEFAULT 'processed',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `,
      
      search_index: `
        CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
          word,
          normalized_word,
          definition,
          examples,
          content='words',
          content_rowid='id'
        )
      `,
      
      suggestions: `
        CREATE TABLE IF NOT EXISTS suggestions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          word_id INTEGER NOT NULL,
          similar_words TEXT NOT NULL,
          relevance_score REAL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
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
      suggestions_word_id_index: 'CREATE INDEX IF NOT EXISTS idx_suggestions_word_id ON suggestions(word_id)',
      suggestions_score_index: 'CREATE INDEX IF NOT EXISTS idx_suggestions_score ON suggestions(relevance_score)'
    };

    this.triggers = {
      update_timestamp: `
        CREATE TRIGGER IF NOT EXISTS update_words_timestamp 
        AFTER UPDATE ON words
        BEGIN
          UPDATE words SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `,
      
      sync_search_index: `
        CREATE TRIGGER IF NOT EXISTS sync_search_index_insert 
        AFTER INSERT ON words
        BEGIN
          INSERT INTO search_index(rowid, word, normalized_word, definition, examples)
          VALUES (NEW.id, NEW.word, NEW.normalized_word, NEW.definition, NEW.examples);
        END
      `,
      
      sync_search_index_update: `
        CREATE TRIGGER IF NOT EXISTS sync_search_index_update 
        AFTER UPDATE ON words
        BEGIN
          UPDATE search_index 
          SET word = NEW.word, normalized_word = NEW.normalized_word, 
              definition = NEW.definition, examples = NEW.examples
          WHERE rowid = NEW.id;
        END
      `,
      
      sync_search_index_delete: `
        CREATE TRIGGER IF NOT EXISTS sync_search_index_delete 
        AFTER DELETE ON words
        BEGIN
          DELETE FROM search_index WHERE rowid = OLD.id;
        END
      `
    };
  }

  async createTables(db) {
    try {
      await logger.info('Creating database tables...');
      
      for (const [tableName, createSQL] of Object.entries(this.tables)) {
        await db.run(createSQL);
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
        await db.run(indexSQL);
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
        await db.run(triggerSQL);
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
        'DROP TABLE IF EXISTS suggestions',
        'DROP TABLE IF EXISTS search_index',
        'DROP TABLE IF EXISTS processing_log',
        'DROP TABLE IF EXISTS words'
      ];
      
      for (const dropSQL of dropTables) {
        await db.run(dropSQL);
      }
      
      await logger.info('All tables dropped successfully');
    } catch (error) {
      await logger.error('Failed to drop tables', { error: error.message });
      throw error;
    }
  }

  async getSchemaInfo(db) {
    try {
      const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
      const indexes = await db.all("SELECT name FROM sqlite_master WHERE type='index'");
      const triggers = await db.all("SELECT name FROM sqlite_master WHERE type='trigger'");
      
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
      
      await db.run(logSQL, [operation, status, message, details ? JSON.stringify(details) : null]);
    } catch (error) {
      await logger.error('Failed to log operation', { error: error.message });
    }
  }

  async optimizeDatabase(db) {
    try {
      await logger.info('Optimizing database...');
      
      await db.run('VACUUM');
      await db.run('ANALYZE');
      
      await logger.info('Database optimization completed');
    } catch (error) {
      await logger.error('Database optimization failed', { error: error.message });
      throw error;
    }
  }

  getTableSchema(tableName) {
    return this.tables[tableName];
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