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
}

// NewLeaderboard creates a new leaderboard instance
func NewLeaderboard() *Leaderboard {
	return &Leaderboard{
		usersByUsername: make(map[string]*models.User),
		sortedUsers:     make([]*models.User, 0),
		ratingToUsers:   make(map[int][]string),
		rankCache:       make(map[int]int),
		rankCacheDirty:  true,
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
