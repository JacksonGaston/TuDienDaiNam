# TuDienDaiNam Refactoring & Implementation Plan

## Current State Analysis

### Backend Status (70% Complete)

✅ **Working:**

- Text parsing pipeline (168 entries from A.txt)
- Entry validation (146/168 valid, 91% confidence)
- Database schema with FTS5 search index
- Database generation to frontend/assets/

⚠️ **Issues to Fix:**

1. **Search not working** - FTS5 queries return no results for test searches
2. **Suggestions table empty** - `generateSuggestions()` never called
3. **Dainamese detection broken** - 0 Dainamese words detected
4. **Text parsing issues** - OCR artifacts in A.txt causing poor parsing
5. **Missing suggestions generation** in database build process

### Frontend Status (0% Complete)

❌ **Not Implemented:**

- No React Native app structure
- No screens/components
- No database integration
- No search UI
- No autocomplete/suggestions
- No word display with meaning + examples

## Phase 1: Backend Refactoring

### 1.1 Fix Data Parsing Issues (intend to remove because I will manually audit the data to ensure it is in correct format)

### 1.2 Fix Search Implementation

**Problem:** FTS5 search returns no results
**Solution:**

1. Test FTS5 queries directly on database
2. Ensure search_index is properly populated
3. Add proper search test cases
4. Fix query syntax if needed

**Files to modify:**

- `backend/src/database/seeder.js` (updateSearchIndex method)
- `backend/verify-pipeline.js` (search test queries)

### 1.3 Implement Suggestions Generation

**Problem:** Suggestions table is empty
**Solution:** Call `generateSuggestions()` in database generation pipeline

**Files to modify:**

- `backend/src/database/generate-db.js` (add suggestions generation)
- `backend/src/database/seeder.js` (improve suggestion algorithms)

### 1.4 Improve Dainamese Detection

**Problem:** 0 Dainamese words detected
**Solution:**

1. Add proper Dainamese character detection
2. Test with actual Dainamese dictionary data
3. Update normalizer to recognize Dainamese patterns

**Files to modify:**

- `backend/src/parser/dainamese-normalizer.js`
- `backend/src/parser/entry-validator.js`

## Phase 2: Frontend Implementation

### 2.1 Project Structure Setup

```
frontend/
├── src/
│   ├── App.js                    # Main app component
│   ├── navigation/               # React Navigation setup
│   │   ├── AppNavigator.js
│   │   └── routes.js
│   ├── screens/                  # App screens
│   │   ├── SearchScreen.js       # Main search interface
│   │   ├── WordDetailScreen.js   # Word details view
│   │   ├── HistoryScreen.js      # Search history
│   │   └── SettingsScreen.js     # App settings
│   ├── components/               # Reusable components
│   │   ├── SearchBar.js          # Search input with autocomplete
│   │   ├── WordCard.js           # Word display component
│   │   ├── SuggestionList.js     # Similar words list
│   │   ├── LoadingSpinner.js     # Loading indicator
│   │   └── ErrorMessage.js       # Error display
│   ├── services/                 # Database and business logic
│   │   ├── database.js           # SQLite setup and queries
│   │   ├── searchService.js      # Search and autocomplete logic
│   │   └── suggestionService.js  # Similar words logic
│   ├── store/                    # State management (Redux)
│   │   ├── store.js
│   │   ├── slices/
│   │   │   ├── searchSlice.js
│   │   │   ├── historySlice.js
│   │   │   └── settingsSlice.js
│   │   └── selectors.js
│   └── utils/                    # Helper functions
│       ├── constants.js          # App constants
│       ├── helpers.js            # Utility functions
│       └── styles.js             # Shared styles
├── assets/
│   └── database/
│       └── dictionary.db         # Pre-built database
└── package.json
```

### 2.2 Core Features Implementation

#### 2.2.1 Database Service (`services/database.js`)

```javascript
// Key responsibilities:
1. Initialize SQLite database from assets
2. Execute search queries using FTS5
3. Fetch word details by ID
4. Get similar words from suggestions table
5. Manage search history
```

#### 2.2.2 Search Screen (`screens/SearchScreen.js`)

```javascript
// Key features:
1. Search input with real-time autocomplete
2. Display search results as user types
3. Show "No results found" with similar word suggestions
4. Tap result to view WordDetailScreen
5. Search history tracking
```

#### 2.2.3 Word Detail Screen (`screens/WordDetailScreen.js`)

```javascript
// Key features:
1. Display word, pronunciation, type
2. Show definition with proper formatting
3. Display examples with translations
4. Show similar words section
5. Bookmark/favorite functionality
```

#### 2.2.4 Search Bar Component (`components/SearchBar.js`)

```javascript
// Key features:
1. Text input with debounced search
2. Dropdown autocomplete list
3. Clear search button
4. Loading indicator during search
5. Keyboard handling (dismiss on tap outside)
```

### 2.3 State Management

**Redux Toolkit slices:**

- `searchSlice`: Current query, results, loading state
- `historySlice`: Search history, recent words
- `settingsSlice`: App preferences (theme, font size, etc.)

### 2.4 UI/UX Design

