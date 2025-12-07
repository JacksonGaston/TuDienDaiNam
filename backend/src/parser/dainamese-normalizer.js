const logger = require('../utils/logger');

class DainameseNormalizer {
  constructor() {
    this.dainameseChars = {
      'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'å': 'a',
      'Á': 'A', 'À': 'A', 'Â': 'A', 'Ä': 'A', 'Ã': 'A', 'Å': 'A',
      'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
      'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
      'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
      'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
      'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o', 'ø': 'o',
      'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Ö': 'O', 'Õ': 'O', 'Ø': 'O',
      'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
      'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
      'ý': 'y', 'ÿ': 'y',
      'Ý': 'Y', 'Ÿ': 'Y',
      'ñ': 'n', 'Ñ': 'N',
      'ç': 'c', 'Ç': 'C',
      'æ': 'ae', 'Æ': 'AE',
      'œ': 'oe', 'Œ': 'OE'
    };

    this.wordSeparators = /[\s\n\r\t\-\—\–\.,;:!?'"()\[\]{}<>\\/]+/;
    this.cleanupPatterns = [
      { pattern: /^\s+|\s+$/g, replacement: '' },
      { pattern: /\s+/g, replacement: ' ' },
      { pattern: /[^\w\sáàâäãåçéèêëíìîïñóòôöõøúùûüýÿæœÁÀÂÄÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕØÚÙÛÜÝŸÆŒ\-\.,;:!?'"()\[\]{}<>\/]/g, replacement: '' }
    ];
  }

  normalizeText(text) {
    try {
      if (!text || typeof text !== 'string') {
        return '';
      }

      let normalized = text;
      
      for (const { pattern, replacement } of this.cleanupPatterns) {
        normalized = normalized.replace(pattern, replacement);
      }

      normalized = this.normalizeDainameseCharacters(normalized);
      
      return normalized.trim();
    } catch (error) {
      logger.error('Text normalization failed', { error: error.message });
      return text;
    }
  }

  normalizeDainameseCharacters(text) {
    let normalized = text;
    
    for (const [dainamese, replacement] of Object.entries(this.dainameseChars)) {
      normalized = normalized.replace(new RegExp(dainamese, 'g'), replacement);
    }
    
    return normalized;
  }

  normalizeWord(word) {
    if (!word || typeof word !== 'string') {
      return '';
    }

    return this.normalizeText(word.toLowerCase());
  }

  extractWords(text) {
    try {
      const normalizedText = this.normalizeText(text);
      const words = normalizedText.split(this.wordSeparators)
        .filter(word => word.length > 0)
        .map(word => this.normalizeWord(word))
        .filter(word => word.length > 1);
      
      return [...new Set(words)];
    } catch (error) {
      logger.error('Word extraction failed', { error: error.message });
      return [];
    }
  }

  isDainameseWord(word) {
    if (!word || typeof word !== 'string') {
      return false;
    }

    const dainameseRegex = /[áàâäãåçéèêëíìîïñóòôöõøúùûüýÿæœÁÀÂÄÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕØÚÙÛÜÝŸÆŒ]/;
    return dainameseRegex.test(word);
  }

  generateSearchVariations(word) {
    if (!word || typeof word !== 'string') {
      return [];
    }

    const variations = new Set([word]);
    const normalized = this.normalizeWord(word);
    
    variations.add(normalized);
    
    const withoutAccents = this.normalizeDainameseCharacters(normalized);
    variations.add(withoutAccents);
    
    if (word.length > 3) {
      for (let i = 1; i < word.length - 1; i++) {
        variations.add(word.substring(0, i));
        variations.add(word.substring(i));
      }
    }

    return Array.from(variations).filter(v => v.length > 1);
  }

  calculateSimilarity(word1, word2) {
    if (!word1 || !word2) return 0;
    
    const normalized1 = this.normalizeWord(word1);
    const normalized2 = this.normalizeWord(word2);
    
    if (normalized1 === normalized2) return 1.0;
    
    const longer = normalized1.length > normalized2.length ? normalized1 : normalized2;
    const shorter = normalized1.length > normalized2.length ? normalized2 : normalized1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

module.exports = DainameseNormalizer;