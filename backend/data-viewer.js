const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const FileUtils = require('./src/utils/file-utils');

class DataViewer {
  constructor() {
    this.app = express();
    this.dbPath = path.join(__dirname, '../frontend/assets/database/dictionary.db');
    this.ocrResultsDir = path.join(__dirname, './output/ocr-results');
    this.port = 3000;
    
    this.setupRoutes();
  }

  setupRoutes() {
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.use(express.json());
    
    // Main page
    this.app.get('/', (req, res) => {
      res.send(this.generateHTML());
    });
    
    // API routes
    this.app.get('/api/ocr-results', async (req, res) => {
      try {
        const results = await this.loadOCRResults();
        res.json(results);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    this.app.get('/api/parsed-entries', async (req, res) => {
      try {
        const TextParser = require('./src/parser/text-parser');
        const parser = new TextParser();
        const ocrResults = await this.loadOCRResults();
        const parsedData = await parser.batchParse(ocrResults);
        res.json(parsedData);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    this.app.get('/api/validation-results', async (req, res) => {
      try {
        const TextParser = require('./src/parser/text-parser');
        const EntryValidator = require('./src/parser/entry-validator');
        const parser = new TextParser();
        const validator = new EntryValidator();
        const ocrResults = await this.loadOCRResults();
        const parsedData = await parser.batchParse(ocrResults);
        const validationResults = validator.batchValidate(parsedData.entries);
        res.json(validationResults);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    this.app.get('/api/database-stats', (req, res) => {
      const db = new sqlite3.Database(this.dbPath);
      
      const queries = [
        'SELECT COUNT(*) as count FROM words',
        'SELECT COUNT(*) as count FROM words WHERE is_dainamese = 1',
        'SELECT COUNT(*) as count FROM search_index',
        'SELECT COUNT(*) as count FROM suggestions',
        'SELECT AVG(ocr_confidence) as avg_conf FROM words'
      ];
      
      let completed = 0;
      const stats = {};
      
      queries.forEach((query, index) => {
        db.get(query, (err, row) => {
          if (!err) {
            const tableName = query.match(/FROM (\w+)/)[1];
            if (tableName === 'words' && query.includes('AVG')) {
              stats.averageConfidence = row.avg_conf || 0;
            } else {
              stats[tableName] = row.count;
            }
          }
          
          completed++;
          if (completed === queries.length) {
            db.close();
            res.json(stats);
          }
        });
      });
    });
    
    this.app.get('/api/words', (req, res) => {
      const db = new sqlite3.Database(this.dbPath);
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      
      db.all(`
        SELECT id, word, pronunciation, definition, word_type, examples, 
               is_dainamese, ocr_confidence, source_image, created_at
        FROM words 
        ORDER BY word 
        LIMIT ? OFFSET ?
      `, [limit, offset], (err, rows) => {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          db.get('SELECT COUNT(*) as total FROM words', (err, countRow) => {
            db.close();
            res.json({
              words: rows,
              total: countRow ? countRow.total : 0,
              limit,
              offset
            });
          });
        }
      });
    });
    
    this.app.get('/api/search', (req, res) => {
      const db = new sqlite3.Database(this.dbPath);
      const query = req.query.q;
      
      if (!query) {
        res.status(400).json({ error: 'Search query required' });
        return;
      }
      
      db.all(`
        SELECT w.word, w.definition, w.pronunciation, w.word_type, 
               w.examples, w.ocr_confidence, rank as search_rank
        FROM search_index si 
        JOIN words w ON si.rowid = w.id 
        WHERE search_index MATCH ?
        ORDER BY rank
        LIMIT 20
      `, [query], (err, rows) => {
        db.close();
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          res.json({ query, results: rows });
        }
      });
    });
  }

  async loadOCRResults() {
    try {
      const batchResultsPath = path.join(this.ocrResultsDir, 'batch-results.json');
      
      if (await FileUtils.fileExists(batchResultsPath)) {
        return await FileUtils.readFile(batchResultsPath);
      }
      
      return { results: [], totalImages: 0, successful: 0, failed: 0 };
    } catch (error) {
      return { results: [], totalImages: 0, successful: 0, failed: 0 };
    }
  }

  generateHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TuDienDaiNam Data Verification</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
        .header { background: #1E90FF; color: white; padding: 1rem; }
        .header h1 { font-size: 1.5rem; }
        .container { max-width: 1200px; margin: 0 auto; padding: 1rem; }
        .nav { display: flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap; }
        .nav button { 
            background: #1E90FF; color: white; border: none; padding: 0.5rem 1rem; 
            border-radius: 4px; cursor: pointer; font-size: 0.9rem;
        }
        .nav button:hover { background: #4169E1; }
        .nav button.active { background: #FFD700; color: #333; }
        .section { display: none; background: white; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .section.active { display: block; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .stat-card { background: #f8f9fa; padding: 1rem; border-radius: 6px; text-align: center; }
        .stat-number { font-size: 2rem; font-weight: bold; color: #1E90FF; }
        .stat-label { font-size: 0.9rem; color: #666; margin-top: 0.5rem; }
        .search-box { margin-bottom: 1rem; }
        .search-box input { 
            width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 4px; 
            font-size: 1rem; 
        }
        .search-box input:focus { outline: none; border-color: #1E90FF; }
        .entry { border: 1px solid #ddd; border-radius: 6px; padding: 1rem; margin-bottom: 1rem; }
        .entry-word { font-size: 1.2rem; font-weight: bold; color: #1E90FF; margin-bottom: 0.5rem; }
        .entry-meta { font-size: 0.9rem; color: #666; margin-bottom: 0.5rem; }
        .entry-definition { line-height: 1.5; margin-bottom: 0.5rem; }
        .entry-examples { font-style: italic; color: #555; }
        .confidence-good { color: #28a745; }
        .confidence-medium { color: #ffc107; }
        .confidence-low { color: #dc3545; }
        .pagination { display: flex; justify-content: center; gap: 0.5rem; margin-top: 1rem; }
        .pagination button { 
            background: #1E90FF; color: white; border: none; padding: 0.5rem 1rem; 
            border-radius: 4px; cursor: pointer; 
        }
        .pagination button:disabled { background: #ccc; cursor: not-allowed; }
        .loading { text-align: center; padding: 2rem; color: #666; }
        .error { background: #f8d7da; color: #721c24; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; }
        .success { background: #d4edda; color: #155724; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 TuDienDaiNam Data Verification Dashboard</h1>
    </div>
    
    <div class="container">
        <div class="nav">
            <button onclick="showSection('overview')" class="active">Overview</button>
            <button onclick="showSection('ocr')">OCR Results</button>
            <button onclick="showSection('parsed')">Parsed Entries</button>
            <button onclick="showSection('validation')">Validation</button>
            <button onclick="showSection('database')">Database</button>
            <button onclick="showSection('search')">Search Test</button>
        </div>
        
        <div id="overview" class="section active">
            <h2>📊 Pipeline Overview</h2>
            <div id="overview-stats" class="stats"></div>
            <div id="overview-content"></div>
        </div>
        
        <div id="ocr" class="section">
            <h2>🖼️ OCR Results</h2>
            <div id="ocr-content"></div>
        </div>
        
        <div id="parsed" class="section">
            <h2>🧠 Parsed Entries</h2>
            <div id="parsed-content"></div>
        </div>
        
        <div id="validation" class="section">
            <h2>✅ Validation Results</h2>
            <div id="validation-content"></div>
        </div>
        
        <div id="database" class="section">
            <h2>🗄️ Database Contents</h2>
            <div id="database-stats" class="stats"></div>
            <div id="database-content"></div>
        </div>
        
        <div id="search" class="section">
            <h2>🔍 Search Test</h2>
            <div class="search-box">
                <input type="text" id="searchInput" placeholder="Enter search term..." onkeyup="performSearch(event)">
            </div>
            <div id="search-results"></div>
        </div>
    </div>

    <script>
        let currentSection = 'overview';
        let currentPage = 0;
        const pageSize = 20;

        function showSection(section) {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
            
            document.getElementById(section).classList.add('active');
            event.target.classList.add('active');
            
            currentSection = section;
            loadSection(section);
        }

        async function loadSection(section) {
            const content = document.getElementById(section + '-content');
            content.innerHTML = '<div class="loading">Loading...</div>';
            
            try {
                switch(section) {
                    case 'overview':
                        await loadOverview();
                        break;
                    case 'ocr':
                        await loadOCRResults();
                        break;
                    case 'parsed':
                        await loadParsedEntries();
                        break;
                    case 'validation':
                        await loadValidationResults();
                        break;
                    case 'database':
                        await loadDatabase();
                        break;
                    case 'search':
                        document.getElementById('search-results').innerHTML = '<p>Enter a search term to test the search functionality.</p>';
                        break;
                }
            } catch (error) {
                content.innerHTML = \`<div class="error">Error loading data: \${error.message}</div>\`;
            }
        }

        async function loadOverview() {
            const [stats, ocrData, validationData] = await Promise.all([
                fetch('/api/database-stats').then(r => r.json()),
                fetch('/api/ocr-results').then(r => r.json()),
                fetch('/api/validation-results').then(r => r.json())
            ]);

            const statsHtml = \`
                <div class="stat-card">
                    <div class="stat-number">\${stats.words || 0}</div>
                    <div class="stat-label">Total Words</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">\${stats.is_dainamese || 0}</div>
                    <div class="stat-label">Dainamese Words</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">\${ocrData.successful || 0}</div>
                    <div class="stat-label">OCR Success</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">\${validationData.stats ? validationData.stats.valid : 0}</div>
                    <div class="stat-label">Valid Entries</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">\${(stats.averageConfidence || 0).toFixed(1)}%</div>
                    <div class="stat-label">Avg Confidence</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">\${stats.search_index || 0}</div>
                    <div class="stat-label">Search Index</div>
                </div>
            \`;

            document.getElementById('overview-stats').innerHTML = statsHtml;
            
            const content = document.getElementById('overview-content');
            if (stats.words > 0) {
                content.innerHTML = \`
                    <div class="success">
                        ✅ Pipeline completed successfully! Database contains \${stats.words} words ready for use.
                    </div>
                \`;
            } else {
                content.innerHTML = \`
                    <div class="error">
                        ❌ No data found. Please run the OCR processing pipeline first.
                    </div>
                \`;
            }
        }

        async function loadOCRResults() {
            const data = await fetch('/api/ocr-results').then(r => r.json());
            
            let html = \`
                <div class="stats">
                    <div class="stat-card">
                        <div class="stat-number">\${data.totalImages}</div>
                        <div class="stat-label">Total Images</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">\${data.successful}</div>
                        <div class="stat-label">Successful</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">\${data.failed}</div>
                        <div class="stat-label">Failed</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">\${data.averageConfidence}%</div>
                        <div class="stat-label">Avg Confidence</div>
                    </div>
                </div>
            \`;

            if (data.results && data.results.length > 0) {
                data.results.forEach(result => {
                    const status = result.success ? '✅' : '❌';
                    const confidenceClass = result.confidence >= 60 ? 'confidence-good' : 
                                         result.confidence >= 40 ? 'confidence-medium' : 'confidence-low';
                    
                    html += \`
                        <div class="entry">
                            <div class="entry-word">\${status} \${result.imageName}</div>
                            <div class="entry-meta">
                                Confidence: <span class="\${confidenceClass}">\${result.confidence}%</span> | 
                                Processing Time: \${result.processingTime}ms | 
                                Text Length: \${result.text.length} chars
                            </div>
                            <div class="entry-definition">
                                <strong>Text Preview:</strong><br>
                                \${result.text.substring(0, 300)}\${result.text.length > 300 ? '...' : ''}
                            </div>
                        </div>
                    \`;
                });
            }

            document.getElementById('ocr-content').innerHTML = html;
        }

        async function loadParsedEntries() {
            const data = await fetch('/api/parsed-entries').then(r => r.json());
            
            let html = \`
                <div class="stats">
                    <div class="stat-card">
                        <div class="stat-number">\${data.stats.totalImages}</div>
                        <div class="stat-label">Images Processed</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">\${data.stats.successfulParses}</div>
                        <div class="stat-label">Successful Parses</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">\${data.stats.totalEntries}</div>
                        <div class="stat-label">Total Entries</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">\${data.stats.averageEntriesPerImage.toFixed(1)}</div>
                        <div class="stat-label">Avg Per Image</div>
                    </div>
                </div>
            \`;

            data.entries.slice(0, 10).forEach((entry, index) => {
                const dainameseStatus = entry.isDainamese ? '✅' : '❌';
                
                html += \`
                    <div class="entry">
                        <div class="entry-word">\${index + 1}. "\${entry.word}" \${dainameseStatus}</div>
                        <div class="entry-meta">
                            Type: "\${entry.wordType || 'N/A'}" | 
                            Normalized: "\${entry.normalizedWord}" | 
                            Line: \${entry.sourceLine}
                        </div>
                        <div class="entry-definition">
                            <strong>Definition:</strong> \${entry.definition.substring(0, 200)}\${entry.definition.length > 200 ? '...' : ''}
                        </div>
                        \${entry.pronunciation ? \`<div class="entry-examples"><strong>Pronunciation:</strong> \${entry.pronunciation}</div>\` : ''}
                        \${entry.examples && entry.examples.length > 0 ? \`<div class="entry-examples"><strong>Examples:</strong> \${entry.examples.join('; ')}</div>\` : ''}
                        <div class="entry-meta">
                            <strong>Raw Text:</strong> "\${entry.rawText}"
                        </div>
                    </div>
                \`;
            });

            if (data.entries.length > 10) {
                html += \`<p>... and \${data.entries.length - 10} more entries</p>\`;
            }

            document.getElementById('parsed-content').innerHTML = html;
        }

        async function loadValidationResults() {
            const data = await fetch('/api/validation-results').then(r => r.json());
            
            let html = \`
                <div class="stats">
                    <div class="stat-card">
                        <div class="stat-number">\${data.stats.total}</div>
                        <div class="stat-label">Total Entries</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">\${data.stats.valid}</div>
                        <div class="stat-label">Valid ✅</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">\${data.stats.invalid}</div>
                        <div class="stat-label">Invalid ❌</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">\${(data.stats.averageConfidence * 100).toFixed(1)}%</div>
                        <div class="stat-label">Avg Confidence</div>
                    </div>
                </div>
            \`;

            const invalidEntries = data.results.filter(r => !r.isValid);
            if (invalidEntries.length > 0) {
                html += '<h3>❌ Invalid Entries</h3>';
                invalidEntries.slice(0, 5).forEach(result => {
                    html += \`
                        <div class="entry">
                            <div class="entry-word">\${result.entry.word}</div>
                            <div class="entry-meta">
                                Confidence: \${(result.confidence * 100).toFixed(1)}%
                            </div>
                            <div class="error">
                                <strong>Errors:</strong> \${result.errors.join(', ')}
                            </div>
                            \${result.warnings.length > 0 ? \`<div class="entry-meta"><strong>Warnings:</strong> \${result.warnings.join(', ')}</div>\` : ''}
                        </div>
                    \`;
                });
            }

            const highConfidenceValid = data.results.filter(r => r.isValid && r.confidence >= 0.8);
            if (highConfidenceValid.length > 0) {
                html += '<h3>✅ High Quality Entries</h3>';
                highConfidenceValid.slice(0, 5).forEach(result => {
                    html += \`
                        <div class="entry">
                            <div class="entry-word">\${result.entry.word}</div>
                            <div class="entry-meta">
                                Confidence: \${(result.confidence * 100).toFixed(1)}%
                            </div>
                            <div class="entry-definition">
                                \${result.entry.definition.substring(0, 150)}\${result.entry.definition.length > 150 ? '...' : ''}
                            </div>
                        </div>
                    \`;
                });
            }

            document.getElementById('validation-content').innerHTML = html;
        }

        async function loadDatabase() {
            const [stats, wordsData] = await Promise.all([
                fetch('/api/database-stats').then(r => r.json()),
                fetch('/api/words?limit=20&offset=0').then(r => r.json())
            ]);

            const statsHtml = \`
                <div class="stat-card">
                    <div class="stat-number">\${stats.words || 0}</div>
                    <div class="stat-label">Total Words</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">\${stats.is_dainamese || 0}</div>
                    <div class="stat-label">Dainamese Words</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">\${stats.search_index || 0}</div>
                    <div class="stat-label">Search Index</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">\${(stats.averageConfidence || 0).toFixed(1)}%</div>
                    <div class="stat-label">Avg Confidence</div>
                </div>
            \`;

            document.getElementById('database-stats').innerHTML = statsHtml;

            let html = '';
            wordsData.words.forEach((word, index) => {
                const dainameseStatus = word.is_dainamese ? '✅' : '❌';
                const confidenceClass = word.ocr_confidence >= 60 ? 'confidence-good' : 
                                     word.ocr_confidence >= 40 ? 'confidence-medium' : 'confidence-low';
                
                html += \`
                    <div class="entry">
                        <div class="entry-word">\${index + 1}. "\${word.word}" \${dainameseStatus}</div>
                        <div class="entry-meta">
                            Type: "\${word.word_type || 'N/A'}" | 
                            Confidence: <span class="\${confidenceClass}">\${word.ocr_confidence}%</span> |
                            Source: \${word.source_image || 'N/A'}
                        </div>
                        \${word.pronunciation ? \`<div class="entry-examples"><strong>Pronunciation:</strong> \${word.pronunciation}</div>\` : ''}
                        <div class="entry-definition">
                            \${word.definition.substring(0, 200)}\${word.definition.length > 200 ? '...' : ''}
                        </div>
                        \${word.examples ? \`<div class="entry-examples"><strong>Examples:</strong> \${word.examples}</div>\` : ''}
                    </div>
                \`;
            });

            if (wordsData.total > 20) {
                html += \`
                    <div class="pagination">
                        <button onclick="loadDatabasePage(\${currentPage - 1})" \${currentPage === 0 ? 'disabled' : ''}>Previous</button>
                        <span>Page \${currentPage + 1} of \${Math.ceil(wordsData.total / pageSize)}</span>
                        <button onclick="loadDatabasePage(\${currentPage + 1})" \${(currentPage + 1) * pageSize >= wordsData.total ? 'disabled' : ''}>Next</button>
                    </div>
                \`;
            }

            document.getElementById('database-content').innerHTML = html;
        }

        async function loadDatabasePage(page) {
            currentPage = page;
            const offset = page * pageSize;
            const wordsData = await fetch(\`/api/words?limit=\${pageSize}&offset=\${offset}\`).then(r => r.json());
            
            let html = '';
            wordsData.words.forEach((word, index) => {
                const dainameseStatus = word.is_dainamese ? '✅' : '❌';
                const confidenceClass = word.ocr_confidence >= 60 ? 'confidence-good' : 
                                     word.ocr_confidence >= 40 ? 'confidence-medium' : 'confidence-low';
                
                html += \`
                    <div class="entry">
                        <div class="entry-word">\${offset + index + 1}. "\${word.word}" \${dainameseStatus}</div>
                        <div class="entry-meta">
                            Type: "\${word.word_type || 'N/A'}" | 
                            Confidence: <span class="\${confidenceClass}">\${word.ocr_confidence}%</span>
                        </div>
                        <div class="entry-definition">
                            \${word.definition.substring(0, 200)}\${word.definition.length > 200 ? '...' : ''}
                        </div>
                    </div>
                \`;
            });

            html += \`
                <div class="pagination">
                    <button onclick="loadDatabasePage(\${currentPage - 1})" \${currentPage === 0 ? 'disabled' : ''}>Previous</button>
                    <span>Page \${currentPage + 1} of \${Math.ceil(wordsData.total / pageSize)}</span>
                    <button onclick="loadDatabasePage(\${currentPage + 1})" \${(currentPage + 1) * pageSize >= wordsData.total ? 'disabled' : ''}>Next</button>
                </div>
            \`;

            document.getElementById('database-content').innerHTML = html;
        }

        async function performSearch(event) {
            if (event.key === 'Enter') {
                const query = document.getElementById('searchInput').value.trim();
                if (!query) return;

                const resultsDiv = document.getElementById('search-results');
                resultsDiv.innerHTML = '<div class="loading">Searching...</div>';

                try {
                    const data = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`).then(r => r.json());
                    
                    let html = \`;
                        <h3>Search results for "\${data.query}"</h3>
                    \`;

                    if (data.results.length === 0) {
                        html += '<p>No results found.</p>';
                    } else {
                        data.results.forEach((result, index) => {
                            const confidenceClass = result.ocr_confidence >= 60 ? 'confidence-good' : 
                                                 result.ocr_confidence >= 40 ? 'confidence-medium' : 'confidence-low';
                            
                            html += \`
                                <div class="entry">
                                    <div class="entry-word">\${index + 1}. "\${result.word}" (Rank: \${result.search_rank})</div>
                                    <div class="entry-meta">
                                        Type: "\${result.word_type || 'N/A'}" | 
                                        Confidence: <span class="\${confidenceClass}">\${result.ocr_confidence}%</span>
                                    </div>
                                    \${result.pronunciation ? \`<div class="entry-examples"><strong>Pronunciation:</strong> \${result.pronunciation}</div>\` : ''}
                                    <div class="entry-definition">
                                        \${result.definition.substring(0, 200)}\${result.definition.length > 200 ? '...' : ''}
                                    </div>
                                </div>
                            \`;
                        });
                    }

                    resultsDiv.innerHTML = html;
                } catch (error) {
                    resultsDiv.innerHTML = \`<div class="error">Search error: \${error.message}</div>\`;
                }
            }
        }

        // Load overview on page load
        window.onload = () => loadSection('overview');
    </script>
</body>
</html>`;
  }

  async start() {
    try {
      await this.setupPublicDir();
      
      this.app.listen(this.port, () => {
        console.log(`🌐 Data Viewer started successfully!`);
        console.log(`📱 Open your browser and navigate to: http://localhost:${this.port}`);
        console.log(`🔍 This dashboard allows you to verify the accuracy of transformed data at each pipeline stage.`);
        console.log(`⏹️  Press Ctrl+C to stop the server.`);
      });
    } catch (error) {
      console.error('❌ Failed to start data viewer:', error.message);
    }
  }

  async setupPublicDir() {
    const publicDir = path.join(__dirname, 'public');
    await FileUtils.ensureDir(publicDir);
  }
}

// CLI interface
async function main() {
  const viewer = new DataViewer();
  
  // Check if express is available
  try {
    require('express');
  } catch (error) {
    console.error('❌ Express is not installed. Please install it with:');
    console.error('   npm install express');
    process.exit(1);
  }
  
  await viewer.start();
}

if (require.main === module) {
  main();
}

module.exports = DataViewer;