import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { searchWord, getSuggestions, addToHistory } from '../store/dictionarySlice';
import { useTranslation } from '../i18n/LanguageContext';

const SearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const submittedRef = useRef(null);
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const { searchResult, suggestions, isLoading } = useSelector(
    (state) => state.dictionary
  );
  const { match, notFound } = searchResult || { match: null, notFound: false };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const q = (debouncedQuery || '').trim();
    const submitted = (submittedRef.current || '').trim().toLowerCase();
    if (q.length > 0 && searchQuery.length > 0 && q.toLowerCase() !== submitted) {
      dispatch(getSuggestions(debouncedQuery));
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }
  }, [debouncedQuery, dispatch, searchQuery.length]);

  const handleChangeText = useCallback((text) => {
    submittedRef.current = null;
    setSearchQuery(text);
  }, []);

  const handleSearch = useCallback(() => {
    if (searchQuery.trim().length > 0) {
      Keyboard.dismiss();
      submittedRef.current = searchQuery.trim();
      setShowAutocomplete(false);
      dispatch(searchWord(searchQuery.trim()));
    }
  }, [searchQuery, dispatch]);

  const handleSuggestionPress = useCallback((word) => {
    setSearchQuery(word.word);
    submittedRef.current = word.word;
    setShowAutocomplete(false);
    dispatch(searchWord(word.word));
    navigation.navigate('WordDetail', { wordId: word.id });
  }, [dispatch, navigation]);

  const handleResultPress = useCallback((word) => {
    if (!word || word.id == null) return;
    submittedRef.current = word.word;
    setSearchQuery(word.word);
    setShowAutocomplete(false);
    dispatch(searchWord(word.word));
    dispatch(addToHistory(word));
    navigation.navigate('WordDetail', { wordId: word.id });
  }, [dispatch, navigation]);

  const renderSuggestionItem = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionPress(item)}
    >
      <Text style={styles.suggestionText}>{item.word}</Text>
      {item.pronunciation && (
        <Text style={styles.suggestionPronunciation}>[{item.pronunciation}]</Text>
      )}
    </TouchableOpacity>
  );

  const renderCompound = ({ item }) => (
    <View style={styles.compoundItem}>
      <Text style={styles.compoundText}>{item.compound}</Text>
      {item.meaning ? <Text style={styles.compoundMeaning}> — {item.meaning}</Text> : null}
    </View>
  );

  const renderRelatedItem = ({ item }) => (
    <TouchableOpacity
      style={styles.relatedItem}
      onPress={() => handleResultPress(item)}
    >
      <Text style={styles.relatedText}>{item.word}</Text>
      {item.wordType ? <Text style={styles.relatedType}> · {item.wordType}</Text> : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChangeText={handleChangeText}
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
            <Text style={styles.searchButtonText}>{t('search')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {showAutocomplete && suggestions.length > 0 && (
        <View style={styles.autocompleteContainer}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestionItem}
            keyExtractor={(item) => item.id.toString()}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {!showAutocomplete && match && (
        <ScrollView style={styles.resultsContainer}>
          <TouchableOpacity
            style={styles.matchCard}
            activeOpacity={0.7}
            onPress={() => handleResultPress(match)}
          >
            <View style={styles.matchHeader}>
              <Text style={styles.matchWord}>{match.word}</Text>
            </View>
            {match.pronunciation ? (
              <Text style={styles.matchPronunciation}>[{match.pronunciation}]</Text>
            ) : null}
            <Text style={styles.matchType}>{match.wordType}</Text>
            <Text style={styles.matchMeaning}>{match.meaning}</Text>
            {match.compounds && match.compounds.length > 0 && (
              <View style={styles.compoundsSection}>
                <Text style={styles.sectionTitle}>{t('compounds')}</Text>
                <FlatList
                  data={match.compounds}
                  renderItem={renderCompound}
                  keyExtractor={(_, i) => `compound-${i}`}
                  scrollEnabled={false}
                />
              </View>
            )}
            <Text style={styles.matchDetailHint}>{t('tapForFullEntry')}</Text>
          </TouchableOpacity>

          {searchResult.suggestions && searchResult.suggestions.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={styles.sectionTitle}>{t('relatedWords')}</Text>
              <FlatList
                data={searchResult.suggestions}
                renderItem={renderRelatedItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                horizontal
              />
            </View>
          )}
        </ScrollView>
      )}

      {!showAutocomplete && notFound && searchQuery.length > 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('noEntryFound', { query: searchQuery })}</Text>
          {searchResult.suggestions && searchResult.suggestions.length > 0 && (
            <>
              <Text style={styles.emptySub}>{t('didYouMean')}</Text>
              <FlatList
                data={searchResult.suggestions}
                renderItem={renderRelatedItem}
                keyExtractor={(item) => item.id.toString()}
              />
            </>
          )}
        </View>
      )}

      {!showAutocomplete && !match && !notFound && searchQuery.length === 0 && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>{t('enterDainameseWord')}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
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
  searchButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  autocompleteContainer: { maxHeight: 200, backgroundColor: '#fff' },
  suggestionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: { fontSize: 16, color: '#333' },
  suggestionPronunciation: { fontSize: 14, color: '#666', marginTop: 4 },
  resultsContainer: { flex: 1, backgroundColor: '#fff' },
  matchCard: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  matchDetailHint: { marginTop: 12, fontSize: 14, color: '#007AFF', fontWeight: '600' },
  matchHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  matchWord: { fontSize: 32, fontWeight: '700', color: '#212529', flex: 1 },
  matchPronunciation: { fontSize: 18, color: '#6c757d', fontStyle: 'italic', marginBottom: 4 },
  matchType: { fontSize: 16, color: '#6c757d', marginBottom: 8 },
  matchMeaning: { fontSize: 16, lineHeight: 24, color: '#212549', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#495057', marginBottom: 12 },
  compoundsSection: { marginTop: 8 },
  compoundItem: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  compoundText: { fontSize: 15, color: '#212549', fontWeight: '600' },
  compoundMeaning: { fontSize: 14, color: '#495057' },
  relatedSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  relatedItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    alignItems: 'center',
  },
  relatedText: { fontSize: 16, color: '#212549', fontWeight: '600' },
  relatedType: { fontSize: 13, color: '#6c757d' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 12 },
  emptySub: { fontSize: 14, color: '#6c757d', marginBottom: 8 },
  hintContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  hintText: { fontSize: 15, color: '#6c757d', textAlign: 'center' },
});

export default SearchScreen;
