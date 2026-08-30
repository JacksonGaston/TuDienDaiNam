const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const FileUtils = require('../utils/file-utils');
const DatabaseSchema = require('./schema');
const DatabaseSeeder = require('./seeder');
const TextParser = require('../parser/text-parser');
const EntryValidator = require('../parser/entry-validator');

// Must stay in sync with DICTIONARY_DB_VERSION in
// frontend/src/services/dictionaryService.js. Bump on every data-relevant
// rebuild so the web app detects stale cached databases and re-fetches them.
const DICTIONARY_DB_VERSION = 2;

class DatabaseGenerator {
  constructor() {
    this.dbPath = path.join(__dirname, '../../frontend/assets/database/dictionary.db');
    this.dataDir = path.join(__dirname, '../../data');
    this.schema = new DatabaseSchema();
    this.seeder = new DatabaseSeeder();
    this.parser = new TextParser();
    this.validator = new EntryValidator();
    this.db = null;
  }

  async initialize() {
    try {
      await logger.info('Initializing database generator...');
      
      await FileUtils.ensureDir(path.dirname(this.dbPath));
      
      this.db = await this.connectDatabase();
      
      await this.schema.initializeDatabase(this.db);
      
      await logger.info('Database generator initialized successfully');
    } catch (error) {
      await logger.error('Database generator initialization failed', { error: error.message });
      throw error;
    }
  }

  async connectDatabase() {
    return new Promise((resolve, reject) => {
      try { if (fs.existsSync(this.dbPath)) fs.unlinkSync(this.dbPath); } catch (e) {}
      const db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(new Error(`Failed to connect to database: ${err.message}`));
        } else {
          logger.info(`Connected to database: ${this.dbPath}`);
          resolve(db);
        }
      });
    });
  }

  async generateDatabase(options = {}) {
    try {
      await logger.info('Starting database generation...');
      
      const textFiles = await this.loadTextFiles();
      
      if (textFiles.length === 0) {
        throw new Error('No text files found in /data directory. Please add dictionary text files first.');
      }
      
      const parsedData = await this.parser.batchParse(textFiles);
      await logger.info(`Parsed ${parsedData.entries.length} dictionary entries`);
      
      const validationResults = this.validator.batchValidate(parsedData.entries);
      const validEntries = this.validator.filterValidEntries(validationResults.results, options.minConfidence || 0.5);
      
      await logger.info(`Validated entries: ${validEntries.length}/${parsedData.entries.length} valid`);
      
      await this.clearExistingData();

      const seedingResult = await this.seeder.seedAll(this.db, validEntries);

      await this.seeder.seedCompounds(this.db, validEntries);

      await this.seeder.generateRelatedWords(this.db);

      await this.seeder.updateSearchIndex(this.db);

      // Stamp the build version into the SQLite file so clients can detect and
      // refresh stale locally-cached copies of the database.
      await this.runQuery(`PRAGMA user_version = ${DICTIONARY_DB_VERSION}`);
      
      if (options.optimize !== false) {
        await this.schema.optimizeDatabase(this.db);
      }
      
      let stats;
      try {
        stats = await this.seeder.getSeedingStats(this.db);
      } catch (error) {
        await logger.error('Failed to get seeding stats', { error: error.message });
        stats = {
          totalWords: 0,
          totalSuggestions: 0,
          averageConfidence: 0
        };
      }
      
      await this.logGenerationComplete(stats, seedingResult);
      
      await logger.info('Database generation completed successfully');
      
      return {
        stats,
        seedingResult,
        validationResults,
        databasePath: this.dbPath
      };
    } catch (error) {
      await logger.error('Database generation failed', { error: error.message });
      throw error;
    }
  }

  async loadTextFiles() {
    try {
      await logger.info('Loading text files...');
      
      const textFiles = await FileUtils.getTextFiles(this.dataDir);
      const results = [];
      
      for (const file of textFiles) {
        try {
          const content = await FileUtils.readTextFile(file.path);
          results.push({
            filename: file.name,
            path: file.path,
            content: content,
            size: content.length,
            quality: 1.0 // Default quality for text files
          });
        } catch (error) {
          await logger.warn(`Failed to load text file: ${file.name}`, { error: error.message });
        }
      }
      
      await logger.info(`Loaded ${results.length} text files`);
      return results;
    } catch (error) {
      await logger.error('Failed to load text files', { error: error.message });
      throw error;
    }
  }

  async addIdsToEntries(entries) {
    try {
      const wordsWithIds = [];
      
      for (const entry of entries) {
        const row = await this.getQuery('SELECT id FROM words WHERE word = ?', [entry.word]);
        if (row) {
          wordsWithIds.push({ ...entry, id: row.id });
        } else {
          await logger.warn(`No ID found for word: ${entry.word}`);
        }
      }
      
      return wordsWithIds;
    } catch (error) {
      await logger.error('Failed to add IDs to entries', { error: error.message });
      throw error;
    }
  }

  async runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes, lastID: this.lastID });
        }
      });
    });
  }

  async getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async clearExistingData() {
    try {
      await logger.info('Clearing existing database data...');
      const tables = ['related_words', 'compounds', 'search_index', 'processing_log', 'words'];
      for (const table of tables) {
        await this.runQuery(`DELETE FROM ${table}`);
      }
      await logger.info('Existing data cleared');
    } catch (error) {
      await logger.error('Failed to clear existing data', { error: error.message });
      throw error;
    }
  }

  async verifyDatabase() {
    try {
      await logger.info('Verifying database integrity...');
      
      const schemaInfo = await this.schema.getSchemaInfo(this.db);
      const stats = await this.seeder.getSeedingStats(this.db);
      
      const testSearch = await this.db.get(`
        SELECT COUNT(*) as count FROM search_index 
        WHERE search_index MATCH 'test' LIMIT 1
      `);
      
      const verification = {
        schema: schemaInfo,
        stats,
        searchIndexWorking: testSearch.count >= 0,
        databaseSize: await this.getDatabaseSize(),
        timestamp: new Date().toISOString()
      };
      
      await logger.info('Database verification completed', verification);
      
      return verification;
    } catch (error) {
      await logger.error('Database verification failed', { error: error.message });
      throw error;
    }
  }

  async getDatabaseSize() {
    try {
      const stats = await FileUtils.getFileStats(this.dbPath);
      return {
        bytes: stats.size,
        mb: (stats.size / (1024 * 1024)).toFixed(2)
      };
    } catch (error) {
      return { bytes: 0, mb: '0.00' };
    }
  }

  async logGenerationComplete(stats, seedingResult) {
    try {
      await this.schema.logOperation(this.db, 'database_generation', 'success', 'Database generation completed', {
        stats,
        seedingResult,
        databasePath: this.dbPath
      });
    } catch (error) {
      await logger.error('Failed to log generation completion', { error: error.message });
    }
  }

  async close() {
    try {
      if (this.db) {
        await new Promise((resolve, reject) => {
          this.db.close((err) => {
            if (err) {
              reject(err);
            } else {
              logger.info('Database connection closed');
              resolve();
            }
          });
        });
      }
    } catch (error) {
      await logger.error('Failed to close database', { error: error.message });
    }
  }

  async resetDatabase() {
    try {
      await logger.info('Resetting database...');
      
      await this.schema.dropAllTables(this.db);
      await this.schema.initializeDatabase(this.db);
      
      await logger.info('Database reset completed');
    } catch (error) {
      await logger.error('Database reset failed', { error: error.message });
      throw error;
    }
  }
}

