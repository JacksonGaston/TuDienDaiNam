const logger = require('../utils/logger');
const DainameseNormalizer = require('./dainamese-normalizer');

class TextParser {
  constructor() {
    this.normalizer = new DainameseNormalizer();
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

  /**
   * Extract dictionary entries by detecting blocks separated by blank lines
   * Each block represents one dictionary entry with:
   * - First line: "ancient_char word. (optional_pronunciation). type. meaning"
   * - Following lines: examples, additional definitions
   * - Block ends with an empty line
   */
  extractDictionaryEntries(text, textFile = null) {
    const entries = [];
    const blocks = this.extractBlocks(text);

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const blockLines = block.split('\n');

      if (blockLines.length === 0) continue;

      const firstLine = blockLines[0].trim();

      if (!firstLine) continue;

      const parsedEntry = this.parseBlock(firstLine, block, blockLines, i, textFile);

      if (parsedEntry) {
        entries.push(parsedEntry);
      }
    }

    return entries;
  }

  /**
   * Split text into blocks separated by one or more blank lines
   * Each block represents a single dictionary entry
   */
  extractBlocks(text) {
    // Split by two or more newlines (handles blank line separation)
    return text.split(/\n[\s\n]*\n/)
      .map(block => block.trim())
      .filter(block => block.length > 0);
  }

  /**
   * Parse a dictionary block to extract entry data
   */
  parseBlock(firstLine, fullBlock, blockLines, blockIndex, textFile) {
    try {
      const searchableWordData = this.extractSearchableWord(firstLine);

      if (!searchableWordData || !searchableWordData.searchableWord) {
        return null;
      }

      const { searchableWord, wordType, rawWord } = searchableWordData;

      const entry = {
        word: searchableWord,
        originalWord: rawWord,
        pronunciation: '',
        wordType: wordType,
        definition: fullBlock,
        examples: [],
        sourceLine: blockIndex + 1,
        rawText: firstLine,
        sourceFile: textFile?.filename || '',
        textQuality: textFile?.quality || 1.0
      };

      return this.finalizeEntry(entry);

    } catch (error) {
      logger.warn(`Failed to parse block starting with: ${firstLine.substring(0, 50)}...`);
      return null;
    }
  }

  /**
   * Extract the searchable word from the first line of a block
   *
   * Line format: "ancient_char searchable_word. (pronunciation). word_type. meaning..."
   * Example 1: "阿    A. c. Đèo, nương dựa..."
   * Example 2: "丫    A. (Nha.) c. Cái cháng hai..."
   * Example 3: "阿    A. n. Tiếng than kêu..."
   *
   * Searchable word is the 2nd word position (after ancient character)
   *
   * Edge cases:
   * - May have pronunciation in parentheses: "A. (Nha.)"
   * - May have only 2 parts total: "A. Definition..."
   * - May have multiple dots within word: handle carefully
   */
  extractSearchableWord(firstLine) {
    // Remove extra whitespace but preserve original spacing info
    const cleanLine = firstLine.trim().replace(/\s+/g, ' ');

    // Find the positions of dots (.)
    const dotPositions = [];
    for (let i = 0; i < cleanLine.length; i++) {
      if (cleanLine[i] === '.') {
        dotPositions.push(i);
      }
    }

    if (dotPositions.length < 2) {
      return null; // Need at least 2 dots to define the searchable word
    }

    let searchableWordEndPos = dotPositions[1];
    let wordType = '';
    let searchableWord;
    let pronunciation = '';

    // Check if there's pronunciation in parentheses after the first dot
    const afterFirstDot = cleanLine.substring(dotPositions[0] + 1).trim();

    if (afterFirstDot.startsWith('(')) {
      // Case: "丫    A. (Nha.) c. Cái cháng hai..."
      // Find the closing parenthesis
      const closingParenPos = cleanLine.indexOf(')', dotPositions[0]);
      if (closingParenPos > dotPositions[0] && dotPositions.length >= 3) {
        // The searchable word is before the first dot, pronunciation after it
        // From "丫    A. (Nha.) c. ..." we want word: "A", pronunciation: "(Nha.)", type: "c"

        // Find where the first word ends (ancient character)
        const firstSpace = cleanLine.indexOf(' ');
        if (firstSpace === -1) {
          return null;
        }

        // Extract just the word (between ancient char and first dot)
        searchableWord = cleanLine.substring(firstSpace + 1, dotPositions[0]).trim();

        // Extract pronunciation (between first dot and closing paren, include parentheses for full display)
        const pronunciationWithParens = cleanLine.substring(dotPositions[0] + 1, closingParenPos + 1).trim();
        // Clean pronunciation by removing leading/trailing punctuation and spaces
        pronunciation = pronunciationWithParens.replace(/^[\(.\s]+|[\).\s]+$/g, '');

        // Extract word type (between closing paren and third dot, remove dot)
        if (dotPositions.length >= 3) {
          const typeWithDot = cleanLine.substring(closingParenPos + 1, dotPositions[2]).trim();
          wordType = typeWithDot.replace(/\.$/, '');
        }
      } else {
        return null; // Malformed pronunciation format
      }
    } else {
      // Standard case: "阿    A. c. Definition..."
      // Find where the first word ends (ancient character)
      const firstSpace = cleanLine.indexOf(' ');
      if (firstSpace === -1) {
        return null;
      }

      // Extract just the word (between ancient char and first dot)
      searchableWord = cleanLine.substring(firstSpace + 1, dotPositions[0]).trim();

      // Word type is between second and third dot (if exists), remove dot
      if (dotPositions.length >= 3) {
        const typeStart = dotPositions[1] + 1;
        const typeWithDot = cleanLine.substring(typeStart, dotPositions[2]).trim();
        wordType = typeWithDot.replace(/\.$/, '');
      }
    }

    // Clean up the searchable word
    if (!searchableWord) return null;

    return {
      searchableWord: searchableWord,
      wordType: wordType,
      pronunciation: pronunciation,
      rawWord: searchableWord + (pronunciation ? ` (${pronunciation})` : '')
    };
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

    if (!entry.word || entry.word.length < 1) {
      errors.push('Word is too short or missing');
    }

    if (!entry.definition || entry.definition.length < 5) {
      errors.push('Definition is too short or missing');
    }

    if (entry.word === entry.definition) {
      errors.push('Word and definition are identical');
    }

    if (entry.definition.length > 20000) {
      errors.push('Definition is too long');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = TextParser;
