package main

import (
	"fmt"
	"leaderboard-api/handlers"
	"leaderboard-api/seed"
	"leaderboard-api/simulator"
	"leaderboard-api/store"
	"log"
	"net/http"
	"os"
	"time"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Allow all origins for development
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))
	})
}

func main() {
	log.Println("Initializing leaderboard...")
	leaderboard := store.NewLeaderboard()

	log.Println("Generating 10,000 seed users...")
	users := seed.GenerateUsersWithTies(10000)
	leaderboard.BulkAddUsers(users)
	log.Printf("Loaded %d users into leaderboard", leaderboard.GetTotalUsers())

	h := handlers.NewHandler(leaderboard)

	log.Println("Starting score update simulator...")
	updater := simulator.NewScoreUpdater(leaderboard)
	updater.Start(1500)

	// Setup routes
	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("GET /api/leaderboard", h.GetLeaderboard)
	mux.HandleFunc("GET /api/users/search", h.SearchUsers)
	mux.HandleFunc("GET /api/users/{username}", h.GetUser)
	mux.HandleFunc("GET /api/stats", h.GetStats)
	mux.HandleFunc("GET /api/stream", h.StreamUpdates)
	mux.HandleFunc("GET /api/stream/search", h.StreamSearchUpdates)
	mux.HandleFunc("GET /health", h.HealthCheck)

	// Apply middleware
	handler := corsMiddleware(loggingMiddleware(mux))

	// Get port from environment or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Start server
	addr := fmt.Sprintf(":%s", port)
	log.Printf("  Leaderboard API server starting on http://localhost%s", addr)
	log.Printf("  API Endpoints:")
	log.Printf("   GET /api/leaderboard?limit=50&offset=0")
	log.Printf("   GET /api/users/search?q=rahul")
	log.Printf("   GET /api/users/{username}")
	log.Printf("   GET /api/stats")
	log.Printf("   GET /health")

	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
