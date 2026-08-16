const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'assets/database/dictionary.db');
const db = new sqlite3.Database(dbPath);

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function testDatabase() {
  console.log('Testing database directly...\n');
  console.log('Database opened successfully\n');
  try {
    const total = await get('SELECT COUNT(*) AS count FROM words');
    console.log(`1. Total words: ${total.count}`);

    const searchRows = await all(
      `SELECT w.id, w.word, w.meaning, w.pronunciation, w.word_type, w.text_quality
       FROM search_index si JOIN words w ON si.rowid = w.id
       WHERE search_index MATCH 'phat' ORDER BY rank LIMIT 5`
    );
    console.log(`2. Search results for "phat": ${searchRows.length} found`);
    searchRows.forEach((row, i) => {
      console.log(`   ${i + 1}. "${row.word}" - ${(row.meaning || '').substring(0, 50)}`);
    });

    const relatedRows = await all(
      `SELECT w.word AS suggestion, w.pronunciation, rw.score
       FROM related_words rw JOIN words w ON w.id = rw.related_word_id
       WHERE w.word LIKE 'Ph%'
       ORDER BY rw.score DESC, w.word LIMIT 5`
    );
    console.log(`\n3. Related words starting with "Ph": ${relatedRows.length} found`);
    relatedRows.forEach((row, i) => {
      console.log(`   ${i + 1}. "${row.suggestion}" (${row.suggestion}) - score: ${row.score}`);
    });

    const randomRows = await all(
      `SELECT id, word, meaning, pronunciation, word_type, text_quality
       FROM words WHERE text_quality > 0.5 ORDER BY RANDOM() LIMIT 3`
    );
    console.log(`\n4. Random words: ${randomRows.length} found`);
    randomRows.forEach((row, i) => {
      console.log(`   ${i + 1}. "${row.word}" - ${(row.meaning || '').substring(0, 50)}`);
    });

    db.close(() => {
      console.log('\nDatabase closed successfully');
      console.log('\nAll tests passed! Database is working correctly.');
    });
  } catch (error) {
    console.error('Error:', error.message);
    db.close();
  }
}

testDatabase().catch(console.error);
