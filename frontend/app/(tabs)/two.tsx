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
  return (
    <View style={styles.rankBadge}>
      <Text style={styles.rankText}>{rank}</Text>
    </View>
  );
};

/* Rating display */
const RatingDisplay = ({ rating }: { rating: number }) => {
  return <Text style={styles.ratingText}>{rating}</Text>;
};

/* Search result row */
const SearchResultRow = ({
  item,
  index,
}: {
  item: SearchResult;
  index: number;
}) => (
  <View style={styles.resultRow}>
    <RankBadge rank={item.globalRank} />
    {/* Avatar */}
    <View style={styles.listAvatar}>
      <Text style={styles.listAvatarText}>
        {item.username.charAt(0).toUpperCase()}
      </Text>
    </View>
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

  // Initial search
  useEffect(() => {
    searchUsers(debouncedQuery);
  }, [debouncedQuery, searchUsers]);

  // Subscribe to live updates separately
  useEffect(() => {
    if (debouncedQuery.trim().length === 0) {
      return;
    }

    const unsubscribe = apiService.subscribeToSearchUpdates(
      debouncedQuery,
      (data) => {
        setResults([...data.results]); // Spread to force React re-render
      },
    );

    return () => {
      unsubscribe();
    };
  }, [debouncedQuery]);

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

      {/* Results container with golden border */}
      <View
        style={[
          styles.resultsContainer,
          results.length === 0 && styles.resultsContainerEmpty,
        ]}
      >
        <FlatList
          data={results}
          keyExtractor={(item) =>
            `${item.username}-${item.globalRank}-${item.rating}`
          }
          extraData={results}
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
      </View>
    </SafeAreaView>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#18181b",
  },

  header: {
    padding: 20,
    paddingBottom: 12,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
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

  resultsContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#D4AF37",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: "#1a1a1f",
    overflow: "hidden",
  },
  resultsContainerEmpty: {
    borderWidth: 0,
    backgroundColor: "transparent",
  },

  listContent: {
    paddingBottom: 10,
  },
  emptyListContent: {
    flex: 1,
  },

  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },

  rankBadge: {
    width: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#9ca3af",
  },

  listAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  listAvatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },

  username: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },

  ratingText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
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
