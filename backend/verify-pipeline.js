const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const FileUtils = require('./src/utils/file-utils');

class PipelineVerifier {
  constructor() {
    this.dbPath = path.join(__dirname, '../frontend/assets/database/dictionary.db');
    this.dataDir = path.join(__dirname, '../data');
  }

  async showTextFiles() {
    console.log('\n📝 TEXT FILES VERIFICATION');
    console.log('='.repeat(50));
    
    try {
      const textFiles = await FileUtils.getTextFiles(this.dataDir);
      
      if (textFiles.length === 0) {
        console.log('❌ No text files found in /data directory. Please add dictionary text files first.');
        return;
      }
      
      console.log(`📊 Text Files Summary:`);
      console.log(`   Total Files: ${textFiles.length}`);
      console.log(`   Directory: ${this.dataDir}`);
      
      console.log('\n📝 Individual Files:');
      for (const file of textFiles) {
        const stats = await FileUtils.getFileStats(file.path);
        const content = await FileUtils.readTextFile(file.path);
        const lines = content.split('\n').filter(line => line.trim()).length;
        
        console.log(`\n   File: ${file.name}`);
        console.log(`   Size: ${stats.size} bytes`);
        console.log(`   Lines: ${lines}`);
        console.log(`   Modified: ${stats.modified.toLocaleDateString()}`);
        console.log(`   Preview:`);
        console.log(`   ${content.substring(0, 200)}...`);
      }
    } catch (error) {
      console.error('❌ Error reading text files:', error.message);
    }
  }

  async showParsedEntries() {
    console.log('\n🧠 PARSED ENTRIES VERIFICATION');
    console.log('='.repeat(50));
    
    try {
      const TextParser = require('./src/parser/text-parser');
      const parser = new TextParser();
      
      const textFiles = await this.loadTextFiles();
      if (textFiles.length === 0) {
        console.log('❌ No text files found. Add dictionary text files to /data directory first.');
        return;
      }
      
      const parsedData = await parser.batchParse(textFiles);
      
      console.log(`📊 Parsing Summary:`);
      console.log(`   Total Files Processed: ${parsedData.stats.totalFiles}`);
      console.log(`   Successful Parses: ${parsedData.stats.successfulParses}`);
      console.log(`   Total Entries Extracted: ${parsedData.stats.totalEntries}`);
      console.log(`   Average Entries Per File: ${parsedData.stats.averageEntriesPerFile.toFixed(1)}`);
      
      console.log('\n📝 Sample Parsed Entries:');
      parsedData.entries.slice(0, 10).forEach((entry, index) => {
        console.log(`\n   ${index + 1}. Word: "${entry.word}"`);
        console.log(`      Original: "${entry.originalWord}"`);
        console.log(`      Normalized: "${entry.normalizedWord}"`);
        console.log(`      Is Dainamese: ${entry.isDainamese ? '✅' : '❌'}`);
        console.log(`      Word Type: "${entry.wordType || 'N/A'}"`);
        console.log(`      Pronunciation: "${entry.pronunciation || 'N/A'}"`);
        console.log(`      Definition: "${entry.definition.substring(0, 100)}..."`);
        if (entry.examples && entry.examples.length > 0) {
          console.log(`      Examples: ${entry.examples.join('; ')}`);
        }
        console.log(`      Source Line: ${entry.sourceLine}`);
        console.log(`      Source File: "${entry.sourceFile}"`);
        console.log(`      Raw Text: "${entry.rawText}"`);
      });
      
      if (parsedData.entries.length > 10) {
        console.log(`\n   ... and ${parsedData.entries.length - 10} more entries`);
      }
    } catch (error) {
      console.error('❌ Error parsing entries:', error.message);
    }
  }

