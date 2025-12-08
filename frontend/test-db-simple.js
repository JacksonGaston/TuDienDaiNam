const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'assets/database/dictionary.db');

async function testDatabase() {
  console.log('Testing database directly...\n');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err.message);
        reject(err);
        return;
      }
      
      console.log('✅ Database opened successfully\n');
      
      // Test word count
      db.get('SELECT COUNT(*) as count FROM words', (err, row) => {
        if (err) {
          console.error('❌ Error getting word count:', err.message);
          db.close();
          reject(err);
          return;
        }
        
        console.log(`1. Total words: ${row.count}`);
        
        // Test Dainamese word count
        db.get('SELECT COUNT(*) as count FROM words WHERE is_dainamese = 1', (err, row) => {
          if (err) {
            console.error('❌ Error getting Dainamese word count:', err.message);
            db.close();
            reject(err);
            return;
          }
          
          console.log(`2. Dainamese words: ${row.count}`);
          
          // Test search
          db.all(`
            SELECT w.id, w.word, w.definition, w.pronunciation, w.word_type, w.is_dainamese, w.text_quality
            FROM search_index si
            JOIN words w ON si.rowid = w.id
            WHERE search_index MATCH 'phat'
            ORDER BY si.rank
            LIMIT 5
          `, (err, rows) => {
            if (err) {
              console.error('❌ Error searching:', err.message);
              db.close();
              reject(err);
              return;
            }
            
            console.log(`3. Search results for "phat": ${rows.length} found`);
            rows.forEach((row, index) => {
              console.log(`   ${index + 1}. "${row.word}" - ${row.definition.substring(0, 50)}...`);
            });
            
            // Test suggestions
            db.all(`
              SELECT s.word_id, s.suggestion, s.score, w.word, w.pronunciation
              FROM suggestions s
              JOIN words w ON s.word_id = w.id
              WHERE s.suggestion LIKE 'ph%'
              ORDER BY s.score DESC
              LIMIT 5
            `, (err, rows) => {
              if (err) {
                console.error('❌ Error getting suggestions:', err.message);
                db.close();
                reject(err);
                return;
              }
              
              console.log(`\n4. Suggestions for "ph": ${rows.length} found`);
              rows.forEach((row, index) => {
                console.log(`   ${index + 1}. "${row.word}" (${row.suggestion}) - score: ${row.score}`);
              });
              
              // Test random words
              db.all(`
                SELECT id, word, definition, pronunciation, word_type, is_dainamese, text_quality
                FROM words
                WHERE text_quality > 0.5
                ORDER BY RANDOM()
                LIMIT 3
              `, (err, rows) => {
                if (err) {
                  console.error('❌ Error getting random words:', err.message);
                  db.close();
                  reject(err);
                  return;
                }
                
                console.log(`\n5. Random words: ${rows.length} found`);
                rows.forEach((row, index) => {
                  console.log(`   ${index + 1}. "${row.word}" - ${row.definition.substring(0, 50)}...`);
                });
                
                // Close database
                db.close((err) => {
                  if (err) {
                    console.error('❌ Error closing database:', err.message);
                    reject(err);
                    return;
                  }
                  
                  console.log('\n✅ Database closed successfully');
                  console.log('\n🎉 All tests passed! Database is working correctly.');
                  resolve();
                });
              });
            });
          });
        });
      });
    });
  });
}

// Run the test
testDatabase().catch(console.error);