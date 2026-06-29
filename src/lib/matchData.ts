import api from './api';
import { GameMatch, User } from '@/types';

export interface ScoreboardRow {
  rank: number;
  elo_rating: number;
  matches_played: number;
  matches_won: number;
  skill_level?: 'beginner' | 'intermediate' | 'advanced';
  user: User;
  sport?: { id: number; name: string };
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface Paginated<T> {
  data: T[];
  hasMore: boolean;
}

interface PageParams {
  page?: number;
  per_page?: number;
}

const emptyMeta: PaginationMeta = { page: 1, per_page: 10, has_more: false };

export const matchDataService = {
  async getPlayers(
    params?: { q?: string; city?: string; sport_id?: number; skill_level?: string; max_distance?: number } & PageParams
  ): Promise<Paginated<User>> {
    const response = await api.get<{ players: User[]; pagination?: PaginationMeta }>('/players', { params });
    return {
      data: response.data.players ?? [],
      hasMore: (response.data.pagination ?? emptyMeta).has_more,
    };
  },

  async getScoreboard(
    params?: { q?: string; city?: string; sport_id?: number } & PageParams
  ): Promise<Paginated<ScoreboardRow>> {
    const response = await api.get<{ scoreboard: ScoreboardRow[]; pagination?: PaginationMeta }>('/scoreboard', { params });
    return {
      data: response.data.scoreboard ?? [],
      hasMore: (response.data.pagination ?? emptyMeta).has_more,
    };
  },

  async getMatches(
    params?: { status?: string; scope?: 'upcoming' | 'history' } & PageParams
  ): Promise<Paginated<GameMatch>> {
    const response = await api.get<{ matches: GameMatch[]; pagination?: PaginationMeta }>('/matches', { params });
    return {
      data: response.data.matches ?? [],
      hasMore: (response.data.pagination ?? emptyMeta).has_more,
    };
  },

  async getHistory(params?: PageParams): Promise<Paginated<GameMatch>> {
    const response = await api.get<{ matches: GameMatch[]; pagination?: PaginationMeta }>('/matches/history', { params });
    return {
      data: response.data.matches ?? [],
      hasMore: (response.data.pagination ?? emptyMeta).has_more,
    };
  },

  async getCities(): Promise<string[]> {
    const response = await api.get<{ cities: string[] }>('/cities');
    return response.data.cities ?? [];
  },

  async getMatch(matchId: number): Promise<GameMatch> {
    const response = await api.get<GameMatch>(`/matches/${matchId}`);
    return response.data;
  },

  async createMatch(data: {
    sport_id: number;
    opponent_id: number;
    scheduled_at: string;
    location_name?: string;
    location_address?: string;
    location_city?: string;
    location_latitude?: number;
    location_longitude?: number;
    notes?: string;
  }): Promise<GameMatch> {
    const response = await api.post<{ match: GameMatch }>('/matches', data);
    return response.data.match;
  },

  async acceptMatch(matchId: number): Promise<GameMatch> {
    const response = await api.post<{ match: GameMatch }>(`/matches/${matchId}/accept`);
    return response.data.match;
  },

  async declineMatch(matchId: number): Promise<GameMatch> {
    const response = await api.post<{ match: GameMatch }>(`/matches/${matchId}/decline`);
    return response.data.match;
  },

  async cancelMatch(matchId: number): Promise<GameMatch> {
    const response = await api.post<{ match: GameMatch }>(`/matches/${matchId}/cancel`);
    return response.data.match;
  },

  async reportMatchResult(matchId: number, payload: { initiator_score: number; opponent_score: number }): Promise<GameMatch> {
    const response = await api.post<{ match: GameMatch }>(`/matches/${matchId}/result`, payload);
    return response.data.match;
  },

  async confirmMatchResult(matchId: number): Promise<GameMatch> {
    const response = await api.post<{ match: GameMatch }>(`/matches/${matchId}/result/confirm`);
    return response.data.match;
  },
};
