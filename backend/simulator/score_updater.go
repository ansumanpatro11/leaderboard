package simulator

import (
	"leaderboard-api/store"
	"math/rand"
	"time"
)

// ScoreUpdater simulates random score updates
type ScoreUpdater struct {
	leaderboard *store.Leaderboard
	stopChan    chan struct{}
	running     bool
}

// NewScoreUpdater creates a new score updater
func NewScoreUpdater(lb *store.Leaderboard) *ScoreUpdater {
	return &ScoreUpdater{
		leaderboard: lb,
		stopChan:    make(chan struct{}),
		running:     false,
	}
}

// Start begins the score update simulation
func (su *ScoreUpdater) Start(updatesPerSecond int) {
	if su.running {
		return
	}
	su.running = true

	go func() {
		ticker := time.NewTicker(time.Second / time.Duration(updatesPerSecond))
		defer ticker.Stop()

		counter := 0
		for {
			select {
			case <-ticker.C:
				su.performRandomUpdate(counter)
				counter++
			case <-su.stopChan:
				return
			}
		}
	}()
}

// Stop stops the score update simulation
func (su *ScoreUpdater) Stop() {
	if !su.running {
		return
	}
	su.running = false
	close(su.stopChan)
}

// performRandomUpdate updates a random user's rating
func (su *ScoreUpdater) performRandomUpdate(seed int) {
	totalUsers := su.leaderboard.GetTotalUsers()
	if totalUsers == 0 {
		return
	}

	// Pick a random user
	userIndex := rand.Intn(totalUsers)
	user := su.leaderboard.GetRandomUser(userIndex)
	if user == nil {
		return
	}

	// Calculate new rating with some randomness
	// Ratings can go up or down by 1-50 points
	change := rand.Intn(101) - 50 // -50 to +50
	newRating := user.Rating + change

	// Clamp to valid range
	if newRating < 100 {
		newRating = 100
	}
	if newRating > 5000 {
		newRating = 5000
	}

	su.leaderboard.UpdateRating(user.Username, newRating)
}
