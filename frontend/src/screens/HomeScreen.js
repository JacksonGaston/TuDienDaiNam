import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { dictionaryService } from '../services/dictionaryService';
import { useTranslation } from '../i18n/LanguageContext';

const HomeScreen = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [randomWords, setRandomWords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t, language, setLanguage } = useTranslation();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await dictionaryService.initialize();

      const wordCount = await dictionaryService.getWordCount();
      const randomWordsData = await dictionaryService.getRandomWords(5);

      setStats({
        totalWords: wordCount,
      });
      setRandomWords(randomWordsData);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(t('failedToLoad'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleWordPress = (word) => {
    navigation.navigate('WordDetail', { wordId: word.id });
  };

  const handleSearchPress = () => {
    navigation.navigate('Search');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'dainamese' : 'en');
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t('loadingDictionary')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>{t('databaseError')}</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadData}
        >
          <Text style={styles.retryButtonText}>{t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('appName')}</Text>
        <Text style={styles.subtitle}>{t('offlineDainameseDictionary')}</Text>
        <TouchableOpacity onPress={toggleLanguage} style={styles.langToggle}>
          <Text style={styles.langToggleText}>
            {language === 'en' ? 'DN' : 'EN'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>{t('dictionaryStatistics')}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats?.totalWords || 0}</Text>
            <Text style={styles.statLabel}>{t('totalWords')}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.searchButton}
        onPress={handleSearchPress}
      >
        <Text style={styles.searchButtonText}>{t('searchDictionaryButton')}</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('featuredWords')}</Text>
        {randomWords.map((word) => (
          <TouchableOpacity
            key={word.id}
            style={styles.wordCard}
            onPress={() => handleWordPress(word)}
          >
            <View style={styles.wordHeader}>
              <Text style={styles.wordText}>{word.word}</Text>
            </View>
            {word.pronunciation && (
              <Text style={styles.pronunciation}>[{word.pronunciation}]</Text>
            )}
            <Text style={styles.definition} numberOfLines={2}>
              {word.meaning}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>{t('aboutThisApp')}</Text>
        <Text style={styles.infoText}>
          {t('aboutDescription')}
        </Text>
        <Text style={styles.infoText}>
          {t('aboutSource')}
        </Text>
        <Text style={styles.infoText}>
          {t('aboutDescription2')}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  langToggle: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  langToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  wordCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  wordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  wordText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
  },
  pronunciation: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  definition: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },
  infoSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#d32f2f',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;
