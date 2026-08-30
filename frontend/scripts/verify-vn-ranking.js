#!/usr/bin/env node
/**
 * Verify Vietnamese-aware related words & suggestion ranking against the real
 * dictionary DB, by driving the ACTUAL frontend service code
 * (frontend/src/services/dictionaryService.js) through a stubbed adapter that
 * wraps the on-disk SQLite database.
 *
 * Usage: node frontend/scripts/verify-vn-ranking.js [path-to-dictionary.db]
 *
 * Exit code 0 = all assertions pass.
 */
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath =
  process.argv[2] || path.join(__dirname, "../assets/database/dictionary.db");

// ---- Load the frontend service source, strip ESM imports/exports ----
const src = fs.readFileSync(
  path.join(__dirname, "../src/services/dictionaryService.js"),
  "utf8",
);
const cleaned = src
  .replace(/^import[^;]*;\s*$/gm, "")
  .replace(/^export\s+(const|let|var|function|\{).*$/gm, "")
  // eval cannot see Node's require; the require'd asset is only used in
  // initialize() paths we never call in this harness.
  .replace(
    /^const DATABASE_ASSET = require\([^;]*\);$/m,
    "const DATABASE_ASSET = {};",
  );
const { DictionaryService, normalizeBaseWord } = (0, eval)(
  `(function(){${cleaned}; return {DictionaryService, normalizeBaseWord, relatedScore};})()`,
);
// ^ the cleaned source declares the class + helpers with `const DictionaryService`,
// `function normalizeBaseWord`, etc., so they are in scope inside this closure.

// ---- SQLite adapter mimicking expo-sqlite's promise API ----
function openAdapter(p) {
  const db = new sqlite3.Database(p, sqlite3.OPEN_READONLY);
  return {
    runAsync(sql, params = []) {
      return new Promise((resolve, reject) =>
        db.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve({ changes: this.changes, lastID: this.lastID });
        }),
      );
    },
    getAllAsync(sql, params = []) {
      return new Promise((resolve, reject) =>
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))),
      );
    },
    getFirstAsync(sql, params = []) {
      return new Promise((resolve, reject) =>
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))),
      );
    },
    close() {
      db.close();
    },
  };
}

// ---- Harness ----
let failures = 0;
function check(label, actual, predicate, detail) {
  const ok = predicate(actual);
  if (!ok) failures++;
  console.log(
    ok ? "PASS" : "FAIL",
    label,
    "→",
    JSON.stringify(actual),
    ok ? "" : "| " + (detail || ""),
  );
  return ok;
}
const words = (sugs) => sugs.map((s) => s.word);

async function main() {
  const adapter = openAdapter(dbPath);
  const svc = new DictionaryService();
  svc.db = adapter;
  svc.isInitialized = true;
  svc.executeSelect = adapter.getAllAsync;
  svc.executeGet = adapter.getFirstAsync;

  // ---- Sanity: helpers ----
  check(
    "normalizeBaseWord(Đậu)=đâu",
    normalizeBaseWord("Đậu"),
    (v) => v === "đâu",
  );

  // ---- Related words (searchWord exact-match path → getRelatedWords) ----
  const r = await svc.searchWord("Đậu");
  check("Đậu exact match", r.match && r.match.word, (v) => v === "Đậu");
  const rel = words(r.suggestions);
  console.log("   related(Đậu):", rel.join(", "));
  check("Đậu related[0] is Đâu", rel[0], (v) => v === "Đâu");
  check(
    "Đậu related top-3 all Đ-family",
    rel.slice(0, 3),
    (l) => l.every((w) => w.startsWith("Đ")) && l.length === 3,
  );

  const r2 = await svc.searchWord("Đỗ");
  const rel2 = words(r2.suggestions);
  console.log("   related(Đỗ):", rel2.join(", "));
  check(
    "Đỗ related top-3 Đ-family",
    rel2.slice(0, 3),
    (l) => l.every((w) => w.startsWith("Đ")) && l.length === 3,
  );

  // Tone-only variants still related ("bạn" → "ban/bán/bàn/bản")
  const rb = await svc.searchWord("Bạn");
  const relB = words(rb.suggestions);
  console.log("   related(Bạn):", relB.join(", "));

  // ---- Suggestions (dropdown ranking tiers) ----
  const s1 = await svc.getSuggestions("Đỗ", 8);
  const s1w = words(s1);
  console.log("   suggestions(Đỗ):", s1w.join(", "));
  check("suggestions(Đỗ)[0] exact", s1w[0], (v) => v === "Đỗ");
  check(
    "suggestions(Đỗ) Đ-family before any Do/Dó",
    s1w,
    (l) => l.slice(1).every((w) => w.startsWith("Đ")) && l.length >= 3,
  );
  check("suggestions(Đỗ) contains same-root tones", s1w.slice(0, 6), (l) =>
    ["Đô", "Đố", "Đồ", "Đổ", "Độ"].every((w) => l.includes(w)),
  );

  const s2 = await svc.getSuggestions("Đậu", 8);
  const s2w = words(s2);
  console.log("   suggestions(Đậu):", s2w.join(", "));
  check("suggestions(Đậu)[0] exact", s2w[0], (v) => v === "Đậu");
  check("suggestions(Đậu) top-4 Đ-family", s2w.slice(1, 4), (l) =>
    l.every((w) => w.startsWith("Đ")),
  );

  // ---- Regression: plain queries ----
  const sc = await svc.searchWord("Con");
  check("searchWord(Con) finds a match", sc.match && sc.match.word, (v) => !!v);
  const sc2 = await svc.getSuggestions("con", 8);
  check("suggestions(con) non-empty", words(sc2), (l) => l.length > 0);
  const sm = await svc.getSuggestions("mèo", 8);
  check("suggestions(mèo) non-empty", words(sm), (l) => l.length > 0);

  // ---- D-dictionary words keep their own D-family ----
  const sd = await svc.searchWord("Dầu");
  const relD = words(sd.suggestions);
  console.log("   related(Dầu):", relD.join(", "));
  check("Dầu related[0] starts with D", relD[0], (v) => v.startsWith("D"));

  adapter.close();
  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error("HARNESS ERROR:", e);
  process.exit(2);
});
