# TuDienDaiNam Mobile Dictionary App

## Project Overview
A fully offline mobile dictionary application for the Dainamese language, designed for both iOS and Android with a modern interface using blue, white, and yellow color scheme. All data is processed during development and bundled with the app—no internet connection or server required at runtime.

## Core Features
- Word search engine with real-time autocomplete suggestions
- Dropdown list of similar words as user types
- Error handling with similar word suggestions when exact match not found
- Clean, intuitive UI with blue, white, and yellow color palette

## Technical Requirements
- Cross-platform framework: React Native (recommended)
- Database: SQLite with pre-built database bundled in app (no network access)
- Search algorithm: Fuzzy matching with prefix-based autocomplete using Fuse.js
- Data processing: One-time OCR pipeline to convert PNG images to structured SQLite database during development only

## Database Processing Strategy
1. Use OCR technology (Tesseract.js) to extract text from PNG images in /images/
2. Parse extracted text into structured dictionary entries (word, pronunciation, definition, word_type, examples)
3. Normalize Dainamese characters and handle special orthographic rules
4. Generate a pre-built SQLite database file (dictionary.db)
5. Bundle database with mobile app for offline use—no runtime database generation
6. Implement optimized indexing for fast local search performance

## Design Guidelines
- Primary color: Blue (#1E90FF)
- Secondary color: Yellow (#FFD700)
- Background: White (#FFFFFF)
- Typography: Clean sans-serif font (e.g., Inter, Roboto)
- UI components: Minimalist design with ample white space

## Development Roadmap
1. Set up cross-platform project structure
2. Implement OCR pipeline for PNG database conversion
3. Design database schema and import processed data
4. Build search functionality with autocomplete
5. Implement UI with specified color scheme
6. Test on both iOS and Android devices
7. Optimize performance and user experience

## Notes
- Ensure proper handling of Dainamese language-specific characters and grammar rules
- Prioritize search speed and accuracy
- App operates 100% offline—no internet or server dependencies
- Database is pre-built during development and bundled with app
- Future expansion: audio pronunciations and example sentences can be bundled as assets
- Backend OCR processing runs only during development, not in production app