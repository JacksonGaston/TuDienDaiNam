# TuDienDaiNam Backend Processing Pipeline

One-time OCR processing pipeline to convert PNG dictionary images into a structured SQLite database.

## Purpose
This backend service processes raw PNG images from /images/ and generates a pre-built SQLite database (dictionary.db) for bundling with the mobile app.

## Important Note
This code runs ONLY during development. The final mobile app contains only the pre-built database and has no server or network dependencies.

## Installation
```bash
cd /home/litemnt/Projects/TuDienDaiNam/backend
npm install
```

## Usage
1. Place Dainamese dictionary PNG images in /home/litemnt/Projects/TuDienDaiNam/images/
2. Run OCR processing:
   ```bash
   npm run process
   ```
3. The generated database will be saved to: frontend/assets/database/dictionary.db

## Dependencies
- tesseract.js: OCR engine for text extraction
- sqlite3: Database operations
- node: JavaScript runtime

## Output
- A single SQLite database file (dictionary.db) with tables:
  - words (id, word, pronunciation, definition, word_type, examples)
  - search_index (word_id, keyword, relevance_score)
  - suggestions (word_id, similar_words)

## Development Workflow
1. Add new PNG images to /images/
2. Run `npm run process`
3. Verify database generation
4. Replace frontend/assets/database/dictionary.db with the new file
5. Rebuild the mobile app

## Notes
- This is a development-only tool
- No network connectivity required
- All processing happens locally
- Database must be optimized for size and search performance