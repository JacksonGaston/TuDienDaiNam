# TuDienDaiNam Offline Dictionary App

A fully offline mobile dictionary application for the Dainamese language.

## Project Structure
```
frontend/
├── src/
│   ├── components/      # UI components
│   ├── screens/         # App screens
│   ├── services/        # Local database services
│   ├── store/           # State management
│   └── utils/           # Helper functions
├── assets/
│   └── database/        # Pre-built SQLite database
└── package.json

backend/
├── src/
│   ├── ocr/            # OCR processing pipeline
│   ├── parser/         # Text parsing and structuring
│   └── database/       # SQLite database generation
├── package.json

images/                  # Source PNG images
└── *.png                # Raw dictionary data

docs/                    # Documentation
└── ARCHITECTURE.md
```

## Setup
1. Add Dainamese dictionary PNG images to the /images/ directory
2. Run backend processing: `cd backend && npm install && npm run process`
3. The generated database will be placed in frontend/assets/database/dictionary.db
4. Run the mobile app: `cd frontend && npm start`

## Notes
- This app works 100% offline
- All data processing happens during development only
- No internet connection required at runtime
- Database is pre-built and bundled with the app
- Future expansion: audio pronunciations and example sentences can be added as assets