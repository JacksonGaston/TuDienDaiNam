import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import {
  openDatabaseAsync,
  deserializeDatabaseAsync,
  deleteDatabaseAsync,
  importDatabaseFromAssetAsync,
} from 'expo-sqlite';

const DATABASE_ASSET = require('../../assets/database/dictionary.db');
const DB_NAME = 'dictionary.db';

const DIACRITIC_MAP = {
  'á': 'a', 'à': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
  'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
  'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
  'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
  'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
  'í': 'i', 'ì': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
  'ó': 'o', 'ò': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
  'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
  'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
  'ú': 'u', 'ù': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
  'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
  'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ĩ': 'y', 'ỵ': 'y',
  'đ': 'd',
  'Á': 'a', 'À': 'a', 'Ả': 'a', 'Ã': 'a', 'Ạ': 'a',
  'Ă': 'a', 'Ắ': 'a', 'Ằ': 'a', 'Ẳ': 'a', 'Ẵ': 'a', 'Ặ': 'a',
  'Â': 'a', 'Ấ': 'a', 'Ầ': 'a', 'Ẩ': 'a', 'Ẫ': 'a', 'Ậ': 'a',
  'É': 'e', 'È': 'e', 'Ẻ': 'e', 'Ẽ': 'e', 'Ẹ': 'e',
  'Ê': 'e', 'Ế': 'e', 'Ề': 'e', 'Ể': 'e', 'Ễ': 'e', 'Ệ': 'e',
  'Í': 'i', 'Ì': 'i', 'Ỉ': 'i', 'Ĩ': 'i', 'Ị': 'i',
  'Ó': 'o', 'Ò': 'o', 'Ỏ': 'o', 'Õ': 'o', 'Ọ': 'o',
  'Ô': 'o', 'Ố': 'o', 'Ồ': 'o', 'Ổ': 'o', 'Ỗ': 'o', 'Ộ': 'o',
  'Ơ': 'o', 'Ớ': 'o', 'Ờ': 'o', 'Ở': 'o', 'Ỡ': 'o', 'Ợ': 'o',
  'Ú': 'u', 'Ù': 'u', 'Ủ': 'u', 'Ũ': 'u', 'Ụ': 'u',
  'Ư': 'u', 'Ứ': 'u', 'Ừ': 'u', 'Ử': 'u', 'Ữ': 'u', 'Ự': 'u',
  'Ý': 'y', 'Ỳ': 'y', 'Ỷ': 'y', 'Ỹ': 'y', 'Ỵ': 'y',
  'Đ': 'd'
};

function normalizeForSearch(word) {
  if (!word || typeof word !== 'string') return '';
  let result = word.toLowerCase();
  for (const [accented, base] of Object.entries(DIACRITIC_MAP)) {
    result = result.split(accented).join(base);
  }
  result = result.replace(/[^a-z0-9]/g, '').replace(/\s+/g, ' ').trim();
  return result;
}

