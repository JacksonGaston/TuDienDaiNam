const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const FileUtils = require('./src/utils/file-utils');

const DIACRITIC_MAP = {
  'á': 'a', 'à': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a', 'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
  'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
  'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e', 'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
  'í': 'i', 'ì': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
  'ó': 'o', 'ò': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o', 'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
  'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
  'ú': 'u', 'ù': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u', 'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
  'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ĩ': 'y', 'ỵ': 'y', 'đ': 'd',
  'Á': 'a', 'À': 'a', 'Ả': 'a', 'Ã': 'a', 'Ạ': 'a', 'Ă': 'a', 'Ắ': 'a', 'Ằ': 'a', 'Ẳ': 'a', 'Ẵ': 'a', 'Ặ': 'a',
  'Â': 'a', 'Ấ': 'a', 'Ầ': 'a', 'Ẩ': 'a', 'Ẫ': 'a', 'Ậ': 'a',
  'É': 'e', 'È': 'e', 'Ẻ': 'e', 'Ẽ': 'e', 'Ẹ': 'e', 'Ê': 'e', 'Ế': 'e', 'Ề': 'e', 'Ể': 'e', 'Ễ': 'e', 'Ệ': 'e',
  'Í': 'i', 'Ì': 'i', 'Ỉ': 'i', 'Ĩ': 'i', 'Ị': 'i',
  'Ó': 'o', 'Ò': 'o', 'Ỏ': 'o', 'Õ': 'o', 'Ọ': 'o', 'Ô': 'o', 'Ố': 'o', 'Ồ': 'o', 'Ổ': 'o', 'Ỗ': 'o', 'Ộ': 'o',
  'Ơ': 'o', 'Ớ': 'o', 'Ờ': 'o', 'Ở': 'o', 'Ỡ': 'o', 'Ợ': 'o',
  'Ú': 'u', 'Ù': 'u', 'Ủ': 'u', 'Ũ': 'u', 'Ụ': 'u', 'Ư': 'u', 'Ứ': 'u', 'Ừ': 'u', 'Ử': 'u', 'Ữ': 'u', 'Ự': 'u',
  'Ý': 'y', 'Ỳ': 'y', 'Ỷ': 'y', 'Ỹ': 'y', 'Ỵ': 'y', 'Đ': 'd'
};
function normalizeForSearch(word) {
  if (!word) return '';
  let r = word.toLowerCase();
  for (const [a, b] of Object.entries(DIACRITIC_MAP)) r = r.split(a).join(b);
  return r.replace(/[^a-z0-9]/g, '').replace(/\s+/g, ' ').trim();
}

class PipelineVerifier {
  constructor() {
    this.dbPath = path.join(__dirname, 'frontend/assets/database/dictionary.db');
    this.dataDir = path.join(__dirname, 'data');
  }

  async showTextFiles() {
    console.log('\nTEXT FILES VERIFICATION');
    console.log('='.repeat(50));
    try {
      const textFiles = await FileUtils.getTextFiles(this.dataDir);
      if (textFiles.length === 0) {
        console.log('No text files found in data directory.');
        return;
      }
      console.log(`Total Files: ${textFiles.length}`);
      console.log(`Directory: ${this.dataDir}\n`);
      for (const file of textFiles) {
        const stats = await FileUtils.getFileStats(file.path);
        const content = await FileUtils.readTextFile(file.path);
        const lines = content.split('\r?\n').filter(line => line.trim()).length;
        console.log(`File: ${file.name}`);
        console.log(`  Size: ${stats.size} bytes | Non-empty lines: ${lines}`);
        console.log(`  Preview: ${content.replace(/\t/g, ' ').substring(0, 120)}`);
      }
    } catch (error) {
      console.error('Error reading text files:', error.message);
    }
  }

