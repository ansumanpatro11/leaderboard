package store

import (
	"leaderboard-api/models"
	"sort"
	"strings"
	"sync"
)

// Leaderboard manages users and their rankings efficiently
type Leaderboard struct {
	mu sync.RWMutex

	// All users indexed by username for O(1) lookup
	usersByUsername map[string]*models.User

	// Users sorted by rating (descending) for leaderboard display
	sortedUsers []*models.User

	// Rating to list of usernames for tie-aware ranking
	ratingToUsers map[int][]string

	// Cache for rank lookup - maps rating to rank
	rankCache map[int]int

	// Flag to indicate if rankCache needs rebuild
	rankCacheDirty bool

	// Prefix index for fast user search - maps lowercase prefix to list of usernames
	prefixIndex map[string][]string

	// Flag to indicate if prefixIndex needs rebuild
	prefixIndexDirty bool
}

// NewLeaderboard creates a new leaderboard instance
func NewLeaderboard() *Leaderboard {
	return &Leaderboard{
		usersByUsername:  make(map[string]*models.User),
		sortedUsers:      make([]*models.User, 0),
		ratingToUsers:    make(map[int][]string),
		rankCache:        make(map[int]int),
		rankCacheDirty:   true,
		prefixIndex:      make(map[string][]string),
		prefixIndexDirty: true,
	}
}

// AddUser adds a new user to the leaderboard
func (lb *Leaderboard) AddUser(user *models.User) {
	lb.mu.Lock()
	defer lb.mu.Unlock()

	// Check if user already exists
	if _, exists := lb.usersByUsername[user.Username]; exists {
		return
	}

	lb.usersByUsername[user.Username] = user

	// Add to sorted list (will be sorted in batch later or use binary insert)
	lb.sortedUsers = append(lb.sortedUsers, user)

	// Add to rating map
	lb.ratingToUsers[user.Rating] = append(lb.ratingToUsers[user.Rating], user.Username)

	lb.rankCacheDirty = true
	lb.prefixIndexDirty = true
}

// BulkAddUsers adds multiple users efficiently
func (lb *Leaderboard) BulkAddUsers(users []*models.User) {
	lb.mu.Lock()
	defer lb.mu.Unlock()

	for _, user := range users {
		if _, exists := lb.usersByUsername[user.Username]; exists {
			continue
		}

		lb.usersByUsername[user.Username] = user
		lb.sortedUsers = append(lb.sortedUsers, user)
		lb.ratingToUsers[user.Rating] = append(lb.ratingToUsers[user.Rating], user.Username)
	}

	// Sort all users by rating descending after bulk add
	sort.Slice(lb.sortedUsers, func(i, j int) bool {
		return lb.sortedUsers[i].Rating > lb.sortedUsers[j].Rating
	})

	lb.rankCacheDirty = true
	lb.prefixIndexDirty = true
}

// rebuildRankCache rebuilds the rank cache for tie-aware ranking
func (lb *Leaderboard) rebuildRankCache() {
	if !lb.rankCacheDirty {

		return
	}

	lb.rankCache = make(map[int]int)

	// Get unique ratings sorted descending
	ratings := make([]int, 0, len(lb.ratingToUsers))
	for rating := range lb.ratingToUsers {
		ratings = append(ratings, rating)
	}
	sort.Sort(sort.Reverse(sort.IntSlice(ratings)))

	// Assign ranks - same rating gets same rank (dense ranking)
	rank := 1
	for _, rating := range ratings {
		lb.rankCache[rating] = rank
		rank++
	}

	lb.rankCacheDirty = false
}

// rebuildPrefixIndex rebuilds the prefix index from current users
func (lb *Leaderboard) rebuildPrefixIndex() {
	if !lb.prefixIndexDirty {
		return
	}

	lb.prefixIndex = make(map[string][]string)
	for username := range lb.usersByUsername {
		usernameL := strings.ToLower(username)
		// Add all prefixes of the username
		for i := 1; i <= len(usernameL); i++ {
			prefix := usernameL[:i]
			lb.prefixIndex[prefix] = append(lb.prefixIndex[prefix], username)
		}
	}
	lb.prefixIndexDirty = false
}

// ensureSorted makes sure the sortedUsers slice is sorted
func (lb *Leaderboard) ensureSorted() {
	sort.Slice(lb.sortedUsers, func(i, j int) bool {
		if lb.sortedUsers[i].Rating != lb.sortedUsers[j].Rating {
			return lb.sortedUsers[i].Rating > lb.sortedUsers[j].Rating
		}
		return lb.sortedUsers[i].Username < lb.sortedUsers[j].Username
	})
}

// GetLeaderboard returns paginated leaderboard entries with tie-aware ranking
func (lb *Leaderboard) GetLeaderboard(limit, offset int) []models.LeaderboardEntry {
	lb.mu.RLock()
	defer lb.mu.RUnlock()

	if lb.rankCacheDirty {
		lb.mu.RUnlock()
		lb.mu.Lock()
		lb.rebuildRankCache()
		lb.ensureSorted()
		lb.mu.Unlock()
		lb.mu.RLock()
	}

	if offset >= len(lb.sortedUsers) {
		return []models.LeaderboardEntry{}
	}

	end := offset + limit
	if end > len(lb.sortedUsers) {
		end = len(lb.sortedUsers)
	}

	entries := make([]models.LeaderboardEntry, 0, end-offset)
	for i := offset; i < end; i++ {
		user := lb.sortedUsers[i]
		entries = append(entries, models.LeaderboardEntry{
			Rank:     lb.rankCache[user.Rating],
			Username: user.Username,
			Rating:   user.Rating,
		})
	}

	return entries
}

