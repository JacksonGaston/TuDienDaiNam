const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../frontend/assets/database/dictionary.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking database contents...\n');

// Check word count
db.get('SELECT COUNT(*) as count FROM words', (err, row) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log(`📊 Total words: ${row.count}`);
});

// Check sample entries
db.all('SELECT word, ocr_confidence, definition FROM words LIMIT 5', (err, rows) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('\n📝 Sample entries:');
  rows.forEach((row, i) => {
    console.log(`  ${i+1}. "${row.word}" (confidence: ${row.ocr_confidence}%)`);
    console.log(`     Definition: ${row.definition.substring(0, 80)}...`);
  });
});

// Check search index
db.get('SELECT COUNT(*) as count FROM search_index', (err, row) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log(`\n🔍 Search index entries: ${row.count}`);
});

// Test search with different syntax
db.all('SELECT word FROM search_index WHERE search_index MATCH ?', ['ke'], (err, rows) => {
  if (err) {
    console.error('Search error:', err);
  } else {
    console.log(`\n🔎 Search results for "ke" (MATCH):`);
    if (rows.length === 0) {
      console.log('  No results found');
    } else {
      rows.forEach((row, i) => {
        console.log(`  ${i+1}. "${row.word}"`);
      });
    }
  }
});

// Try simple LIKE query
db.all('SELECT word FROM search_index WHERE word LIKE ?', ['%ke%'], (err, rows) => {
  if (err) {
    console.error('LIKE error:', err);
  } else {
    console.log(`\n🔎 Search results for "ke" (LIKE):`);
    if (rows.length === 0) {
      console.log('  No results found');
    } else {
      rows.forEach((row, i) => {
        console.log(`  ${i+1}. "${row.word}"`);
      });
    }
  }
});

// Check search index contents
db.all('SELECT word FROM search_index LIMIT 5', (err, rows) => {
  if (err) {
    console.error('Error checking search index:', err);
    return;
  }
  console.log(`\n📝 Search index sample contents:`);
  rows.forEach((row, i) => {
    console.log(`  ${i+1}. "${row.word}"`);
  });
});

db.close();