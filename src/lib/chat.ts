import api from './api';
import { ChatConversation, ChatMessage, User } from '@/types';

export const chatService = {
  async getConversations(): Promise<ChatConversation[]> {
    const response = await api.get<{ conversations: ChatConversation[] }>('/chats');
    return response.data.conversations ?? [];
  },

  async getConversation(friendId: number): Promise<{ friend: Pick<User, 'id' | 'name' | 'profile_picture'>; messages: ChatMessage[] }> {
    const response = await api.get<{ friend: Pick<User, 'id' | 'name' | 'profile_picture'>; messages: ChatMessage[] }>(`/chats/${friendId}`);
    return {
      friend: response.data.friend,
      messages: response.data.messages ?? [],
    };
  },

  async sendMessage(friendId: number, message: string): Promise<ChatMessage> {
    const response = await api.post<{ chat_message: ChatMessage }>(`/chats/${friendId}`, { message });
    return response.data.chat_message;
  },
};
