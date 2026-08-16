const logger = require('../utils/logger');
const DainameseNormalizer = require('./dainamese-normalizer');

class EntryValidator {
  constructor() {
    this.normalizer = new DainameseNormalizer();
    this.validationRules = {
      word: {
        minLength: 1,
        maxLength: 80,
        allowedChars: /^[a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EFF'\-\s]+$/u,
        forbiddenPatterns: [/^\d+$/, /^[^a-zA-Z\u00C0-\u024F\u1EA0-\u1EFF\s]+$/, /^\s+$/]
      },
      definition: {
        minLength: 1,
        maxLength: 60000,
        forbiddenPatterns: [/^\s+$/]
      },
      pronunciation: {
        maxLength: 100,
        allowedChars: /^[a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EFF\s\-\[\],\.\/]+$/u
      },
      wordType: {
        maxLength: 50,
        allowedTypes: ['c.', 'n.', 'v.', 'c. n.', 'n. c.', 'adj.', 'adv.', 'pron.', 'prep.', 'conj.', 'interj.', 'art.', '']
      }
    };
  }

  validateEntry(entry) {
    const validationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      confidence: 1.0,
      entry: entry
    };

    try {
      this.validateWord(entry, validationResult);
      this.validateDefinition(entry, validationResult);
      this.validatePronunciation(entry, validationResult);
      this.validateWordType(entry, validationResult);
      this.validateExamples(entry, validationResult);
      this.validateConsistency(entry, validationResult);
      this.calculateConfidence(validationResult);

      validationResult.isValid = validationResult.errors.length === 0;

    } catch (error) {
      logger.error('Entry validation failed', { error: error.message, entry: entry.word });
      validationResult.isValid = false;
      validationResult.errors.push('Validation process failed');
    }

    return validationResult;
  }

  validateWord(entry, result) {
    const word = entry.word;
    const rules = this.validationRules.word;

    if (!word) {
      result.errors.push('Word is missing');
      return;
    }

    if (word.length < rules.minLength) {
      result.errors.push(`Word is too short (${word.length} < ${rules.minLength})`);
    }

    if (word.length > rules.maxLength) {
      result.errors.push(`Word is too long (${word.length} > ${rules.maxLength})`);
    }

    if (!rules.allowedChars.test(word)) {
      result.errors.push('Word contains invalid characters');
    }

    for (const pattern of rules.forbiddenPatterns) {
      if (pattern.test(word)) {
        result.errors.push('Word matches forbidden pattern');
        break;
      }
    }

    if (word.toLowerCase() === word.toLowerCase().replace(/[a-z]/g, '')) {
      result.warnings.push('Word contains no alphabetic characters');
    }

    if (!this.normalizer.isDainameseWord(word) && !/^[a-zA-Z]+$/.test(word)) {
      result.warnings.push('Word contains mixed character sets');
    }
  }

  validateDefinition(entry, result) {
    const definition = entry.definition;
    const rules = this.validationRules.definition;

    if (!definition) {
      result.errors.push('Definition is missing');
      return;
    }

    if (definition.length < rules.minLength) {
      result.errors.push(`Definition is too short (${definition.length} < ${rules.minLength})`);
    }

    if (definition.length > rules.maxLength) {
      result.warnings.push(`Definition is very long (${definition.length} chars)`);
    }

    for (const pattern of rules.forbiddenPatterns) {
      if (pattern.test(definition)) {
        result.errors.push('Definition matches forbidden pattern');
        break;
      }
    }

    if (definition.toLowerCase().includes(entry.word.toLowerCase()) && 
        definition.toLowerCase().split(entry.word.toLowerCase()).length - 1 > 2) {
      result.warnings.push('Definition repeats word excessively');
    }

    if (definition.split(/\s+/).length < 3) {
      result.warnings.push('Definition seems too short');
    }
  }

