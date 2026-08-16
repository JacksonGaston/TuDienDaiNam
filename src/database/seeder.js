const logger = require('../utils/logger');
const DainameseNormalizer = require('../parser/dainamese-normalizer');

function levenshtein(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase();
  b = b.toLowerCase();
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

async function batchInsert(runQuery, db, table, columns, rows, batchSize = 1000) {
  const cols = '(' + columns.join(',') + ')';
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const placeholders = chunk.map(() => '(' + columns.map(() => '?').join(',') + ')').join(',');
    const flat = chunk.flatMap(r => columns.map(c => r[c]));
    await runQuery(db, `INSERT OR IGNORE INTO ${table} ${cols} VALUES ${placeholders}`, flat);
    inserted += chunk.length;
  }
  return inserted;
}

const TOP_RELATED_PER_WORD = 12;
const SAME_ROOT_SCORE = 1.0;
const EDIT1_SCORE = 0.93;
const EDIT2_SCORE = 0.8;
const EDIT3_SCORE = 0.7;

class DatabaseSeeder {
  constructor() {
    this.normalizer = new DainameseNormalizer();
    this.batchSize = 500;
  }

  async seedAll(db, entries) {
    const insertSQL = `
      INSERT OR IGNORE INTO words (
        word, normalized_word, pronunciation, word_type, meaning,
        ancient_char, source_file, text_quality
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    let successCount = 0;
    const errors = [];
    for (let i = 0; i < entries.length; i += this.batchSize) {
      const batch = entries.slice(i, i + this.batchSize);
      try {
        await this.runQuery(db, 'BEGIN');
        for (const entry of batch) {
          const pe = this.processEntry(entry);
          try {
            await this.runQuery(db, insertSQL, [
              pe.word, pe.normalizedWord, pe.pronunciation, pe.wordType,
              pe.meaning, pe.ancientChar, pe.sourceFile, pe.textQuality
            ]);
            successCount++;
          } catch (error) {
            errors.push({ word: entry.word, error: error.message });
          }
        }
        await this.runQuery(db, 'COMMIT');
      } catch (error) {
        await this.runQuery(db, 'ROLLBACK');
        errors.push({ batch: i, error: error.message });
      }
    }
    await logger.info(`Seeded ${successCount}/${entries.length} words`);
    return {
      successCount,
      errorCount: errors.length,
      errors,
      totalEntries: entries.length,
      successRate: entries.length > 0 ? (successCount / entries.length) * 100 : 0
    };
  }

  processEntry(entry) {
    return {
      word: entry.word || '',
      normalizedWord: entry.normalizedWord || this.normalizer.normalizeForSearch(entry.word || ''),
      pronunciation: entry.pronunciation || '',
      wordType: entry.wordType || '',
      meaning: entry.meaning || '',
      ancientChar: entry.ancientChar || '',
      sourceFile: entry.sourceFile || '',
      textQuality: entry.textQuality || 1.0
    };
  }

  async seedCompounds(db, entries) {
    const wordIdMap = await this.buildWordIdMap(db);
    if (wordIdMap.size === 0) {
      await logger.warn('No words found for compound seeding');
      return { inserted: 0 };
    }
    const compoundRows = [];
    for (const entry of entries) {
      const wordId = wordIdMap.get(entry.word);
      if (!wordId) continue;
      for (const c of (entry.compounds || [])) {
        if (c.compound && c.compound !== '') {
          compoundRows.push({
            word_id: wordId,
            phrase: c.phrase || '',
            compound: c.compound,
            meaning: c.meaning || '',
            ancient_chars: c.ancientChars || ''
          });
        }
      }
    }
    let inserted = 0;
    try {
      await this.runQuery(db, 'BEGIN');
      inserted = await batchInsert(
        (d, sql, params) => this.runQuery(d, sql, params),
        db, 'compounds', ['word_id', 'phrase', 'compound', 'meaning', 'ancient_chars'], compoundRows
      );
      await this.runQuery(db, 'COMMIT');
    } catch (e) {
      await this.runQuery(db, 'ROLLBACK');
      throw e;
    }
    await logger.info(`Inserted ${inserted} compounds`);
    return { inserted };
  }

  async buildWordIdMap(db) {
    const rows = await this.allQuery(db, 'SELECT id, word FROM words');
    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.word)) map.set(row.word, row.id);
    }
    return map;
  }

  async loadAllWords(db) {
    return this.allQuery(db, 'SELECT id, word, normalized_word FROM words');
  }

  async generateRelatedWords(db) {
    try {
      await logger.info('Generating related words...');
      const rows = await this.allQuery(db, 'SELECT id, word, normalized_word FROM words');

      const normMap = new Map();
      const firstCharBuckets = new Map();
      const byId = new Map();
      for (const r of rows) {
        byId.set(r.id, r);
        const norm = r.normalized_word || '';
        if (!normMap.has(norm)) normMap.set(norm, []);
        normMap.get(norm).push(r);
        const fc = norm.charAt(0);
        if (!firstCharBuckets.has(fc)) firstCharBuckets.set(fc, []);
        firstCharBuckets.get(fc).push(r);
      }

      let totalRelations = 0;
      let processed = 0;
      const relationRows = [];
      for (const r of rows) {
        const related = this.computeRelated(r, normMap, firstCharBuckets, byId);
        for (const rel of related) {
          relationRows.push({ word_id: r.id, related_word_id: rel.id, score: rel.score });
        }
        processed++;
        if (processed % 500 === 0) {
          await logger.progress(processed, rows.length, 'Computing related words');
        }
      }
      await this.runQuery(db, 'BEGIN');
      const inserted = await batchInsert(
        (d, sql, params) => this.runQuery(d, sql, params),
        db, 'related_words', ['word_id', 'related_word_id', 'score'], relationRows
      );
      await this.runQuery(db, 'COMMIT');
      totalRelations = inserted;
      await logger.info(`Generated ${totalRelations} related word relations`);
      return { totalRelations };
    } catch (error) {
      await logger.error('Related words generation failed', { error: error.message });
      throw error;
    }
  }

  computeRelated(target, normMap, buckets, byId) {
    const norm = target.normalized_word || '';
    const candidateIds = new Set();

    const sameNorm = normMap.get(norm) || [];
    for (const r of sameNorm) if (r.id !== target.id) candidateIds.add(r.id);

    const fc = norm.charAt(0);
    const bucket = buckets.get(fc) || [];
    for (const r of bucket) if (r.id !== target.id) candidateIds.add(r.id);

    const scored = [];
    for (const id of candidateIds) {
      const other = byId.get(id);
      if (!other) continue;
      const dist = levenshtein(norm, other.normalized_word || '');
      let score;
      if (other.normalized_word === norm) {
        score = SAME_ROOT_SCORE;
      } else if (dist === 1) {
        score = EDIT1_SCORE;
      } else if (dist === 2) {
        score = EDIT2_SCORE;
      } else if (dist === 3) {
        score = EDIT3_SCORE;
      } else if ((other.normalized_word || '').startsWith(norm)) {
        score = EDIT2_SCORE;
      } else {
        continue;
      }
      scored.push({ id: other.id, word: other.word, score, dist });
    }
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.dist !== b.dist) return a.dist - b.dist;
      return a.word.localeCompare(b.word);
    });
    return scored.slice(0, TOP_RELATED_PER_WORD);
  }

  async updateSearchIndex(db) {
    try {
      await logger.info('Updating search index...');
      await this.runQuery(db, 'DELETE FROM search_index');
      await this.runQuery(db, `
        INSERT INTO search_index(rowid, word, normalized_word, meaning)
        SELECT id, word, normalized_word, meaning FROM words
      `);
      const countResult = await this.getQuery(db, 'SELECT COUNT(*) as count FROM search_index');
      const indexedEntries = countResult ? countResult.count : 0;
      await logger.info(`Search index updated with ${indexedEntries} entries`);
      return { indexedEntries };
    } catch (error) {
      await logger.error('Search index update failed', { error: error.message });
      throw error;
    }
  }

  async logSeedingOperation(db, totalEntries, successCount, errorCount) {
    try {
      const logSQL = `
        INSERT INTO processing_log (operation, status, message, details)
        VALUES (?, ?, ?, ?)
      `;
      const details = {
        totalEntries, successCount, errorCount,
        successRate: (successCount / totalEntries) * 100,
        timestamp: new Date().toISOString()
      };
      await this.runQuery(db, logSQL, [
        'database_seeding',
        errorCount === 0 ? 'success' : 'partial_success',
        `Seeded ${successCount}/${totalEntries} entries`,
        JSON.stringify(details)
      ]);
    } catch (error) {
      await logger.error('Failed to log seeding operation', { error: error.message });
    }
  }

  async getSeedingStats(db) {
    try {
      const wordCount = await this.getQuery(db, 'SELECT COUNT(*) as count FROM words');
      const compoundCount = await this.getQuery(db, 'SELECT COUNT(*) as count FROM compounds');
      const relatedCount = await this.getQuery(db, 'SELECT COUNT(*) as count FROM related_words');
      const avgQuality = await this.getQuery(db, 'SELECT AVG(text_quality) as avg_quality FROM words');
      return {
        totalWords: wordCount ? wordCount.count : 0,
        totalCompounds: compoundCount ? compoundCount.count : 0,
        totalRelations: relatedCount ? relatedCount.count : 0,
        averageConfidence: avgQuality ? (avgQuality.avg_quality || 0) * 100 : 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      await logger.error('Failed to get seeding stats', { error: error.message });
      return {
        totalWords: 0, totalCompounds: 0, totalRelations: 0,
        averageConfidence: 0, timestamp: new Date().toISOString()
      };
    }
  }

  async runQuery(db, sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes, lastID: this.lastID });
      });
    });
  }

  async getQuery(db, sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async allQuery(db, sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = DatabaseSeeder;