// SearchUsers searches for users by username using prefix index (case-insensitive)
func (lb *Leaderboard) SearchUsers(query string, limit int) []models.SearchResult {
	lb.mu.RLock()
	defer lb.mu.RUnlock()

	if lb.rankCacheDirty {
		lb.mu.RUnlock()
		lb.mu.Lock()
		lb.rebuildRankCache()
		lb.ensureSorted()
		lb.mu.Unlock()
		lb.mu.RLock()
	}

	if lb.prefixIndexDirty {
		lb.mu.RUnlock()
		lb.mu.Lock()
		lb.rebuildPrefixIndex()
		lb.mu.Unlock()
		lb.mu.RLock()
	}

	query = strings.ToLower(query)
	results := make([]models.SearchResult, 0)

	// Use prefix index for fast lookup
	matchingUsernames := make([]string, 0)
	if len(query) > 0 {
		if prefixMatches, exists := lb.prefixIndex[query]; exists {
			matchingUsernames = prefixMatches
		} else {
			// Fall back to substring search
			seenMap := make(map[string]bool)
			for prefix, usernames := range lb.prefixIndex {
				if strings.Contains(prefix, query) {
					for _, u := range usernames {
						if !seenMap[u] {
							matchingUsernames = append(matchingUsernames, u)
							seenMap[u] = true
						}
					}
				}
			}
		}
	}

	// Sort matching usernames by rating (descending)
	sort.Slice(matchingUsernames, func(i, j int) bool {
		userI := lb.usersByUsername[matchingUsernames[i]]
		userJ := lb.usersByUsername[matchingUsernames[j]]
		return userI.Rating > userJ.Rating
	})

	// Build results up to limit
	for _, username := range matchingUsernames {
		if len(results) >= limit {
			break
		}
		user := lb.usersByUsername[username]
		results = append(results, models.SearchResult{
			GlobalRank: lb.rankCache[user.Rating],
			Username:   user.Username,
			Rating:     user.Rating,
		})
	}

	return results
}

// GetUserRank gets a specific user's rank by username
func (lb *Leaderboard) GetUserRank(username string) (*models.SearchResult, bool) {
	lb.mu.RLock()
	defer lb.mu.RUnlock()

	if lb.rankCacheDirty {
		lb.mu.RUnlock()
		lb.mu.Lock()
		lb.rebuildRankCache()
		lb.mu.Unlock()
		lb.mu.RLock()
	}

	user, exists := lb.usersByUsername[username]
	if !exists {
		return nil, false
	}

	return &models.SearchResult{
		GlobalRank: lb.rankCache[user.Rating],
		Username:   user.Username,
		Rating:     user.Rating,
	}, true
}

// UpdateRating updates a user's rating
func (lb *Leaderboard) UpdateRating(username string, newRating int) bool {
	lb.mu.Lock()
	defer lb.mu.Unlock()

	user, exists := lb.usersByUsername[username]
	if !exists {
		return false
	}

	oldRating := user.Rating

	// Remove from old rating group
	users := lb.ratingToUsers[oldRating]
	for i, u := range users {
		if u == username {
			lb.ratingToUsers[oldRating] = append(users[:i], users[i+1:]...)
			break
		}
	}
	if len(lb.ratingToUsers[oldRating]) == 0 {
		delete(lb.ratingToUsers, oldRating)
	}

	// Update user rating
	user.Rating = newRating

	// Add to new rating group
	lb.ratingToUsers[newRating] = append(lb.ratingToUsers[newRating], username)

	lb.rankCacheDirty = true
	return true
}

// GetRandomUser returns a random user for score updates
func (lb *Leaderboard) GetRandomUser(index int) *models.User {
	lb.mu.RLock()
	defer lb.mu.RUnlock()

	if len(lb.sortedUsers) == 0 {
		return nil
	}

	return lb.sortedUsers[index%len(lb.sortedUsers)]
}

// GetTotalUsers returns total number of users
func (lb *Leaderboard) GetTotalUsers() int {
	lb.mu.RLock()
	defer lb.mu.RUnlock()
	return len(lb.sortedUsers)
}

// GetStats returns leaderboard statistics
func (lb *Leaderboard) GetStats() models.StatsResponse {
	lb.mu.RLock()
	defer lb.mu.RUnlock()

	stats := models.StatsResponse{
		TotalUsers: len(lb.sortedUsers),
		MinRating:  5000,
		MaxRating:  100,
	}

	for rating := range lb.ratingToUsers {
		if rating < stats.MinRating {
			stats.MinRating = rating
		}
		if rating > stats.MaxRating {
			stats.MaxRating = rating
		}
	}

	if len(lb.sortedUsers) == 0 {
		stats.MinRating = 0
		stats.MaxRating = 0
	}

	return stats
}
