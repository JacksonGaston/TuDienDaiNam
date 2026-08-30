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
│   ├── utils/           # Helper functions
│   └── navigation/      # Navigation configuration
├── assets/
│   └── database/        # Pre-built SQLite database
├── App.js               # Main app component
├── index.js            # App entry point
├── app.json            # Expo configuration
├── babel.config.js     # Babel configuration
├── metro.config.js     # Metro bundler configuration
└── package.json
```

## Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (optional, can use npx)
- **Important**: `babel-preset-expo` must be installed as a direct dependency (not just a nested dependency)

### Installation
1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
   
   **Note**: If you encounter "Cannot find module 'babel-preset-expo'" error, install it explicitly:
   ```bash
   npm install babel-preset-expo
   ```

2. Generate the database (from backend):
   ```bash
   cd ../backend
   npm install
   npm run build-db
   ```

3. Start the app:
   ```bash
   cd ../frontend
   npm start
   ```

### Running the App
- **Web**: Open browser at http://localhost:8081
- **Android**: Scan QR code with Expo Go app
- **iOS**: Scan QR code with Camera app (requires Expo Go)

## Features

### Home Screen
- Displays dictionary statistics (total words)
- Shows featured random words
- Quick access to search functionality

### Search Screen
- Real-time search with autocomplete suggestions
- Search history with recent searches
- Quality indicators for search results
- Tap any result to view detailed definition

### Word Detail Screen
- Complete word information display
- Pronunciation and word type
- Full definition with examples
- Metadata including text quality and source

### Database Features
- **Fully offline**: No internet connection required
- **Fast search**: Uses SQLite FTS5 full-text search
- **Autocomplete**: Smart suggestions based on similar words
- **Quality scoring**: Each entry has a text quality score

## Technical Details

### State Management
- Redux Toolkit for global state
- Async thunks for database operations
- Search history persistence

### Database Service
- SQLite with react-native-sqlite-storage
- Pre-loaded database from assets
- Efficient search with FTS5
- Connection pooling and error handling

### Navigation
- React Navigation Stack navigator
- Header customization
- Smooth transitions between screens

### UI Components
- Custom components for search results
- Quality indicators with color coding
- Responsive design for mobile devices
- Touch-friendly interface

## Development

### Adding New Features
1. Create new screen in `src/screens/`
2. Add navigation route in `src/navigation/AppNavigator.js`
3. Update Redux store if needed in `src/store/`
4. Add database queries in `src/services/dictionaryService.js`

### Database Updates
1. Add new text files to `/data/` directory in backend
2. Run `npm run build-db` in backend
3. Database automatically copied to frontend assets
4. Restart frontend app to see changes

## Troubleshooting

### Common Issues

1. **"Cannot find module 'babel-preset-expo'" error**
   - Solution: Install `babel-preset-expo` as a direct dependency:
     ```bash
     npm install babel-preset-expo
     ```

2. **JIMP CRC error when starting Expo**
   - Solution: Ensure all PNG files in `assets/` are standard 8-bit/color RGBA format
   - Regenerate icons if needed using standard image editing tools

3. **Expo cache issues**
   - Clear Expo cache:
     ```bash
     npx expo start --clear
     ```

4. **Database not loading**
   - Ensure database generation completed successfully in backend
   - Check that `assets/database/dictionary.db` exists

## Notes
- This app works 100% offline
- All data processing happens during development only
- No internet connection required at runtime
- Database is pre-built and bundled with the app
- Future expansion: audio pronunciations and example sentences can be added as assets