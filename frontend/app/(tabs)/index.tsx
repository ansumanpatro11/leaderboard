import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiService, LeaderboardEntry } from "@/services/api";

// Rank badge component with colors for top 3
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
  }

  return (
    <View style={[styles.rankBadge, { borderColor, backgroundColor }]}>
      <Text style={[styles.rankText, { color: textColor }]}>#{rank}</Text>
    </View>
  );
};

// Rating display component
const RatingDisplay = ({ rating }: { rating: number }) => {
  let color = "#4ade80"; // green for high ratings
  if (rating < 2000)
    color = "#f87171"; // red
  else if (rating < 3500) color = "#facc15"; // yellow

  return (
    <View style={[styles.ratingContainer, { borderColor: color }]}>
      <Text style={[styles.ratingText, { color }]}>{rating}</Text>
    </View>
  );
};

// User row component
const UserRow = ({
  item,
  index,
}: {
  item: LeaderboardEntry;
  index: number;
}) => (
  <View
    style={[styles.userRow, index % 2 === 0 ? styles.evenRow : styles.oddRow]}
  >
    <RankBadge rank={item.rank} />
    <Text style={styles.username} numberOfLines={1}>
      {item.username}
    </Text>
    <RatingDisplay rating={item.rating} />
  </View>
);

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 50;

  const fetchLeaderboard = useCallback(
    async (offset: number = 0, isRefresh: boolean = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else if (offset === 0) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        setError(null);

        const response = await apiService.getLeaderboard(PAGE_SIZE, offset);

        if (isRefresh || offset === 0) {
          setEntries(response.entries);
        } else {
          setEntries((prev) => [...prev, ...response.entries]);
        }

        setHasMore(response.hasMore);
        setTotalUsers(response.totalUsers);
      } catch (err) {
        setError("Failed to load leaderboard. Is the backend running?");
        console.error(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleRefresh = () => {
    fetchLeaderboard(0, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchLeaderboard(entries.length);
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#8b5cf6" />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <Text style={styles.errorHint}>
            Make sure the backend is running on port 8080
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Leaderboard</Text>
      </View>

      {/* Column Headers */}
      <View style={styles.columnHeaders}>
        <Text style={styles.columnRank}>Rank</Text>
        <Text style={styles.columnUsername}>Username</Text>
        <Text style={styles.columnRating}>Rating</Text>
      </View>

      {/* Leaderboard List */}
      <FlatList
        data={entries}
        keyExtractor={(item, index) => `${item.username}-${index}`}
        renderItem={({ item, index }) => <UserRow item={item} index={index} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#8b5cf6"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS !== "web"}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f1a",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#9ca3af",
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#f87171",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 8,
  },
  errorHint: {
    color: "#9ca3af",
    fontSize: 14,
    textAlign: "center",
  },
  header: {
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1f1f2e",
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
  userRow: {
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
  footer: {
    padding: 16,
    alignItems: "center",
  },
});