function levenshtein(a, b) {
  if (!a) return b ? b.length : 0;
  if (!b) return a.length;
  a = a.toLowerCase(); b = b.toLowerCase();
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

class DictionaryService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.initPromise = null;
  }

  async executeQuery(sql, params = []) {
    await this.initialize();
    try { return await this.db.runAsync(sql, params); }
    catch (error) { console.error('Database query error:', error); throw error; }
  }

  async executeSelect(sql, params = []) {
    await this.initialize();
    try { return await this.db.getAllAsync(sql, params); }
    catch (error) { console.error('Database select error:', error); throw error; }
  }

  async executeGet(sql, params = []) {
    await this.initialize();
    try { return await this.db.getFirstAsync(sql, params); }
    catch (error) { console.error('Database get error:', error); throw error; }
  }

  async searchWord(query) {
    const q = (query || '').trim();
    if (!q) return { match: null, suggestions: [], notFound: true };

    const exact = await this.executeGet(
      'SELECT id, word, pronunciation, word_type AS wordType, meaning, ancient_char AS ancientChar, is_dainamese AS isDainamese, source_file AS sourceFile, text_quality AS textQuality FROM words WHERE word = ?',
      [q]
    );

    let match = exact ? this.mapWord(exact) : null;
    let suggestions = [];

    if (match) {
      suggestions = await this.getRelatedWords(match.id, 3);
    } else {
      const normQ = normalizeForSearch(q);
      if (normQ) {
        const normRows = await this.executeSelect(
          'SELECT id, word, word_type AS wordType, meaning FROM words WHERE normalized_word = ? ORDER BY word',
          [normQ]
        );
        if (normRows.length > 0) {
          match = this.mapWord(normRows[0]);
          suggestions = normRows.slice(1, 4).map(r => this.mapSuggestion(r));
          const remaining = 3 - suggestions.length;
          if (remaining > 0) {
            suggestions.push(...(await this.getRelatedWords(match.id, remaining).then(rs => rs.map(this.mapSuggestion))));
          }
        } else {
          const prefixRows = await this.executeSelect(
            'SELECT id, word, word_type AS wordType, meaning FROM words WHERE normalized_word LIKE ? ORDER BY word LIMIT 12',
            [normQ + '%']
          );
          if (prefixRows.length > 0) {
            prefixRows.sort((a, b) => levenshtein(normQ, normalizeForSearch(a.word)) - levenshtein(normQ, normalizeForSearch(b.word)));
            match = this.mapWord(prefixRows[0]);
            suggestions = prefixRows.slice(1, 4).map(r => this.mapSuggestion(r));
          }
        }
      }
      if (!match) {
        const ftsRows = await this.executeSelect(
          'SELECT id, word, word_type AS wordType, meaning FROM words WHERE word LIKE ? ESCAPE "\\" ORDER BY word LIMIT 3',
          [q.replace(/[\\%_]/g, '\\$&') + '%']
        );
        suggestions = ftsRows.map(r => this.mapSuggestion(r));
      }
    }

    if (match) {
      match.compounds = await this.getCompounds(match.id);
    }

    return { match, suggestions, notFound: !match };
  }

  async getRelatedWords(wordId, limit = 3) {
    const rows = await this.executeSelect(
      `SELECT w.id, w.word, w.word_type AS wordType, w.meaning
         FROM related_words r JOIN words w ON w.id = r.related_word_id
        WHERE r.word_id = ?
        ORDER BY r.score DESC, w.word
        LIMIT ?`,
      [wordId, limit]
    );
    return rows;
  }

  async getCompounds(wordId) {
    const rows = await this.executeSelect(
      'SELECT compound AS compound, meaning, ancient_chars AS ancientChars FROM compounds WHERE word_id = ? ORDER BY id',
      [wordId]
    );
    return rows.map(r => ({ compound: r.compound, meaning: r.meaning, ancientChars: r.ancientChars }));
  }

  mapWord(row) {
    return row ? {
      id: row.id,
      word: row.word,
      pronunciation: row.pronunciation || '',
      wordType: row.wordType || '',
      meaning: row.meaning || '',
      ancientChar: row.ancientChar || '',
      isDainamese: Boolean(row.isDainamese),
      sourceFile: row.sourceFile || '',
      textQuality: row.textQuality != null ? row.textQuality : 1.0
    } : null;
  }

  mapSuggestion(row) {
    return {
      id: row.id,
      word: row.word,
      wordType: row.wordType || '',
      meaning: row.meaning || ''
    };
  }

  async getWordById(wordId) {
    const row = await this.executeGet(
      'SELECT id, word, pronunciation, word_type AS wordType, meaning, ancient_char AS ancientChar, is_dainamese AS isDainamese, source_file AS sourceFile, text_quality AS textQuality FROM words WHERE id = ?',
      [wordId]
    );
    if (!row) return null;
    const word = this.mapWord(row);
    word.compounds = await this.getCompounds(wordId);
    return word;
  }

  async getWordByWord(word) {
    if (!word) return null;
    const row = await this.executeGet(
      'SELECT id, word, pronunciation, word_type AS wordType, meaning, ancient_char AS ancientChar, is_dainamese AS isDainamese, source_file AS sourceFile, text_quality AS textQuality FROM words WHERE word = ?',
      [word]
    );
    if (!row) return null;
    const mapped = this.mapWord(row);
    mapped.compounds = await this.getCompounds(mapped.id);
    return mapped;
  }

  async getSuggestions(query, limit = 8) {
    const q = (query || '').trim();
    if (!q) return [];
    const normQ = normalizeForSearch(q);
    let rows = [];
    if (normQ) {
      rows = await this.executeSelect(
        'SELECT id, word, word_type AS wordType, meaning FROM words WHERE normalized_word LIKE ? ORDER BY word LIMIT ?',
        [normQ + '%', limit]
      );
    }
    if (rows.length === 0) {
      rows = await this.executeSelect(
        'SELECT id, word, word_type AS wordType, meaning FROM words WHERE word LIKE ? ESCAPE "\\" ORDER BY word LIMIT ?',
        [q.replace(/[\\%_]/g, '\\$&') + '%', limit]
      );
    }
    return rows.map(r => this.mapSuggestion(r));
  }

  async getRandomWords(limit = 10) {
    const rows = await this.executeSelect(
      'SELECT id, word, pronunciation, word_type AS wordType, meaning, text_quality AS textQuality FROM words WHERE text_quality > 0.5 ORDER BY RANDOM() LIMIT ?',
      [limit]
    );
    return rows.map(r => this.mapWord(r));
  }

  async getWordCount() {
    const result = await this.executeGet('SELECT COUNT(*) as count FROM words');
    return result ? result.count : 0;
  }

  async getDainameseWordCount() {
    const result = await this.executeGet('SELECT COUNT(*) as count FROM words WHERE is_dainamese = 1');
    return result ? result.count : 0;
  }

  async resetDatabase() {
    if (this.db) {
      try { await this.db.closeAsync(); } catch (e) {}
      this.db = null;
    }
    this.isInitialized = false;
    this.initPromise = null;
    try { await deleteDatabaseAsync(DB_NAME); } catch (e) {}
  }

  initialize() {
    if (this.isInitialized) return Promise.resolve();
    if (!this.initPromise) {
      this.initPromise = this._initialize()
        .catch((error) => {
          this.initPromise = null;
          throw error;
        });
    }
    return this.initPromise;
  }

  async _initialize() {
    if (Platform.OS === 'web') {
      await this.initializeWeb();
      return;
    }

    await importDatabaseFromAssetAsync(DB_NAME, {
      assetId: DATABASE_ASSET,
      forceOverwrite: true,
    });
    this.db = await openDatabaseAsync(DB_NAME);
    const result = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM words');
    if (!result || result.count === 0) {
      throw new Error('Database is empty after loading');
    }
    this.isInitialized = true;
  }

  async initializeWeb() {
    const asset = Asset.fromModule(DATABASE_ASSET);
    const uri = asset.localUri || asset.uri;
    if (!uri) {
      throw new Error('Database asset has no downloadable URI on web');
    }
    const res = await fetch(uri);
    if (!res.ok) {
      throw new Error('Failed to fetch database asset: ' + res.status + ' ' + res.statusText);
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    this.db = await deserializeDatabaseAsync(bytes);
    const result = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM words');
    if (!result || result.count === 0) {
      throw new Error('Database is empty after web deserialization');
    }
    this.isInitialized = true;
  }

  async close() {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
    }
    this.initPromise = null;
  }
}

export const dictionaryService = new DictionaryService();
export { normalizeForSearch, levenshtein };
