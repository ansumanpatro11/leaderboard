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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { apiService, LeaderboardEntry } from "@/services/api";

// Rank badge component for list items (ranks 4+)
const RankBadge = ({ rank }: { rank: number }) => {
  return (
    <View style={styles.rankBadge}>
      <Text style={styles.rankText}>{rank}</Text>
    </View>
  );
};

// Rating display component
const RatingDisplay = ({ rating }: { rating: number }) => {
  return <Text style={styles.ratingText}>{rating}</Text>;
};

// User row component
const UserRow = ({
  item,
  index,
}: {
  item: LeaderboardEntry;
  index: number;
}) => (
  <View style={[styles.userRow]}>
    <RankBadge rank={item.rank} />
    {/* Avatar Placeholder in List */}
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

// Helper to get colors for 3D effect
const getPodiumColors = (rank: number, baseColor: string) => {
  switch (rank) {
    case 1:
      return { front: baseColor, top: "#D4AF37" }; // Darker gold for top
    case 2:
      return { front: baseColor, top: "#A8A8A8" }; // Darker silver for top
    case 3:
      return { front: baseColor, top: "#A0522D" }; // Darker bronze for top
    default:
      return { front: baseColor, top: baseColor };
  }
};

const PodiumItem = ({
  entry,
  rank,
  height,
  color,
  isCenter = false,
}: {
  entry: LeaderboardEntry;
  rank: number;
  height: number;
  color: string;
  isCenter?: boolean;
}) => {
  const { front, top } = getPodiumColors(rank, color);
  const barWidth = isCenter ? 110 : 90;
  const depth = 20; // How deep the top face appears

  const avatarSize = isCenter ? 80 : 60;
  const avatarRadius = avatarSize / 2;
  const avatarFontSize = isCenter ? 24 : 18;

  return (
    <View style={[styles.podiumColumn, { zIndex: isCenter ? 10 : 1 }]}>
      <View style={[styles.podiumUserContainer, { marginBottom: depth + 10 }]}>
        {/* Avatar */}
        <View
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarRadius,
            backgroundColor: "#27272a",
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 2,
            borderColor: color,
            marginBottom: 6,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: avatarFontSize,
              fontWeight: "bold",
            }}
          >
            {entry.username.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.podiumUsername} numberOfLines={1}>
          {entry.username}
        </Text>
        <Text style={[styles.podiumScore, { color: color }]}>
          {entry.rating}
        </Text>
      </View>

      {/* 3D Bar - Front and Top visible */}
      <View style={{ width: barWidth, height: height + depth }}>
        {/* Top Face - recedes inward */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: barWidth,
            height: depth,
            backgroundColor: top,
            transform: [{ perspective: 200 }, { rotateX: "60deg" }],
            transformOrigin: "bottom",
          }}
        />
        {/* Front Face */}
        <View
          style={{
            position: "absolute",
            top: depth,
            left: 0,
            width: barWidth,
            height: height,
            backgroundColor: front,
            justifyContent: "flex-start",
            alignItems: "center",
            paddingTop: 15,
          }}
        >
          <Text style={styles.podiumRankText}>{rank}</Text>
        </View>
      </View>
    </View>
  );
};

const Podium = ({ entries }: { entries: LeaderboardEntry[] }) => {
  // We expect entries to be sorted by rank (1, 2, 3...)
  // But allow passing unsorted, so we find by rank.
  const first = entries.find((e) => e.rank === 1);
  const second = entries.find((e) => e.rank === 2);
  const third = entries.find((e) => e.rank === 3);

  return (
    <View style={styles.podiumContainer}>
      {/* Second Place (Left) */}
      <View style={styles.podiumPlaceContainer}>
        {second ? (
          <PodiumItem entry={second} rank={2} height={100} color="#C0C0C0" />
        ) : (
          <View style={{ width: "100%" }} />
        )}
      </View>

      {/* First Place (Center) */}
      <View
        style={[
          styles.podiumPlaceContainer,
          { marginHorizontal: 4, zIndex: 10 },
        ]}
      >
        {/* Crown could go here */}
        {first && (
          <View style={{ alignItems: "center", width: "100%" }}>
            <View style={styles.crownContainer}>
              <MaterialCommunityIcons name="crown" size={24} color="#FFD700" />
            </View>
            <PodiumItem
              entry={first}
              rank={1}
              height={130}
              color="#FFD700"
              isCenter
            />
          </View>
        )}
      </View>

      {/* Third Place (Right) */}
      <View style={styles.podiumPlaceContainer}>
        {third ? (
          <PodiumItem entry={third} rank={3} height={70} color="#CD7F32" />
        ) : (
          <View style={{ width: "100%" }} />
        )}
      </View>
    </View>
  );
};

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

    // Subscribe to real-time updates via Server-Sent Events
    const unsubscribe = apiService.subscribeToUpdates((data) => {
      setEntries([...data.entries]);
      setTotalUsers(data.totalUsers);
      setHasMore(data.hasMore);
    });

    return unsubscribe;
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

  if (loading && entries.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && entries.length === 0) {
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

  const topThree = entries.slice(0, 3);
  const otherEntries = entries.slice(3);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leaderboard</Text>
      </View>

      {/* Podium - Top 3 */}
      <Podium entries={topThree} />

      {/* Bordered container for ranks 4+ */}
      <View style={styles.ranksListContainer}>
        <FlatList
          data={otherEntries}
          keyExtractor={(item) => `${item.username}-${item.rank}`}
          renderItem={({ item, index }) => (
            <UserRow item={item} index={index} />
          )}
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
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#18181b", // Dark background like the image
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#18181b",
  },
  loadingText: {
    marginTop: 12,
    color: "#a1a1aa",
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#18181b",
  },
  errorText: {
    color: "#f87171",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 8,
  },
  errorHint: {
    color: "#a1a1aa",
    fontSize: 14,
    textAlign: "center",
  },
  header: {
    padding: 20,
    alignItems: "center",
    backgroundColor: "#18181b",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },

  // Podium Styles
  podiumContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 0,
    paddingHorizontal: 20,
    height: 300,
  },
  podiumPlaceContainer: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  podiumColumn: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  podiumUserContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  podiumAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#27272a", // Dark grey placeholder
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    marginBottom: 8,
    overflow: "hidden",
  },
  podiumAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  podiumAvatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  podiumUsername: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
  },
  podiumScore: {
    fontSize: 10,
    fontWeight: "bold",
  },
  podiumRankText: {
    color: "#ffffff",
    fontSize: 42,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  crownContainer: {
    marginBottom: -10,
    zIndex: 20,
  },

  listContent: {
    paddingBottom: 10,
  },
  ranksListContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 0,
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
  userRow: {
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
  footer: {
    padding: 16,
    alignItems: "center",
  },
});
