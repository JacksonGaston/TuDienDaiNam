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

## 🖼️ PNG Image Processing (Database Generation)

### Step 1: Prepare PNG Images
1. Place your Dainamese dictionary PNG images in the `/images/` directory
2. Example: The existing `b1s3.png` file contains dictionary page data
3. Ensure images are high-quality (300 DPI recommended) for best OCR results

### Step 2: Backend Setup
```bash
# Navigate to backend directory
cd /home/litemnt/Projects/TuDienDaiNam/backend

# Install dependencies
npm install

# Install OCR dependencies
npm install tesseract.js sqlite3 fs-extra path

# For better OCR performance, install system Tesseract:
# Ubuntu/Debian: sudo apt-get install tesseract-ocr
# macOS: brew install tesseract
# Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki
```

### Step 3: Process PNG Images
```bash
# Process all PNG images in /images/ directory
npm run process

# This will:
# 1. Extract text from each PNG using OCR
# 2. Parse and structure the dictionary entries
# 3. Generate search indexes
# 4. Create the final SQLite database
```

### Step 4: Verify Database Generation
```bash
# Check if database was created
ls -la ../frontend/assets/database/dictionary.db

# Verify database structure (optional)
npm run build-db -- --verify
```

### Step 5: Manual Validation (Recommended)
1. Review OCR output in `backend/output/ocr-results.json`
2. Check for any text extraction errors
3. Validate Dainamese character encoding
4. Manually correct any critical errors if needed

## 🛠️ Development Mode

### Backend Development
```bash
# Navigate to backend
cd /home/litemnt/Projects/TuDienDaiNam/backend

# Install dependencies
npm install

# Run OCR processing on existing images
npm run process

# Monitor processing logs for any errors
# Database will be generated in frontend/assets/database/
```

### Frontend Development
```bash
# Navigate to frontend
cd /home/litemnt/Projects/TuDienDaiNam/frontend

# Install dependencies
npm install

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
NODE_ENV=production npm run process

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

### OCR Processing Issues
```bash
# If OCR fails on specific images
npm run process -- --image b1s3.png --debug

# Check Tesseract installation
tesseract --version

# Improve OCR quality
# - Ensure images are high contrast
# - Try different image preprocessing
# - Manually verify difficult characters
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
1. Add new PNG images to `/images/`
2. Run `npm run process` in backend
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