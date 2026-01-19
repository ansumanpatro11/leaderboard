package seed

import (
	"fmt"
	"leaderboard-api/models"
	"math/rand"
)

var firstNames = []string{
	"rahul", "amit", "priya", "neha", "vijay", "sanjay", "deepak", "ankit", "rohit", "suresh",
	"arun", "kiran", "manoj", "pooja", "ravi", "ashok", "vivek", "sunita", "rajesh", "meena",
	"gaurav", "nisha", "sachin", "anjali", "vikram", "kavita", "nikhil", "swati", "akash", "geeta",
	"harsh", "divya", "mohit", "rekha", "varun", "shikha", "kunal", "mamta", "tarun", "seema",
	"alex", "john", "mike", "sarah", "emma", "james", "david", "lisa", "anna", "chris",
	"jason", "kevin", "brian", "steven", "mark", "paul", "daniel", "andrew", "joshua", "ryan",
	"arjun", "krishna", "shiva", "ganesh", "lakshmi", "durga", "parvati", "saraswati", "vishnu", "brahma",
	"alpha", "beta", "gamma", "delta", "epsilon", "omega", "sigma", "theta", "zeta", "kappa",
	"neo", "max", "sam", "leo", "kai", "raj", "jai", "dev", "nav", "sri",
	"titan", "phoenix", "dragon", "ninja", "cyber", "tech", "code", "byte", "pixel", "quantum",
}

var suffixes = []string{
	"", "_kumar", "_sharma", "_singh", "_verma", "_gupta", "_patel", "_joshi", "_mehta", "_reddy",
	"_123", "_456", "_789", "_007", "_pro", "_dev", "_ace", "_star", "_king", "_queen",
	"_x", "_z", "_99", "_01", "_22", "_gamer", "_coder", "_hacker", "_ninja", "_wizard",
	"_burman", "_mathur", "_yadav", "_chauhan", "_malhotra", "_kapoor", "_saxena", "_bansal", "_mittal", "_agarwal",
}

func GenerateUsers(count int) []*models.User {
	users := make([]*models.User, 0, count)
	usedUsernames := make(map[string]bool)

	for i := 0; i < count; {
		firstName := firstNames[rand.Intn(len(firstNames))]
		suffix := suffixes[rand.Intn(len(suffixes))]
		username := firstName + suffix

		// Add a number if username is taken
		if usedUsernames[username] {
			username = fmt.Sprintf("%s%s_%d", firstName, suffix, rand.Intn(10000))
		}

		if usedUsernames[username] {
			continue
		}

		usedUsernames[username] = true

		// Generate rating between 100 and 5000
		rating := 100 + rand.Intn(4901) // 100 to 5000 inclusive

		user := &models.User{
			ID:       fmt.Sprintf("user_%d", i+1),
			Username: username,
			Rating:   rating,
		}

		users = append(users, user)
		i++
	}

	return users
}

func GenerateUsersWithTies(count int) []*models.User {
	users := GenerateUsers(count)

	commonRatings := []int{4600, 3900, 2500, 1500, 1000}

	for i := 0; i < len(users) && i < 50; i++ {
		if i%10 < 5 {
			users[i].Rating = commonRatings[i%5]
		}
	}

	return users
}