  validatePronunciation(entry, result) {
    const pronunciation = entry.pronunciation;
    const rules = this.validationRules.pronunciation;

    if (!pronunciation) return;

    if (pronunciation.length > rules.maxLength) {
      result.errors.push(`Pronunciation is too long (${pronunciation.length} > ${rules.maxLength})`);
    }

    if (!rules.allowedChars.test(pronunciation)) {
      result.errors.push('Pronunciation contains invalid characters');
    }
  }

  validateWordType(entry, result) {
    const wordType = entry.wordType;
    const rules = this.validationRules.wordType;

    if (!wordType) return;

    const normalizedType = wordType.toLowerCase().trim();
    
    if (!rules.allowedTypes.includes(normalizedType)) {
      result.warnings.push(`Unusual word type: ${wordType}`);
    }

    if (wordType.length > rules.maxLength) {
      result.errors.push(`Word type is too long (${wordType.length} > ${rules.maxLength})`);
    }
  }

  validateExamples(entry, result) {
    if (!entry.examples || !Array.isArray(entry.examples)) return;

    for (let i = 0; i < entry.examples.length; i++) {
      const example = entry.examples[i];

      if (!example || example.trim().length === 0) {
        result.warnings.push(`Example ${i + 1} is empty`);
        continue;
      }

      if (example.length > 200) {
        result.warnings.push(`Example ${i + 1} is too long (${example.length} characters)`);
      }

      if (example.split(/\s+/).length < 3) {
        result.warnings.push(`Example ${i + 1} seems too short`);
      }
    }

    if (entry.examples.length > 5) {
      result.warnings.push('Too many examples (more than 5)');
    }
  }

  validateConsistency(entry, result) {
    if (entry.word && entry.definition) {
      if (entry.word.toLowerCase() === entry.definition.toLowerCase().trim()) {
        result.errors.push('Word and definition are identical');
      }

      const wordInDefinition = entry.definition.toLowerCase().includes(entry.word.toLowerCase());
      if (!wordInDefinition && entry.definition.length > 20) {
        result.warnings.push('Definition does not contain the word');
      }
    }

    if (entry.pronunciation && entry.word) {
      if (entry.pronunciation.toLowerCase() === entry.word.toLowerCase()) {
        result.warnings.push('Pronunciation is identical to word');
      }
    }
  }

  calculateConfidence(result) {
    let confidence = 1.0;

    confidence -= result.errors.length * 0.3;
    confidence -= result.warnings.length * 0.1;

    if (result.entry.word && this.normalizer.isDainameseWord(result.entry.word)) {
      confidence += 0.1;
    }

    if (result.entry.definition && result.entry.definition.length > 20) {
      confidence += 0.05;
    }

    if (result.entry.pronunciation) {
      confidence += 0.05;
    }

    if (result.entry.examples && result.entry.examples.length > 0) {
      confidence += 0.05;
    }

    // Text quality bonus for well-structured entries
    if (result.entry.sourceFile && result.entry.sourceFile.length > 0) {
      confidence += 0.02;
    }

    result.confidence = Math.max(0, Math.min(1, confidence));
  }

  batchValidate(entries) {
    const results = [];
    const stats = {
      total: entries.length,
      valid: 0,
      invalid: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
      averageConfidence: 0
    };

    let totalConfidence = 0;

    for (const entry of entries) {
      const validation = this.validateEntry(entry);
      results.push(validation);

      if (validation.isValid) {
        stats.valid++;
      } else {
        stats.invalid++;
      }

      totalConfidence += validation.confidence;

      if (validation.confidence >= 0.8) {
        stats.highConfidence++;
      } else if (validation.confidence >= 0.5) {
        stats.mediumConfidence++;
      } else {
        stats.lowConfidence++;
      }
    }

    stats.averageConfidence = totalConfidence / entries.length;

    return {
      results,
      stats,
      timestamp: new Date().toISOString()
    };
  }

  filterValidEntries(validations, minConfidence = 0.5) {
    return validations
      .filter(validation => validation.isValid && validation.confidence >= minConfidence)
      .map(validation => validation.entry);
  }
}

module.exports = EntryValidator;