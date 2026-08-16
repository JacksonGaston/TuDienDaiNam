const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const FileUtils = require('./src/utils/file-utils');

class DataViewer {
  constructor() {
    this.app = express();
    this.dbPath = path.join(__dirname, 'frontend/assets/database/dictionary.db');
    this.port = process.env.PORT || 3000;

    this.setupRoutes();
  }

  setupRoutes() {
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.use(express.json());

    this.app.get('/', (req, res) => res.send(this.generateHTML()));

    this.app.get('/api/database-stats', (req, res) => {
      const db = new sqlite3.Database(this.dbPath, err => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        const stats = {};
        const queries = {
          words: 'SELECT COUNT(*) AS c FROM words',
          dainamese: 'SELECT COUNT(*) AS c FROM words WHERE is_dainamese = 1',
          compounds: 'SELECT COUNT(*) AS c FROM compounds',
          related_words: 'SELECT COUNT(*) AS c FROM related_words',
          search_index: 'SELECT COUNT(*) AS c FROM search_index',
          processing_log: 'SELECT COUNT(*) AS c FROM processing_log',
          averageQuality: 'SELECT ROUND(AVG(text_quality), 4) AS avg FROM words'
        };
        let done = 0;
        for (const [label, sql] of Object.entries(queries)) {
          db.get(sql, (e, row) => {
            if (!e) {
              stats[label] = row.c !== undefined ? row.c : row.avg;
            }
            done++;
            if (done === Object.keys(queries).length) {
              stats.averageConfidence = stats.averageQuality;
              delete stats.averageQuality;
              db.close();
              res.json(stats);
            }
          });
        }
      });
    });

