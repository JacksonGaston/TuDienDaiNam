import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { searchWords, getSuggestions, addToHistory } from '../store/dictionarySlice';
import SearchResultItem from '../components/SearchResultItem';

const SearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  const dispatch = useDispatch();
  const { searchResults, suggestions, isLoading, error, searchHistory } = useSelector(
    (state) => state.dictionary
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedQuery.trim().length > 0) {
      dispatch(getSuggestions(debouncedQuery));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [debouncedQuery, dispatch]);

  const handleSearch = useCallback(() => {
    if (searchQuery.trim().length > 0) {
      Keyboard.dismiss();
      setShowSuggestions(false);
      dispatch(searchWords(searchQuery));
    }
  }, [searchQuery, dispatch]);

  const handleSuggestionPress = useCallback((suggestion) => {
    setSearchQuery(suggestion.word);
    setShowSuggestions(false);
    dispatch(searchWords(suggestion.word));
  }, [dispatch]);

  const handleResultPress = useCallback((word) => {
    dispatch(addToHistory(word));
    navigation.navigate('WordDetail', { wordId: word.id });
  }, [dispatch, navigation]);

  const handleHistoryPress = useCallback((word) => {
    setSearchQuery(word.word);
    dispatch(searchWords(word.word));
    navigation.navigate('WordDetail', { wordId: word.id });
  }, [dispatch, navigation]);

  const renderSuggestionItem = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionPress(item)}
    >
      <Text style={styles.suggestionText}>{item.word}</Text>
      {item.pronunciation && (
        <Text style={styles.suggestionPronunciation}>{item.pronunciation}</Text>
      )}
    </TouchableOpacity>
  );

  const renderResultItem = ({ item }) => (
    <SearchResultItem
      word={item}
      onPress={() => handleResultPress(item)}
    />
  );

  const renderHistoryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => handleHistoryPress(item)}
    >
      <Text style={styles.historyWord}>{item.word}</Text>
      {item.pronunciation && (
        <Text style={styles.historyPronunciation}>{item.pronunciation}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a word..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.sectionTitle}>Suggestions</Text>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestionItem}
            keyExtractor={(item) => `${item.wordId}-${item.suggestion}`}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {!showSuggestions && searchResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.sectionTitle}>
            Results ({searchResults.length})
          </Text>
          <FlatList
            data={searchResults}
            renderItem={renderResultItem}
            keyExtractor={(item) => item.id.toString()}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {!showSuggestions && searchResults.length === 0 && searchQuery.length === 0 && searchHistory.length > 0 && (
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            <TouchableOpacity onPress={() => dispatch(clearHistory())}>
              <Text style={styles.clearHistoryText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={searchHistory}
            renderItem={renderHistoryItem}
            keyExtractor={(item) => item.id.toString()}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {!showSuggestions && searchResults.length === 0 && searchQuery.length > 0 && !isLoading && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No results found for "{searchQuery}"</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  searchButton: {
    marginLeft: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  suggestionsContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  historyContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    padding: 16,
    backgroundColor: '#f5f5f5',
    color: '#333',
  },
  suggestionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
  },
  suggestionPronunciation: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  historyItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyWord: {
    fontSize: 16,
    color: '#333',
  },
  historyPronunciation: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
  },
  clearHistoryText: {
    color: '#007AFF',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default SearchScreen;