import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { getWordDetails } from "../store/dictionarySlice";
import { useTranslation } from "../i18n/LanguageContext";

const WordDetailScreen = ({ route, navigation }) => {
  const { wordId } = route.params;
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { currentWord, isLoading, error } = useSelector(
    (state) => state.dictionary,
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
    if (quality >= 0.8) return "#4CAF50";
    if (quality >= 0.5) return "#FF9800";
    return "#F44336";
  };

  const getQualityText = (quality) => {
    if (quality >= 0.8) return t("high");
    if (quality >= 0.5) return t("medium");
    return t("low");
  };

  const formatDate = (dateString) => {
    if (!dateString) return t("na");
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t("loadingWordDetails")}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t("error", { error })}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => dispatch(getWordDetails(wordId))}
        >
          <Text style={styles.retryButtonText}>{t("retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentWord) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>{t("wordNotFound")}</Text>
      </View>
    );
  }

  // Each meaning block carries its own ancient char, word type and meaning.
  // Fall back to the word-level fields when blocks are missing (older DBs).
  const meaningBlocks =
    currentWord.meaningBlocks && currentWord.meaningBlocks.length > 0
      ? currentWord.meaningBlocks
      : currentWord.meaning
        ? [
            {
              meaning: currentWord.meaning,
              ancientChar: currentWord.ancientChar || "",
              wordType: currentWord.wordType || "",
              blockIndex: 0,
            },
          ]
        : [];

  // blockIndex -> list of compound items, so blocks without any compounds
  // can still be rendered with their meaning header.
  const compoundsByBlock = {};
  for (const block of currentWord.compounds || []) {
    compoundsByBlock[block.blockIndex] = block.compounds || [];
  }

  // Only fall back to the word-level type for legacy data where the meaning
  // blocks carry no per-block type at all. When per-block types exist, trust
  // them exactly — a block may legitimately have no type (e.g. stub entries
  // like "Bàng c." vs the primary entry's "c. n.").
  const wordHasPerBlockTypes = meaningBlocks.some(
    (b) => b.wordType != null && b.wordType !== "",
  );
  const getBlockWordType = (block) => {
    const blockType = block && block.wordType != null ? block.wordType : "";
    if (!wordHasPerBlockTypes && !blockType) return currentWord.wordType || "";
    return blockType;
  };

  const hasCompounds =
    currentWord.compounds && currentWord.compounds.length > 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.word}>{currentWord.word}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("meaning")}</Text>
        {meaningBlocks.map((block, index) => (
          <View key={`meaning-${index}`} style={styles.meaningItem}>
            <View style={styles.meaningItemHeader}>
              <Text style={styles.meaningNumber}>{index + 1}.</Text>
              {block.ancientChar ? (
                <Text style={styles.ancientCharInline}>
                  {block.ancientChar}
                </Text>
              ) : null}
              {block.synonym ? (
                <Text style={styles.synonymInline}> [{block.synonym}]</Text>
              ) : null}
              {getBlockWordType(block) ? (
                <Text style={styles.wordTypeInline}>
                  ({getBlockWordType(block)})
                </Text>
              ) : null}
            </View>
            {block.meaning ? (
              <Text style={styles.definition}>{block.meaning}</Text>
            ) : null}
          </View>
        ))}
      </View>

      {hasCompounds && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("compounds")}</Text>
          {meaningBlocks.map((block, index) => {
            const compounds = compoundsByBlock[block.blockIndex] || [];
            return (
              <View key={`block-${index}`} style={styles.compoundBlock}>
                <View style={styles.compoundBlockHeader}>
                  <Text style={styles.compoundBlockNumber}>{index + 1}.</Text>
                  {block.ancientChar ? (
                    <Text style={styles.compoundBlockAncientChar}>
                      {block.ancientChar}
                    </Text>
                  ) : null}
                  {block.synonym ? (
                    <Text style={styles.synonymInline}> [{block.synonym}]</Text>
                  ) : null}
                  {getBlockWordType(block) ? (
                    <Text style={styles.compoundBlockType}>
                      ({getBlockWordType(block)})
                    </Text>
                  ) : null}
                  <Text style={styles.compoundBlockMeaning}>
                    {block.meaning}
                  </Text>
                </View>
                {compounds.length > 0 ? (
                  compounds.map((item, i) => (
                    <View
                      key={`compound-${index}-${i}`}
                      style={styles.exampleItem}
                    >
                      <View style={styles.compoundRow}>
                        {item.ancientChars ? (
                          <Text style={styles.compoundAncientChar}>
                            {item.ancientChars}
                          </Text>
                        ) : null}
                        <Text style={styles.compoundText}>{item.compound}</Text>
                      </View>
                      {item.meaning ? (
                        <Text style={styles.exampleText}>
                          {" "}
                          — {item.meaning}
                        </Text>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <Text style={styles.noCompounds}>{t("noCompounds")}</Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      {currentWord.examples && currentWord.examples.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("examples")}</Text>
          {currentWord.examples.map((example, index) => (
            <View key={index} style={styles.exampleItem}>
              <Text style={styles.exampleText}>{example}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.metadataSection}>
        <Text style={styles.sectionTitle}>{t("metadata")}</Text>

        <View style={styles.metadataRow}>
          <Text style={styles.metadataLabel}>{t("textQuality")}</Text>
          <View style={styles.qualityContainer}>
            <View
              style={[
                styles.qualityDot,
                { backgroundColor: getQualityColor(currentWord.textQuality) },
              ]}
            />
            <Text style={styles.metadataValue}>
              {getQualityText(currentWord.textQuality)} (
              {(currentWord.textQuality * 100).toFixed(1)}%)
            </Text>
          </View>
        </View>

        {currentWord.sourceFile && (
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>{t("sourceFile")}</Text>
            <Text style={styles.metadataValue}>{currentWord.sourceFile}</Text>
          </View>
        )}

        <View style={styles.metadataRow}>
          <Text style={styles.metadataLabel}>{t("created")}</Text>
          <Text style={styles.metadataValue}>
            {formatDate(currentWord.createdAt)}
          </Text>
        </View>

        <View style={styles.metadataRow}>
          <Text style={styles.metadataLabel}>{t("updated")}</Text>
          <Text style={styles.metadataValue}>
            {formatDate(currentWord.updatedAt)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#d32f2f",
    textAlign: "center",
    marginBottom: 16,
  },
  notFoundText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    padding: 20,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  word: {
    fontSize: 32,
    fontWeight: "700",
    color: "#212529",
  },
  pronunciation: {
    fontSize: 18,
    color: "#6c757d",
    fontStyle: "italic",
    marginTop: 4,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 12,
  },
  meaningItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  meaningItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  meaningNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#495057",
    marginRight: 6,
  },
  ancientCharInline: {
    fontSize: 16,
    color: "#6c757d",
    marginRight: 6,
    fontFamily: "serif",
  },
  synonymInline: {
    fontSize: 16,
    color: "#007AFF",
    fontStyle: "italic",
    marginRight: 6,
  },
  wordTypeInline: {
    fontSize: 15,
    color: "#6c757d",
    marginRight: 6,
  },
  definition: {
    fontSize: 16,
    lineHeight: 24,
    color: "#212529",
    flex: 1,
  },
  compoundBlock: { marginBottom: 12 },
  compoundBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
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
  compoundRow: { flexDirection: "row", alignItems: "center" },
  compoundAncientChar: {
    fontSize: 13,
    color: "#6c757d",
    marginRight: 6,
    fontFamily: "serif",
  },
  compoundText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 4,
  },
  exampleItem: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#495057",
    fontStyle: "italic",
  },
  noCompounds: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#adb5bd",
    paddingVertical: 4,
  },
  metadataSection: {
    padding: 20,
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
    width: 100,
  },
  metadataValue: {
    fontSize: 14,
    color: "#6c757d",
    flex: 1,
  },
  qualityContainer: {
    flexDirection: "row",
    alignItems: "center",
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
