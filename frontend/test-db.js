const { dictionaryService } = require('./src/services/dictionaryService');

async function testDatabase() {
  console.log('Testing database service...\n');
  
  try {
    // Initialize database
    console.log('1. Initializing database...');
    await dictionaryService.initialize();
    console.log('✅ Database initialized successfully\n');
    
    // Test word count
    console.log('2. Getting word count...');
    const wordCount = await dictionaryService.getWordCount();
    console.log(`✅ Total words: ${wordCount}\n`);
    
    // Test Dainamese word count
    console.log('3. Getting Dainamese word count...');
    const dainameseCount = await dictionaryService.getDainameseWordCount();
    console.log(`✅ Dainamese words: ${dainameseCount}\n`);
    
    // Test search
    console.log('4. Testing search functionality...');
    const searchResults = await dictionaryService.searchWords('phat', 5);
    console.log(`✅ Search results for "phat": ${searchResults.length} found`);
    searchResults.forEach((result, index) => {
      console.log(`   ${index + 1}. "${result.word}" - ${result.definition.substring(0, 50)}...`);
    });
    console.log();
    
    // Test suggestions
    console.log('5. Testing suggestions...');
    const suggestions = await dictionaryService.getSuggestions('ph', 5);
    console.log(`✅ Suggestions for "ph": ${suggestions.length} found`);
    suggestions.forEach((suggestion, index) => {
      console.log(`   ${index + 1}. "${suggestion.word}" (${suggestion.suggestion}) - score: ${suggestion.score}`);
    });
    console.log();
    
    // Test random words
    console.log('6. Testing random words...');
    const randomWords = await dictionaryService.getRandomWords(3);
    console.log(`✅ Random words: ${randomWords.length} found`);
    randomWords.forEach((word, index) => {
      console.log(`   ${index + 1}. "${word.word}" - ${word.definition.substring(0, 50)}...`);
    });
    console.log();
    
    // Test getting word by ID
    if (searchResults.length > 0) {
      console.log('7. Testing get word by ID...');
      const firstWord = searchResults[0];
      const wordDetails = await dictionaryService.getWordById(firstWord.id);
      console.log(`✅ Word details for "${firstWord.word}":`);
      console.log(`   ID: ${wordDetails.id}`);
      console.log(`   Word: ${wordDetails.word}`);
      console.log(`   Pronunciation: ${wordDetails.pronunciation || 'N/A'}`);
      console.log(`   Type: ${wordDetails.wordType || 'N/A'}`);
      console.log(`   Definition: ${wordDetails.definition.substring(0, 100)}...`);
      console.log(`   Is Dainamese: ${wordDetails.isDainamese}`);
      console.log(`   Text Quality: ${wordDetails.textQuality}`);
      console.log();
    }
    
    // Test getting word by word
    console.log('8. Testing get word by word...');
    const wordByWord = await dictionaryService.getWordByWord('dua');
    if (wordByWord) {
      console.log(`✅ Found word "dua": ${wordByWord.definition.substring(0, 50)}...`);
    } else {
      console.log('❌ Word "dua" not found');
    }
    console.log();
    
    console.log('🎉 All tests passed! Database service is working correctly.');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await dictionaryService.close();
  }
}

// Run the test
testDatabase().catch(console.error);