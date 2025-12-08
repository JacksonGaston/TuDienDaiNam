# TuDienDaiNam - Offline Dainamese Dictionary App

A fully offline mobile dictionary application for the Dainamese language, designed for iOS and Android with no internet connection required.

## 🏗️ Architecture Overview

- **Frontend**: React Native with Expo (cross-platform mobile app)
- **Backend**: Node.js OCR processing pipeline (development only)
- **Database**: SQLite (pre-built and bundled with app)
- **Design**: Blue (#1E90FF), White (#FFFFFF), Yellow (#FFD700)

## 📋 Prerequisites

### System Requirements
- **Node.js**: 16.x or higher
- **npm**: 8.x or higher
- **Operating System**: Windows 10+, macOS 10.15+, or Ubuntu 18.04+
- **Memory**: Minimum 8GB RAM (for OCR processing)
- **Storage**: 2GB free space

### Mobile Development Requirements
- **Expo CLI**: `npm install -g @expo/cli`
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)
- **Physical device or emulator** for testing

## 📝 Text File Processing (Database Generation)

### Step 1: Prepare Text Files
1. Place your Dainamese dictionary text files in the `/data/` directory
2. Use the format: `word [pronunciation] (word_type). definition`
3. Ensure UTF-8 encoding for proper Dainamese character support

**Example text file content:**
```
hello [həˈloʊ] (interjection). A greeting used when meeting someone.
dictionary [ˈdɪkʃəˌnɛri] (noun). A reference work containing words and their meanings.
```

### Step 2: Backend Setup
```bash
# Navigate to backend directory
cd /home/litemnt/Projects/TuDienDaiNam/backend

# Install dependencies
npm install

# Install required packages
npm install sqlite3 fs-extra path
```

### Step 3: Process Text Files
```bash
# Generate database from text files in /data/ directory
npm run build-db

# This will:
# 1. Read all .txt files from /data/ directory
# 2. Parse and structure the dictionary entries
# 3. Validate entries for quality and completeness
# 4. Generate search indexes
# 5. Create the final SQLite database
```

### Step 4: Verify Database Generation
```bash
# Check if database was created
ls -la ../frontend/assets/database/dictionary.db

# Verify database structure (optional)
npm run build-db -- --verify
```

### Step 5: Manual Validation (Recommended)
1. Review text file format in `/data/` directory
2. Check for any parsing errors in logs
3. Validate Dainamese character encoding
4. Test search functionality with verification tools

## 🛠️ Development Mode

### Backend Development
```bash
# Navigate to backend
cd /home/litemnt/Projects/TuDienDaiNam/backend

# Install dependencies
npm install

# Add your dictionary text files to /data/ directory
# Then generate the database
npm run build-db

# Monitor processing logs for any errors
# Database will be generated in frontend/assets/database/
```

### Frontend Development
```bash
# Navigate to frontend
cd /home/litemnt/Projects/TuDienDaiNam/frontend

# Install dependencies
npm install

# Install babel-preset-expo explicitly (required for Expo 54+)
npm install babel-preset-expo

# Install Expo CLI if not already installed
npm install -g @expo/cli

# Install required packages
npm install @react-navigation/native @react-navigation/stack
npm install react-native-sqlite-storage fuse.js
npm install @reduxjs/toolkit react-redux
npm install react-native-screens react-native-safe-area-context

# Start development server
npm start

# Or run on specific platforms:
npm run android    # For Android
npm run ios        # For iOS (macOS only)
npm run web        # For web testing
```

### Testing in Development
1. Open Expo Go app on your device
2. Scan the QR code from terminal
3. Test dictionary search functionality
4. Verify offline capability (disable internet)
5. Test autocomplete and error suggestions

## 🏭 Production Mode

### Backend Production (Database Generation)
```bash
# Navigate to backend
cd /home/litemnt/Projects/TuDienDaiNam/backend

# Clean previous builds
rm -rf ../frontend/assets/database/dictionary.db

# Generate optimized production database
NODE_ENV=production npm run build-db

# Optimize database size
npm run build-db -- --optimize

# Validate production database
npm run build-db -- --validate
```

### Frontend Production Build
```bash
# Navigate to frontend
cd /home/litemnt/Projects/TuDienDaiNam/frontend

# Install production dependencies
npm install --production

# Build for Android
expo build:android --type apk

# Build for iOS (macOS only)
expo build:ios

# Build standalone app bundles
expo build:android --type app-bundle
expo build:ios --type archive
```

