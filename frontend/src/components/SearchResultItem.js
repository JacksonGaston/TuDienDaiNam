import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const SearchResultItem = ({ word, onPress }) => {
  const getQualityColor = (quality) => {
    if (quality >= 0.8) return '#4CAF50';
    if (quality >= 0.5) return '#FF9800';
    return '#F44336';
  };

  const getQualityText = (quality) => {
    if (quality >= 0.8) return 'High';
    if (quality >= 0.5) return 'Medium';
    return 'Low';
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.word}>{word.word}</Text>
          {word.isDainamese && (
            <View style={styles.dainameseBadge}>
              <Text style={styles.dainameseText}>Dainamese</Text>
            </View>
          )}
        </View>
        
        {word.pronunciation && (
          <Text style={styles.pronunciation}>[{word.pronunciation}]</Text>
        )}
        
        {word.wordType && (
          <Text style={styles.wordType}>({word.wordType})</Text>
        )}
        
        <Text style={styles.definition} numberOfLines={2}>
          {word.definition}
        </Text>
        
        <View style={styles.footer}>
          <View style={styles.qualityContainer}>
            <View 
              style={[
                styles.qualityDot, 
                { backgroundColor: getQualityColor(word.textQuality) }
              ]} 
            />
            <Text style={styles.qualityText}>
              {getQualityText(word.textQuality)} quality
            </Text>
          </View>
          
          {word.searchRank && (
            <Text style={styles.rankText}>
              Rank: {word.searchRank.toFixed(2)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  word: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  dainameseBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  dainameseText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  pronunciation: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  wordType: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  definition: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qualityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  qualityText: {
    fontSize: 12,
    color: '#666',
  },
  rankText: {
    fontSize: 12,
    color: '#666',
  },
});

export default SearchResultItem;