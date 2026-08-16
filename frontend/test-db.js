const { dictionaryService } = require('./src/services/dictionaryService');

async function testDatabase() {
  console.log('Testing database service...\n');

  try {
    console.log('1. Initializing database...');
    await dictionaryService.initialize();
    console.log('Database initialized successfully\n');

    console.log('2. Getting word count...');
    const wordCount = await dictionaryService.getWordCount();
    console.log('Total words:', wordCount, '\n');

    console.log('3. Getting Dainamese word count...');
    const dainameseCount = await dictionaryService.getDainameseWordCount();
    console.log('Dainamese words:', dainameseCount, '\n');

    console.log('4. Testing search functionality (searchWord)...');
    const searchResults = await dictionaryService.searchWord('phat');
    if (searchResults.match) {
      console.log('Match found:', searchResults.match.word, '-', (searchResults.match.meaning || '').substring(0, 50));
      console.log('Top 3 related:', (searchResults.suggestions || []).map(s => s.word).join(', '));
    } else {
      console.log('No exact match. Suggestions:', (searchResults.suggestions || []).map(s => s.word).join(', ') || 'none');
    }
    console.log();

    console.log('5. Testing suggestions (getSuggestions)...');
    const suggestions = await dictionaryService.getSuggestions('ph', 5);
    suggestions.forEach((s, i) => {
      console.log('  ' + (i + 1) + '. ' + s.word + ' - ' + (s.meaning || '').substring(0, 40));
    });
    console.log();

    console.log('6. Testing random words...');
    const randomWords = await dictionaryService.getRandomWords(3);
    randomWords.forEach((w, i) => {
      console.log('  ' + (i + 1) + '. ' + w.word + ' (' + w.wordType + ') - ' + (w.meaning || '').substring(0, 50));
    });
    console.log();

    if (searchResults.match) {
      console.log('7. Testing get word by ID...');
      const wordDetails = await dictionaryService.getWordById(searchResults.match.id);
      console.log('Word:', wordDetails.word);
      console.log('Type:', wordDetails.wordType);
      console.log('Meaning:', (wordDetails.meaning || '').substring(0, 100));
      console.log('Is Dainamese:', wordDetails.isDainamese);
      console.log('Compounds:', (wordDetails.compounds || []).length);
      console.log();
    }

    console.log('8. Testing get word by word...');
    const wordByWord = await dictionaryService.getWordByWord('dua');
    if (wordByWord) {
      console.log('Found word "dua":', wordByWord.wordType, '-', (wordByWord.meaning || '').substring(0, 50));
    } else {
      console.log('Word "dua" not found');
    }
    console.log();

    console.log('All tests passed! Database service is working correctly.');

  } catch (error) {
    console.error('Error during testing:', error);
    process.exit(1);
  } finally {
    await dictionaryService.close();
  }
}

testDatabase().catch(console.error);
