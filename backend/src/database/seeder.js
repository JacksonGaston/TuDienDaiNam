const logger = require('../utils/logger');
const DainameseNormalizer = require('../parser/dainamese-normalizer');

class DatabaseSeeder {
  constructor() {
    this.normalizer = new DainameseNormalizer();
    this.batchSize = 100;
  }

  async seedWords(db, entries) {
    try {
      await logger.info(`Seeding ${entries.length} dictionary entries...`);
      
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      
      for (let i = 0; i < entries.length; i += this.batchSize) {
        const batch = entries.slice(i, i + this.batchSize);
        
        try {
          const batchResult = await this.seedBatch(db, batch);
          successCount += batchResult.successCount;
          errorCount += batchResult.errorCount;
          errors.push(...batchResult.errors);
          
          await logger.progress(i + batch.length, entries.length, 'Seeding entries');
        } catch (error) {
          await logger.error(`Batch seeding failed at index ${i}`, { error: error.message });
          errorCount += batch.length;
          errors.push({
            index: i,
            error: error.message,
            batchSize: batch.length
          });
        }
      }
      
      await this.logSeedingOperation(db, entries.length, successCount, errorCount);
      
      await logger.info(`Seeding completed: ${successCount} successful, ${errorCount} failed`);
      
      return {
        totalEntries: entries.length,
        successCount,
        errorCount,
        errors,
        successRate: (successCount / entries.length) * 100
      };
    } catch (error) {
      await logger.error('Word seeding failed', { error: error.message });
      throw error;
    }
  }

  async seedBatch(db, batch) {
    const insertSQL = `
      INSERT OR IGNORE INTO words (
        word, normalized_word, pronunciation, definition, word_type, 
        examples, is_dainamese, source_file, text_quality, processing_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const entry of batch) {
      try {
        const processedEntry = this.processEntry(entry);
        
        await db.run(insertSQL, [
          processedEntry.word,
          processedEntry.normalizedWord,
          processedEntry.pronunciation,
          processedEntry.definition,
          processedEntry.wordType,
          processedEntry.examples,
          processedEntry.isDainamese ? 1 : 0,
          processedEntry.sourceFile,
          processedEntry.textQuality,
          processedEntry.processingStatus
        ]);
        
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({
          word: entry.word,
          error: error.message
        });
      }
    }
    
    return { successCount, errorCount, errors };
  }

  processEntry(entry) {
    return {
      word: entry.word || '',
      normalizedWord: entry.normalizedWord || this.normalizer.normalizeWord(entry.word || ''),
      pronunciation: entry.pronunciation || '',
      definition: entry.definition || '',
      wordType: entry.wordType || '',
      examples: Array.isArray(entry.examples) ? entry.examples.join('; ') : (entry.examples || ''),
      isDainamese: entry.isDainamese || false,
      sourceFile: entry.sourceFile || '',
      textQuality: entry.textQuality || 1.0,
      processingStatus: entry.processingStatus || 'processed'
    };
  }

  async generateSuggestions(db, entries) {
    try {
      await logger.info('Generating search suggestions...');
      
      await db.run('DELETE FROM suggestions');
      
      let suggestionCount = 0;
      
      for (const entry of entries) {
        try {
          const suggestions = this.generateWordSuggestions(entry);
          
          for (const suggestion of suggestions) {
            await this.insertSuggestion(db, entry.id, suggestion);
            suggestionCount++;
          }
        } catch (error) {
          await logger.warn(`Failed to generate suggestions for word: ${entry.word}`, { error: error.message });
        }
      }
      
      await logger.info(`Generated ${suggestionCount} search suggestions`);
      
      return { suggestionCount };
    } catch (error) {
      await logger.error('Suggestion generation failed', { error: error.message });
      throw error;
    }
  }

  generateWordSuggestions(entry) {
    const suggestions = [];
    const word = entry.word;
    
    if (!word) return suggestions;
    
    const variations = this.normalizer.generateSearchVariations(word);
    
    for (const variation of variations) {
      if (variation !== word && variation.length > 2) {
        const similarity = this.normalizer.calculateSimilarity(word, variation);
        
        if (similarity > 0.3) {
          suggestions.push({
            similarWords: variation,
            relevanceScore: similarity
          });
        }
      }
    }
    
    const commonMisspellings = this.generateCommonMisspellings(word);
    suggestions.push(...commonMisspellings);
    
    return suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);
  }

  generateCommonMisspellings(word) {
    const misspellings = [];
    const lowerWord = word.toLowerCase();
    
    if (lowerWord.includes('tion')) {
      misspellings.push({
        similarWords: lowerWord.replace('tion', 'shun'),
        relevanceScore: 0.6
      });
    }
    
    if (lowerWord.includes('ough')) {
      misspellings.push({
        similarWords: lowerWord.replace('ough', 'u'),
        relevanceScore: 0.5
      });
    }
    
    const doubleLetters = lowerWord.match(/([a-z])\1+/g);
    if (doubleLetters) {
      for (const double of doubleLetters) {
        const single = double[0];
        misspellings.push({
          similarWords: lowerWord.replace(double, single),
          relevanceScore: 0.4
        });
      }
    }
    
    return misspellings;
  }

  async insertSuggestion(db, wordId, suggestion) {
    const insertSQL = `
      INSERT INTO suggestions (word_id, similar_words, relevance_score)
      VALUES (?, ?, ?)
    `;
    
    await db.run(insertSQL, [wordId, suggestion.similarWords, suggestion.relevanceScore]);
  }

  async updateSearchIndex(db) {
    try {
      await logger.info('Updating search index...');
      
      await db.run('DELETE FROM search_index');
      
      const insertSQL = `
        INSERT INTO search_index (rowid, word, normalized_word, definition, examples)
        SELECT id, word, normalized_word, definition, examples FROM words
      `;
      
      const result = await db.run(insertSQL);
      
      await logger.info(`Search index updated with ${result.changes} entries`);
      
      return { indexedEntries: result.changes };
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
        totalEntries,
        successCount,
        errorCount,
        successRate: (successCount / totalEntries) * 100,
        timestamp: new Date().toISOString()
      };
      
      await db.run(logSQL, [
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
      const wordCount = await db.get('SELECT COUNT(*) as count FROM words');
      const suggestionCount = await db.get('SELECT COUNT(*) as count FROM suggestions');
      const dainameseCount = await db.get('SELECT COUNT(*) as count FROM words WHERE is_dainamese = 1');
      const avgQuality = await db.get('SELECT AVG(text_quality) as avg_quality FROM words');
      
      return {
        totalWords: wordCount ? wordCount.count : 0,
        totalSuggestions: suggestionCount ? suggestionCount.count : 0,
        dainameseWords: dainameseCount ? dainameseCount.count : 0,
        averageQuality: avgQuality ? avgQuality.avg_quality || 0 : 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      await logger.error('Failed to get seeding stats', { error: error.message });
      return {
        totalWords: 0,
        totalSuggestions: 0,
        dainameseWords: 0,
        averageConfidence: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  setBatchSize(size) {
    this.batchSize = Math.max(1, Math.min(1000, size));
    logger.info(`Batch size set to ${this.batchSize}`);
  }
}

module.exports = DatabaseSeeder;