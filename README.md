# Leaderboard System

A full-stack competitive ranking platform built with Go backend and React Native frontend. Track player ratings, search users, and compete in real-time.

## 🌐 Live Demo

[View Live Application](https://leaderboardtrack.netlify.app)

## 📁 Project Structure

```
leaderboard/
├── backend/                 # Go REST API server
│   ├── main.go             # Entry point
│   ├── handlers/           # HTTP request handlers
│   │   └── handlers.go     # API endpoints
│   ├── models/             # Data structures
│   │   └── user.go         # User model
│   ├── store/              # Data persistence layer
│   │   └── leaderboard.go  # Leaderboard queries
│   ├── seed/               # Initial data seeding
│   │   └── seeder.go       # Seed script
│   ├── simulator/          # Test data generation
│   │   └── score_updater.go
│   └── go.mod              # Go dependencies
│
├── frontend/               # React Native / Expo web app
│   ├── app/                # Main application logic
│   │   ├── (tabs)/         # Tab-based navigation
│   │   │   ├── index.tsx   # Leaderboard tab
│   │   │   └── two.tsx     # Search players tab
│   │   └── _layout.tsx     # App routing setup
│   ├── components/         # Reusable UI components
│   ├── services/           # API service layer
│   │   └── api.ts          # Backend API client
│   ├── constants/          # App-wide constants
│   └── package.json        # Dependencies & scripts
│
└── README.md              # Project documentation
```

## ✨ Key Features

- **Real-time Leaderboard**: Displays top-ranked players with live rating updates
- **Advanced Search**: Search players by username with instant results and global rank display
- **Tier-based Ranking**: Visual rank badges with color-coded tiers (Gold, Silver, Bronze)
- **Responsive Design**: Dark-themed UI optimized for web and mobile
- **Dynamic Rating Colors**: Green (high rating), Yellow (medium), Red (low)
- **Pagination Support**: Efficiently load large leaderboard datasets
- **Cross-platform**: Built with Expo/React Native for web deployment

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Go (v1.18 or higher)
- npm or yarn

### Backend Setup

```bash
cd backend

# Install Go dependencies
go mod download

# Run the server (default: http://localhost:8080)
go run main.go
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server (http://localhost:3000)
npm run web

# Build for production
npm run build
```

## 📊 API Endpoints

### Leaderboard

- `GET /api/leaderboard?limit=50&offset=0` - Get ranked players

### Search

- `GET /api/search?q=username` - Search players by username

## 🛠 Tech Stack

**Backend:**

- Go (REST API)
- In-memory data store

**Frontend:**

- React 19.1
- React Native 0.81
- Expo Router
- TypeScript
- React Navigation

## 📝 Development Notes

- Backend runs on port 8080
- Frontend development server runs on port 3000
- All styling uses dark theme (#0f0f1a background) for modern look
- API responses are properly typed with TypeScript interfaces

## 📦 Deployment

The frontend is deployed on Netlify with automatic builds from the main branch.

---


