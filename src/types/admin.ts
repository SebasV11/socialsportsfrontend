export interface AdminSummary {
  users_total: number;
  admins_total: number;
  active_users: number;
  inactive_users: number;
  matches_total: number;
  pending_matches: number;
  completed_matches: number;
  sports_total: number;
  user_sports_total: number;
  availabilities_total: number;
  messages_total: number;
  notifications_total: number;
}

export interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  city?: string | null;
  bio?: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface AdminMatchRow {
  id: number;
  status: string;
  scheduled_at?: string | null;
  location_city?: string | null;
  created_at: string;
  sport?: { id: number; name: string };
  initiator?: { id: number; name: string };
  opponent?: { id: number; name: string };
}

export interface AdminOverviewResponse {
  summary: AdminSummary;
  users: AdminUserRow[];
  matches: AdminMatchRow[];
}

export interface AdminTestRunResponse {
  output: string;
  passed: boolean;
  tests_run: number;
  failures: number;
}

export interface Advertisement {
  id: number;
  company_name: string;
  title: string;
  description: string;
  video_url?: string | null;
  is_active: boolean;
  views_count: number;
  clicks_count: number;
  ctr?: number;
  created_at: string;
  updated_at: string;
}

export interface AdvertisementSetting {
  slot: string;
  advertisement_id: number | null;
  frequency: number;
  advertisement?: Pick<Advertisement, 'id' | 'company_name' | 'title'> | null;
}

export type AdvertisementSettingsMap = Record<string, AdvertisementSetting>;

export interface AdvertisementSummary {
  active_advertisements: number;
  total_views: number;
  total_clicks: number;
  total_companies: number;
  average_ctr: number;
}

export interface AdvertisementSummaryResponse {
  summary: AdvertisementSummary;
  top_performing: Advertisement[];
  companies: string[];
}

export interface AdvertisementListResponse {
  advertisements: Advertisement[];
}
