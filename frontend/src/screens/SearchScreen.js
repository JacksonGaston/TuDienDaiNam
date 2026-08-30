import { useState, useEffect, useCallback, useRef } from "react";
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
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import {
  searchWord,
  getSuggestions,
  addToHistory,
} from "../store/dictionarySlice";
import { useTranslation } from "../i18n/LanguageContext";

const SearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const submittedRef = useRef(null);
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const { searchResult, suggestions, isLoading } = useSelector(
    (state) => state.dictionary,
  );
  const { match, notFound } = searchResult || { match: null, notFound: false };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const q = (debouncedQuery || "").trim();
    const submitted = (submittedRef.current || "").trim().toLowerCase();
    if (
      q.length > 0 &&
      searchQuery.length > 0 &&
      q.toLowerCase() !== submitted
    ) {
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

  const handleSuggestionPress = useCallback(
    (word) => {
      setSearchQuery(word.word);
      submittedRef.current = word.word;
      setShowAutocomplete(false);
      dispatch(searchWord(word.word));
      navigation.navigate("WordDetail", { wordId: word.id });
    },
    [dispatch, navigation],
  );

  const handleResultPress = useCallback(
    (word) => {
      if (!word || word.id == null) return;
      submittedRef.current = word.word;
      setSearchQuery(word.word);
      setShowAutocomplete(false);
      dispatch(searchWord(word.word));
      dispatch(addToHistory(word));
      navigation.navigate("WordDetail", { wordId: word.id });
    },
    [dispatch, navigation],
  );

  const renderSuggestionItem = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionPress(item)}
    >
      <Text style={styles.suggestionText}>{item.word}</Text>
      {item.pronunciation && (
        <Text style={styles.suggestionPronunciation}>
          [{item.pronunciation}]
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderCompound = (item) => (
    <View style={styles.compoundItem}>
      {item.ancientChars ? (
        <Text style={styles.compoundAncientChar}>{item.ancientChars}</Text>
      ) : null}
      <Text style={styles.compoundText}>{item.compound}</Text>
      {item.meaning ? (
        <Text style={styles.compoundMeaning}> — {item.meaning}</Text>
      ) : null}
    </View>
  );

  const renderRelatedItem = ({ item }) => (
    <TouchableOpacity
      style={styles.relatedItem}
      onPress={() => handleResultPress(item)}
    >
      <Text style={styles.relatedText}>{item.word}</Text>
      {item.wordType ? (
        <Text style={styles.relatedType}> · {item.wordType}</Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t("searchPlaceholder")}
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
            <Text style={styles.searchButtonText}>{t("search")}</Text>
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
            <Text style={styles.matchWord}>{match.word}</Text>

            {(() => {
              let meaningBlocks = [];
              if (match.meaningBlocks && match.meaningBlocks.length > 0) {
                meaningBlocks = match.meaningBlocks;
              } else if (match.meaning) {
                meaningBlocks = [
                  {
                    meaning: match.meaning,
                    ancientChar: match.ancientChar || "",
                    wordType: match.wordType || "",
                    blockIndex: 0,
                  },
                ];
              }
              const compoundsByBlock = {};
              for (const block of match.compounds || []) {
                compoundsByBlock[block.blockIndex] = block.compounds || [];
              }
              const wordHasPerBlockTypes = meaningBlocks.some(
                (b) => b.wordType != null && b.wordType !== "",
              );
              const blockWordType = (block) => {
                const blockType =
                  block && block.wordType != null ? block.wordType : "";
                if (!wordHasPerBlockTypes && !blockType)
                  return match.wordType || "";
                return blockType;
              };
              return (
                <>
                  <Text style={styles.sectionTitle}>{t("meaning")}</Text>
                  {meaningBlocks.map((block, idx) => (
                    <View key={`m-${idx}`} style={styles.matchMeaningRow}>
                      <View style={styles.matchMeaningHeader}>
                        <Text style={styles.matchMeaningNumber}>
                          {idx + 1}.
                        </Text>
                        {block.ancientChar ? (
                          <Text style={styles.matchAncientChar}>
                            {block.ancientChar}
                          </Text>
                        ) : null}
                        {block.synonym ? (
                          <Text style={styles.matchSynonym}>
                            {" "}
                            [{block.synonym}]
                          </Text>
                        ) : null}
                        {blockWordType(block) ? (
                          <Text style={styles.matchType}>
                            ({blockWordType(block)})
                          </Text>
                        ) : null}
                      </View>
                      {block.meaning ? (
                        <Text style={styles.matchMeaning}>{block.meaning}</Text>
                      ) : null}
                    </View>
                  ))}

                  {match.compounds && match.compounds.length > 0 && (
                    <View style={styles.compoundsSection}>
                      <Text style={styles.sectionTitle}>{t("compounds")}</Text>
                      {meaningBlocks.map((block, blockIdx) => {
                        const comps = compoundsByBlock[block.blockIndex] || [];
                        return (
                          <View
                            key={`block-${blockIdx}`}
                            style={styles.compoundBlock}
                          >
                            <View style={styles.compoundBlockHeader}>
                              <Text style={styles.compoundBlockNumber}>
                                {blockIdx + 1}.
                              </Text>
                              {block.ancientChar ? (
                                <Text style={styles.compoundBlockAncientChar}>
                                  {block.ancientChar}
                                </Text>
                              ) : null}
                              {block.synonym ? (
                                <Text style={styles.matchSynonym}>
                                  {" "}
                                  [{block.synonym}]
                                </Text>
                              ) : null}
                              {blockWordType(block) ? (
                                <Text style={styles.compoundBlockType}>
                                  ({blockWordType(block)})
                                </Text>
                              ) : null}
                              <Text style={styles.compoundBlockMeaning}>
                                {block.meaning}
                              </Text>
                            </View>
                            {comps.length > 0 ? (
                              comps.map((item, i) => (
                                <View key={`compound-${blockIdx}-${i}`}>
                                  {renderCompound(item)}
                                </View>
                              ))
                            ) : (
                              <Text style={styles.noCompounds}>
                                {t("noCompounds")}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </>
              );
            })()}

            <Text style={styles.matchDetailHint}>{t("tapForFullEntry")}</Text>
          </TouchableOpacity>

          {searchResult.suggestions && searchResult.suggestions.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={styles.sectionTitle}>{t("relatedWords")}</Text>
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
          <Text style={styles.emptyText}>
            {t("noEntryFound", { query: searchQuery })}
          </Text>
          {searchResult.suggestions && searchResult.suggestions.length > 0 && (
            <>
              <Text style={styles.emptySub}>{t("didYouMean")}</Text>
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
          <Text style={styles.hintText}>{t("enterDainameseWord")}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  searchContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  searchInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  searchButton: {
    marginLeft: 12,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 80,
  },
  searchButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  autocompleteContainer: { maxHeight: 200, backgroundColor: "#fff" },
  suggestionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  suggestionText: { fontSize: 16, color: "#333" },
  suggestionPronunciation: { fontSize: 14, color: "#666", marginTop: 4 },
  resultsContainer: { flex: 1, backgroundColor: "#fff" },
  matchCard: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  matchDetailHint: {
    marginTop: 12,
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  matchWord: { fontSize: 32, fontWeight: "700", color: "#212529" },
  matchPronunciation: {
    fontSize: 18,
    color: "#6c757d",
    fontStyle: "italic",
    marginBottom: 12,
  },
  matchMeaningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  matchMeaningHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  matchMeaningNumber: {
    fontSize: 15,
    fontWeight: "600",
    color: "#495057",
    marginRight: 6,
  },
  matchAncientChar: {
    fontSize: 15,
    color: "#6c757d",
    marginRight: 6,
    fontFamily: "serif",
  },
  matchSynonym: { fontSize: 16, color: "#007AFF", fontStyle: "italic" },
  matchType: { fontSize: 14, color: "#6c757d", marginRight: 6 },
  matchMeaning: {
    fontSize: 16,
    lineHeight: 22,
    color: "#212549",
    flex: 1,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 12,
  },
  compoundsSection: { marginTop: 8 },
  compoundBlock: { marginBottom: 12 },
  compoundBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  compoundBlockNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
    marginRight: 6,
  },
  compoundBlockAncientChar: {
    fontSize: 14,
    color: "#6c757d",
    marginRight: 6,
    fontFamily: "serif",
  },
  compoundBlockType: { fontSize: 13, color: "#6c757d", marginRight: 6 },
  compoundBlockMeaning: {
    fontSize: 14,
    color: "#495057",
    fontStyle: "italic",
    flex: 1,
  },
  compoundItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  compoundAncientChar: {
    fontSize: 13,
    color: "#6c757d",
    marginRight: 6,
    fontFamily: "serif",
  },
  compoundText: { fontSize: 15, color: "#212549", fontWeight: "600" },
  compoundMeaning: { fontSize: 14, color: "#495057" },
  noCompounds: {
    fontSize: 13,
    fontStyle: "italic",
    color: "#adb5bd",
    paddingVertical: 4,
  },
  relatedSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  relatedItem: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    alignItems: "center",
  },
  relatedText: { fontSize: 16, color: "#212549", fontWeight: "600" },
  relatedType: { fontSize: 13, color: "#6c757d" },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 12,
  },
  emptySub: { fontSize: 14, color: "#6c757d", marginBottom: 8 },
  hintContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  hintText: { fontSize: 15, color: "#6c757d", textAlign: "center" },
});

export default SearchScreen;
