import { Platform } from "react-native";
import { Asset } from "expo-asset";
import {
  openDatabaseAsync,
  deserializeDatabaseAsync,
  deleteDatabaseAsync,
  importDatabaseFromAssetAsync,
} from "expo-sqlite";
import {
  getAssetBytes,
  setAssetBytes,
  deleteAsset,
} from "../web/localAssetCache";

const DATABASE_ASSET = require("../../assets/database/dictionary.db");
const DB_NAME = "dictionary.db";

// Version stamped into the SQLite file (PRAGMA user_version) when the DB is
// generated (src/database/generate-db.js). The web loader checks the cached
// copy against this number and re-fetches once when the local cache is stale
// — in dev mode the asset URL is not content-hashed, so a rebuilt dictionary.db
// would otherwise be served from IndexedDB/service-worker forever. Bump BOTH
// this constant and the generator's pragma on every data-relevant rebuild.
const DICTIONARY_DB_VERSION = 4;

// Thrown when a critical binary asset (DB/WASM) was served as an HTML error
// page — i.e. a poisoned cache from a previous broken deploy. This is the only
// failure mode that should trigger the service-worker heal + reload.
class PoisonedAssetError extends Error {}

// Resolve once the page is controlled by an active service worker, or after a
// timeout. On a cold, offline PWA launch the SW is not controlling the page
// during early boot, so the cached .wasm/.db assets are only served once it is.
// Waiting here prevents hanging on a dead network request (see sw-source.js
// cache-first handler). The wasm fetch is issued internally by expo-sqlite, so
// this gate must run before deserializeDatabaseAsync as well.
function waitForServiceWorkerController(timeoutMs = 4000) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve();
  }
  const sw = navigator.serviceWorker;
  if (sw.controller) return Promise.resolve();
  const onController = () =>
    new Promise((resolve) => {
      sw.addEventListener("controllerchange", () => resolve(), { once: true });
    });
  return Promise.race([
    onController(),
    sw.ready.then(() => (sw.controller ? undefined : onController())),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

// Fetch the database asset with resilience AND stream progress: a hanging/offline
// network request must never block the app forever, but while bytes arrive we
// report how many have been downloaded so the UI can show a real progress bar.
// Precedence for offline-first behaviour (no network wait on repeat launches):
//   1. IndexedDB local store (instant, fully offline, no 13 MB re-download).
//   2. Service Worker / HTTP cache (offline-safe, no progress).
//   3. Network fetch with progress (only reached when online for the very first
//      launch, then persisted to IndexedDB for next time).
async function fetchDatabaseWithProgress(uri, onProgress) {
  const isHtml = (res) => {
    const ct = (res && res.headers && res.headers.get("content-type")) || "";
    return ct.includes("text/html");
  };
  const report = (loaded, total) => {
    if (onProgress) {
      onProgress({
        stage: "download",
        loaded,
        total,
        percent: total ? loaded / total : 0,
      });
    }
  };

  // 1) Local IndexedDB store — instant, offline-first, no re-download.
  // Skipped in dev: the dev asset URL is not content-hashed, so a rebuilt
  // database would otherwise forever be masked by the stale cached bytes.
  if (typeof __DEV__ === "undefined" || !__DEV__) {
    try {
      const local = await getAssetBytes(uri);
      if (local && local.byteLength > 0) {
        report(local.byteLength, local.byteLength);
        return { bytes: local, poisoned: false, source: "idb" };
      }
    } catch {
      /* fall through to cache/network */
    }
  }

  // Stream a fetch response into a single Uint8Array, reporting progress as we go.
  const streamFetch = async (opts) => {
    const res = await fetch(uri, { cache: "reload", ...opts });
    if (!res.ok) return null;
    if (!res.body || !res.body.getReader) {
      // Environment without a readable stream (rare) — one-shot read, no progress.
      const bytes = new Uint8Array(await res.arrayBuffer());
      report(bytes.length, bytes.length);
      return { bytes, poisoned: isHtml(res) };
    }
    const total = Number(res.headers.get("content-length")) || 0;
    const reader = res.body.getReader();
    const chunks = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      report(loaded, total);
    }
    const bytes = new Uint8Array(loaded);
    let offset = 0;
    for (const c of chunks) {
      bytes.set(c, offset);
      offset += c.length;
    }
    return { bytes, poisoned: isHtml(res) };
  };

  // 2) Service Worker / HTTP cache (no progress bar, but offline-safe).
  if (typeof caches !== "undefined") {
    try {
      const cached = await caches.match(uri, { ignoreSearch: true });
      if (cached) {
        const bytes = new Uint8Array(await cached.arrayBuffer());
        report(bytes.length, bytes.length);
        const poisoned = isHtml(cached);
        // Persist to IndexedDB so future launches read locally and skip the network.
        if (!poisoned && bytes.length > 0)
          setAssetBytes(uri, bytes).catch(() => {});
        return { bytes, poisoned, source: "cache" };
      }
    } catch {
      /* fall through to last-resort network fetch */
    }
  }

  // 3) Last-resort network fetch with progress (reached online for the first
  //    launch). Persist to IndexedDB for next time.
  const result = await streamFetch();
  if (result && !result.poisoned && result.bytes && result.bytes.length > 0) {
    setAssetBytes(uri, result.bytes).catch(() => {});
  }
  return result;
}

// Discard every locally cached copy of the database (IndexedDB store and any
// service-worker cache entries) so the next fetch has to come from the network.
async function dropCachedAsset(uri) {
  try {
    await deleteAsset(uri);
  } catch {}
  if (typeof caches !== "undefined") {
    try {
      const names = await caches.keys();
      for (const name of names) {
        const cache = await caches.open(name);
        await cache.delete(uri, { ignoreSearch: true });
      }
    } catch {}
  }
}

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
  ỹ: "y",
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
// letter (keeps ă/â/ê/ô/ơ/ư and đ distinct — they are separate letters, not
// diacritic variants). Second normal form used for Vietnamese-aware similarity:
// tone variants of the same root (đậu vs đâu vs đấu) collapse to one base
// form, while distinct base letters (đ vs d) stay distinguishable.
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

const VIETNAMESE_BASE_VOWELS = "aăâeêioôơuưy";

// Base-quality vowels (tone-stripped form). Substituting one base vowel for
// another (ă↔â↔a, ô↔o, …) is a lighter edit than swapping consonants (đ↔d).

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

function normalizeBaseWord(word) {
  if (!word || typeof word !== "string") return "";
  const result = word.toLowerCase();
  let out = "";
  for (const ch of result) {
    out += TONE_STRIP_MAP[ch] || ch;
  }
  // keep đ/ă/â/ê/ô/ơ/ư and a-z, drop everything else
  return out.replace(/[^a-zđăâêôơư]/g, "");
}
function normalizeForSearch(word) {
  if (!word || typeof word !== "string") return "";
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

function levenshtein(a, b) {
  if (!a) return b ? b.length : 0;
  if (!b) return a.length;
  a = a.toLowerCase();
  b = b.toLowerCase();
  const m = a.length,
    n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

const WORD_COLUMNS =
  "id, word, pronunciation, word_type AS wordType, meaning, ancient_char AS ancientChar, meaning_blocks AS meaningBlocks, source_file AS sourceFile, text_quality AS textQuality";

function rankByQuery(q) {
  const lower = (q || "").toLowerCase();
  return (a, b) => {
    const aExact = (a.word || "").toLowerCase() === lower ? 0 : 1;
    const bExact = (b.word || "").toLowerCase() === lower ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    return (a.word || "").localeCompare(b.word || "");
  };
}

// Vietnamese-aware suggestion tiers used by both the dropdown (getSuggestions)
// and searchWord's did-you-mean paths:
//   0 = exact word (case-insensitive); 1 = same base form (Đỗ ↔ Đố/Đồ/Đổ…);
//   2 = base-form prefix (Đỗ ↔ Đốc/Đối/Đồng…); 3 = folded-only (Đỗ ↔ Do/Dó…).
function suggestionTier(q, row) {
  const word = row.word || "";
  if (word.toLowerCase() === q.toLowerCase()) return 0;
  const qBase = normalizeBaseWord(q);
  const rBase = normalizeBaseWord(word);
  if (rBase === qBase) return 1;
  if (qBase.length >= 2 && rBase.startsWith(qBase)) return 2;
  return 3;
}

function rankBySuggestionTiers(q) {
  const lower = (q || "").toLowerCase();
  return (a, b) => {
    const ta = suggestionTier(q, a);
    const tb = suggestionTier(q, b);
    if (ta !== tb) return ta - tb;
    const aExact = (a.word || "").toLowerCase() === lower ? 0 : 1;
    const bExact = (b.word || "").toLowerCase() === lower ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    return vietnameseCompare(a.word || "", b.word || "");
  };
}

function dedupeById(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (item && item.id != null && !seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

class DictionaryService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.initPromise = null;
  }

  async executeQuery(sql, params = []) {
    await this.initialize();
    try {
      return await this.db.runAsync(sql, params);
    } catch (error) {
      console.error("Database query error:", error);
      throw error;
    }
  }

  async executeSelect(sql, params = []) {
    await this.initialize();
    try {
      return await this.db.getAllAsync(sql, params);
    } catch (error) {
      console.error("Database select error:", error);
      throw error;
    }
  }

  async executeGet(sql, params = []) {
    await this.initialize();
    try {
      return await this.db.getFirstAsync(sql, params);
    } catch (error) {
      console.error("Database get error:", error);
      throw error;
    }
  }

  async searchWord(query) {
    const q = (query || "").trim();
    if (!q) return { match: null, suggestions: [], notFound: true };

    let match = null;
    let suggestions = [];

    if (!match) {
      const exact = await this.findExactWord(q);
      match = exact ? this.mapWord(exact) : null;
      if (match) {
        suggestions = await this.getRelatedWords(match.id, 3);
      }
    }

    if (!match) {
      const normQ = normalizeForSearch(q);
      if (normQ) {
        const normRows = await this.executeSelect(
          `SELECT ${WORD_COLUMNS} FROM words WHERE normalized_word = ? ORDER BY word`,
          [normQ],
        );
        if (normRows.length > 0) {
          normRows.sort(rankBySuggestionTiers(q));
          match = this.mapWord(normRows[0]);
          suggestions = normRows.slice(1, 4).map((r) => this.mapSuggestion(r));
          const remaining = 3 - suggestions.length;
          if (remaining > 0) {
            const related = await this.getRelatedWords(match.id, remaining);
            suggestions.push(...related.map((r) => this.mapSuggestion(r)));
          }
        } else {
          const prefixRows = await this.executeSelect(
            `SELECT ${WORD_COLUMNS} FROM words WHERE normalized_word LIKE ? ORDER BY word LIMIT 12`,
            [normQ + "%"],
          );
          if (prefixRows.length > 0) {
            prefixRows.sort(rankBySuggestionTiers(q));
            match = this.mapWord(prefixRows[0]);
            suggestions = prefixRows
              .slice(1, 4)
              .map((r) => this.mapSuggestion(r));
          }
        }
      }

      // Fallback: substring search inside normalized_word. This catches entries
      // where the stored word contains extra text (e.g. pronunciation in parens
      // that was not stripped during parsing).
      if (!match && normQ && normQ.length >= 2) {
        const containsRows = await this.executeSelect(
          `SELECT ${WORD_COLUMNS} FROM words WHERE normalized_word LIKE ? ORDER BY word LIMIT 12`,
          ["%" + normQ + "%"],
        );
        if (containsRows.length > 0) {
          // Rank: prefer entries where normalized_word starts with the query,
          // then by Levenshtein distance to the full normalized_word.
          containsRows.sort((a, b) => {
            const aNorm = normalizeForSearch(a.word);
            const bNorm = normalizeForSearch(b.word);
            const aStarts = aNorm.startsWith(normQ) ? 0 : 1;
            const bStarts = bNorm.startsWith(normQ) ? 0 : 1;
            if (aStarts !== bStarts) return aStarts - bStarts;
            const aDist = levenshtein(normQ, aNorm);
            const bDist = levenshtein(normQ, bNorm);
            if (aDist !== bDist) return aDist - bDist;
            return (a.word || "").localeCompare(b.word || "");
          });
          match = this.mapWord(containsRows[0]);
          suggestions = containsRows
            .slice(1, 4)
            .map((r) => this.mapSuggestion(r));
        }
      }

      if (!match) {
        const ftsRows = await this.executeSelect(
          'SELECT id, word, word_type AS wordType, meaning FROM words WHERE word LIKE ? ESCAPE "\\" ORDER BY word LIMIT 3',
          [q.replace(/[\\%_]/g, "\\$&") + "%"],
        );
        suggestions = ftsRows.map((r) => this.mapSuggestion(r));
      }
    }

    suggestions = dedupeById(suggestions);

    if (match) {
      match.compounds = await this.getCompounds(match.id, match.meaningBlocks);
    }

    return { match, suggestions, notFound: !match };
  }

  async findExactWord(q) {
    const exact = await this.executeGet(
      `SELECT ${WORD_COLUMNS} FROM words WHERE word = ?`,
      [q],
    );
    if (exact) return exact;
    return this.executeGet(
      `SELECT ${WORD_COLUMNS} FROM words WHERE word = ? COLLATE NOCASE`,
      [q],
    );
  }

  async getRelatedWords(wordId, limit = 3) {
    // Rescore the stored candidates with Vietnamese-aware relatedness:
    // exact-base-form tone variants (Đậu ↔ Đâu/Đấu/Đầu) outrank consonant-swap
    // variants (Đậu ↔ Dâu) regardless of the build-time stored score. The
    // stored score (and its alphabetical tie-break) becomes advisory only.
    const self = await this.executeGet("SELECT word FROM words WHERE id = ?", [
      wordId,
    ]);
    if (!self || !self.word) return [];
    const base = normalizeBaseWord(self.word);
    const rows = await this.executeSelect(
      `SELECT w.id, w.word, w.word_type AS wordType, w.meaning
         FROM related_words r JOIN words w ON w.id = r.related_word_id
        WHERE r.word_id = ?
        ORDER BY r.score DESC
        LIMIT 12`,
      [wordId],
    );
    const scored = rows.map((r) => ({
      row: r,
      score: relatedScore(base, normalizeBaseWord(r.word)),
    }));
    scored.sort(
      (a, b) => b.score - a.score || vietnameseCompare(a.row.word, b.row.word),
    );
    return scored.slice(0, limit).map((s) => s.row);
  }

  async getCompounds(wordId, meaningBlocks = []) {
    const rows = await this.executeSelect(
      "SELECT block_index AS blockIndex, compound AS compound, meaning, ancient_chars AS ancientChars FROM compounds WHERE word_id = ? ORDER BY block_index, id",
      [wordId],
    );
    const blockMap = new Map();
    for (const r of rows) {
      const idx = r.blockIndex == null ? 0 : r.blockIndex;
      if (!blockMap.has(idx)) {
        blockMap.set(idx, {
          blockIndex: idx,
          meaning: "",
          ancientChar: "",
          wordType: "",
          compounds: [],
        });
      }
      blockMap.get(idx).compounds.push({
        compound: r.compound,
        meaning: r.meaning,
        ancientChars: r.ancientChars,
      });
    }
    for (const [idx, block] of blockMap) {
      const mb = meaningBlocks.find((b) => b.blockIndex === idx);
      if (mb) {
        block.meaning = mb.meaning || "";
        block.ancientChar = mb.ancientChar || "";
        block.wordType = mb.wordType || "";
      }
    }
    if (blockMap.size === 0 && meaningBlocks.length > 0) {
      for (const mb of meaningBlocks) {
        blockMap.set(mb.blockIndex || 0, {
          blockIndex: mb.blockIndex || 0,
          meaning: mb.meaning || "",
          ancientChar: mb.ancientChar || "",
          wordType: mb.wordType || "",
          compounds: [],
        });
      }
    }
    return Array.from(blockMap.values()).sort(
      (a, b) => a.blockIndex - b.blockIndex,
    );
  }

  mapWord(row) {
    return row
      ? {
          id: row.id,
          word: row.word,
          pronunciation: row.pronunciation || "",
          wordType: row.wordType || "",
          meaning: row.meaning || "",
          ancientChar: row.ancientChar || "",
          meaningBlocks: (() => {
            try {
              return row.meaningBlocks ? JSON.parse(row.meaningBlocks) : [];
            } catch {
              return [];
            }
          })(),
          sourceFile: row.sourceFile || "",
          textQuality: row.textQuality == null ? 1.0 : row.textQuality,
        }
      : null;
  }

  mapSuggestion(row) {
    return {
      id: row.id,
      word: row.word,
      wordType: row.wordType || "",
      meaning: row.meaning || "",
    };
  }

  async getWordById(wordId) {
    const row = await this.executeGet(
      `SELECT ${WORD_COLUMNS} FROM words WHERE id = ?`,
      [wordId],
    );
    if (!row) return null;
    const word = this.mapWord(row);
    word.compounds = await this.getCompounds(wordId, word.meaningBlocks);
    return word;
  }

  async getWordByWord(word) {
    if (!word) return null;
    const row = await this.executeGet(
      `SELECT ${WORD_COLUMNS} FROM words WHERE word = ?`,
      [word],
    );
    if (!row) return null;
    const mapped = this.mapWord(row);
    mapped.compounds = await this.getCompounds(mapped.id, mapped.meaningBlocks);
    return mapped;
  }

  async getSuggestions(query, limit = 8) {
    const q = (query || "").trim();
    if (!q) return [];
    const normQ = normalizeForSearch(q);
    let rows = [];
    if (normQ) {
      // Fold-prefix recall, then Vietnamese-aware tier ranking in JS: every
      // same-base (Đỗ ↔ Đố/Đồ/Đổ…) and base-prefix (Đỗ ↔ Đốc/Đối/Đồng…)
      // candidate folds to the same prefix, so this recall set is complete.
      rows = await this.executeSelect(
        "SELECT id, word, word_type AS wordType, meaning FROM words WHERE normalized_word LIKE ? ORDER BY word LIMIT ?",
        [normQ + "%", Math.max(limit * 6, 200)],
      );
    }
    if (rows.length === 0) {
      // Non-letter query (no foldable prefix): fall back to raw prefix and
      // keep the legacy exact-first ordering.
      rows = await this.executeSelect(
        'SELECT id, word, word_type AS wordType, meaning FROM words WHERE word LIKE ? ESCAPE "\\" ORDER BY word LIMIT ?',
        [q.replace(/[\\%_]/g, "\\$&") + "%", Math.max(limit * 6, 200)],
      );
      rows.sort(rankByQuery(q));
      return rows.slice(0, limit).map((r) => this.mapSuggestion(r));
    }
    rows.sort(rankBySuggestionTiers(q));
    return rows.slice(0, limit).map((r) => this.mapSuggestion(r));
  }

  async getRandomWords(limit = 10) {
    const rows = await this.executeSelect(
      `SELECT ${WORD_COLUMNS} FROM words WHERE text_quality > 0.5 ORDER BY RANDOM() LIMIT ?`,
      [limit],
    );
    return rows.map((r) => this.mapWord(r));
  }

  async getWordCount() {
    const result = await this.executeGet("SELECT COUNT(*) as count FROM words");
    return result ? result.count : 0;
  }

  async resetDatabase() {
    if (this.db) {
      try {
        await this.db.closeAsync();
      } catch {}
      this.db = null;
    }
    this.isInitialized = false;
    this.initPromise = null;
    try {
      await deleteDatabaseAsync(DB_NAME);
    } catch {}
  }

  initialize(onProgress) {
    if (onProgress) {
      this.onProgress = onProgress;
    }
    if (this.isInitialized) return Promise.resolve();
    if (!this.initPromise) {
      this.initPromise = this._initialize(onProgress).catch(async (error) => {
        this.initPromise = null;
        // Only heal when a critical binary asset was served as a poisoned
        // cache (HTML error page). A genuine offline/timeout failure must NOT
        // trigger an unregister+reload loop, which would just fail again
        // offline. See PoisonedAssetError in initializeWeb().
        if (
          Platform.OS === "web" &&
          typeof window !== "undefined" &&
          error instanceof PoisonedAssetError &&
          !window.__tudienHealAttempted
        ) {
          window.__tudienHealAttempted = true;
          try {
            const healed = await this._healServiceWorker();
            if (healed) {
              window.location.reload();
              await new Promise(() => {}); // suspend until reload
            }
          } catch {
            /* fall through to rethrow */
          }
        }
        throw error;
      });
    }
    return this.initPromise;
  }

  async _healServiceWorker() {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return false;
    }
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length === 0) return false;
      await Promise.all(registrations.map((r) => r.unregister()));
      return true;
    } catch {
      return false;
    }
  }

  async _initialize(onProgress) {
    if (Platform.OS === "web") {
      await this.initializeWeb(onProgress);
      return;
    }

    await importDatabaseFromAssetAsync(DB_NAME, {
      assetId: DATABASE_ASSET,
      forceOverwrite: true,
    });
    this.db = await openDatabaseAsync(DB_NAME);
    const result = await this.db.getFirstAsync(
      "SELECT COUNT(*) as count FROM words",
    );
    if (!result || result.count === 0) {
      throw new Error("Database is empty after loading");
    }
    this.isInitialized = true;
  }

  async initializeWeb() {
    // Ensure the page is controlled by the SW so the cached .wasm assets are
    // served (offline). Without this, a cold launch hits the dead network and
    // hangs on the loading screen. (The DB itself is read from the IndexedDB
    // local store first, so it no longer depends on SW control — see
    // fetchDatabaseWithProgress.)
    await waitForServiceWorkerController();

    const asset = Asset.fromModule(DATABASE_ASSET);
    const uri = asset.localUri || asset.uri;
    if (!uri) {
      throw new Error("Database asset has no downloadable URI on web");
    }

    const onProgress = this.onProgress;
    const { bytes, poisoned, source } = await fetchDatabaseWithProgress(
      uri,
      onProgress,
    );
    if (!bytes || bytes.length === 0) {
      throw new Error("Database asset could not be loaded (empty response)");
    }
    if (poisoned) {
      // Drop the poisoned local copy so we don't keep serving it offline.
      try {
        await deleteAsset(uri);
      } catch {}
      throw new PoisonedAssetError(
        "Database response is HTML, not a SQLite file (poisoned cache)",
      );
    }

    onProgress?.({ stage: "prepare", loaded: 0, total: 0, percent: 0 });
    this.db = await deserializeDatabaseAsync(bytes);
    onProgress?.({ stage: "ready", loaded: 1, total: 1, percent: 1 });

    const result = await this.db.getFirstAsync(
      "SELECT COUNT(*) as count FROM words",
    );
    if (!result || result.count === 0) {
      throw new Error("Database is empty after web deserialization");
    }

    // Stale-cache refresh: a locally cached copy from an older dictionary build
    // (e.g. dev-mode URL is not content-hashed, or a previously deployed hashed
    // URL collided) must not replace real data. Drop it and re-fetch once from
    // the network; if that also fails we keep the stale copy rather than break.
    if (source === "idb" || source === "cache") {
      let dbVersion = 0;
      try {
        const vr = await this.db.getFirstAsync("PRAGMA user_version");
        dbVersion = vr && vr.user_version != null ? Number(vr.user_version) : 0;
      } catch {}
      if (dbVersion < DICTIONARY_DB_VERSION) {
        await dropCachedAsset(uri);
        const fresh = await fetchDatabaseWithProgress(uri, onProgress);
        if (fresh && fresh.bytes && fresh.bytes.length > 0 && !fresh.poisoned) {
          try {
            const freshDb = await deserializeDatabaseAsync(fresh.bytes);
            const freshResult = await freshDb.getFirstAsync(
              "SELECT COUNT(*) as count FROM words",
            );
            if (freshResult && freshResult.count > 0) {
              this.db = freshDb;
            } else {
              freshDb.closeAsync().catch(() => {});
            }
          } catch {
            /* keep the stale-but-working copy */
          }
        }
      }
    }

    this.isInitialized = true;
  }

  async close() {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
    }
    this.initPromise = null;
  }
}

export const dictionaryService = new DictionaryService();
export { normalizeForSearch, levenshtein };
