const logger = require("../utils/logger");

const DIACRITIC_MAP = {
  á: "a",
  à: "a",
  ả: "a",
  ã: "a",
  ạ: "a",
  ă: "a",
  ắ: "a",
  ằ: "a",
  ẳ: "a",
  ẵ: "a",
  ặ: "a",
  â: "a",
  ấ: "a",
  ầ: "a",
  ẩ: "a",
  ẫ: "a",
  ậ: "a",
  é: "e",
  è: "e",
  ẻ: "e",
  ẽ: "e",
  ẹ: "e",
  ê: "e",
  ế: "e",
  ề: "e",
  ể: "e",
  ễ: "e",
  ệ: "e",
  í: "i",
  ì: "i",
  ỉ: "i",
  ĩ: "i",
  ị: "i",
  ó: "o",
  ò: "o",
  ỏ: "o",
  õ: "o",
  ọ: "o",
  ô: "o",
  ố: "o",
  ồ: "o",
  ổ: "o",
  ỗ: "o",
  ộ: "o",
  ơ: "o",
  ớ: "o",
  ờ: "o",
  ở: "o",
  ỡ: "o",
  ợ: "o",
  ú: "u",
  ù: "u",
  ủ: "u",
  ũ: "u",
  ụ: "u",
  ư: "u",
  ứ: "u",
  ừ: "u",
  ử: "u",
  ữ: "u",
  ự: "u",
  ý: "y",
  ỳ: "y",
  ỷ: "y",
  ỵ: "y",
  đ: "d",
  Á: "a",
  À: "a",
  Ả: "a",
  Ã: "a",
  Ạ: "a",
  Ă: "a",
  Ắ: "a",
  Ằ: "a",
  Ẳ: "a",
  Ẵ: "a",
  Ặ: "a",
  Â: "a",
  Ấ: "a",
  Ầ: "a",
  Ẩ: "a",
  Ẫ: "a",
  Ậ: "a",
  É: "e",
  È: "e",
  Ẻ: "e",
  Ẽ: "e",
  Ẹ: "e",
  Ê: "e",
  Ế: "e",
  Ề: "e",
  Ể: "e",
  Ễ: "e",
  Ệ: "e",
  Í: "i",
  Ì: "i",
  Ỉ: "i",
  Ĩ: "i",
  Ị: "i",
  Ó: "o",
  Ò: "o",
  Ỏ: "o",
  Õ: "o",
  Ọ: "o",
  Ô: "o",
  Ố: "o",
  Ồ: "o",
  Ổ: "o",
  Ỗ: "o",
  Ộ: "o",
  Ơ: "o",
  Ớ: "o",
  Ờ: "o",
  Ở: "o",
  Ỡ: "o",
  Ợ: "o",
  Ú: "u",
  Ù: "u",
  Ủ: "u",
  Ũ: "u",
  Ụ: "u",
  Ư: "u",
  Ứ: "u",
  Ừ: "u",
  Ử: "u",
  Ữ: "u",
  Ự: "u",
  Ý: "y",
  Ỳ: "y",
  Ỷ: "y",
  Ỹ: "y",
  Ỵ: "y",
  Đ: "d",
};

// Tones-only strip: maps each accented Vietnamese vowel to its base-quality
// letter. Unlike DIACRITIC_MAP (which collapses base-letter quality too,
// e.g. ấ→a and đ→d), this keeps distinct letters distinct: ấ→â, ắ→ă, đ→đ.
// This is the second normal form used for Vietnamese-aware similarity — tone
// variants of the same root (đậu vs đâu vs đấu) collapse to one base form,
// while distinct base letters (đ vs d) stay distinguishable.
const TONE_STRIP_MAP = {
  á: "a",
  à: "a",
  ả: "a",
  ã: "a",
  ạ: "a",
  ắ: "ă",
  ằ: "ă",
  ẳ: "ă",
  ẵ: "ă",
  ặ: "ă",
  ấ: "â",
  ầ: "â",
  ẩ: "â",
  ẫ: "â",
  ậ: "â",
  é: "e",
  è: "e",
  ẻ: "e",
  ẽ: "e",
  ẹ: "e",
  ế: "ê",
  ề: "ê",
  ể: "ê",
  ễ: "ê",
  ệ: "ê",
  í: "i",
  ì: "i",
  ỉ: "i",
  ĩ: "i",
  ị: "i",
  ó: "o",
  ò: "o",
  ỏ: "o",
  õ: "o",
  ọ: "o",
  ố: "ô",
  ồ: "ô",
  ổ: "ô",
  ỗ: "ô",
  ộ: "ô",
  ớ: "ơ",
  ờ: "ơ",
  ở: "ơ",
  ỡ: "ơ",
  ợ: "ơ",
  ú: "u",
  ù: "u",
  ủ: "u",
  ũ: "u",
  ụ: "u",
  ứ: "ư",
  ừ: "ư",
  ử: "ư",
  ữ: "ư",
  ự: "ư",
  ý: "y",
  ỳ: "y",
  ỷ: "y",
  ỹ: "y",
  ỵ: "y",
  Á: "a",
  À: "a",
  Ả: "a",
  Ã: "a",
  Ạ: "a",
  Ắ: "ă",
  Ằ: "ă",
  Ẳ: "ă",
  Ẵ: "ă",
  Ặ: "ă",
  Ấ: "â",
  Ầ: "â",
  Ẩ: "â",
  Ẫ: "â",
  Ậ: "â",
  É: "e",
  È: "e",
  Ẻ: "e",
  Ẽ: "e",
  Ẹ: "e",
  Ế: "ê",
  Ề: "ê",
  Ể: "ê",
  Ễ: "ê",
  Ệ: "ê",
  Í: "i",
  Ì: "i",
  Ỉ: "i",
  Ĩ: "i",
  Ị: "i",
  Ó: "o",
  Ò: "o",
  Ỏ: "o",
  Õ: "o",
  Ọ: "o",
  Ố: "ô",
  Ồ: "ô",
  Ổ: "ô",
  Ỗ: "ô",
  Ộ: "ô",
  Ớ: "ơ",
  Ờ: "ơ",
  Ở: "ơ",
  Ỡ: "ơ",
  Ợ: "ơ",
  Ú: "u",
  Ù: "u",
  Ủ: "u",
  Ũ: "u",
  Ụ: "u",
  Ứ: "ư",
  Ừ: "ư",
  Ử: "ư",
  Ữ: "ư",
  Ự: "ư",
  Ý: "y",
  Ỳ: "y",
  Ỷ: "y",
  Ỹ: "y",
  Ỵ: "y",
};

// Base-quality vowels (tone-stripped form). Substituting one base vowel for
// another (ă↔â↔a, ô↔o, …) is a "lighter" edit than swapping consonants (đ↔d):
// both are Vietnamese look-alike word families, but vowel-quality variants are
// much closer than a consonant-letter change.
const VIETNAMESE_BASE_VOWELS = "aăâeêioôơuưy";

// Vietnamese collation order: alphabet (a ă â b c d đ e ê g h i k l m n o ô ơ
// p q r s t u ư v x y), with tone marks ordered ngang, sắc, huyền, hỏi, ngã, nặng
// within each vowel (standard VNI order). Used as a deterministic final
// tie-break so the same base form sorts predictably (Đâu before Đấu before
// Đầu …).
const VIETNAMESE_ORDER =
  "\u0061\u00e1\u00e0\u1ea3\u00e3\u1ea1" +
  "\u0103\u1eaf\u1eae\u1eb3\u1eb5\u1eb7" +
  "\u00e2\u1ea5\u1ea7\u1ea9\u1eab\u1ead" +
  "bcd\u0111" +
  "\u0065\u00e9\u00e8\u1ebb\u1ebd\u1eb9" +
  "\u00ea\u1ebf\u1ec1\u1ec3\u1ec5\u1ec7" +
  "gh\u0069\u00ed\u00ec\u1ec9\u0128\u1ecb" +
  "klmn\u006f\u00f3\u00f2\u1ecf\u00f5\u1ecd" +
  "\u00f4\u1ed1\u1ed3\u1ed5\u1ed7\u1ed9" +
  "\u01a1\u1edb\u1edd\u1edf\u1ee1\u1ee3" +
  "pqrst\u0075\u00fa\u00f9\u1ee7\u0169\u1ee5" +
  "\u01b0\u1ee9\u1eeb\u1eed\u1eef\u1ef1" +
  "vx\u0079\u00fd\u1ef3\u1ef7\u1ef9\u1ef5";
const VN_ORDER_INDEX = new Map();
for (let i = 0; i < VIETNAMESE_ORDER.length; i++) {
  VN_ORDER_INDEX.set(VIETNAMESE_ORDER[i], i);
}

function vietnameseCompare(a, b) {
  const sa = String(a || "").toLowerCase();
  const sb = String(b || "").toLowerCase();
  const n = Math.min(sa.length, sb.length);
  for (let i = 0; i < n; i++) {
    const ca = sa[i];
    const cb = sb[i];
    if (ca === cb) continue;
    const ia = VN_ORDER_INDEX.has(ca) ? VN_ORDER_INDEX.get(ca) : -1;
    const ib = VN_ORDER_INDEX.has(cb) ? VN_ORDER_INDEX.get(cb) : -1;
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return ca < cb ? -1 : 1;
  }
  return sa.length - sb.length;
}

// Class-aware Levenshtein over base forms: vowel-quality substitutions cost
// 0.6, every other change (consonant↔consonant incl. đ↔d, consonant↔vowel,
// insertions, deletions) costs 1.0.
function weightedEditDistance(a, b) {
  if (!a) return b ? b.length : 0;
  if (!b) return a.length;
  const m = a.length;
  const n = b.length;
  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const x = a[i - 1];
      const y = b[j - 1];
      let cost;
      if (x === y) cost = 0;
      else if (
        VIETNAMESE_BASE_VOWELS.includes(x) &&
        VIETNAMESE_BASE_VOWELS.includes(y)
      ) {
        cost = 0.6;
      } else {
        cost = 1.0;
      }
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

function relatedScore(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1.0;
  const dist = weightedEditDistance(a, b);
  const maxLen = Math.max(a.length, b.length, 1);
  return Math.max(0, 1 - dist / maxLen);
}

class DainameseNormalizer {
  constructor() {}

  normalizeText(text) {
    try {
      if (!text || typeof text !== "string") {
        return "";
      }
      const normalized = text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n[ \t]+/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      return normalized;
    } catch (error) {
      logger.error("Text normalization failed", { error: error.message });
      return text || "";
    }
  }

  normalizeWord(word) {
    if (!word || typeof word !== "string") {
      return "";
    }
    return this.normalizeForSearch(word);
  }

  normalizeForSearch(word) {
    if (!word || typeof word !== "string") {
      return "";
    }
    let result = word.toLowerCase();
    for (const [accented, base] of Object.entries(DIACRITIC_MAP)) {
      result = result.split(accented).join(base);
    }
    result = result
      .replace(/[^a-z0-9]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return result;
  }

  normalizeDainameseCharacters(text) {
    return this.normalizeForSearch(text);
  }

  extractWords(text) {
    try {
      const normalizedText = this.normalizeText(text);
      const words = normalizedText
        .split(/[\s\n\r\t\-—–.,;:!?'"()[\]{}<>\\/]+/)
        .filter((word) => word.length > 0)
        .map((word) => this.normalizeForSearch(word))
        .filter((word) => word.length > 1);
      return [...new Set(words)];
    } catch (error) {
      logger.error("Word extraction failed", { error: error.message });
      return [];
    }
  }

  generateSearchVariations(word) {
    if (!word || typeof word !== "string") {
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
    return Array.from(variations).filter((v) => v && v.length > 1);
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
        return 0.5 + ratio * 0.5;
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
            matrix[i - 1][j] + 1,
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  normalizeBaseWord(word) {
    if (!word || typeof word !== "string") {
      return "";
    }
    const result = word.toLowerCase();
    let out = "";
    for (const ch of result) {
      out += TONE_STRIP_MAP[ch] || ch;
    }
    return out.replace(/[^a-zđăâêôơư]/g, "");
  }

  weightedEditDistance(a, b) {
    return weightedEditDistance(a, b);
  }

  relatedScore(a, b) {
    return relatedScore(a, b);
  }

  vietnameseCompare(a, b) {
    return vietnameseCompare(a, b);
  }
}

module.exports = DainameseNormalizer;
module.exports.vietnameseCompare = vietnameseCompare;
module.exports.relatedScore = relatedScore;
module.exports.weightedEditDistance = weightedEditDistance;
module.exports.normalizeBaseWord = (word) =>
  new DainameseNormalizer().normalizeBaseWord(word);
module.exports.VIETNAMESE_BASE_VOWELS = VIETNAMESE_BASE_VOWELS;
