# TuDienDaiNam Offline Dictionary App Architecture

## Overview
A fully offline mobile dictionary application for the Dainamese language with no server dependencies. All data is processed during development and bundled with the app for offline use.

## Architecture Components

### 1. Frontend (Mobile App)
- **Framework**: React Native with Expo
- **State Management**: Redux Toolkit or Zustand
- **Navigation**: React Navigation
- **Database**: SQLite via react-native-sqlite-storage
- **Search**: Fuse.js for fuzzy matching and autocomplete
- **UI**: Blue (#1E90FF), white (#FFFFFF), and yellow (#FFD700) color scheme

### 2. Backend (Development-Only Processing)
- **Purpose**: One-time OCR processing and database generation
- **Technology**: Node.js
- **OCR Engine**: Tesseract.js
- **Output**: Pre-built SQLite database file
- **Location**: Runs only during development, not included in final app

### 3. Database Structure
**SQLite Database (Bundled with App)**
- `words` table: (id, word, pronunciation, definition, word_type, examples)
- `search_index` table: (word_id, keyword, relevance_score)
- `suggestions` table: (word_id, similar_words)

## Project Structure
```
TuDienDaiNam/
├── frontend/                 # React Native app
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── screens/         # App screens
│   │   ├── services/        # Local database services
│   │   ├── store/           # State management
│   │   └── utils/           # Helper functions
│   ├── assets/
│   │   └── database/
│   │       └── dictionary.db # Pre-built SQLite database
│   └── package.json
├── backend/                 # Development-only data processing
│   ├── src/
│   │   ├── ocr/            # OCR processing pipeline
│   │   ├── parser/         # Text parsing and structuring
│   │   └── database/       # SQLite database generation
│   └── package.json
├── images/                  # Source PNG images
│   └── *.png               # Raw dictionary data
└── docs/                    # Documentation
    └── ARCHITECTURE.md
```

## Data Flow

### Development Phase
1. Raw PNG images in `/images/` are processed by backend OCR pipeline
2. Extracted text is parsed into structured dictionary entries
3. Data is normalized for Dainamese language rules
4. Structured data is imported into SQLite database
5. Generated `dictionary.db` is copied to `frontend/assets/database/`

### Runtime Phase (Offline)
1. App launches with embedded `dictionary.db`
2. User types word in search field
3. App performs local fuzzy search on SQLite database
4. Results displayed with autocomplete suggestions
5. If no exact match found, similar word suggestions are shown

## Key Technical Decisions
- **Fully offline**: No network connectivity required
- **Pre-built database**: All data processed during development
- **Local search only**: All operations occur on device
- **One-time processing**: Backend runs only during development
- **App updates**: Dictionary updates require new app versions

## Development Workflow
1. Add new PNG images to `/images/`
2. Run backend OCR processing to generate updated `dictionary.db`
3. Replace `frontend/assets/database/dictionary.db` with new file
4. Build and deploy updated mobile app

## Notes
- Ensure proper handling of Dainamese language-specific characters
- Optimize database indexing for fast search performance
- Database file size must be minimized for app store limits
- Consider future expansion with audio pronunciations bundled in assets