  async showValidationResults() {
    console.log('\n✅ VALIDATION RESULTS VERIFICATION');
    console.log('='.repeat(50));
    
    try {
      const TextParser = require('./src/parser/text-parser');
      const EntryValidator = require('./src/parser/entry-validator');
      
      const parser = new TextParser();
      const validator = new EntryValidator();
      
      const textFiles = await this.loadTextFiles();
      const parsedData = await parser.batchParse(textFiles);
      const validationResults = validator.batchValidate(parsedData.entries);
      
      console.log(`📊 Validation Summary:`);
      console.log(`   Total Entries: ${validationResults.stats.total}`);
      console.log(`   Valid Entries: ${validationResults.stats.valid} ✅`);
      console.log(`   Invalid Entries: ${validationResults.stats.invalid} ❌`);
      console.log(`   High Confidence: ${validationResults.stats.highConfidence}`);
      console.log(`   Medium Confidence: ${validationResults.stats.mediumConfidence}`);
      console.log(`   Low Confidence: ${validationResults.stats.lowConfidence}`);
      console.log(`   Average Confidence: ${(validationResults.stats.averageConfidence * 100).toFixed(1)}%`);
      
      console.log('\n❌ Invalid Entries:');
      const invalidEntries = validationResults.results.filter(r => !r.isValid);
      invalidEntries.slice(0, 5).forEach((result, index) => {
        console.log(`\n   ${index + 1}. Word: "${result.entry.word}"`);
        console.log(`      Errors: ${result.errors.join(', ')}`);
        console.log(`      Warnings: ${result.warnings.join(', ')}`);
        console.log(`      Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      });
      
      if (invalidEntries.length > 5) {
        console.log(`\n   ... and ${invalidEntries.length - 5} more invalid entries`);
      }
      
      console.log('\n✅ High Confidence Valid Entries:');
      const highConfidenceValid = validationResults.results.filter(r => r.isValid && r.confidence >= 0.8);
      highConfidenceValid.slice(0, 5).forEach((result, index) => {
        console.log(`\n   ${index + 1}. Word: "${result.entry.word}"`);
        console.log(`      Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`      Definition: "${result.entry.definition.substring(0, 80)}..."`);
      });
      
      if (highConfidenceValid.length > 5) {
        console.log(`\n   ... and ${highConfidenceValid.length - 5} more high-confidence entries`);
      }
    } catch (error) {
      console.error('❌ Error validating entries:', error.message);
    }
  }

  async showDatabaseContents() {
    console.log('\n🗄️ DATABASE CONTENTS VERIFICATION');
    console.log('='.repeat(50));
    
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Error opening database:', err.message);
          reject(err);
          return;
        }
        
        console.log('✅ Database connected successfully');
        
        // Get table counts
        const queries = [
          'SELECT COUNT(*) as count FROM words',
          'SELECT COUNT(*) as count FROM words WHERE is_dainamese = 1',
          'SELECT COUNT(*) as count FROM search_index',
          'SELECT COUNT(*) as count FROM suggestions',
          'SELECT COUNT(*) as count FROM processing_log'
        ];
        
        let completedQueries = 0;
        const results = {};
        
