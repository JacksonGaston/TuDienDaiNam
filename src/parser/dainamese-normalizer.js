const logger = require('../utils/logger');

const VIETNAMESE_CHARS = 'áàảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệíỉịĩọôồổỗộpơq';

const VIETNAMESE_LOWER = 'aáàảãạăắằẳẵặâấầẩẫậăêếềểễệđèéẻẽẹêíỉịĩñoòỏõọôồổỗộơờởỡợụủủụũưứừửữựỵ';

const VIETNAMESE_UPPER = 'ÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÍỈỊĨÕ';

const VIETNAMESE_ALL = VIETNAMESE_LOWER + VIETNAMESE_UPPER + 'đĐ';

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
  'á': 'a', 'đ': 'd',
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

class DainameseNormalizer {
  constructor() {
    this.dainameseRegex = new RegExp(
      '[áàảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệíỉịĩóòỏõọôồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÍỈĨÕÔỒỔỖỘƠỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ]'
    );
  }

  normalizeText(text) {
    try {
      if (!text || typeof text !== 'string') {
        return '';
      }
      let normalized = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      return normalized;
    } catch (error) {
      logger.error('Text normalization failed', { error: error.message });
      return text || '';
    }
  }

  normalizeWord(word) {
    if (!word || typeof word !== 'string') {
      return '';
    }
    return this.normalizeForSearch(word);
  }

  normalizeForSearch(word) {
    if (!word || typeof word !== 'string') {
      return '';
    }
    let result = word.toLowerCase();
    for (const [accented, base] of Object.entries(DIACRITIC_MAP)) {
      result = result.split(accented).join(base);
    }
    result = result.replace(/[^a-z0-9]/g, '').replace(/\s+/g, ' ').trim();
    return result;
  }

  normalizeDainameseCharacters(text) {
    return this.normalizeForSearch(text);
  }

  extractWords(text) {
    try {
      const normalizedText = this.normalizeText(text);
      const words = normalizedText
        .split(/[\s\n\r\t\-\—–\.,;:!?'"()\[\]{}<>\\/]+/)
        .filter(word => word.length > 0)
        .map(word => this.normalizeForSearch(word))
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
    if (this.dainameseRegex.test(word)) {
      return true;
    }
    return false;
  }

  isVietnameseWord(word) {
    return this.isDainameseWord(word);
  }

  generateSearchVariations(word) {
    if (!word || typeof word !== 'string') {
      return [];
    }
    const variations = new Set([word]);
    const normalized = this.normalizeForSearch(word);
    if (normalized) {
      variations.add(normalized);
    }
    if (word.length > 3) {
      for (let i = 1; i < word.length - 1; i++) {
        variations.add(word.substring(0, i));
        variations.add(word.substring(i));
      }
    }
    return Array.from(variations).filter(v => v && v.length > 1);
  }

  calculateSimilarity(word1, word2) {
    if (!word1 || !word2) {
      return 0;
    }
    const norm1 = this.normalizeForSearch(word1);
    const norm2 = this.normalizeForSearch(word2);
    if (!norm1 || !norm2) {
      return 0;
    }
    if (norm1 === norm2) {
      return 1.0;
    }
    const longer = norm1.length > norm2.length ? norm1 : norm2;
    const shorter = norm1.length > norm2.length ? norm2 : norm1;
    if (longer.length === 0) {
      return 1.0;
    }
    if (longer.startsWith(shorter) || shorter.startsWith(longer)) {
      const ratio = shorter.length / longer.length;
      if (ratio >= 0.5) {
        return 0.5 + (ratio * 0.5);
      }
    }
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
