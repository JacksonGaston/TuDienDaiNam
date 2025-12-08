import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import * as SQLite from 'expo-sqlite';

// Import database as an asset
const DATABASE_ASSET = require('../../assets/database/dictionary.db');

// Database paths
const DB_NAME = 'dictionary.db';
const DB_PATH = `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;

class DictionaryService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  
  async executeQuery(sql, params = []) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      return await this.db.runAsync(sql, params);
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async executeSelect(sql, params = []) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      return await this.db.getAllAsync(sql, params);
    } catch (error) {
      console.error('Database select error:', error);
      throw error;
    }
  }

  async executeGet(sql, params = []) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      return await this.db.getFirstAsync(sql, params);
    } catch (error) {
      console.error('Database get error:', error);
      throw error;
    }
  }

  async searchWords(query, limit = 50) {
    let rows = [];
    let ftsUsed = false;

    try {
      // Try FTS5 search first
      const ftsSQL = `
        SELECT w.id, w.word, w.pronunciation, w.word_type, w.definition,
               w.examples, w.is_dainamese, w.text_quality,
               si.rank as search_rank
        FROM search_index si
        JOIN words w ON si.rowid = w.id
        WHERE search_index MATCH ?
        ORDER BY si.rank
        LIMIT ?
      `;

      rows = await this.executeSelect(ftsSQL, [query, limit]);
      ftsUsed = true;
    } catch (ftsError) {
      console.warn('FTS5 search failed, using fallback:', ftsError.message);

      // Fallback to regular SQL search
      try {
        const fallbackSQL = `
          SELECT id, word, pronunciation, word_type, definition,
                 examples, is_dainamese, text_quality, id as search_rank
          FROM words
          WHERE word LIKE ? OR normalized_word LIKE ?
          ORDER BY id
          LIMIT ?
        `;
        rows = await this.executeSelect(fallbackSQL, [`${query}%`, `${query}%`, limit]);
      } catch (fallbackError) {
        console.error('Both FTS5 and fallback search failed:', fallbackError);
        throw fallbackError;
      }
    }

    return rows.map(row => ({
      id: row.id,
      word: row.word,
      pronunciation: row.pronunciation,
      wordType: row.word_type,
      definition: row.definition,
      examples: row.examples ? JSON.parse(row.examples) : [],
      isDainamese: Boolean(row.is_dainamese),
      textQuality: row.text_quality,
      searchRank: row.search_rank,
    }));
  }

  async getWordById(wordId) {
    try {
      const sql = `
        SELECT id, word, pronunciation, word_type, definition, 
               examples, is_dainamese, text_quality, source_file, 
               created_at, updated_at
        FROM words
        WHERE id = ?
      `;

      const row = await this.executeGet(sql, [wordId]);

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        word: row.word,
        pronunciation: row.pronunciation,
        wordType: row.word_type,
        definition: row.definition,
        examples: row.examples ? JSON.parse(row.examples) : [],
        isDainamese: Boolean(row.is_dainamese),
        textQuality: row.text_quality,
        sourceFile: row.source_file,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('Error getting word by ID:', error);
      throw error;
    }
  }

  async getWordByWord(word) {
    try {
      const sql = `
        SELECT id, word, pronunciation, word_type, definition, 
               examples, is_dainamese, text_quality, source_file, 
               created_at, updated_at
        FROM words
        WHERE word = ? OR normalized_word = ?
        LIMIT 1
      `;

      const row = await this.executeGet(sql, [word, word]);

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        word: row.word,
        pronunciation: row.pronunciation,
        wordType: row.word_type,
        definition: row.definition,
        examples: row.examples ? JSON.parse(row.examples) : [],
        isDainamese: Boolean(row.is_dainamese),
        textQuality: row.text_quality,
        sourceFile: row.source_file,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('Error getting word by word:', error);
      throw error;
    }
  }

  async getSuggestions(query, limit = 10) {
    try {
      const sql = `
        SELECT s.word_id, s.similar_words as suggestion, s.relevance_score as score, w.word, w.pronunciation
        FROM suggestions s
        JOIN words w ON s.word_id = w.id
        WHERE s.similar_words LIKE ?
        ORDER BY s.relevance_score DESC
        LIMIT ?
      `;

      const rows = await this.executeSelect(sql, [`${query}%`, limit]);

      return rows.map(row => ({
        wordId: row.word_id,
        suggestion: row.suggestion,
        score: row.score,
        word: row.word,
        pronunciation: row.pronunciation,
      }));
    } catch (error) {
      console.error('Error getting suggestions:', error);
      throw error;
    }
  }

  async getRandomWords(limit = 10) {
    try {
      const sql = `
        SELECT id, word, pronunciation, word_type, definition, 
               is_dainamese, text_quality
        FROM words
        WHERE text_quality > 0.5
        ORDER BY RANDOM()
        LIMIT ?
      `;

      const rows = await this.executeSelect(sql, [limit]);

      return rows.map(row => ({
        id: row.id,
        word: row.word,
        pronunciation: row.pronunciation,
        wordType: row.word_type,
        definition: row.definition,
        isDainamese: Boolean(row.is_dainamese),
        textQuality: row.text_quality,
      }));
    } catch (error) {
      console.error('Error getting random words:', error);
      throw error;
    }
  }

  async getWordCount() {
    try {
      const sql = 'SELECT COUNT(*) as count FROM words';
      const result = await this.executeGet(sql);
      return result.count;
    } catch (error) {
      console.error('Error getting word count:', error);
      throw error;
    }
  }

  async getDainameseWordCount() {
    try {
      const sql = 'SELECT COUNT(*) as count FROM words WHERE is_dainamese = 1';
      const result = await this.executeGet(sql);
      return result.count;
    } catch (error) {
      console.error('Error getting Dainamese word count:', error);
      throw error;
    }
  }

  async resetDatabase() {
    try {
      await this.close();
      const dbInfo = await FileSystem.getInfoAsync(DB_PATH);
      if (dbInfo.exists) {
        await FileSystem.deleteAsync(DB_PATH);
        console.log('Database deleted for reset');
      }
      this.isInitialized = false;
    } catch (error) {
      console.error('Error resetting database:', error);
      throw error;
    }
  }

  // Initialize using expo-sqlite's built-in asset loading (primary approach)
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('=== Database Initialization with expo-sqlite Asset Loading ===');
      console.log('Asset loaded:', DATABASE_ASSET);

      // Step 1: Try to open database using expo-sqlite's asset loading
      this.db = await SQLite.openDatabaseAsync(DB_NAME, {
        assetSource: DATABASE_ASSET
      });

      console.log('Database opened successfully with asset');

      // Step 2: Verify database content
      const result = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM words');

      if (result && result.count > 0) {
        this.isInitialized = true;
        console.log(`Database initialized successfully with ${result.count} words`);
      } else {
        console.error('Database asset loaded but contains no entries');
        throw new Error('Database is empty after loading');
      }

    } catch (error) {
      console.error('Asset loading failed, falling back to manual copy:', error);

      // Fallback to manual copy approach
      await this.initializeWithManualCopy();
    }
  }

  // Fallback method with proper binary asset handling
  async initializeWithManualCopy() {
    try {
      console.log('=== Manual Database Copy Fallback ===');
      console.log('Database Path:', DB_PATH);

      // Clear any existing empty database file
      const dbInfo = await FileSystem.getInfoAsync(DB_PATH);
      if (dbInfo.exists && dbInfo.size === 0) {
        await FileSystem.deleteAsync(DB_PATH);
        console.log('Removed empty database file');
      }

      // Check if database exists and has content
      const existingDbInfo = await FileSystem.getInfoAsync(DB_PATH);
      if (existingDbInfo.exists && existingDbInfo.size > 0) {
        console.log('Database already exists with content, using existing file');
        console.log('Database size:', existingDbInfo.size, 'bytes');
      } else {
        console.log('Database not found or empty, copying from assets...');

        // Ensure SQLite directory exists
        const dbDirectory = `${FileSystem.documentDirectory}SQLite/`;
        await FileSystem.makeDirectoryAsync(dbDirectory, { intermediates: true });

        // Use expo-asset for binary file handling
        const asset = Asset.fromModule(DATABASE_ASSET);
        console.log('Loading asset:', asset);
        await asset.downloadAsync();

        if (!asset.localUri) {
          throw new Error('Asset download failed - no local URI');
        }

        console.log('Asset downloaded to:', asset.localUri);

        // Copy using the downloaded asset's local URI
        await FileSystem.copyAsync({
          from: asset.localUri,
          to: DB_PATH
        });

        const copiedInfo = await FileSystem.getInfoAsync(DB_PATH);
        if (!copiedInfo.exists || copiedInfo.size === 0) {
          throw new Error(`Database copy failed - size: ${copiedInfo.size || 0} bytes`);
        }
        console.log('Database copied successfully, size:', copiedInfo.size, 'bytes');
      }

      // Open the database
      console.log('Opening database...');
      this.db = await SQLite.openDatabaseAsync(DB_NAME);
      console.log('Database opened successfully');

      // Verify content
      console.log('Verifying database content...');
      const result = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM words');

      if (result && result.count > 0) {
        this.isInitialized = true;
        console.log(`Database initialized successfully with ${result.count} words`);
      } else {
        console.error('Database verification failed - no words found');
        throw new Error('Database is empty after copy');
      }

    } catch (error) {
      console.error('=== Manual Copy Failed ===');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  async close() {
    if (this.db) {
      await this.db.closeAsync();
      this.isInitialized = false;
      console.log('Database closed');
    }
  }
}

export const dictionaryService = new DictionaryService();