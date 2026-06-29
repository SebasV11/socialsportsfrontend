import api from './api';
import { Advertisement } from '@/types/admin';

export const advertisementService = {
  async getRandomActive(slot?: string): Promise<Advertisement | null> {
    const params = slot ? { slot } : undefined;
    const response = await api.get<{ advertisement: Advertisement | null }>('/advertisements/random', { params });
    return response.data.advertisement;
  },

  async getSlotConfig(slot: string): Promise<{ frequency: number; has_ad: boolean }> {
    const response = await api.get<{ frequency: number; has_ad: boolean }>('/advertisements/slot-config', {
      params: { slot },
    });
    return response.data;
  },

  async recordView(advertisementId: number): Promise<void> {
    await api.post(`/advertisements/${advertisementId}/view`);
  },

  async recordClick(advertisementId: number): Promise<void> {
    await api.post(`/advertisements/${advertisementId}/click`);
  },
};
