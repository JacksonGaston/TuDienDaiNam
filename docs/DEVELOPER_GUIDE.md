# TuDienDaiNam Developer Guide

## Overview

This guide provides comprehensive instructions for setting up, developing, testing, and deploying the TuDienDaiNam offline dictionary application.

## Prerequisites

### System Requirements
- **Node.js**: 16.x or higher
- **npm**: 8.x or higher
- **Git**: For version control
- **Operating System**: Windows 10+, macOS 10.15+, or Ubuntu 18.04+
- **Memory**: Minimum 8GB RAM (recommended 16GB)
- **Storage**: 2GB free space

### Mobile Development Requirements
- **Expo CLI**: `npm install -g @expo/cli`
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)
- **Physical device or emulator** for testing

## Project Structure

```
TuDienDaiNam/
├── backend/                 # Development-only data processing
│   ├── src/
│   │   ├── database/       # Database generation and schema
│   │   ├── parser/         # Text parsing and validation
│   │   └── utils/          # Logging and file utilities
│   ├── package.json
│   └── README.md
├── frontend/               # React Native mobile app
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── screens/        # App screens
│   │   ├── services/       # Local database services
│   │   ├── store/          # State management
│   │   └── utils/          # Helper functions
│   ├── assets/
│   │   └── database/       # Pre-built SQLite database
│   ├── package.json
│   └── README.md
├── data/                   # Source dictionary text files
│   └── *.txt              # Raw dictionary data
└── docs/                   # Documentation
    ├── ARCHITECTURE.md
    ├── REFACTORING_PLAN.md
    └── DEVELOPER_GUIDE.md
```

## Setup Instructions

### 1. Clone and Initialize

```bash
# Clone the repository
git clone <repository-url>
cd TuDienDaiNam

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install Expo CLI globally (if not already installed)
npm install -g @expo/cli
```

### 2. Backend Setup (Database Generation)

#### 2.1 Prepare Dictionary Data
Place your dictionary text files in the `/data/` directory with the following format:

```
word [pronunciation] (word_type). definition
example1. meaning of example1
example2. meaning of example2
```

**Example:**
```
hello [həˈloʊ] (interjection). A greeting used when meeting someone.
example1. Hello, how are you? - A common greeting.
example2. Say hello to your mother for me. - Send greetings.

dictionary [ˈdɪkʃəˌnɛri] (noun). A reference work containing words and their meanings.
example1. I looked up the word in the dictionary. - Using a dictionary for reference.
example2. This is a comprehensive dictionary. - Describing a complete reference.
```

#### 2.2 Generate Database

```bash
# Navigate to backend directory
cd backend

# Generate database from text files
npm run build-db

# Options:
npm run build-db -- --verify    # Generate and verify database
npm run build-db -- --optimize  # Generate with optimizations
npm run build-db -- --reset     # Reset database before generation
```

#### 2.3 Verify Database Generation

```bash
# Check if database was created
ls -la ../frontend/assets/database/dictionary.db

# Run verification tests
node simple-verify.js full      # Complete pipeline verification
node simple-verify.js text      # Show text files only
node simple-verify.js parsed    # Show parsed entries only
node simple-verify.js valid     # Show validation results only
node simple-verify.js db        # Show database contents only
node simple-verify.js search    # Test search functionality only

# Web dashboard for visual verification
node data-viewer.js
# Open browser to: http://localhost:3000
```

### 3. Frontend Setup (Mobile App)

#### 3.1 Install Dependencies

```bash
# Navigate to frontend directory
cd frontend

# Install Expo packages (Expo manages versions)
npx expo install @react-navigation/native @react-navigation/stack
npx expo install expo-sqlite
npx expo install react-native-screens react-native-safe-area-context
npx expo install react-native-gesture-handler

# Install other dependencies
npm install fuse.js @reduxjs/toolkit react-redux

# Fix any version mismatches
npx expo install --fix

# Verify installation
npx expo-doctor
```

**Important**: Always use `npx expo install` for Expo and React Native packages to ensure version compatibility. Using `npm install` directly can cause version conflicts.

#### 3.2 Start Development Server

```bash
# Start Expo development server
npm start

# Or run on specific platforms:
npm run android    # For Android
npm run ios        # For iOS (macOS only)
npm run web        # For web testing
```

#### 3.3 Expo Development Options

Expo provides multiple ways to run your app during development:

##### **Tunnel Mode (Recommended for Mobile Testing)**
Creates a public URL via ngrok that works on any network:
```bash
# Start with tunnel (works on any network)
npx expo start --tunnel

# Or with clear cache
npx expo start --tunnel --clear
```
**When to use:**
- Testing on physical devices not on same WiFi
- Sharing development build with others
- Testing on mobile data connection
- When LAN mode doesn't work

**Benefits:**
- Works anywhere with internet
- No network configuration needed
- Easy to share with testers

**Limitations:**
- Slightly slower than LAN
- Requires internet connection
- Tunnel URL changes each session

##### **LAN Mode (Local Network)**
Uses your local network IP address:
```bash
# Start with LAN mode
npx expo start --lan

# Or specify host explicitly
npx expo start --host lan
```
**When to use:**
- Testing on physical devices on same WiFi
- Faster than tunnel mode
- No external internet dependency

**Requirements:**
- Computer and device on same network
- Firewall allows port 8081
- Network discovery enabled

**Troubleshooting LAN:**
```bash
# Check your IP address
ip addr show

# Test connectivity
ping <device-ip>

# If LAN doesn't work, try specifying IP
EXPO_PACKAGER_PROXY_URL=http://<your-ip>:8081 npx expo start
```

##### **Localhost Mode**
Only accessible from development machine:
```bash
# Start with localhost only
npx expo start --localhost

# Or specify host explicitly
npx expo start --host localhost
```
**When to use:**
- Testing in emulator/simulator
- Development only on computer
- When no network available

**Limitations:**
- Won't work on physical devices
- Only accessible from local machine

##### **Web Mode**
Run app in web browser:
```bash
# Start web version
npx expo start --web

# Or use npm script
npm run web
```
**When to use:**
- Quick UI testing
- Debugging layout issues
- Testing without mobile device
- Cross-browser compatibility

**Access:** Open `http://localhost:8082` in browser

##### **Direct Connection**
Manually specify connection details:
```bash
# Start with custom port
npx expo start --port 19000

# With specific scheme
npx expo start --scheme myapp

# With HTTPS (requires certificate)
npx expo start --https
```

#### 3.4 Test on Devices

**Android (Physical Device):**
1. Install **Expo Go** from Play Store
2. Start Expo with tunnel: `npx expo start --tunnel`
3. Scan QR code from terminal with Expo Go app
4. Or enter URL manually: `exp://<tunnel-url>`

**iOS (Physical Device):**
1. Install **Expo Go** from App Store
2. Start Expo with tunnel: `npx expo start --tunnel`
3. Scan QR code with Camera app (iOS 13+)
4. Or enter URL manually in Safari: `exp://<tunnel-url>`

**Android Emulator:**
```bash
# Start Android emulator first (from Android Studio)
# Then run:
npm run android

# Or start Expo and press 'a' in terminal
npx expo start
# Press 'a' to open on Android
```

**iOS Simulator (macOS only):**
```bash
# Start iOS simulator first
# Then run:
npm run ios

# Or start Expo and press 'i' in terminal
npx expo start
# Press 'i' to open on iOS
```

**Web Browser:**
```bash
# Start web version
npm run web
# Open http://localhost:8082 in browser
```

#### 3.5 Troubleshooting Expo Connection

**Common Issues and Solutions:**

1. **"Unable to resolve module" errors:**
```bash
# Clear Metro bundler cache
npx expo start --clear

# Or reset cache completely
npx expo start --reset-cache
```

2. **"Tunnel connection failed":**
```bash
# Try LAN mode instead
npx expo start --lan

# Or check network connectivity
curl https://ngrok.com
```

3. **"Device not connecting on LAN":**
```bash
# Check firewall settings
sudo ufw allow 8081

# Verify devices are on same network
ip addr show  # Computer IP
# Check device IP in settings
```

4. **"Expo Go app crashes":**
```bash
# Clear Expo Go app cache on device
# Settings > Apps > Expo Go > Storage > Clear Cache

# Or reinstall Expo Go app
```

5. **"React version mismatch" error:**
```bash
# Fix package versions
npx expo install --fix

# Check compatibility
npx expo-doctor
```

6. **"Database not loading" on mobile:**
- Verify database file exists: `frontend/assets/database/dictionary.db`
- Check file size (should be ~600KB)
- Ensure proper SQLite initialization in code

**Quick Reference Commands:**
```bash
# Start with tunnel (recommended for mobile)
npx expo start --tunnel

# Start web version for quick testing
npm run web

# Clear cache and start fresh
npx expo start --tunnel --clear

# Check for issues
npx expo-doctor

# Fix package versions
npx expo install --fix
```