        queries.forEach((query, index) => {
          db.get(query, (err, row) => {
            if (err) {
              console.error(`❌ Error in query ${index + 1}:`, err.message);
            } else {
              const tableName = query.match(/FROM (\w+)/)[1];
              results[tableName] = row.count;
            }
            
            completedQueries++;
            if (completedQueries === queries.length) {
              this.displayDatabaseStats(results);
              this.displaySampleEntries(db);
              this.displayProcessingLog(db);
              
              db.close((err) => {
                if (err) {
                  console.error('❌ Error closing database:', err.message);
                } else {
                  console.log('\n✅ Database connection closed');
                }
                resolve();
              });
            }
          });
        });
      });
    });
  }

  displayDatabaseStats(results) {
    console.log('\n📊 Database Statistics:');
    console.log(`   Total Words: ${results.words || 0}`);
    console.log(`   Dainamese Words: ${results.words && results.is_dainamese || 0}`);
    console.log(`   Search Index Entries: ${results.search_index || 0}`);
    console.log(`   Suggestions: ${results.suggestions || 0}`);
    console.log(`   Processing Log Entries: ${results.processing_log || 0}`);
  }

  displaySampleEntries(db) {
    console.log('\n📝 Sample Database Entries:');
    
    db.all('SELECT word, pronunciation, definition, word_type, examples, is_dainamese, text_quality FROM words LIMIT 10', (err, rows) => {
      if (err) {
        console.error('❌ Error fetching sample entries:', err.message);
        return;
      }
      
      rows.forEach((row, index) => {
        console.log(`\n   ${index + 1}. Word: "${row.word}"`);
        console.log(`      Dainamese: ${row.is_dainamese ? '✅' : '❌'}`);
        console.log(`      Type: "${row.word_type || 'N/A'}"`);
        console.log(`      Pronunciation: "${row.pronunciation || 'N/A'}"`);
        console.log(`      Text Quality: ${(row.text_quality * 100).toFixed(1)}%`);
        console.log(`      Definition: "${row.definition.substring(0, 100)}..."`);
        if (row.examples) {
          console.log(`      Examples: ${row.examples}`);
        }
      });
    });
  }

  displayProcessingLog(db) {
    console.log('\n📋 Recent Processing Log:');
    
    db.all('SELECT operation, status, message, timestamp FROM processing_log ORDER BY timestamp DESC LIMIT 5', (err, rows) => {
      if (err) {
        console.error('❌ Error fetching processing log:', err.message);
        return;
      }
      
      rows.forEach((row, index) => {
        const status = row.status === 'success' ? '✅' : row.status === 'error' ? '❌' : '⚠️';
        console.log(`   ${index + 1}. ${status} [${row.timestamp}] ${row.operation}: ${row.message}`);
      });
    });
  }

  async showSearchTest() {
    console.log('\n🔍 SEARCH FUNCTIONALITY TEST');
    console.log('='.repeat(50));
    
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Error opening database:', err.message);
          reject(err);
          return;
        }
        
        // Test basic search
        const testQueries = ['ke', 'vio', 'fer', 'phat'];
        
        console.log('🔍 Testing search functionality:');
        
        let completedTests = 0;
        
        testQueries.forEach(query => {
          db.all(`
            SELECT w.word, w.definition, w.text_quality, 
                   rank as search_rank
            FROM search_index si 
            JOIN words w ON si.rowid = w.id 
            WHERE search_index MATCH ?
            ORDER BY rank
            LIMIT 3
          `, [query], (err, rows) => {
            if (err) {
              console.error(`❌ Error searching for "${query}":`, err.message);
            } else {
              console.log(`\n   Search results for "${query}":`);
              if (rows.length === 0) {
                console.log('      No results found');
              } else {
                rows.forEach((row, index) => {
                  console.log(`      ${index + 1}. "${row.word}" (rank: ${row.search_rank}, quality: ${(row.text_quality * 100).toFixed(1)}%)`);
                  console.log(`         ${row.definition.substring(0, 80)}...`);
                });
              }
            }
            
            completedTests++;
            if (completedTests === testQueries.length) {
              db.close((err) => {
                if (err) {
                  console.error('❌ Error closing database:', err.message);
                }
                resolve();
              });
            }
          });
        });
      });
    });
  }

  async loadTextFiles() {
    try {
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
            quality: 1.0
          });
        } catch (error) {
          console.warn(`⚠️ Failed to load text file: ${file.name}`);
        }
      }
      
      return results;
    } catch (error) {
      console.error('❌ Failed to load text files:', error.message);
      return [];
    }
  }

  async runFullVerification() {
    console.log('🔍 COMPREHENSIVE PIPELINE VERIFICATION');
    console.log('='.repeat(60));
    
    await this.showTextFiles();
    await this.showParsedEntries();
    await this.showValidationResults();
    await this.showDatabaseContents();
    await this.showSearchTest();
    
    console.log('\n✅ VERIFICATION COMPLETE');
    console.log('='.repeat(60));
  }
}

// CLI interface
async function main() {
  const verifier = new PipelineVerifier();
  const args = process.argv.slice(2);
  
  try {
    if (args.length === 0) {
      await verifier.runFullVerification();
    } else {
      switch (args[0]) {
        case 'text':
          await verifier.showTextFiles();
          break;
        case 'parsed':
          await verifier.showParsedEntries();
          break;
        case 'validation':
          await verifier.showValidationResults();
          break;
        case 'database':
          await verifier.showDatabaseContents();
          break;
        case 'search':
          await verifier.showSearchTest();
          break;
        default:
          console.log('Usage: node verify-pipeline.js [text|parsed|validation|database|search]');
          console.log('  text       - Show text files');
          console.log('  parsed     - Show parsed entries');
          console.log('  validation - Show validation results');
          console.log('  database   - Show database contents');
          console.log('  search     - Test search functionality');
          console.log('  (no args)  - Run full verification');
      }
    }
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PipelineVerifier;