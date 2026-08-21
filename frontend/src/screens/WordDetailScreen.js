import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { getWordDetails } from '../store/dictionarySlice';
import { useTranslation } from '../i18n/LanguageContext';

const WordDetailScreen = ({ route, navigation }) => {
  const { wordId } = route.params;
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { currentWord, isLoading, error } = useSelector(
    (state) => state.dictionary
  );

  useEffect(() => {
    if (wordId) {
      dispatch(getWordDetails(wordId));
    }
  }, [wordId, dispatch]);

  useEffect(() => {
    if (currentWord) {
      navigation.setOptions({
        title: currentWord.word,
      });
    }
  }, [currentWord, navigation]);

  const getQualityColor = (quality) => {
    if (quality >= 0.8) return '#4CAF50';
    if (quality >= 0.5) return '#FF9800';
    return '#F44336';
  };

  const getQualityText = (quality) => {
    if (quality >= 0.8) return t('high');
    if (quality >= 0.5) return t('medium');
    return t('low');
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('na');
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t('loadingWordDetails')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('error', { error })}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => dispatch(getWordDetails(wordId))}
        >
          <Text style={styles.retryButtonText}>{t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentWord) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>{t('wordNotFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.wordHeader}>
          {currentWord.ancientChar ? (
            <Text style={styles.ancientChar}>{currentWord.ancientChar}</Text>
          ) : null}
          <Text style={styles.word}>{currentWord.word}</Text>
        </View>

        {currentWord.pronunciation && (
          <Text style={styles.pronunciation}>[{currentWord.pronunciation}]</Text>
        )}

        {currentWord.wordType && (
          <Text style={styles.wordType}>({currentWord.wordType})</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('meaning')}</Text>
        <Text style={styles.definition}>{currentWord.meaning}</Text>
      </View>

      {currentWord.compounds && currentWord.compounds.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('compounds')}</Text>
          {currentWord.compounds.map((block, blockIndex) => (
            <View key={`block-${blockIndex}`} style={styles.compoundBlock}>
              {block.meaning && currentWord.compounds.length > 1 ? (
                <View style={styles.compoundBlockHeader}>
                  {block.ancientChar ? (
                    <Text style={styles.compoundBlockAncientChar}>{block.ancientChar}</Text>
                  ) : null}
                  <Text style={styles.compoundBlockMeaning}>{block.meaning}</Text>
                </View>
              ) : null}
              {block.compounds.map((item, i) => (
                <View key={`compound-${blockIndex}-${i}`} style={styles.exampleItem}>
                  <View style={styles.compoundRow}>
                    {item.ancientChars ? (
                      <Text style={styles.compoundAncientChar}>{item.ancientChars}</Text>
                    ) : null}
                    <Text style={styles.compoundText}>{item.compound}</Text>
                  </View>
                  {item.meaning ? <Text style={styles.exampleText}> — {item.meaning}</Text> : null}
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {currentWord.examples && currentWord.examples.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('examples')}</Text>
          {currentWord.examples.map((example, index) => (
            <View key={index} style={styles.exampleItem}>
              <Text style={styles.exampleText}>{example}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.metadataSection}>
        <Text style={styles.sectionTitle}>{t('metadata')}</Text>

        <View style={styles.metadataRow}>
          <Text style={styles.metadataLabel}>{t('textQuality')}</Text>
          <View style={styles.qualityContainer}>
            <View
              style={[
                styles.qualityDot,
                { backgroundColor: getQualityColor(currentWord.textQuality) }
              ]}
            />
            <Text style={styles.metadataValue}>
              {getQualityText(currentWord.textQuality)} ({(currentWord.textQuality * 100).toFixed(1)}%)
            </Text>
          </View>
        </View>

        {currentWord.sourceFile && (
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>{t('sourceFile')}</Text>
            <Text style={styles.metadataValue}>{currentWord.sourceFile}</Text>
          </View>
        )}

        <View style={styles.metadataRow}>
          <Text style={styles.metadataLabel}>{t('created')}</Text>
          <Text style={styles.metadataValue}>{formatDate(currentWord.createdAt)}</Text>
        </View>

        <View style={styles.metadataRow}>
          <Text style={styles.metadataLabel}>{t('updated')}</Text>
          <Text style={styles.metadataValue}>{formatDate(currentWord.updatedAt)}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
  },
  notFoundText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  wordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ancientChar: {
    fontSize: 24,
    color: '#6c757d',
    marginRight: 8,
    fontFamily: 'serif',
  },
  word: {
    fontSize: 32,
    fontWeight: '700',
    color: '#212529',
    flex: 1,
  },
  pronunciation: {
    fontSize: 18,
    color: '#6c757d',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  wordType: {
    fontSize: 16,
    color: '#6c757d',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  definition: {
    fontSize: 16,
    lineHeight: 24,
    color: '#212529',
  },
  compoundBlock: { marginBottom: 12 },
  compoundBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  compoundBlockAncientChar: { fontSize: 14, color: '#6c757d', marginRight: 6, fontFamily: 'serif' },
  compoundBlockMeaning: { fontSize: 14, color: '#495057', fontStyle: 'italic' },
  compoundRow: { flexDirection: 'row', alignItems: 'center' },
  compoundAncientChar: { fontSize: 13, color: '#6c757d', marginRight: 6, fontFamily: 'serif' },
  compoundText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  exampleItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#495057',
    fontStyle: 'italic',
  },
  metadataSection: {
    padding: 20,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    width: 100,
  },
  metadataValue: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1,
  },
  qualityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  qualityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
});

export default WordDetailScreen;
