import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Keyboard,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiService, SearchResult } from "@/services/api";
import { useDebounce } from "@/hooks/useDebounce";

/* Rank badge for search results */
const RankBadge = ({ rank }: { rank: number }) => {
  let borderColor = "#9ca3af";
  let textColor = "#9ca3af";
  let backgroundColor = "rgba(156, 163, 175, 0.1)";

  if (rank === 1) {
    borderColor = "#FFD700";
    textColor = "#FFD700";
    backgroundColor = "rgba(255, 215, 0, 0.1)";
  } else if (rank === 2) {
    borderColor = "#C0C0C0";
    textColor = "#C0C0C0";
    backgroundColor = "rgba(192, 192, 192, 0.1)";
  } else if (rank === 3) {
    borderColor = "#CD7F32";
    textColor = "#CD7F32";
    backgroundColor = "rgba(205, 127, 50, 0.1)";
  } else if (rank <= 10) {
    borderColor = "#8b5cf6";
    textColor = "#8b5cf6";
    backgroundColor = "rgba(139, 92, 246, 0.1)";
  }

  return (
    <View style={[styles.rankBadge, { borderColor, backgroundColor }]}>
      <Text style={[styles.rankText, { color: textColor }]}>#{rank}</Text>
    </View>
  );
};

/* Rating display with color coding */
const RatingDisplay = ({ rating }: { rating: number }) => {
  let color = "#4ade80";
  if (rating < 2000) color = "#f87171";
  else if (rating < 3500) color = "#facc15";

  return (
    <View style={[styles.ratingContainer, { borderColor: color }]}>
      <Text style={[styles.ratingText, { color }]}>{rating}</Text>
    </View>
  );
};

/* Search result row */
const SearchResultRow = ({
  item,
  index,
}: {
  item: SearchResult;
  index: number;
}) => (
  <View
    style={[styles.resultRow, index % 2 === 0 ? styles.evenRow : styles.oddRow]}
  >
    <RankBadge rank={item.globalRank} />
    <Text style={styles.username} numberOfLines={1}>
      {item.username}
    </Text>
    <RatingDisplay rating={item.rating} />
  </View>
);

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  const searchUsers = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length === 0) {
      setResults([]);
      setSearched(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiService.searchUsers(searchQuery);
      setResults(response.results);
      setSearched(true);
    } catch (err) {
      setError("Search failed. Is the backend running?");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    searchUsers(debouncedQuery);
  }, [debouncedQuery, searchUsers]);

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
    Keyboard.dismiss();
  };

  const renderEmptyState = () => {
    if (loading) return null;

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }

    if (!searched) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Search for Players</Text>
          <Text style={styles.emptySubtitle}>
            Enter a username to find their global rank
          </Text>
        </View>
      );
    }

    if (results.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>Try a different search term</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔍 Find Player</Text>
        <Text style={styles.headerSubtitle}>Search by username</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Type username (e.g., rahul)"
          placeholderTextColor="#6b7280"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#8b5cf6" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {results.length > 0 && (
        <View style={styles.columnHeaders}>
          <Text style={styles.columnRank}>Rank</Text>
          <Text style={styles.columnUsername}>Username</Text>
          <Text style={styles.columnRating}>Rating</Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item, index) => `${item.username}-${index}`}
        renderItem={({ item, index }) => (
          <SearchResultRow item={item} index={index} />
        )}
        ListEmptyComponent={renderEmptyState}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          results.length === 0 && styles.emptyListContent,
        ]}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        removeClippedSubviews={Platform.OS !== "web"}
      />
    </SafeAreaView>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f1a",
  },

  header: {
    padding: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a3e",
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#ffffff",
  },
  clearButton: {
    padding: 12,
  },
  clearButtonText: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "bold",
  },

  columnHeaders: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1a1a2e",
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a3e",
  },
  columnRank: {
    width: 70,
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  columnUsername: {
    flex: 1,
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  columnRating: {
    width: 80,
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    textAlign: "center",
  },

  listContent: {
    paddingBottom: 20,
  },
  emptyListContent: {
    flex: 1,
  },

  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  evenRow: {
    backgroundColor: "#0f0f1a",
  },
  oddRow: {
    backgroundColor: "#151525",
  },

  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 2,
  },
  rankText: {
    fontSize: 13,
    fontWeight: "bold",
  },

  username: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "500",
    paddingLeft: 16,
  },

  ratingContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    width: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "bold",
  },

  loadingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: "#9ca3af",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
  },
  errorText: {
    color: "#f87171",
    fontSize: 16,
    textAlign: "center",
  },
});