  async showParsedEntries() {
    console.log('\nPARSED ENTRIES VERIFICATION');
    console.log('='.repeat(50));
    try {
      const TextParser = require('./src/parser/text-parser');
      const parser = new TextParser();
      const textFiles = await this.loadTextFiles();
      if (textFiles.length === 0) return;
      const parsedData = await parser.batchParse(textFiles);
      console.log(`Total Files Processed: ${parsedData.stats.totalFiles}`);
      console.log(`Successful Parses: ${parsedData.stats.successfulParses}`);
      console.log(`Total Entries Extracted: ${parsedData.stats.totalEntries}`);
      console.log(`Total Compounds: ${parsedData.entries.reduce((s, e) => s + (e.compounds?.length || 0), 0)}`);
      console.log(`Average Entries Per File: ${parsedData.stats.averageEntriesPerFile.toFixed(1)}\n`);
      console.log('Sample Parsed Entries:');
      parsedData.entries.slice(0, 10).forEach((entry, index) => {
        console.log(`  ${index + 1}. Word: "${entry.word}"`);
        console.log(`     Normalized: "${entry.normalizedWord}"`);
        console.log(`     Word Type: "${entry.wordType || 'N/A'}"`);
        console.log(`     Meaning: "${(entry.meaning || '').slice(0, 100)}"`);
        console.log(`     Ancient char: "${entry.ancientChar}"`);
        console.log(`     Compounds: ${(entry.compounds || []).map(c => c.compound).join(', ')}`);
        console.log(`     Source File: ${entry.sourceFile}`);
      });
    } catch (error) {
      console.error('Error parsing entries:', error.message);
    }
  }

  async showValidationResults() {
    console.log('\nVALIDATION RESULTS VERIFICATION');
    console.log('='.repeat(50));
    try {
      const TextParser = require('./src/parser/text-parser');
      const EntryValidator = require('./src/parser/entry-validator');
      const parser = new TextParser();
      const validator = new EntryValidator();
      const textFiles = await this.loadTextFiles();
      const parsedData = await parser.batchParse(textFiles);
      const validationResults = validator.batchValidate(parsedData.entries);
      console.log(`Total Entries: ${validationResults.stats.total}`);
      console.log(`Valid Entries: ${validationResults.stats.valid}`);
      console.log(`Invalid Entries: ${validationResults.stats.invalid}`);
      console.log(`High Confidence: ${validationResults.stats.highConfidence}`);
      console.log(`Average Confidence: ${(validationResults.stats.averageConfidence * 100).toFixed(1)}%`);
      const invalidEntries = validationResults.results.filter(r => !r.isValid);
      if (invalidEntries.length) {
        console.log('\nInvalid Entries:');
        invalidEntries.slice(0, 5).forEach((result, i) => {
          console.log(`  ${i + 1}. Word: "${result.entry.word}" Errors: ${result.errors.join(', ')}`);
        });
      }
    } catch (error) {
      console.error('Error validating entries:', error.message);
    }
  }

  async showDatabaseContents() {
    console.log('\nDATABASE CONTENTS VERIFICATION');
    console.log('='.repeat(50));
    const db = new sqlite3.Database(this.dbPath, err => {
      if (err) { console.error('Error opening database:', err.message); return; }
      console.log('Database connected successfully\n');
      const countQueries = [
        ['words', 'SELECT COUNT(*) AS c FROM words'],
        ['compounds', 'SELECT COUNT(*) AS c FROM compounds'],
        ['related_words', 'SELECT COUNT(*) AS c FROM related_words'],
        ['search_index', 'SELECT COUNT(*) AS c FROM search_index'],
        ['processing_log', 'SELECT COUNT(*) AS c FROM processing_log']
      ];
      const results = {};
      let done = 0;
      countQueries.forEach(([label, sql]) => {
        db.get(sql, (e, row) => {
          results[label] = row ? row.c : 0;
          done++;
          if (done === countQueries.length) {
            this.displayDatabaseStats(results);
            this.displaySampleEntries(db);
            this.displayProcessingLog(db);
            db.close();
          }
        });
      });
    });
  }

  displayDatabaseStats(results) {
    console.log('Database Statistics:');
    console.log(`   Total Words: ${results.words || 0}`);
    console.log(`   Compounds: ${results.compounds || 0}`);
    console.log(`   Related Words: ${results.related_words || 0}`);
    console.log(`   Search Index Entries: ${results.search_index || 0}`);
    console.log(`   Processing Log Entries: ${results.processing_log || 0}`);
  }