### Production Testing
1. Install built APK/AAB on test devices
2. Verify all dictionary features work offline
3. Test app performance and memory usage
4. Validate database integrity and search speed
5. Test on various screen sizes and OS versions

## 📱 Deployment

### iOS Deployment (App Store)

#### Prerequisites
- Apple Developer Account ($99/year)
- macOS with Xcode 12+
- iOS device for testing
- App Store Connect access

#### Step-by-Step Deployment
1. **Prepare App Store Assets**
   ```bash
   # Create app icons (1024x1024)
   # Create screenshots for all iOS device sizes
   # Prepare app description and keywords
   ```

2. **Configure App in App Store Connect**
   - Create new app in App Store Connect
   - Fill app metadata and descriptions
   - Set pricing and availability
   - Upload screenshots and app icon

3. **Build and Submit**
   ```bash
   # Build for App Store
   expo build:ios --type archive

   # Upload to App Store Connect
   expo upload:ios
   ```

4. **Submit for Review**
   - Complete app review information
   - Submit for Apple review
   - Wait for approval (typically 1-7 days)

### Android Deployment (Google Play Store)

#### Prerequisites
- Google Play Developer Account ($25 one-time)
- Android Studio or command-line tools
- Signed release keystore

#### Step-by-Step Deployment
1. **Generate Signed APK/AAB**
   ```bash
   # Create signing key (one-time)
   keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

   # Build signed AAB (recommended for Play Store)
   expo build:android --type app-bundle --keystore my-release-key.keystore
   ```

2. **Configure Play Console**
   - Create new app in Google Play Console
   - Fill store listing information
   - Upload screenshots and promotional graphics
   - Set content rating and pricing

3. **Upload and Release**
   - Upload signed AAB to Play Console
   - Complete release notes
   - Set up testing tracks (internal, alpha, beta)
   - Roll out to production

### F-Droid Deployment (Open Source)

#### Prerequisites
- Open source license (GPL, MIT, Apache, etc.)
- Source code hosted on public repository
- No proprietary dependencies

#### Step-by-Step Deployment
1. **Prepare for F-Droid**
   ```bash
   # Ensure all dependencies are open source
   # Remove any proprietary SDKs
   # Add build metadata for F-Droid
   ```

2. **Submit to F-Droid**
   - Submit app to F-Droid data repository
   - Wait for inclusion in F-Droid
   - Alternative: Create your own F-Droid repo

3. **Alternative Distribution**
   - Direct APK download from website
   - GitHub Releases
   - Alternative app stores (Aurora Store, etc.)

## 🔧 Troubleshooting

### Text Processing Issues
```bash
# If text parsing fails
# Check file format in /data/ directory
# Ensure UTF-8 encoding
# Verify entry structure: word [pronunciation] (type). definition

# Debug specific files
npm run build-db -- --debug

# Check text file quality
# - Ensure consistent formatting
# - Verify Dainamese character encoding
# - Check for empty lines or malformed entries
```

### Database Issues
```bash
# If database is corrupted
rm ../frontend/assets/database/dictionary.db
npm run process

# Check database integrity
sqlite3 ../frontend/assets/database/dictionary.db ".schema"
```

### Mobile App Issues
```bash
# Clear Expo cache
expo start -c

# Reset Metro bundler
expo start --reset-cache

# Check database file exists in app bundle
# Use React Native Debugger to inspect app state

# If you get "Cannot find module 'babel-preset-expo'" error:
npm install babel-preset-expo

# If you get JIMP CRC error with PNG files:
# Ensure all PNG files in assets/ are standard 8-bit/color RGBA format
# Regenerate icons using standard image editing tools
```

## 📊 Performance Optimization

### Database Optimization
- Use FTS (Full-Text Search) for faster searches
- Implement proper indexing on word columns
- Compress database using SQLite compression
- Limit database size to <50MB for app store limits

### App Performance
- Implement lazy loading for large result sets
- Use React.memo for component optimization
- Implement proper state management
- Test memory usage on low-end devices

## 🔄 Maintenance and Updates

### Updating Dictionary Data
1. Add new text files to `/data/`
2. Run `npm run build-db` in backend
3. Test updated database thoroughly
4. Build and submit new app version

### Version Management
- Use semantic versioning (1.0.0, 1.1.0, 2.0.0)
- Maintain changelog for each release
- Test backward compatibility
- Plan for incremental updates

## 📝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section above
- Review the architecture documentation in `/docs/`