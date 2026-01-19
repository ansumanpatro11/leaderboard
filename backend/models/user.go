package models

type User struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Rating   int    `json:"rating"`
	Rank     int    `json:"rank,omitempty"`
}

type LeaderboardEntry struct {
	Rank     int    `json:"rank"`
	Username string `json:"username"`
	Rating   int    `json:"rating"`
}

type SearchResult struct {
	GlobalRank int    `json:"globalRank"`
	Username   string `json:"username"`
	Rating     int    `json:"rating"`
}

type StatsResponse struct {
	TotalUsers int `json:"totalUsers"`
	MinRating  int `json:"minRating"`
	MaxRating  int `json:"maxRating"`
}