## Development Workflow

### Backend Development

#### Adding New Dictionary Data
1. Add new `.txt` files to `/data/` directory
2. Ensure proper format: `word [pronunciation] (type). definition`
3. Run database generation: `npm run build-db`
4. Verify with: `node simple-verify.js full`

#### Modifying Parser Logic
1. Edit `backend/src/parser/text-parser.js`
2. Update parsing patterns as needed
3. Test with: `node simple-verify.js parsed`

#### Modifying Validation Rules
1. Edit `backend/src/parser/entry-validator.js`
2. Update validation rules and confidence scoring
3. Test with: `node simple-verify.js valid`

#### Database Schema Changes
1. Edit `backend/src/database/schema.js`
2. Update table definitions, indexes, or triggers
3. Reset database: `npm run build-db -- --reset`
4. Regenerate: `npm run build-db`

### Frontend Development

#### Component Development
1. Create components in `frontend/src/components/`
2. Follow existing patterns and styles
3. Test with Storybook or directly in app

#### Screen Development
1. Create screens in `frontend/src/screens/`
2. Connect to navigation in `frontend/src/navigation/`
3. Test navigation flow

#### Database Integration
1. Use `frontend/src/services/database.js` for all DB operations
2. Implement search queries using FTS5
3. Cache frequently accessed data

#### State Management
1. Use Redux slices in `frontend/src/store/slices/`
2. Follow Redux Toolkit patterns
3. Use selectors for derived state

## Testing

### Backend Testing

```bash
# Run all verification tests
cd backend
node simple-verify.js full

# Test specific components
node test-parser.js      # Test text parsing
node test-validator.js   # Test validation
node test-database.js    # Test database operations
```

### Frontend Testing

```bash
# Run Jest tests
cd frontend
npm test

# Run specific test suites
npm test -- --testNamePattern="SearchScreen"
npm test -- --testNamePattern="database"

# Run with coverage
npm test -- --coverage
```

### Manual Testing Checklist

#### Backend
- [ ] Text files parse correctly
- [ ] Validation catches invalid entries
- [ ] Database generates without errors
- [ ] Search returns correct results
- [ ] Suggestions are generated properly

#### Frontend
- [ ] App launches without errors
- [ ] Search functionality works
- [ ] Autocomplete shows suggestions
- [ ] Word details display correctly
- [ ] Similar words shown for missing words
- [ ] App works offline
- [ ] Performance is acceptable

### Cross-Platform Testing

#### iOS Testing
```bash
# Build for iOS simulator
cd frontend
npm run ios

# Test on physical device
# 1. Scan QR code with Expo Go app
# 2. Test all features
# 3. Check memory usage in Xcode Instruments
```

#### Android Testing
```bash
# Build for Android emulator
cd frontend
npm run android

# Test on physical device
# 1. Scan QR code with Expo Go app
# 2. Test all features
# 3. Check performance in Android Studio Profiler
```

## Debugging

### Backend Debugging

#### Common Issues
1. **Database not generating**: Check file permissions and paths
2. **Parsing errors**: Verify text file format
3. **Search not working**: Check FTS5 table population

#### Debug Commands
```bash
# Debug database generation
cd backend
DEBUG=* npm run build-db

# Check database contents
sqlite3 ../frontend/assets/database/dictionary.db ".tables"
sqlite3 ../frontend/assets/database/dictionary.db "SELECT * FROM words LIMIT 5;"

# Test search queries
sqlite3 ../frontend/assets/database/dictionary.db "SELECT * FROM search_index WHERE search_index MATCH 'test';"
```

### Frontend Debugging

#### Common Issues
1. **App won't start**: Check Expo dependencies
2. **Database not loading**: Verify database file exists in assets
3. **Search not working**: Check FTS5 queries

#### Debug Commands
```bash
# Clear Expo cache
cd frontend
expo start -c
expo start --reset-cache

# Debug with React Native Debugger
# 1. Install React Native Debugger
# 2. Start app with: npm start
# 3. Open React Native Debugger
# 4. Enable remote debugging

# Check database in app
# Use React Native Debugger to inspect database state
```

#### Console Logging
```javascript
// In frontend code
import { logger } from './utils/logger';

logger.debug('Search query:', query);
logger.info('Search results:', results);
logger.error('Database error:', error);
```

## Performance Optimization

