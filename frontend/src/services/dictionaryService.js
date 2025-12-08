import * as SQLite from 'expo-sqlite';

class DictionaryService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Open or create database
      this.db = await SQLite.openDatabaseAsync('dictionary.db');
      
      // Check if database has data
      const result = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM words');
      
      if (result && result.count > 0) {
        this.isInitialized = true;
        console.log('Database initialized successfully');
      } else {
        // Database is empty, try to copy from assets
        console.warn('Database is empty. Make sure to run backend build-db first.');
        this.isInitialized = true; // Still mark as initialized to prevent repeated attempts
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
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
    try {
      const sql = `
        SELECT w.id, w.word, w.pronunciation, w.word_type, w.definition, 
               w.examples, w.is_dainamese, w.text_quality,
               si.rank as search_rank
        FROM search_index si
        JOIN words w ON si.rowid = w.id
        WHERE search_index MATCH ?
        ORDER BY si.rank
        LIMIT ?
      `;

      const rows = await this.executeSelect(sql, [query, limit]);

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
    } catch (error) {
      console.error('Error searching words:', error);
      throw error;
    }
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

  async close() {
    if (this.db) {
      await this.db.closeAsync();
      this.isInitialized = false;
      console.log('Database closed');
    }
  }
}

export const dictionaryService = new DictionaryService();