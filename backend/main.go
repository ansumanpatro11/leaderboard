func main() {
    seedUsers()
    go startScoreSimulator()
    http.HandleFunc("/leaderboard", leaderboardHandler)
    http.ListenAndServe(":8080", nil)
}
