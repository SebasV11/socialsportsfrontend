export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string | null;
  role?: 'admin' | 'user';
  city?: string;
  bio?: string;
  profile_picture?: string;
  is_active: boolean;
  is_admin: boolean;
  is_admin_mode: boolean;
  is_friend?: boolean;
  has_pending_friend_request_sent?: boolean;
  has_pending_friend_request_received?: boolean;
  distance_km?: number | null;
  friends_count?: number;
  pending_friend_requests_count?: number;
  user_sports?: UserSport[];
}

export interface FriendRequest {
  id: number;
  sender_id: number;
  receiver_id: number;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  sender?: User;
  receiver?: User;
}

export interface ChatMessage {
  id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatConversation {
  friend: Pick<User, 'id' | 'name' | 'profile_picture'>;
  friend_id: number;
  latest_message: Pick<ChatMessage, 'id' | 'message' | 'sender_id' | 'receiver_id' | 'created_at'>;
  unread_count: number;
  updated_at: string;
}

export interface Sport {
  id: number;
  name: string;
  description?: string;
  icon?: string;
}

export interface UserSport {
  id: number;
  user_id: number;
  sport_id: number;
  is_active: boolean;
  skill_level?: 'beginner' | 'intermediate' | 'advanced';
  elo_rating: number;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  matches_draw: number;
  sport?: Sport;
}

export interface GameMatch {
  id: number;
  sport_id: number;
  initiator_id: number;
  opponent_id: number;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';
  scheduled_at?: string;
  played_at?: string;
  location_name?: string;
  location_address?: string;
  location_city?: string;
  location_latitude?: number | null;
  location_longitude?: number | null;
  sport?: Sport;
  initiator?: User;
  opponent?: User;
  result?: {
    id: number;
    match_id: number;
    winner_id?: number | null;
    loser_id?: number | null;
    is_draw: boolean;
    initiator_score?: number | null;
    opponent_score?: number | null;
  };
}

export interface Availability {
  id: number;
  user_id: number;
  sport_id: number;
  available_from: string;
  available_until: string;
  location_name?: string;
  location_city?: string;
  notes?: string;
  user?: User;
  sport?: Sport;
  elo_rating?: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}
