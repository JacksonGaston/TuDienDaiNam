// Simple test to verify the app structure
console.log('Testing TuDienDaiNam frontend structure...\n');

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'App.js',
  'index.js',
  'app.json',
  'babel.config.js',
  'metro.config.js',
  'package.json',
  'src/screens/HomeScreen.js',
  'src/screens/SearchScreen.js',
  'src/screens/WordDetailScreen.js',
  'src/components/SearchResultItem.js',
  'src/services/dictionaryService.js',
  'src/store/store.js',
  'src/store/dictionarySlice.js',
  'src/navigation/AppNavigator.js',
  'assets/database/dictionary.db'
];

console.log('Checking required files:');
let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  console.log(`  ${status} ${file}`);
  
  if (!exists) {
    allFilesExist = false;
  }
});

console.log('\nChecking package.json scripts:');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const requiredScripts = ['start', 'android', 'ios', 'web'];
requiredScripts.forEach(script => {
  const hasScript = packageJson.scripts && packageJson.scripts[script];
  const status = hasScript ? '✅' : '❌';
  console.log(`  ${status} ${script}: ${hasScript ? packageJson.scripts[script] : 'missing'}`);
});

console.log('\nChecking dependencies:');
const requiredDeps = ['expo', 'react', 'react-native', 'expo-sqlite', '@react-navigation/native', '@reduxjs/toolkit'];
requiredDeps.forEach(dep => {
  const hasDep = packageJson.dependencies && packageJson.dependencies[dep];
  const status = hasDep ? '✅' : '❌';
  console.log(`  ${status} ${dep}: ${hasDep ? packageJson.dependencies[dep] : 'missing'}`);
});

console.log('\nChecking database file size:');
const dbPath = path.join(__dirname, 'assets/database/dictionary.db');
if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`  ✅ dictionary.db: ${sizeMB} MB`);
} else {
  console.log('  ❌ dictionary.db: missing - run backend build-db first');
  allFilesExist = false;
}

console.log('\n' + (allFilesExist ? '✅ All checks passed!' : '❌ Some checks failed.'));
console.log('\nTo run the app:');
console.log('1. cd frontend');
console.log('2. npm start');
console.log('3. Scan QR code with Expo Go app or open in browser');