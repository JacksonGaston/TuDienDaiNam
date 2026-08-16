const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'frontend/assets/database/dictionary.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking dictionary database...\n');

db.all(
  `SELECT
     (SELECT COUNT(*) FROM words) AS words,
     (SELECT COUNT(*) FROM compounds) AS compounds,
     (SELECT COUNT(*) FROM related_words) AS related,
     (SELECT COUNT(*) FROM search_index) AS searchIndex,
     (SELECT COUNT(*) FROM words WHERE is_dainamese = 1) AS dainamese,
     (SELECT ROUND(AVG(text_quality), 4) FROM words) AS avgQuality
   FROM words LIMIT 1`,
  (err, rows) => {
    if (err) { console.error('Error:', err.message); db.close(); return; }
    const r = rows[0];
    console.log(`Words:        ${r.words}`);
    console.log(`Compounds:    ${r.compounds}`);
    console.log(`Related:      ${r.related}`);
    console.log(`Search index: ${r.searchIndex}`);
    console.log(`Dainamese:    ${r.dainamese}`);
    console.log(`Avg quality:  ${r.avgQuality}`);
  }
);

db.all('SELECT word, word_type AS wordType, meaning FROM words LIMIT 5', (err, rows) => {
  if (err) { console.error('Error:', err.message); return; }
  console.log('\nSample entries:');
  rows.forEach((row, i) => {
    console.log(`  ${i + 1}. "${row.word}" (${row.wordType}) ${row.meaning.slice(0, 60)}`);
  });
});

db.get('SELECT word, word_type AS wordType, meaning FROM words WHERE word = ?', ['Ái'], (err, row) => {
  if (err) { console.error('Lookup error:', err.message); return; }
  console.log(`\nExact lookup "Ái": ${row ? JSON.stringify(row) : 'not found'}`);
});

db.all(
  'SELECT w.word FROM related_words rw JOIN words w ON w.id = rw.related_word_id WHERE rw.word_id = (SELECT id FROM words WHERE word = ? LIMIT 1) ORDER BY rw.score DESC, w.word LIMIT 3',
  ['Ái'],
  (err, rows) => {
    if (err) { console.error('Related error:', err.message); return; }
    console.log(`\nRelated to "Ái": ${rows.map(r => r.word).join(', ') || 'none'}`);
  }
);

db.all('SELECT word FROM words WHERE normalized_word = ?', ['ai'], (err, rows) => {
  if (err) { console.error('Normalized error:', err.message); return; }
  console.log(`\nNormalized "ai" (diacritic-insensitive): ${rows.map(r => r.word).join(', ')}`);
});

db.close();
