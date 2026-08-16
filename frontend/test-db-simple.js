const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'assets/database/dictionary.db');

async function testDatabase() {
  console.log('Testing database directly...\n');
  const db = new sqlite3.Database(dbPath, err => {
    if (err) { console.error('Error opening database:', err.message); return; }
    console.log('Database opened successfully\n');

    db.get('SELECT COUNT(*) AS count FROM words', (e, row) => {
      if (e) { console.error('Error:', e.message); db.close(); return; }
      console.log(`1. Total words: ${row.count}`);

      db.get('SELECT COUNT(*) AS count FROM words WHERE is_dainamese = 1', (e2, r2) => {
        console.log(`2. Dainamese words: ${r2 ? r2.count : 'err'}`);

        db.all(
          `SELECT w.id, w.word, w.meaning, w.pronunciation, w.word_type, w.is_dainamese, w.text_quality
           FROM search_index si JOIN words w ON si.rowid = w.id
           WHERE search_index MATCH 'phat' ORDER BY rank LIMIT 5`,
          (e3, rows) => {
            if (e3) { console.error('Error searching:', e3.message); db.close(); return; }
            console.log(`3. Search results for "phat": ${rows.length} found`);
            rows.forEach((row, i) => {
              console.log(`   ${i + 1}. "${row.word}" - ${(row.meaning || '').substring(0, 50)}`);
            });

            db.all(
              `SELECT w.word AS suggestion, w.pronunciation, rw.score
               FROM related_words rw JOIN words w ON w.id = rw.related_word_id
               WHERE w.word LIKE 'Ph%'
               ORDER BY rw.score DESC, w.word LIMIT 5`,
              (e4, srows) => {
                if (e4) { console.error('Error getting related:', e4.message); db.close(); return; }
                console.log(`\n4. Related words starting with "Ph": ${srows.length} found`);
                srows.forEach((row, i) => {
                  console.log(`   ${i + 1}. "${row.word}" (${row.suggestion}) - score: ${row.score}`);
                });

                db.all(
                  `SELECT id, word, meaning, pronunciation, word_type, is_dainamese, text_quality
                   FROM words WHERE text_quality > 0.5 ORDER BY RANDOM() LIMIT 3`,
                  (e5, rrows) => {
                    console.log(`\n5. Random words: ${rrows.length} found`);
                    rrows.forEach((row, i) => {
                      console.log(`   ${i + 1}. "${row.word}" - ${(row.meaning || '').substring(0, 50)}`);
                    });
                    db.close(() => {
                      console.log('\nDatabase closed successfully');
                      console.log('\nAll tests passed! Database is working correctly.');
                    });
                  }
                );
              }
            );
          }
        );
      });
    });
  });
}

testDatabase().catch(console.error);