**Color Scheme:** Blue (#1E90FF), White (#FFFFFF), Yellow (#FFD700)
**Typography:** System fonts with adjustable sizes
**Layout:** Responsive for both iOS and Android
**Navigation:** Bottom tabs or drawer navigation

## Phase 3: Testing & Quality Assurance

### 3.1 Backend Testing

1. **Unit Tests:** Parser, validator, normalizer
2. **Integration Tests:** Database generation pipeline
3. **Data Quality Tests:** Validate parsed entries match expected format
4. **Performance Tests:** Database generation speed, search query performance

### 3.2 Frontend Testing

1. **Component Tests:** SearchBar, WordCard, etc.
2. **Screen Tests:** SearchScreen, WordDetailScreen
3. **Integration Tests:** Database queries, navigation flow
4. **E2E Tests:** Complete user flows

### 3.3 Cross-Platform Testing

1. **iOS Simulator:** Test on various iPhone models
2. **Android Emulator:** Test on various Android devices
3. **Physical Devices:** Test on actual iOS and Android devices
4. **Performance:** Memory usage, battery impact, startup time

## Phase 4: Deployment & Documentation

### 4.1 Developer Setup Guide

Complete setup instructions for:

- Backend development environment
- Frontend development environment
- Database generation workflow
- Testing procedures

### 4.2 User Documentation

- App usage guide
- Search tips and tricks
- Offline functionality explanation
- Troubleshooting common issues

### 4.3 Deployment Checklist

- [ ] Backend processing pipeline verified
- [ ] Database generation tested
- [ ] Frontend builds for iOS and Android
- [ ] App Store/Play Store assets prepared
- [ ] Privacy policy and terms of service
- [ ] App store descriptions and screenshots

## Implementation Priority

### High Priority (Week 1-2)

1. Fix backend search and suggestions generation
2. Create basic frontend structure with Expo
3. Implement database service and basic search
4. Create SearchScreen with functional search

### Medium Priority (Week 3-4)

1. Implement WordDetailScreen
2. Add autocomplete/suggestions
3. Add search history
4. Implement settings and preferences

### Low Priority (Week 5-6)

1. Add bookmarks/favorites
2. Implement advanced search filters
3. Add pronunciation audio support
4. Add sharing functionality

## Technical Decisions

### Database Optimization

- Use FTS5 for fast text search
- Pre-compute suggestions during database generation
- Implement proper indexing for performance
- Consider database compression for app size

### State Management

- Redux Toolkit for predictable state management
- Persist search history locally
- Cache frequently accessed words

### UI Framework

- React Native with Expo for cross-platform
- React Navigation for routing
- NativeBase or React Native Paper for UI components
- Custom styling for brand consistency

### Performance Considerations

- Lazy load database on first open
- Implement search debouncing
- Cache search results
- Optimize component re-renders

## Success Metrics

### Backend

- [ ] 95%+ parsing accuracy on clean dictionary data
- [ ] < 2 second database generation for 10,000 entries
- [ ] 100ms search response time
- [ ] Proper Dainamese character handling

### Frontend

- [ ] < 3 second app startup time
- [ ] < 100ms search response
- [ ] Smooth 60fps animations
- [ ] < 50MB app size
- [ ] Works 100% offline

### User Experience

- [ ] Intuitive search interface
- [ ] Fast word lookup
- [ ] Helpful suggestions for misspelled words
- [ ] Clean, readable word display
- [ ] Works on both iOS and Android

## Risk Mitigation

### Technical Risks

1. **SQLite performance issues** - Implement proper indexing and query optimization
2. **Large database size** - Implement compression and lazy loading
3. **Cross-platform compatibility** - Test early and often on both platforms
4. **Offline data sync** - Clear versioning and update strategy

### Project Risks

1. **Scope creep** - Stick to MVP features first
2. **Timeline delays** - Weekly progress reviews
3. **Quality issues** - Automated testing and code reviews
4. **User adoption** - Early beta testing with target users

## Next Steps

### Immediate (Day 1-2)

1. Fix backend search implementation
2. Implement suggestions generation
3. Create basic frontend project structure
4. Set up development environment documentation

### Short-term (Week 1)

1. Complete backend fixes
2. Implement basic search functionality
3. Create word detail display
4. Add autocomplete suggestions

### Medium-term (Week 2-3)

1. Polish UI/UX
2. Add search history
3. Implement settings
4. Begin testing on devices

### Long-term (Week 4+)

1. Performance optimization
2. Additional features (bookmarks, sharing, etc.)
3. App store submission preparation
4. User documentation

## Development Workflow

### Daily Workflow

1. **Morning:** Review progress, plan day's tasks
2. **Development:** Implement features with tests
3. **Afternoon:** Test on iOS and Android simulators
4. **Evening:** Code review, documentation updates

### Weekly Workflow

1. **Monday:** Plan week's sprint goals
2. **Tuesday-Thursday:** Feature implementation
3. **Friday:** Testing and bug fixing
4. **Weekend:** Documentation and planning

### Release Workflow

1. **Development:** Feature branches, PR reviews
2. **Testing:** Beta testing on devices
3. **Staging:** Final testing before release
4. **Production:** App store deployment

## Conclusion

This refactoring plan addresses all current issues and provides a clear path forward for both backend improvements and frontend implementation. The key insight is maintaining the separation of concerns: backend prepares the data, frontend consumes it efficiently.

The plan focuses on delivering a fully functional offline dictionary app with proper search, autocomplete, and word display while ensuring cross-platform compatibility and performance.
