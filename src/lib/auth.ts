import api from './api';
import { AuthResponse, User } from '@/types';

interface ProfileSportInput {
  sport_id: number;
  skill_level: 'beginner' | 'intermediate' | 'advanced';
}

interface UpdateProfileInput {
  city?: string;
  bio?: string;
  profilePicture?: File | null;
  sports: ProfileSportInput[];
}

export const authService = {
  async register(data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    city?: string;
  }): Promise<AuthResponse> {
    const normalizedData = {
      ...data,
      email: data.email.trim().toLowerCase(),
    };

    const response = await api.post<AuthResponse>('/register', normalizedData);
    return response.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const response = await api.post<AuthResponse>('/login', { email: normalizedEmail, password });
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/logout');
    localStorage.removeItem('sportmatch_token');
  },

  async deleteAccount(password: string): Promise<string> {
    const response = await api.delete<{ message: string }>('/user', {
      data: { password },
    });
    localStorage.removeItem('sportmatch_token');
    return response.data.message;
  },

  async forgotPassword(email: string): Promise<string> {
    const response = await api.post<{ message: string }>('/forgot-password', {
      email: email.trim().toLowerCase(),
    });
    return response.data.message;
  },

  async resetPassword(data: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Promise<string> {
    const response = await api.post<{ message: string }>('/reset-password', {
      ...data,
      email: data.email.trim().toLowerCase(),
    });
    return response.data.message;
  },

  async changePassword(data: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Promise<string> {
    const response = await api.post<{ message: string }>('/user/password', data);
    return response.data.message;
  },

  async getUser(): Promise<User> {
    const response = await api.get<{ user: User }>('/user');
    return response.data.user ?? (response.data as unknown as User);
  },

  async setAdminMode(enabled: boolean): Promise<User> {
    const response = await api.patch<{ user: User }>('/user/admin-mode', { enabled });
    return response.data.user ?? (response.data as unknown as User);
  },

  async resendVerificationEmail(): Promise<string> {
    const response = await api.post<{ message: string }>('/email/verification-notification');
    return response.data.message;
  },

  async updateProfile(data: UpdateProfileInput): Promise<User> {
    const formData = new FormData();
    formData.append('city', data.city ?? '');
    formData.append('bio', data.bio ?? '');
    formData.append('sports', JSON.stringify(data.sports));

    if (data.profilePicture) {
      formData.append('profile_picture', data.profilePicture);
    }

    const response = await api.post<{ user: User }>('/user/profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.user ?? (response.data as unknown as User);
  },

  saveToken(token: string): void {
    localStorage.setItem('sportmatch_token', token);
  },

  clearToken(): void {
    localStorage.removeItem('sportmatch_token');
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('sportmatch_token');
  },

  isLoggedIn(): boolean {
    return !!this.getToken();
  },
};
