const logger = require('../utils/logger');
const DainameseNormalizer = require('./dainamese-normalizer');

class TextParser {
  constructor() {
    this.normalizer = new DainameseNormalizer();
    this.dictionaryPatterns = {
      wordEntry: /^([A-Za-záàâäãåçéèêëíìîïñóòôöõøúùûüýÿæœÁÀÂÄÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕØÚÙÛÜÝŸÆŒ\-']+)\s*(?:\[(.*?)\])?\s*(?:\((.*?)\))?\s*[\.:\-]?\s*(.+)$/i,
      pronunciation: /\[([^\]]+)\]/,
      wordType: /\(([^)]+)\)/,
      example: /(?:ex|example|eg)[:\.\s]+([^.;\n]+(?:[.;\n][^.;\n]+)*)/i,
      definition: /^(.+?)(?:\s*(?:ex|example|eg)[:\.\s]|$)/i
    };
  }

  async parseTextFile(textFile) {
    try {
      if (!textFile || !textFile.content) {
        throw new Error('Invalid text file provided');
      }

      await logger.info(`Parsing text file: ${textFile.filename}`);
      
      const entries = this.extractDictionaryEntries(textFile.content, textFile);
      
      const parsedResult = {
        ...textFile,
        parsedEntries: entries,
        totalEntries: entries.length,
        parsingTimestamp: new Date().toISOString()
      };

      await logger.info(`Parsed ${entries.length} dictionary entries from ${textFile.filename}`);
      
      return parsedResult;
    } catch (error) {
      await logger.error(`Failed to parse text file ${textFile?.filename}`, { error: error.message });
      throw error;
    }
  }

  extractDictionaryEntries(text, textFile = null) {
    const entries = [];
    const lines = this.splitIntoLines(text);
    
    let currentEntry = null;
    let buffer = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) continue;
      
      const potentialEntry = this.tryParseEntry(line);
      
      if (potentialEntry && potentialEntry.word) {
        if (currentEntry) {
          entries.push(this.finalizeEntry(currentEntry));
        }
        
        currentEntry = {
          ...potentialEntry,
          sourceLine: i + 1,
          rawText: line,
          sourceFile: textFile?.filename || '',
          textQuality: textFile?.quality || 1.0
        };
        buffer = '';
      } else if (currentEntry) {
        buffer += ' ' + line;
        
        if (this.looksLikeDefinitionContinuation(line)) {
          currentEntry.definition += ' ' + line;
        } else if (this.looksLikeExample(line)) {
          if (!currentEntry.examples) currentEntry.examples = [];
          currentEntry.examples.push(line);
        }
      }
    }
    
    if (currentEntry) {
      entries.push(this.finalizeEntry(currentEntry));
    }
    
    return entries.filter(entry => entry.word && entry.word.length > 1);
  }

  tryParseEntry(line) {
    const cleanLine = this.normalizer.normalizeText(line);
    const match = cleanLine.match(this.dictionaryPatterns.wordEntry);
    
    if (!match) return null;
    
    const [, word, pronunciation, wordType, definition] = match;
    
    if (!word || word.length < 2) return null;
    
    const entry = {
      word: this.normalizer.normalizeWord(word),
      originalWord: word,
      pronunciation: pronunciation || '',
      wordType: wordType || '',
      definition: definition || '',
      examples: []
    };
    
    this.extractExamples(entry);
    
    return entry;
  }

  extractExamples(entry) {
    if (!entry.definition) return;
    
    const exampleMatch = entry.definition.match(this.dictionaryPatterns.example);
    if (exampleMatch) {
      entry.examples = [exampleMatch[1].trim()];
      entry.definition = entry.definition.replace(exampleMatch[0], '').trim();
    }
  }

  finalizeEntry(entry) {
    entry.definition = this.normalizer.normalizeText(entry.definition);
    entry.pronunciation = this.normalizer.normalizeText(entry.pronunciation);
    entry.wordType = this.normalizer.normalizeText(entry.wordType);
    entry.examples = entry.examples.map(ex => this.normalizer.normalizeText(ex));
    
    entry.searchVariations = this.normalizer.generateSearchVariations(entry.word);
    entry.normalizedWord = this.normalizer.normalizeWord(entry.word);
    entry.isDainamese = this.normalizer.isDainameseWord(entry.word);
    
    return entry;
  }

  splitIntoLines(text) {
    return text
      .split(/[\n\r]+/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  looksLikeDefinitionContinuation(line) {
    const cleanLine = this.normalizer.normalizeText(line);
    return cleanLine.length > 10 && 
           !cleanLine.match(/^\w+\s*[[(]/) &&
           !this.looksLikeExample(cleanLine);
  }

  looksLikeExample(line) {
    const cleanLine = this.normalizer.normalizeText(line);
    return cleanLine.match(/^(ex|example|eg)[:\.\s]/i) ||
           cleanLine.includes('for example') ||
           cleanLine.includes('e.g.');
  }

  async batchParse(textFiles) {
    const allEntries = [];
    const parsingStats = {
      totalFiles: textFiles.length,
      successfulParses: 0,
      totalEntries: 0,
      averageEntriesPerFile: 0
    };

    for (const textFile of textFiles) {
      try {
        const parsedResult = await this.parseTextFile(textFile);
        allEntries.push(...parsedResult.parsedEntries);
        parsingStats.successfulParses++;
        parsingStats.totalEntries += parsedResult.parsedEntries.length;
      } catch (error) {
        await logger.error(`Failed to parse ${textFile.filename}`, { error: error.message });
      }
    }

    parsingStats.averageEntriesPerFile = parsingStats.totalEntries / parsingStats.successfulParses;

    return {
      entries: allEntries,
      stats: parsingStats,
      timestamp: new Date().toISOString()
    };
  }

  validateEntry(entry) {
    const errors = [];
    
    if (!entry.word || entry.word.length < 2) {
      errors.push('Word is too short or missing');
    }
    
    if (!entry.definition || entry.definition.length < 5) {
      errors.push('Definition is too short or missing');
    }
    
    if (entry.word === entry.definition) {
      errors.push('Word and definition are identical');
    }
    
    if (entry.definition.length > 1000) {
      errors.push('Definition is too long');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = TextParser;