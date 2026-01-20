package handlers

import (
	"encoding/json"
	"fmt"
	"leaderboard-api/store"
	"net/http"
	"strconv"
	"time"
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

// StreamUpdates handles GET /api/stream (Server-Sent Events for live updates)
func (h *Handler) StreamUpdates(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			entries := h.Leaderboard.GetLeaderboard(50, 0)
			stats := h.Leaderboard.GetStats()
			response := map[string]interface{}{
				"entries":    entries,
				"totalUsers": stats.TotalUsers,
				"limit":      50,
				"offset":     0,
				"hasMore":    50 < stats.TotalUsers,
			}
			data, _ := json.Marshal(response)
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
}

// StreamSearchUpdates handles GET /api/stream/search (SSE for live search updates)
func (h *Handler) StreamSearchUpdates(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			results := h.Leaderboard.SearchUsers(query, 50)
			response := map[string]interface{}{
				"results": results,
				"query":   query,
				"count":   len(results),
			}
			data, _ := json.Marshal(response)
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
}