### Backend Optimization

#### Database Generation
```bash
# Use optimization flags
npm run build-db -- --optimize

# Monitor performance
time npm run build-db
```

#### Memory Usage
- Process files in batches
- Use streaming for large files
- Clear memory between processing stages

### Frontend Optimization

#### Database Queries
- Use indexed queries
- Implement pagination for large result sets
- Cache frequent queries

#### Component Performance
- Use React.memo for pure components
- Implement virtualization for long lists
- Optimize re-renders with useMemo/useCallback

#### Bundle Size
- Use code splitting
- Optimize images and assets
- Remove unused dependencies

## Deployment

### Backend Deployment (Development Only)

The backend is development-only and doesn't need deployment. However, you should:

1. **Version control database generation scripts**
2. **Document processing pipeline changes**
3. **Maintain data quality tests**

### Frontend Deployment

#### iOS (App Store)

**Prerequisites:**
- Apple Developer Account ($99/year)
- macOS with Xcode 12+
- iOS device for testing

**Steps:**
```bash
# Build for iOS
cd frontend
expo build:ios

# Or build for simulator
expo build:ios --type simulator

# Upload to App Store Connect
expo upload:ios
```

#### Android (Google Play Store)

**Prerequisites:**
- Google Play Developer Account ($25 one-time)
- Android Studio or command-line tools
- Signed release keystore

**Steps:**
```bash
# Generate signing key (one-time)
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# Build signed APK
cd frontend
expo build:android --type apk --keystore my-release-key.keystore

# Or build App Bundle (recommended)
expo build:android --type app-bundle --keystore my-release-key.keystore
```

#### F-Droid (Open Source)

**Prerequisites:**
- Open source license (GPL, MIT, Apache, etc.)
- Source code hosted on public repository
- No proprietary dependencies

**Steps:**
1. Ensure all dependencies are open source
2. Remove any proprietary SDKs
3. Submit to F-Droid data repository
4. Wait for inclusion in F-Droid

## Maintenance

### Regular Tasks

#### Weekly
1. **Test database generation** with new data
2. **Verify search functionality**
3. **Check app performance** on test devices
4. **Review error logs**

#### Monthly
1. **Update dependencies**
2. **Test on latest iOS/Android versions**
3. **Review and optimize database queries**
4. **Backup dictionary data**

#### Quarterly
1. **Performance audit**
2. **Security review**
3. **User feedback analysis**
4. **Feature planning**

### Database Updates

When updating dictionary data:

```bash
# 1. Add new text files to /data/
# 2. Generate new database
cd backend
npm run build-db -- --verify

# 3. Test new database
node simple-verify.js full

# 4. Replace database in frontend
cp dictionary.db ../frontend/assets/database/

# 5. Update app version and changelog
# 6. Build and deploy new app version
```

### Version Management

Use semantic versioning:
- **Major version**: Breaking changes
- **Minor version**: New features
- **Patch version**: Bug fixes

Update version in:
1. `frontend/package.json`
2. `backend/package.json`
3. App store listings
4. CHANGELOG.md

## Troubleshooting

### Common Issues

#### Expo/React Native Compatibility Issues

**Issue**: React version mismatch causing "[runtime not ready]" error
**Cause**: Expo SDK bundles specific React Native versions. Using incompatible versions causes runtime errors.

**Solution**:
```bash
cd frontend

# 1. Check current versions
npm list react react-native expo-sqlite react-native-screens

# 2. Fix to Expo 54 compatible versions
npx expo install --fix

# 3. Verify fixed versions match:
# react: 19.1.0 (not 19.2.1)
# react-native: 0.81.5 (not 0.82.1)
# expo-sqlite: ~16.0.10 (not 15.0.6)
# react-native-screens: ~4.16.0 (not 4.18.0)

# 4. Install missing peer dependencies
npx expo install react-native-gesture-handler

# 5. Add gesture handler import to index.js
echo "import 'react-native-gesture-handler';" >> index.js

# 6. Clear cache and restart
npx expo start --tunnel --clear
```

**Prevention**: Always use `expo install` instead of `npm install` for Expo packages:
```bash
# ✅ Correct way (Expo manages versions)
npx expo install react-native-gesture-handler
npx expo install @react-navigation/native

# ❌ Avoid (can cause version conflicts)
npm install react-native-gesture-handler
npm install @react-navigation/native
```

#### Backend Issues