  displaySampleEntries(db) {
    console.log('\nSample Database Entries:');
    db.all('SELECT word, pronunciation, word_type, meaning, text_quality, ancient_char FROM words LIMIT 10', (err, rows) => {
      if (err) { console.error('Error fetching sample entries:', err.message); return; }
      rows.forEach((row, index) => {
        console.log(`  ${index + 1}. "${row.word}" (${row.word_type || '?'})`);
        console.log(`     Pron: ${row.pronunciation || 'N/A'}`);
        console.log(`     Meaning: ${(row.meaning || '').substring(0, 90)}`);
      });
    });
  }

  displayProcessingLog(db) {
    console.log('\nRecent Processing Log:');
    db.all('SELECT operation, status, message, timestamp FROM processing_log ORDER BY timestamp DESC LIMIT 5', (err, rows) => {
      if (err) { console.error('Error fetching processing log:', err.message); return; }
      if (!rows.length) console.log('  (no log entries)');
      rows.forEach((row, index) => {
        console.log(`  ${index + 1}. [${row.timestamp}] ${row.operation}: ${row.status} - ${row.message || ''}`);
      });
    });
  }

  async showSearchTest() {
    console.log('\nSEARCH FUNCTIONALITY TEST');
    console.log('='.repeat(50));
    return new Promise(resolve => {
      const db = new sqlite3.Database(this.dbPath, err => {
        if (err) { console.error('Error opening database:', err.message); return resolve(); }
        const testQueries = ['Ái', 'ai', 'ke', 'Dữ'];
        let completed = 0;
        testQueries.forEach(query => {
          const exact = db.get('SELECT word, word_type AS wordType, meaning FROM words WHERE word = ?', [query], (e, row) => {
            this._reportSearch(db, query, row, e, () => {
              completed++;
              if (completed === testQueries.length) { db.close(); resolve(); }
            });
          });
        });
      });
    });
  }

  _reportSearch(db, query, row, err, done) {
    if (err) { console.error(`Search error for "${query}":`, err.message); return done(); }
    console.log(`Exact lookup "${query}": ${row ? JSON.stringify(row) : 'not found'}`);
    if (!row) {
      const normQ = (typeof normalizeForSearch === 'function') ? normalizeForSearch(query) : query.toLowerCase();
      db.all('SELECT word, word_type AS wordType FROM words WHERE normalized_word = ? ORDER BY word LIMIT 3', [normQ], (e2, rows) => {
        console.log(`  normalized "${normQ}" variants:`, rows ? rows.map(r => r.word).join(', ') : 'none');
        done();
      });
    } else {
      done();
    }
  }

  async loadTextFiles() {
    try {
      const textFiles = await FileUtils.getTextFiles(this.dataDir);
      const results = [];
      for (const file of textFiles) {
        try {
          const content = await FileUtils.readTextFile(file.path);
          results.push({ filename: file.name, path: file.path, content, size: content.length, quality: 1.0 });
        } catch (error) {
          console.warn(`Failed to load text file: ${file.name}`);
        }
      }
      return results;
    } catch (error) {
      console.error('Failed to load text files:', error.message);
      return [];
    }
  }

  async runFullVerification() {
    console.log('COMPREHENSIVE PIPELINE VERIFICATION');
    console.log('='.repeat(60));
    await this.showTextFiles();
    await this.showParsedEntries();
    await this.showValidationResults();
    await this.showDatabaseContents();
    await this.showSearchTest();
    console.log('\nVERIFICATION COMPLETE');
    console.log('='.repeat(60));
  }
}

async function main() {
  const verifier = new PipelineVerifier();
  const args = process.argv.slice(2);
  try {
    if (args.length === 0) await verifier.runFullVerification();
    else {
      const map = { text: 'showTextFiles', parsed: 'showParsedEntries', validation: 'showValidationResults', database: 'showDatabaseContents', search: 'showSearchTest' };
      if (map[args[0]]) await verifier[map[args[0]]]();
      else console.log('Usage: node verify-pipeline.js [text|parsed|validation|database|search]');
    }
  } catch (error) {
    console.error('Verification failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = PipelineVerifier;
