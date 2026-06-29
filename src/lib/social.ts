import api from './api';
import { FriendRequest, User } from '@/types';

export const socialService = {
  async getFriends(): Promise<User[]> {
    const response = await api.get<{ friends: User[] }>('/friends');
    return response.data.friends ?? [];
  },

  async addFriend(userId: number): Promise<void> {
    await api.post(`/friends/${userId}`);
  },

  async removeFriend(userId: number): Promise<void> {
    await api.delete(`/friends/${userId}`);
  },

  async invitePlayer(userId: number): Promise<void> {
    await api.post(`/users/${userId}/invite`);
  },

  async getFriendRequests(): Promise<{ incoming: FriendRequest[]; outgoing: FriendRequest[]; pending_count: number }> {
    const response = await api.get<{ incoming: FriendRequest[]; outgoing: FriendRequest[]; pending_count: number }>('/friend-requests');
    return {
      incoming: response.data.incoming ?? [],
      outgoing: response.data.outgoing ?? [],
      pending_count: response.data.pending_count ?? 0,
    };
  },

  async sendFriendRequest(userId: number): Promise<void> {
    await api.post(`/friend-requests/${userId}`);
  },

  async acceptFriendRequest(userId: number): Promise<void> {
    await api.post(`/friend-requests/${userId}/accept`);
  },

  async declineFriendRequest(userId: number): Promise<void> {
    await api.post(`/friend-requests/${userId}/decline`);
  },
};