**Issue**: Database generation fails
**Solution**: 
```bash
# Check file permissions
ls -la data/*.txt

# Check disk space
df -h

# Check Node.js version
node --version

# Clear and retry
rm -rf ../frontend/assets/database/dictionary.db
npm run build-db
```

**Issue**: Search returns no results
**Solution**:
```bash
# Check FTS5 table
sqlite3 ../frontend/assets/database/dictionary.db "SELECT COUNT(*) FROM search_index;"

# Test search query
sqlite3 ../frontend/assets/database/dictionary.db "SELECT * FROM search_index WHERE search_index MATCH 'test' LIMIT 5;"
```

#### Frontend Issues

**Issue**: App crashes on startup
**Solution**:
```bash
# Clear Expo cache
cd frontend
expo start -c
expo start --reset-cache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check database file exists
ls -la assets/database/dictionary.db
```

**Issue**: "[runtime not ready] : error Incompatible React version"
**Solution**:
This occurs when React versions don't match Expo SDK requirements:
```bash
# Fix package versions to match Expo SDK
cd frontend
npx expo install --fix

# Check for compatibility issues
npx expo-doctor

# Verify versions match Expo 54 requirements:
# react: 19.1.0 (not 19.2.1)
# react-native: 0.81.5 (not 0.82.1)
# expo-sqlite: ~16.0.10 (not 15.0.6)
# react-native-screens: ~4.16.0 (not 4.18.0)

# Install missing peer dependencies
npx expo install react-native-gesture-handler
```

**Issue**: Expo Go shows "Failed to download remote update"
**Solution**:
```bash
# Use tunnel mode for external access
npx expo start --tunnel

# Or ensure devices are on same network for LAN
npx expo start --lan

# Check network connectivity
ping <device-ip>
```

**Issue**: Gestures/swipes not working in navigation
**Solution**:
Add gesture handler import to `index.js`:
```javascript
import { registerRootComponent } from 'expo';
import 'react-native-gesture-handler';  // Add this line
import App from './App';

registerRootComponent(App);
```

**Issue**: Search not working in app
**Solution**:
1. Check database is loaded
2. Verify FTS5 queries
3. Check search service implementation
4. Test with debug logging

**Issue**: App size too large
**Solution**:
1. Optimize images and assets
2. Remove unused dependencies
3. Use code splitting
4. Compress database

### Getting Help

1. **Check documentation** in `/docs/`
2. **Review error logs** in console
3. **Test with verification tools**
4. **Search existing issues**
5. **Create new issue** with details:
   - Error message
   - Steps to reproduce
   - Environment details
   - Screenshots if applicable

## Contributing

### Code Style

#### Backend
- Use async/await for asynchronous operations
- Follow JavaScript ES6+ standards
- Use descriptive variable names
- Add JSDoc comments for functions

#### Frontend
- Follow React Native best practices
- Use functional components with hooks
- Implement proper error handling
- Add PropTypes or TypeScript types

### Pull Request Process

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/new-feature`
3. **Make changes**: Follow code style guidelines
4. **Add tests**: For new functionality
5. **Update documentation**: If needed
6. **Commit changes**: `git commit -am 'Add new feature'`
7. **Push to branch**: `git push origin feature/new-feature`
8. **Create Pull Request**: With detailed description

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Performance considered
- [ ] Security reviewed

## Support

For support and questions:

1. **Check documentation** in `/docs/`
2. **Review troubleshooting** section
3. **Create issue** on GitHub
4. **Contact maintainers** for critical issues

### Emergency Contacts

- **Backend issues**: Database generation, parsing errors
- **Frontend issues**: App crashes, UI problems, React version conflicts
- **Expo/React Native issues**: Connection problems, version mismatches
- **Deployment issues**: App store submission problems
- **Security issues**: Vulnerability reports

### Quick Fix Reference

#### React Version Mismatch Fix
If you see `[runtime not ready] : error Incompatible React version`:
```bash
cd frontend
npx expo install --fix
npx expo install react-native-gesture-handler
echo "import 'react-native-gesture-handler';" >> index.js
npx expo start --tunnel --clear
```

#### Expo Go Connection Issues
If Expo Go can't connect:
```bash
# Try tunnel mode (works anywhere)
npx expo start --tunnel

# Or LAN mode (same WiFi)
npx expo start --lan

# Or web testing
npm run web
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- React Native team for the mobile framework
- Expo team for development tools
- SQLite team for embedded database
- Contributors and testers

---

*Last updated: December 8, 2025*
*Version: 1.1.0*