async function main() {
  const generator = new DatabaseGenerator();
  
  try {
    const args = process.argv.slice(2);
    const verifyIndex = args.indexOf('--verify');
    const optimizeIndex = args.indexOf('--optimize');
    const resetIndex = args.indexOf('--reset');
    
    await generator.initialize();
    
    if (resetIndex !== -1) {
      await generator.resetDatabase();
      console.log('Database reset completed');
      return;
    }
    
    const options = {
      optimize: optimizeIndex !== -1,
      minConfidence: 0.5
    };
    
    const result = await generator.generateDatabase(options);
    
    console.log('\n=== DATABASE GENERATION COMPLETE ===');
    console.log(`Database path: ${result.databasePath}`);
    console.log(`Total words: ${result.stats.totalWords}`);
    console.log(`Total suggestions: ${result.stats.totalRelations}`);
    console.log(`Average confidence: ${(result.stats.averageConfidence || 0).toFixed(2)}%`);
    console.log(`Success rate: ${result.seedingResult.successRate.toFixed(2)}%`);
    
    if (verifyIndex !== -1) {
      const verification = await generator.verifyDatabase();
      console.log('\n=== DATABASE VERIFICATION ===');
      console.log(`Database size: ${verification.databaseSize.mb} MB`);
      console.log(`Search index working: ${verification.searchIndexWorking}`);
      console.log(`Tables created: ${verification.schema.tables.join(', ')}`);
    }
    
  } catch (error) {
    console.error('Database generation failed:', error.message);
    process.exit(1);
  } finally {
    await generator.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseGenerator;