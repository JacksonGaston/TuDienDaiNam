const logger = require('../utils/logger');
const DainameseNormalizer = require('./dainamese-normalizer');

const DASH_TOKENS = /[—―]|--/g;
const HAS_DASH_RE = /[—―]|--/;
const MARKER_START_RE = /^[|{}#\[\]]/;
const DASH_START_RE = /^[—―-]/;
const ANCESTOR_PREFIX_RE = /^([\u3000-\u303F\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uE000-\uF8FF\u{20000}-\u{2FA1F}\s\|]*)/u;
const VIET_LETTER = '[a-zA-ZÀ-ỹ]';
const VIET_WORD = '[a-zA-ZÀ-ỹ][a-zA-ZÀ-ỹ\\s\\-]*';
const WORD_PERIOD_RE = new RegExp('^' + VIET_WORD + '\\.\\s', 'u');
const WORD_PERIOD_END_RE = new RegExp('^' + VIET_WORD + '\\.\\s*$', 'u');
const WORD_PERIOD_BARE_RE = new RegExp('^' + VIET_WORD + '\\.', 'u');

function stripToSingleDash(text) {
  return text.replace(DASH_TOKENS, '—');
}

class TextParser {
  constructor() {
    this.normalizer = new DainameseNormalizer();
  }

  async parseTextFile(textFile) {
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
  }

  extractDictionaryEntries(text, textFile = null) {
    const entries = [];
    const lines = text.split(/\r?\n/);
    let currentBlock = null;
    let blockIndex = -1;
    for (const line of lines) {
      if (this.isHeadwordLine(line)) {
        if (currentBlock) {
          this.finalizeBlock(currentBlock, blockIndex, textFile, entries);
        }
        blockIndex++;
        currentBlock = { firstLine: line, continuationLines: [] };
      } else {
        if (!currentBlock) {
          logger.warn('Parser: ignoring non-headword line before any block');
          continue;
        }
        currentBlock.continuationLines.push(line);
      }
    }
    if (currentBlock) {
      this.finalizeBlock(currentBlock, blockIndex, textFile, entries);
    }
    return this.mergeDuplicateEntries(entries);
  }

  mergeDuplicateEntries(entries) {
    const groups = new Map();
    const order = [];
    for (const entry of entries) {
      const key = entry.word;
      if (!groups.has(key)) {
        groups.set(key, []);
        order.push(key);
      }
      groups.get(key).push(entry);
    }

    const merged = [];
    for (const key of order) {
      const group = groups.get(key);
      if (group.length === 1) {
        const entry = group[0];
        const compounds = (entry.compounds || []).map(c => ({ ...c, blockIndex: 0 }));
        const meaningBlocks = [{
          meaning: entry.meaning || '',
          ancientChar: entry.ancientChar || '',
          blockIndex: 0,
          wordType: entry.wordType || ''
        }];
        merged.push(this.finalizeEntry({
          ...entry,
          compounds,
          meaningBlocks
        }));
        continue;
      }

      const primary = group[0];
      const meanings = [];
      const seenMeanings = new Set();
      for (const e of group) {
        const m = (e.meaning || '').trim();
        if (m && !seenMeanings.has(m)) {
          seenMeanings.add(m);
          meanings.push(m);
        }
      }

      const allCompounds = [];
      const meaningBlocks = [];
      const seenChars = new Set();
      const ancientChars = [];
      for (let i = 0; i < group.length; i++) {
        const e = group[i];
        meaningBlocks.push({
          meaning: (e.meaning || '').trim(),
          ancientChar: (e.ancientChar || '').trim(),
          blockIndex: i,
          wordType: e.wordType || ''
        });
        for (const c of (e.compounds || [])) {
          allCompounds.push({ ...c, blockIndex: i });
        }
        const ch = (e.ancientChar || '').trim();
        if (ch && !seenChars.has(ch)) {
          seenChars.add(ch);
          ancientChars.push(ch);
        }
      }

      const mergedEntry = {
        ...primary,
        meaning: meanings.join('\n'),
        compounds: allCompounds,
        meaningBlocks: meaningBlocks,
        ancientChar: ancientChars.join(' ')
      };

      merged.push(this.finalizeEntry(mergedEntry));
    }

    return merged;
  }

  finalizeBlock(block, blockIndex, textFile, entries) {
    const parsedEntry = this.parseBlock(block, blockIndex, textFile);
    if (parsedEntry) {
      entries.push(parsedEntry);
    }
  }

  isHeadwordLine(line) {
    if (!line) return false;
    const t = line.trim();
    if (!t) return false;
    const ts = line.trimStart();
    if (MARKER_START_RE.test(ts)) return false;
    if (DASH_START_RE.test(ts)) return false;
    const tab = line.indexOf('\t');
    if (tab === -1) return false;
    const after = line.slice(tab + 1);
    if (!WORD_PERIOD_RE.test(after)) return false;
    const fp = after.indexOf('.');
    const fd = after.search(HAS_DASH_RE);
    if (fd !== -1 && fp !== -1 && fd < fp) return false;
    if (fd !== -1 && fp === -1) return false;
    return true;
  }

  parseBlock(block, blockIndex, textFile) {
    try {
      const firstLine = block.firstLine;
      const { ancientChar, wordLine } = this.splitAncestor(firstLine);
      if (!wordLine) return null;

      const head = this.extractHeadwordParts(wordLine);
      if (!head) return null;
      const { word, pronunciation, wordType, meaning: rawMeaning, inlineCompounds } = head;

      const entry = {
        word: word,
        originalWord: word,
        pronunciation: this.normalizer.normalizeText(pronunciation || ''),
        wordType: this.normalizer.normalizeText(wordType || ''),
        meaning: this.normalizer.normalizeText(rawMeaning || ''),
        compounds: [],
        sourceLine: blockIndex + 1,
        sourceFile: textFile?.filename || '',
        textQuality: textFile?.quality || 1.0,
        ancientChar: this.normalizer.normalizeText(ancientChar || ''),
        rawText: firstLine.trim()
      };

      for (const c of inlineCompounds) {
        const comp = this.parseCompoundStatement(c, word, ancientChar, true);
        if (comp) entry.compounds.push(comp);
      }
      for (const line of block.continuationLines) {
        const comp = this.parseCompoundLine(line, word, ancientChar);
        if (comp) entry.compounds.push(comp);
      }

      return this.finalizeEntry(entry);
    } catch (error) {
      logger.warn(`Failed to parse block at index ${blockIndex}: ${error.message}`);
      return null;
    }
  }

  splitAncestor(firstLine) {
    const t = firstLine.trim();
    const m = t.match(ANCESTOR_PREFIX_RE);
    const prefix = m ? m[1] : '';
    const wordLine = m ? t.slice(m[0].length) : t;
    const ancientChar = prefix.replace(/\s/g, '').replace(/\|/g, '');
    return { ancientChar: ancientChar || '', wordLine };
  }

  extractHeadwordParts(afterTab) {
    try {
      let rest = afterTab.trim();
      const wordMatch = rest.match(/^([^\.]+?)\./);
      if (!wordMatch) return null;
      const word = wordMatch[1].trim();
      if (!word) return null;
      rest = rest.substring(wordMatch[0].length).trim();

      let pronunciation = '';
      const pronMatch = PRON_PAREN.exec(rest);
      if (pronMatch) {
        pronunciation = pronMatch[1].trim().replace(/\.$/, '');
        rest = rest.substring(pronMatch[0].length).trim();
      }

      // Word types in this dictionary are only the abbreviations c. (chữ) and
      // n. — possibly repeated, e.g. "c. n.". A bare "c."/"n." token can also
      // appear at end-of-line (meaning omitted), and must still be captured as
      // a type token instead of falling through into the meaning text.
      const typeTokens = [];
      let m;
      const localType = /^([cCnN])\.(?:\s+|$)/g;
      while ((m = localType.exec(rest)) !== null) {
        if (m.index === 0 || rest[m.index - 1] === ' ') {
          typeTokens.push(m[1]);
          rest = rest.substring(m[0].length);
          localType.lastIndex = 0;
        } else {
          break;
        }
      }

      const wordType = typeTokens.map(t => t + '.').join(' ');

      const inlineCompounds = [];
      let meaning = rest.trim();
      const dashIdx = meaning.search(HAS_DASH_RE);
      if (dashIdx !== -1) {
        const cut = meaning.lastIndexOf('.', dashIdx);
        if (cut !== -1) {
          const compoundPart = meaning.substring(cut + 1).trim();
          meaning = meaning.substring(0, cut).trim();
          inlineCompounds.push(compoundPart);
        }
      }

      return { word, pronunciation, wordType, meaning, inlineCompounds };
    } catch (error) {
      logger.warn(`Failed to extract headword parts: ${error.message}`);
      return null;
    }
  }

  parseCompoundLine(line, headword, ancientChar) {
    const raw = line.trim();
    if (!raw) return null;
    if (raw.startsWith('{')) return null;
    if (/^\}+$/.test(raw)) return null;
    return this.parseCompoundStatement(raw, headword, ancientChar, false);
  }

  parseCompoundStatement(statement, headword, ancientChar, isInline) {
    const cleaned = stripToSingleDash(statement);
    const { text, variant } = stripVariantPrefix(cleaned);
    const { phrase, meaning } = this.splitPhraseMeaning(text);
    return this.buildCompound(phrase, meaning, variant, headword, ancientChar);
  }

  splitPhraseMeaning(text) {
    const pipeIdx = text.indexOf('|');
    if (pipeIdx !== -1) {
      const before = text.substring(0, pipeIdx).trim();
      const after = text.substring(pipeIdx + 1).trim();
      const head = HAS_DASH_RE.test(before) ? before : (HAS_DASH_RE.test(after) ? after : before);
      const other = HAS_DASH_RE.test(before) ? after : before;
      return { phrase: head, meaning: other };
    }
    const dotIdx = text.indexOf('.');
    if (dotIdx === -1) {
      return { phrase: text.trim(), meaning: '' };
    }
    return {
      phrase: text.substring(0, dotIdx).trim(),
      meaning: text.substring(dotIdx + 1).trim()
    };
  }

  buildCompound(phrase, meaning, variant, headword, ancientChar) {
    let phraseCore = phrase;
    const stripped = stripVariantPrefix(phraseCore);
    const finalVariant = variant || stripped.variant;
    phraseCore = stripped.text;

    const expanded = phraseCore.replace(DASH_TOKENS, headword);
    if (!expanded) {
      return null;
    }

    return {
      phrase: this.normalizer.normalizeText(phraseCore),
      compound: this.normalizer.normalizeText(expanded),
      rawPhrase: this.normalizer.normalizeText(phrase),
      meaning: this.normalizer.normalizeText(meaning || ''),
      ancientChars: this.normalizer.normalizeText(finalVariant || ancientChar),
      isCompound: true
    };
  }

  finalizeEntry(entry) {
    entry.normalizedWord = this.normalizer.normalizeForSearch(entry.word);
    entry.searchVariations = this.normalizer.generateSearchVariations(entry.word);
    entry.definition = this.buildDefinition(entry);
    return entry;
  }

  buildDefinition(entry) {
    const parts = [];
    let header = `${entry.word}. ${entry.wordType || ''}`.trim();
    if (entry.pronunciation) header += ` [${entry.pronunciation}]`;
    parts.push(header);
    parts.push(entry.meaning);
    for (const c of (entry.compounds || [])) {
      parts.push(c.compound + (c.meaning ? `. ${c.meaning}` : ''));
    }
    return parts.filter(p => p).join('\n');
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
      totalCompounds: 0,
      averageEntriesPerFile: 0
    };

    for (const textFile of textFiles) {
      try {
        const parsedResult = await this.parseTextFile(textFile);
        allEntries.push(...parsedResult.parsedEntries);
        parsingStats.successfulParses++;
        parsingStats.totalEntries += parsedResult.parsedEntries.length;
        parsingStats.totalCompounds += parsedResult.parsedEntries.reduce((sum, e) => sum + (e.compounds?.length || 0), 0);
      } catch (error) {
        await logger.error(`Failed to parse ${textFile.filename}`, { error: error.message });
      }
    }

    parsingStats.averageEntriesPerFile = parsingStats.successfulParses > 0
      ? parsingStats.totalEntries / parsingStats.successfulParses
      : 0;

    return {
      entries: allEntries,
      stats: parsingStats,
      timestamp: new Date().toISOString()
    };
  }

  validateEntry(entry) {
    const errors = [];
    if (!entry.word || entry.word.length < 1) errors.push('Word is missing');
    if (!entry.meaning || entry.meaning.trim().length < 2) errors.push('Definition is too short or missing');
    if (entry.word === entry.meaning) errors.push('Word and meaning are identical');
    return { isValid: errors.length === 0, errors };
  }
}

function stripAncestorPrefix(t) {
  const m = t.match(ANCESTOR_PREFIX_RE);
  return m ? t.slice(m[0].length) : t;
}

function stripVariantPrefix(line) {
  const m = line.match(/^[| \t]*([\u3000-\u303F\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uE000-\uF8FF\u{20000}-\u{2FA1F}]+)?[| \t]*/u);
  if (!m) return { text: line.trim(), variant: '' };
  const variant = m[1] || '';
  let rest = line.substring(m[0].length);
  rest = rest.replace(/^[| ]+/, '').trim();
  return { text: rest, variant: (variant || '').trim() };
}

const PRON_PAREN = /^\(([^)]*)\)\s*/;

module.exports = TextParser;
