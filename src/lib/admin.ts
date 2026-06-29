import api from './api';
import {
  AdminOverviewResponse,
  AdminTestRunResponse,
  Advertisement,
  AdvertisementListResponse,
  AdvertisementSettingsMap,
  AdvertisementSummaryResponse,
} from '@/types/admin';
import { User } from '@/types';

export interface AdminUpdateUserInput {
  name?: string;
  email?: string;
  bio?: string | null;
  city?: string;
  is_active?: boolean;
  is_admin?: boolean;
  sports?: { sport_id: number; skill_level: 'beginner' | 'intermediate' | 'advanced'; is_active: boolean }[];
}

export interface AdminCreateAdvertisementInput {
  company_name: string;
  title: string;
  description: string;
  is_active?: boolean;
}

export interface AdminUpdateAdvertisementInput extends Partial<AdminCreateAdvertisementInput> {}

export const adminService = {
  async getOverview(): Promise<AdminOverviewResponse> {
    const response = await api.get<AdminOverviewResponse>('/admin/overview');
    return response.data;
  },

  async getUserDetail(userId: number): Promise<User> {
    const response = await api.get<User>(`/users/${userId}`);
    return response.data;
  },

  async updateUser(userId: number, data: AdminUpdateUserInput): Promise<User> {
    const response = await api.patch<{ user: User }>(`/admin/users/${userId}`, data);
    return response.data.user;
  },

  async deleteUser(userId: number): Promise<string> {
    const response = await api.delete<{ message: string }>(`/admin/users/${userId}`);
    return response.data.message;
  },

  // Advertisements
  async getAdvertisements(): Promise<Advertisement[]> {
    const response = await api.get<AdvertisementListResponse>('/admin/advertisements');
    return response.data.advertisements;
  },

  async getAdvertisementsSummary(): Promise<AdvertisementSummaryResponse> {
    const response = await api.get<AdvertisementSummaryResponse>('/admin/advertisements/summary');
    return response.data;
  },

  async createAdvertisement(data: AdminCreateAdvertisementInput): Promise<Advertisement> {
    const response = await api.post<{ advertisement: Advertisement }>('/admin/advertisements', data);
    return response.data.advertisement;
  },

  async updateAdvertisement(advertisementId: number, data: AdminUpdateAdvertisementInput): Promise<Advertisement> {
    const response = await api.patch<{ advertisement: Advertisement }>(
      `/admin/advertisements/${advertisementId}`,
      data
    );
    return response.data.advertisement;
  },

  async deleteAdvertisement(advertisementId: number): Promise<string> {
    const response = await api.delete<{ message: string }>(`/admin/advertisements/${advertisementId}`);
    return response.data.message;
  },

  async uploadAdvertisementVideo(advertisementId: number, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('video', file);

    // Gaat via de Next route handler (/uploads/...) i.p.v. de /api-proxy, omdat de
    // PHP dev-server grote chunked uploads via de rewrite niet aankan. Daarom hier
    // fetch i.p.v. de axios-instance (die /api als baseURL heeft).
    const token = typeof window !== 'undefined' ? localStorage.getItem('sportmatch_token') : null;
    const res = await fetch(`/uploads/ad-video/${advertisementId}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Upload mislukt (${res.status})`);
    }

    const data = (await res.json()) as { video_url: string };
    return data.video_url;
  },

  async deleteAdvertisementVideo(advertisementId: number): Promise<void> {
    await api.delete(`/admin/advertisements/${advertisementId}/video`);
  },

  async getAdvertisementSettings(): Promise<AdvertisementSettingsMap> {
    const response = await api.get<{ settings: AdvertisementSettingsMap }>('/admin/advertisement-settings');
    return response.data.settings;
  },

  async updateAdvertisementSetting(
    slot: string,
    payload: { advertisement_id?: number | null; frequency?: number }
  ): Promise<void> {
    await api.put(`/admin/advertisement-settings/${slot}`, payload);
  },

  async runUnitTests(): Promise<AdminTestRunResponse> {
    const response = await api.post<AdminTestRunResponse>('/admin/run-tests/unit');
    return response.data;
  },

  async runUiTests(): Promise<AdminTestRunResponse> {
    const response = await api.post<AdminTestRunResponse>('/admin/run-tests/ui');
    return response.data;
  },

  async runPentest(): Promise<AdminTestRunResponse> {
    const response = await api.post<AdminTestRunResponse>('/admin/run-tests/pentest');
    return response.data;
  },
};
