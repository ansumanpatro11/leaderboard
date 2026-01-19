// API configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  rating: number;
}

export interface SearchResult {
  globalRank: number;
  username: string;
  rating: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  totalUsers: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  count: number;
}

export interface Stats {
  totalUsers: number;
  minRating: number;
  maxRating: number;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async getLeaderboard(limit: number = 50, offset: number = 0): Promise<LeaderboardResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/leaderboard?limit=${limit}&offset=${offset}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  }

  async searchUsers(query: string, limit: number = 50): Promise<SearchResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/users/search?q=${encodeURIComponent(query)}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  async getUserRank(username: string): Promise<SearchResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/users/${encodeURIComponent(username)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting user rank:', error);
      throw error;
    }
  }

  async getStats(): Promise<Stats> {
    try {
      const response = await fetch(`${this.baseUrl}/api/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
