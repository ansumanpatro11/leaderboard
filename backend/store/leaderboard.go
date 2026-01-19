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