    this.app.get('/api/words', (req, res) => {
      const db = new sqlite3.Database(this.dbPath);
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      db.all(
        `SELECT id, word, pronunciation, word_type, meaning, is_dainamese, text_quality, source_file
         FROM words ORDER BY word LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, rows) => {
          if (err) { res.status(500).json({ error: err.message }); db.close(); return; }
          db.get('SELECT COUNT(*) AS total FROM words', (e, countRow) => {
            db.close();
            res.json({ words: rows, total: countRow ? countRow.total : 0, limit, offset });
          });
        }
      );
    });

    this.app.get('/api/search', (req, res) => {
      const db = new sqlite3.Database(this.dbPath);
      const query = req.query.q;
      if (!query) { res.status(400).json({ error: 'Search query required' }); return; }
      db.all(
        `SELECT w.id, w.word, w.pronunciation, w.word_type, w.meaning, w.text_quality, rank AS search_rank
         FROM search_index si JOIN words w ON si.rowid = w.id
         WHERE search_index MATCH ? ORDER BY rank LIMIT 20`,
        [query],
        (err, rows) => {
          db.close();
          if (err) { res.status(500).json({ error: err.message }); return; }
          res.json({ query, results: rows });
        }
      );
    });

    this.app.get('/api/word/:word', (req, res) => {
      const db = new sqlite3.Database(this.dbPath);
      const word = decodeURIComponent(req.params.word);
      db.get('SELECT id, word, pronunciation, word_type, meaning, is_dainamese, text_quality, source_file, ancient_char FROM words WHERE word = ?', [word], (err, row) => {
        if (!row) { db.close(); res.status(404).json({ error: 'not found' }); return; }
        db.all('SELECT compound, meaning FROM compounds WHERE word_id = ? ORDER BY id', [row.id], (e2, comps) => {
          db.close();
          res.json({ word: row, compounds: comps });
        });
      });
    });
  }

  generateHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TuDienDaiNam Data Verification</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f5f5f5; }
    .header { background:#1E90FF; color:#fff; padding:1rem; }
    .header h1 { font-size:1.5rem; }
    .container { max-width:1200px; margin:0 auto; padding:1rem; }
    .section { display:none; background:#fff; border-radius:8px; padding:1.5rem; margin-bottom:1rem; box-shadow:0 2px 4px rgba(0,0,0,.1); }
    .section.active { display:block; }
    .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:1rem; margin-bottom:1rem; }
    .stat-card { background:#f8f9fa; padding:1rem; border-radius:6px; text-align:center; }
    .stat-number { font-size:2rem; font-weight:bold; color:#1E90FF; }
    .stat-label { font-size:.9rem; color:#666; margin-top:.5rem; }
    .search-box input { width:100%; padding:.75rem; border:2px solid #ddd; border-radius:4px; font-size:1rem; }
    .entry { border:1px solid #ddd; border-radius:6px; padding:1rem; margin-bottom:1rem; }
    .entry-word { font-size:1.2rem; font-weight:bold; color:#1E90FF; }
    .entry-meaning { line-height:1.5; margin-top:.5rem; }
    .compound { font-size:.9rem; color:#444; margin-left:1rem; }
  </style>
</head>
<body>
  <div class="header"><h1>Dictionary DB Verification</h1></div>
  <div class="container">
    <div class="section active">
      <h2>Database Stats</h2>
      <div id="db-stats" class="stats"></div>
    </div>
    <div class="section">
      <h2>Search Test</h2>
      <div class="search-box"><input type="text" id="searchInput" placeholder="Search word (e.g. Ái)..." onkeyup="performSearch(event)"></div>
      <div id="search-results"></div>
    </div>
  </div>
  <script>
    async function loadStats(){
      const s = await fetch('/api/database-stats').then(r=>r.json());
      document.getElementById('db-stats').innerHTML =
        '<div class="stat-card"><div class="stat-number">'+(s.words||0)+'</div><div class="stat-label">Words</div></div>' +
        '<div class="stat-card"><div class="stat-number">'+(s.dainamese||0)+'</div><div class="stat-label">Dainamese</div></div>' +
        '<div class="stat-card"><div class="stat-number">'+(s.compounds||0)+'</div><div class="stat-label">Compounds</div></div>' +
        '<div class="stat-card"><div class="stat-number">'+(s.related_words||0)+'</div><div class="stat-label">Related</div></div>' +
        '<div class="stat-card"><div class="stat-number">'+(s.search_index||0)+'</div><div class="stat-label">Search Index</div></div>' +
        '<div class="stat-card"><div class="stat-number">'+((s.averageConfidence||0).toFixed(1))+'%</div><div class="stat-label">Avg Quality</div></div>';
    }
    async function performSearch(event){
      if(event.key!=='Enter') return;
      const q = document.getElementById('searchInput').value.trim();
      if(!q) return;
      document.getElementById('search-results').innerHTML='<p>Searching...</p>';
      try{
        const data = await fetch('/api/search?q='+encodeURIComponent(q)).then(r=>r.json());
        let html = '<h3>Results for "'+data.query+'": '+data.results.length+'</h3>';
        (data.results||[]).forEach((r,i)=>{
          html += '<div class="entry"><div class="entry-word">'+(i+1)+'. '+r.word+'</div><div class="entry-meaning">'+(r.meaning||'').substring(0,200)+'</div></div>';
        });
        document.getElementById('search-results').innerHTML = html || '<p>No results.</p>';
      }catch(e){ document.getElementById('search-results').innerHTML='<p class="error">Error: '+e.message+'</p>'; }
    }
    loadStats();
  </script>
</body>
</html>`;
  }

  async start() {
    try {
      await FileUtils.ensureDir(path.join(__dirname, 'public'));
      this.app.listen(this.port, () => {
        console.log(`Data Viewer running: http://localhost:${this.port}`);
      });
    } catch (error) {
      console.error('Failed to start data viewer:', error.message);
    }
  }
}

async function main() {
  try { require('express'); } catch { console.error('Install express: npm install express'); process.exit(1); }
  await new DataViewer().start();
}

if (require.main === module) main();
module.exports = DataViewer;
