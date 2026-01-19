package handlers

import (
	"encoding/json"
	"leaderboard-api/store"
	"net/http"
	"strconv"
)

// Handler holds dependencies for HTTP handlers
type Handler struct {
	Leaderboard *store.Leaderboard
}

// NewHandler creates a new handler instance
func NewHandler(lb *store.Leaderboard) *Handler {
	return &Handler{Leaderboard: lb}
}

// GetLeaderboard handles GET /api/leaderboard
func (h *Handler) GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 50 
	offset := 0

	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	entries := h.Leaderboard.GetLeaderboard(limit, offset)
	stats := h.Leaderboard.GetStats()

	response := map[string]interface{}{
		"entries":    entries,
		"totalUsers": stats.TotalUsers,
		"limit":      limit,
		"offset":     offset,
		"hasMore":    offset+limit < stats.TotalUsers,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// SearchUsers handles GET /api/users/search
func (h *Handler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	limitStr := r.URL.Query().Get("limit")

	limit := 50
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	if query == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"results": []interface{}{},
			"query":   query,
		})
		return
	}

	results := h.Leaderboard.SearchUsers(query, limit)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"results": results,
		"query":   query,
		"count":   len(results),
	})
}

// GetUser handles GET /api/users/{username}
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	if username == "" {
		http.Error(w, "Username required", http.StatusBadRequest)
		return
	}

	result, found := h.Leaderboard.GetUserRank(username)
	if !found {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// GetStats handles GET /api/stats
func (h *Handler) GetStats(w http.ResponseWriter, r *http.Request) {
	stats := h.Leaderboard.GetStats()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// HealthCheck handles GET /health
func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}