'use client';

import { FormEvent, KeyboardEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import UserAvatar from '@/components/ui/UserAvatar';
import UserProfilePopup from '@/components/ui/UserProfilePopup';
import { useAuth } from '@/hooks/useAuth';
import { chatService } from '@/lib/chat';
import { getUserProfileImageUrl } from '@/lib/profile';
import { socialService } from '@/lib/social';
import { matchDataService } from '@/lib/matchData';
import { SPORTS } from '@/constants/sports';
import { ChatConversation, ChatMessage, GameMatch, User } from '@/types';
import LocationMap, { type LocationData } from '@/components/ui/LocationMap';

function formatRelativeDate(dateValue: string): string {
  const date = new Date(dateValue);
  return new Intl.DateTimeFormat('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function ChatPageContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const [showNewChatPicker, setShowNewChatPicker] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [mobileScreen, setMobileScreen] = useState<'list' | 'chat'>('list');
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [selectedChatUser, setSelectedChatUser] = useState<Pick<User, 'id' | 'name' | 'profile_picture'> | null>(null);
  const [profilePopupUser, setProfilePopupUser] = useState<User | null>(null);
  const [profilePopupTab, setProfilePopupTab] = useState<'profile' | 'history' | 'elo'>('profile');
  const [showMatchScheduler, setShowMatchScheduler] = useState(false);
  const [matchForm, setMatchForm] = useState({
    sport_id: '',
    scheduled_at: '',
    location_name: '',
    location_address: '',
    location_city: '',
    location_latitude: undefined as number | undefined,
    location_longitude: undefined as number | undefined,
    notes: '',
  });
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [matchActionLoading, setMatchActionLoading] = useState(false);
  const [matchActionTargetId, setMatchActionTargetId] = useState<number | null>(null);
  const [showMatchAd, setShowMatchAd] = useState(false);
  const MATCH_AD_URL = 'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026';
  const [matchesById, setMatchesById] = useState<Record<number, GameMatch>>({});

  const queryUserId = Number(searchParams.get('userId'));
  const initialUserId = Number.isFinite(queryUserId) && queryUserId > 0 ? queryUserId : null;

  const selectedFriend = useMemo(() => {
    if (selectedChatUser && selectedFriendId === selectedChatUser.id) {
      return {
        ...selectedChatUser,
        email: '',
        is_active: true,
        is_admin: false,
      } as User;
    }

    if (!selectedFriendId) return null;
    return friends.find((friend) => friend.id === selectedFriendId) ?? null;
  }, [friends, selectedFriendId, selectedChatUser]);

  const filteredFriends = useMemo(() => {
    const search = friendSearch.trim().toLowerCase();
    if (!search) return friends;

    return friends.filter((friend) => {
      return friend.name.toLowerCase().includes(search) || (friend.city ?? '').toLowerCase().includes(search);
    });
  }, [friends, friendSearch]);

  const timeOptions = useMemo(() => {
    const options: string[] = [];
    for (let hour = 0; hour < 24; hour += 1) {
      for (let minute = 0; minute < 60; minute += 15) {
        options.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
      }
    }
    return options;
  }, []);

  const updateScheduledAt = (date: string, time: string) => {
    const scheduledAt = date && time ? `${date}T${time}` : '';
    setMatchForm((current) => ({ ...current, scheduled_at: scheduledAt }));
  };

  const missedChatsCount = useMemo(() => {
    return conversations.filter((conversation) => conversation.unread_count > 0).length;
  }, [conversations]);

  const missedMessagesCount = useMemo(() => {
    return conversations.reduce((total, conversation) => total + conversation.unread_count, 0);
  }, [conversations]);

  const extractMatchIdFromMessage = (message: string): number | null => {
    const parsedPayload = parseChatPayload(message);
    const matchId = (parsedPayload?.payload as { match_id?: unknown } | undefined)?.match_id;
    return typeof matchId === 'number' ? matchId : null;
  };

  const loadMatchesForMessages = async (chatMessages: ChatMessage[]) => {
    const matchIds = Array.from(
      new Set(
        chatMessages
          .map((chatMessage) => extractMatchIdFromMessage(chatMessage.message))
          .filter((matchId): matchId is number => typeof matchId === 'number')
      )
    );

    if (matchIds.length === 0) {
      setMatchesById({});
      return;
    }

    const matchResponses = await Promise.all(
      matchIds.map(async (matchId) => {
        try {
          const match = await matchDataService.getMatch(matchId);
          return [matchId, match] as const;
        } catch {
          return null;
        }
      })
    );

    const nextMatchesById: Record<number, GameMatch> = {};
    for (const response of matchResponses) {
      if (!response) continue;
      const [matchId, match] = response;
      nextMatchesById[matchId] = match;
    }

    setMatchesById(nextMatchesById);
  };

  const loadConversation = async (friendId: number) => {
    try {
      const data = await chatService.getConversation(friendId);
      setMessages(data.messages);
      setSelectedChatUser(data.friend);
      await loadMatchesForMessages(data.messages);

      requestAnimationFrame(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        container.scrollTop = container.scrollHeight;
      });

      setConversations((current) =>
        current.some((conversation) => conversation.friend_id === friendId)
          ? current.map((conversation) =>
              conversation.friend_id === friendId
                ? {
                    ...conversation,
                    unread_count: 0,
                    latest_message: data.messages.length > 0
                      ? {
                          id: data.messages[data.messages.length - 1].id,
                          message: data.messages[data.messages.length - 1].message,
                          sender_id: data.messages[data.messages.length - 1].sender_id,
                          receiver_id: data.messages[data.messages.length - 1].receiver_id,
                          created_at: data.messages[data.messages.length - 1].created_at,
                        }
                      : conversation.latest_message,
                  }
                : conversation
            )
          : [
              {
                friend: data.friend,
                friend_id: friendId,
                latest_message: {
                  id: 0,
                  message: 'Start een gesprek',
                  sender_id: friendId,
                  receiver_id: friendId,
                  created_at: new Date().toISOString(),
                },
                unread_count: 0,
                updated_at: new Date().toISOString(),
              },
              ...current,
            ]
      );
    } catch {
      setError('Kon chatgesprek niet ophalen.');
    }
  };

  const loadBaseData = async () => {
    setLoading(true);
    setError('');

    try {
      const [nextConversations, nextFriends] = await Promise.all([
        chatService.getConversations(),
        socialService.getFriends(),
      ]);

      setConversations(nextConversations);
      setFriends(nextFriends);

      if (initialUserId && !selectedFriendId) {
        setSelectedFriendId(initialUserId);
        setMobileScreen('chat');
      }
    } catch {
      setError('Chatgegevens konden niet worden geladen.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedFriendId) {
      setMessages([]);
      return;
    }
    void loadConversation(selectedFriendId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFriendId]);

  useEffect(() => {
    if (!selectedFriendId) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
  }, [selectedFriendId, messages]);

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = messageInput.trim();
    if (!trimmed || !selectedFriendId) return;

    setSending(true);

    try {
      const sent = await chatService.sendMessage(selectedFriendId, trimmed);
      setMessages((current) => [...current, sent]);
      setMessageInput('');
      setSendError(''); // Reset error on success
      if (messageInputRef.current) {
        messageInputRef.current.style.height = '44px';
        messageInputRef.current.style.overflowY = 'hidden';
      }

      setConversations((current) => {
        const existing = current.find((conversation) => conversation.friend_id === selectedFriendId);
        const nextConversation = {
          friend: selectedFriend
            ? {
                id: selectedFriend.id,
                name: selectedFriend.name,
                profile_picture: selectedFriend.profile_picture,
              }
            : existing?.friend,
          friend_id: selectedFriendId,
          latest_message: {
            id: sent.id,
            message: sent.message,
            sender_id: sent.sender_id,
            receiver_id: sent.receiver_id,
            created_at: sent.created_at,
          },
          unread_count: 0,
          updated_at: sent.created_at,
        };

        if (!existing) {
          return [nextConversation as ChatConversation, ...current];
        }

        return [
          nextConversation as ChatConversation,
          ...current.filter((conversation) => conversation.friend_id !== selectedFriendId),
        ];
      });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Versturen is mislukt. Probeer opnieuw.';
      setSendError(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const openFriendChat = (friendId: number) => {
    setSelectedFriendId(friendId);
    const friend = friends.find((item) => item.id === friendId);
    if (friend) {
      setSelectedChatUser({ id: friend.id, name: friend.name, profile_picture: friend.profile_picture });
    }
    setMobileScreen('chat');
    setShowNewChatPicker(false);
    setFriendSearch('');
  };

  const openConversation = (friendId: number) => {
    const conversation = conversations.find((item) => item.friend_id === friendId);
    if (conversation) {
      setSelectedChatUser(conversation.friend);
    }
    setSelectedFriendId(friendId);
    setMobileScreen('chat');
  };

  const handleMessageInputChange = (value: string, element: HTMLTextAreaElement) => {
    setMessageInput(value);
    setSendError(''); // Reset error when user starts typing

    // Grow with content up to a comfortable max height.
    element.style.height = '0px';
    const nextHeight = Math.min(element.scrollHeight, 140);
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > 140 ? 'auto' : 'hidden';
  };

  const handleMessageInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  const openProfilePopup = () => {
    if (!selectedFriend) return;

    setProfilePopupUser(selectedFriend);
    setProfilePopupTab('profile');
  };

  const parseChatPayload = (message: string) => {
    if (message.startsWith('__MATCH__:')) {
      try {
        return { type: 'match_invite' as const, payload: JSON.parse(message.replace('__MATCH__:', '')) };
      } catch {
        return null;
      }
    }

    if (message.startsWith('__MATCH_RESULT__:')) {
      try {
        return { type: 'match_result' as const, payload: JSON.parse(message.replace('__MATCH_RESULT__:', '')) };
      } catch {
        return null;
      }
    }

    return null;
  };

  const getConversationPreviewMessage = (message: string) => {
    const parsedPayload = parseChatPayload(message);

    if (parsedPayload?.type === 'match_invite') {
      return 'Uitnodiging';
    }

    if (parsedPayload?.type === 'match_result') {
      return 'Uitslag gedeeld';
    }

    return message;
  };

  const refreshActiveConversation = async () => {
    if (selectedFriendId) {
      await loadConversation(selectedFriendId);
    }
  };

  const handleCreateMatchInvite = async () => {
    if (!selectedFriendId || !selectedFriend) return;

    setMatchActionLoading(true);
    try {
      await matchDataService.createMatch({
        sport_id: Number(matchForm.sport_id),
        opponent_id: selectedFriend.id,
        scheduled_at: matchForm.scheduled_at,
        location_name: matchForm.location_name || undefined,
        location_address: matchForm.location_address || undefined,
        location_city: matchForm.location_city || undefined,
        location_latitude: matchForm.location_latitude,
        location_longitude: matchForm.location_longitude,
        notes: matchForm.notes || undefined,
      });

      setShowMatchScheduler(false);
      setMatchForm({ sport_id: '', scheduled_at: '', location_name: '', location_address: '', location_city: '', location_latitude: undefined, location_longitude: undefined, notes: '' });
      setMatchDate('');
      setMatchTime('');
      await refreshActiveConversation();
    } catch {
      setError('Afspraak plannen is mislukt. Probeer opnieuw.');
    } finally {
      setMatchActionLoading(false);
    }
  };

  const handleMatchAction = async (matchId: number, action: 'accept' | 'decline' | 'confirm') => {
    setMatchActionLoading(true);
    setMatchActionTargetId(matchId);
    try {
      if (action === 'accept') {
        await matchDataService.acceptMatch(matchId);
      } else if (action === 'decline') {
        await matchDataService.declineMatch(matchId);
      } else {
        await matchDataService.confirmMatchResult(matchId);
        setShowMatchAd(true);
      }

      await refreshActiveConversation();
    } catch {
      setError('Actie op match is mislukt. Probeer opnieuw.');
    } finally {
      setMatchActionLoading(false);
      setMatchActionTargetId(null);
    }
  };

  return (
    <ProtectedRoute>
      <div className="h-dvh overflow-hidden overscroll-none bg-gradient-to-b from-emerald-50 via-white to-emerald-50">
        <main className="mx-auto h-full w-full max-w-6xl overflow-hidden px-0 pb-0 sm:px-4 sm:py-6">
          <div className="grid h-[calc(100dvh-3.6rem)] w-full overflow-hidden sm:h-[calc(100dvh-3rem)] sm:rounded-3xl sm:border sm:border-emerald-100 sm:bg-white sm:shadow-xl sm:shadow-emerald-100/40 sm:grid-cols-[350px_1fr]">
            <section className={`${mobileScreen === 'chat' ? 'hidden' : 'flex'} h-[calc(100dvh-3.6rem)] flex-col overflow-hidden bg-white sm:flex sm:h-auto sm:min-h-0 sm:border-r sm:border-emerald-100`}>
              <div className="sticky top-0 z-10 border-b border-emerald-200 bg-emerald-700 px-4 py-3 text-white">
                <h1 className="text-xl font-bold">Chats</h1>
                <p className="text-xs text-emerald-100">
                  {missedChatsCount > 0
                    ? `${missedChatsCount} gemiste chats • ${missedMessagesCount} ongelezen berichten`
                    : 'Recente inkomende en uitgaande berichten'}
                </p>
              </div>

              {loading && <p className="px-4 py-4 text-sm text-gray-500">Laden...</p>}
              {error && <p className="mx-4 mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

              <div className="flex-1 overflow-y-auto overscroll-contain bg-emerald-50/40 pb-4">
                {conversations.map((conversation) => {
                  const isSelected = selectedFriendId === conversation.friend_id;
                  const avatar = getUserProfileImageUrl({
                    ...conversation.friend,
                    email: '',
                    is_active: true,
                    is_admin: false,
                    is_admin_mode: false,
                  });

                  return (
                    <button
                      key={conversation.friend_id}
                      onClick={() => openConversation(conversation.friend_id)}
                      className={`flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors ${
                        isSelected ? 'bg-emerald-50' : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      {avatar ? (
                        <UserAvatar src={avatar} name={conversation.friend.name} size="md" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                          {getInitials(conversation.friend.name)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-gray-900">{conversation.friend.name}</p>
                          <p className="shrink-0 text-[11px] text-gray-500">{formatRelativeDate(conversation.updated_at)}</p>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-gray-600">{getConversationPreviewMessage(conversation.latest_message.message)}</p>
                          {conversation.unread_count > 0 && (
                            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              {conversation.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {!loading && conversations.length === 0 && (
                  <p className="mx-4 mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
                    Nog geen chats. Gebruik het plusje om een gesprek te starten met vrienden.
                  </p>
                )}

                {!loading && missedChatsCount > 0 && (
                  <p className="mx-4 mt-3 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-700">
                    Je hebt {missedChatsCount} chat{missedChatsCount === 1 ? '' : 's'} gemist.
                  </p>
                )}
              </div>
            </section>

            <section className={`${mobileScreen === 'list' ? 'hidden' : 'flex'} h-[calc(100dvh-3.6rem)] flex-col overflow-hidden bg-emerald-50 sm:flex sm:h-auto sm:min-h-0`}>
              {selectedFriend ? (
                <>
                  <div className="flex items-center gap-3 border-b border-emerald-200 bg-emerald-700 px-4 py-3 text-white">
                    <button
                      onClick={() => setMobileScreen('list')}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-lg sm:hidden"
                      aria-label="Terug"
                    >
                      ←
                    </button>
                    <button onClick={openProfilePopup} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <UserAvatar src={getUserProfileImageUrl(selectedFriend)} name={selectedFriend.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{selectedFriend.name}</p>
                        <p className="text-[11px] text-emerald-100">Speler</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowMatchScheduler(true)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                      aria-label="Afspraak plannen"
                      title="Afspraak plannen"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
                      </svg>
                    </button>
                  </div>

                  {showMatchAd && (
                    <div className="mx-4 mt-4 rounded-3xl border border-amber-200 bg-gradient-to-r from-yellow-50 via-white to-sky-50 p-4 shadow-sm sm:mx-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-amber-600">Advertentie</p>
                          <p className="mt-2 text-base font-semibold text-gray-900">Ontdek FIFA World Cup 2026</p>
                          <p className="mt-1 text-sm text-gray-600">Klik hier om naar de officiële FIFA 2026-pagina te gaan.</p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <a
                            href={MATCH_AD_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-800"
                          >
                            Naar FIFA 2026
                          </a>
                          <button
                            type="button"
                            onClick={() => setShowMatchAd(false)}
                            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Sluiten
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesContainerRef} className="relative flex-1 overflow-y-auto overscroll-contain bg-emerald-50 px-3 py-4 sm:px-6">
                    <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#9fd5b9 0.7px, transparent 0.7px)', backgroundSize: '14px 14px' }} />
                    <div className="relative space-y-2">
                      {messages.map((chatMessage) => {
                        const isOwnMessage = chatMessage.sender_id === user?.id;
                        const parsedPayload = parseChatPayload(chatMessage.message);

                        if (parsedPayload?.type === 'match_invite') {
                          const payload = parsedPayload.payload as {
                            match_id: number;
                            sport_id: number;
                            scheduled_at?: string;
                            location_name?: string;
                            location_city?: string;
                            notes?: string;
                            initiator_name?: string;
                          };
                          const sportName = SPORTS.find((sport) => sport.id === payload.sport_id)?.name ?? 'Match';
                          const isIncomingInvite = chatMessage.receiver_id === user?.id;
                          const match = matchesById[payload.match_id];
                          const matchStatus = match?.status;
                          const invitePending = matchStatus ? matchStatus === 'pending' : true;
                          const isOrganizer = (match?.initiator_id ?? chatMessage.sender_id) === user?.id;
                          const inviteStatusLabel =
                            matchStatus === 'accepted'
                              ? 'Geaccepteerd'
                              : matchStatus === 'declined'
                                ? 'Afgewezen'
                                : matchStatus === 'cancelled'
                                  ? 'Geannuleerd'
                                  : matchStatus === 'completed'
                                    ? 'Voltooid'
                                    : isIncomingInvite
                                      ? 'Nieuw'
                                      : 'Verstuurd';
                          const canRespondToInvite =
                            isIncomingInvite &&
                            invitePending &&
                            chatMessage.receiver_id === user?.id &&
                            chatMessage.sender_id !== user?.id;

                          return (
                            <div key={chatMessage.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                              <div className="w-full max-w-[88%] rounded-3xl border border-emerald-200 bg-white p-4 shadow-sm sm:max-w-[72%]">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Afspraak</p>
                                    <p className="mt-1 text-base font-semibold text-gray-900">{sportName}</p>
                                    <p className="text-sm text-gray-600">
                                      {payload.scheduled_at
                                        ? new Date(payload.scheduled_at).toLocaleString('nl-NL', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false,
                                          })
                                        : 'Datum volgt'}
                                    </p>
                                    <p className="mt-1 text-sm text-gray-500">
                                      {[payload.location_name, payload.location_city].filter(Boolean).join(' • ') || 'Locatie volgt'}
                                    </p>
                                    {payload.notes && <p className="mt-2 text-sm text-gray-700">{payload.notes}</p>}
                                  </div>
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                    {inviteStatusLabel}
                                  </span>
                                </div>

                                <div className="mt-4 flex gap-2">
                                  {canRespondToInvite && (
                                    <>
                                      <button
                                        onClick={() => handleMatchAction(payload.match_id, 'accept')}
                                        disabled={matchActionLoading && matchActionTargetId === payload.match_id}
                                        className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                                      >
                                        Accepteren
                                      </button>
                                      <button
                                        onClick={() => handleMatchAction(payload.match_id, 'decline')}
                                        disabled={matchActionLoading && matchActionTargetId === payload.match_id}
                                        className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
                                      >
                                        Afwijzen
                                      </button>
                                    </>
                                  )}

                                  {!canRespondToInvite && invitePending && !isIncomingInvite && (
                                    <p className="text-xs text-gray-500">Deze uitnodiging staat in je gesprek en wordt later zichtbaar op de matchpagina.</p>
                                  )}

                                  {!invitePending && matchStatus === 'accepted' && (
                                    <p className="text-xs text-gray-600">
                                      {isOrganizer
                                        ? 'Afspraak geaccepteerd. Jij bent organisator, vul na de wedstrijd de uitslag in op de matches-pagina.'
                                        : 'Afspraak geaccepteerd. De organisator vult na de wedstrijd de uitslag in op de matches-pagina.'}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (parsedPayload?.type === 'match_result') {
                          const payload = parsedPayload.payload as {
                            match_id: number;
                            initiator_score: number;
                            opponent_score: number;
                            reported_by: number;
                          };
                          const match = matchesById[payload.match_id];
                          const matchStatus = match?.status;
                          const isResultConfirmed = matchStatus === 'completed';
                          const isReportedByOther = payload.reported_by !== user?.id;
                          const canConfirmResult = isReportedByOther && !isResultConfirmed;

                          return (
                            <div key={chatMessage.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                              <div className="w-full max-w-[88%] rounded-3xl border border-blue-200 bg-blue-50 p-4 shadow-sm sm:max-w-[72%]">
                                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                  {isResultConfirmed
                                    ? 'Resultaat bevestigd'
                                    : canConfirmResult
                                      ? 'Resultaat klaar om te bevestigen'
                                      : 'Wachten op bevestiging van tegenstander'}
                                </p>
                                <div className="mt-2 flex items-end justify-between gap-3">
                                  <div>
                                    <p className="text-sm text-gray-600">Uitslag</p>
                                    <p className="text-2xl font-bold text-gray-900">{payload.initiator_score} - {payload.opponent_score}</p>
                                  </div>
                                  {canConfirmResult && (
                                    <button
                                      onClick={() => handleMatchAction(payload.match_id, 'confirm')}
                                      disabled={matchActionLoading && matchActionTargetId === payload.match_id}
                                      className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                                    >
                                      Bevestigen
                                    </button>
                                  )}
                                </div>

                                {!canConfirmResult && !isResultConfirmed && !isReportedByOther && (
                                  <p className="mt-2 text-xs text-gray-600">Je tegenstander moet deze uitslag nog bevestigen.</p>
                                )}

                                {isResultConfirmed && (
                                  <p className="mt-2 text-xs text-gray-600">Deze uitslag is bevestigd door beide spelers.</p>
                                )}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={chatMessage.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[86%] rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[72%] ${
                                isOwnMessage
                                  ? 'rounded-br-md bg-emerald-200 text-emerald-950'
                                  : 'rounded-bl-md bg-white text-gray-800 border border-emerald-100'
                              }`}
                            >
                              <p className="break-words">{chatMessage.message}</p>
                              <p className="mt-1 text-right text-[11px] text-gray-500">{formatRelativeDate(chatMessage.created_at)}</p>
                            </div>
                          </div>
                        );
                      })}

                      {messages.length === 0 && (
                        <p className="rounded-xl bg-white/80 p-3 text-sm text-gray-600">Nog geen berichten in dit gesprek.</p>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleSendMessage} className="sticky bottom-0 shrink-0 border-t border-emerald-100 bg-white px-3 py-2">
                    {sendError && <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{sendError}</p>}
                    <div className="flex items-end gap-2">
                      <textarea
                        ref={messageInputRef}
                        value={messageInput}
                        onChange={(event) => handleMessageInputChange(event.target.value, event.target)}
                        onKeyDown={handleMessageInputKeyDown}
                        placeholder="Typ een bericht"
                        rows={1}
                        className="max-h-[140px] min-h-[44px] w-full resize-none overflow-y-hidden rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-5 outline-none ring-emerald-200 focus:ring"
                      />
                      <button
                        type="submit"
                        disabled={sending}
                        className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {sending ? '...' : 'Versturen'}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-gray-600">
                  Selecteer een chat of start een nieuw gesprek.
                </div>
              )}
            </section>
          </div>
        </main>

        {mobileScreen === 'list' && (
          <button
            onClick={() => setShowNewChatPicker(true)}
            className="fixed bottom-24 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-3xl text-white shadow-lg shadow-emerald-800/20 transition-colors hover:bg-emerald-700"
            aria-label="Nieuwe chat"
            title="Nieuwe chat"
          >
            +
          </button>
        )}

        {showNewChatPicker && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4">
            <div className="flex h-[78dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-auto sm:max-h-[80dvh] sm:max-w-md sm:rounded-2xl">
              <div className="border-b border-emerald-100 bg-white px-4 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold text-gray-900">Nieuwe chat</p>
                  <button
                    onClick={() => {
                      setShowNewChatPicker(false);
                      setFriendSearch('');
                    }}
                    className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
                  >
                    Sluiten
                  </button>
                </div>

                <p className="mt-1 text-sm text-gray-600">Kies een vriend om een chat te starten.</p>

                <input
                  value={friendSearch}
                  onChange={(event) => setFriendSearch(event.target.value)}
                  placeholder="Zoek op naam of stad"
                  className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                />
              </div>

              <div className="flex-1 overflow-y-auto bg-emerald-50/40 px-4 py-3">
                <div className="space-y-2">
                  {filteredFriends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => openFriendChat(friend.id)}
                      className="w-full rounded-xl border border-gray-100 bg-white p-3 text-left transition-colors hover:bg-emerald-50"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar src={getUserProfileImageUrl(friend)} name={friend.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{friend.name}</p>
                          <p className="truncate text-xs text-gray-500">{friend.city ?? 'Onbekende stad'}</p>
                        </div>
                      </div>
                    </button>
                  ))}

                  {filteredFriends.length === 0 && (
                    <p className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
                      Geen vrienden gevonden met deze zoekterm.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showMatchScheduler && selectedFriend && (
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
            onClick={() => setShowMatchScheduler(false)}
          >
            <div
              className="w-full max-h-[92dvh] overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-emerald-100 px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Afspraak plannen</p>
                    <p className="text-sm text-gray-500">Stuur een duidelijke match-uitnodiging in de chat.</p>
                  </div>
                  <button
                    onClick={() => setShowMatchScheduler(false)}
                    className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
                  >
                    Sluiten
                  </button>
                </div>
              </div>

              <div className="max-h-[calc(92dvh-10.5rem)] space-y-3 overflow-y-auto px-4 py-4 sm:max-h-[65dvh] sm:px-5 sm:py-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Sport</label>
                  <select
                    value={matchForm.sport_id}
                    onChange={(event) => setMatchForm((current) => ({ ...current, sport_id: event.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                  >
                    <option value="">Kies een sport</option>
                    {SPORTS.map((sport) => (
                      <option key={sport.id} value={sport.id}>
                        {sport.emoji} {sport.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Datum & tijd</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={matchDate}
                        onChange={(event) => {
                          const nextDate = event.target.value;
                          setMatchDate(nextDate);
                          updateScheduledAt(nextDate, matchTime);
                        }}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                      />
                      <select
                        value={matchTime}
                        onChange={(event) => {
                          const nextTime = event.target.value;
                          setMatchTime(nextTime);
                          updateScheduledAt(matchDate, nextTime);
                        }}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                      >
                        <option value="">Tijd (24H)</option>
                        {timeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Locatie naam</label>
                    <input
                      value={matchForm.location_name}
                      onChange={(event) => setMatchForm((current) => ({ ...current, location_name: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Adres / velden</label>
                    <input
                      value={matchForm.location_address}
                      onChange={(event) => setMatchForm((current) => ({ ...current, location_address: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Stad</label>
                    <input
                      value={matchForm.location_city}
                      onChange={(event) => setMatchForm((current) => ({ ...current, location_city: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Opmerking</label>
                  <textarea
                    value={matchForm.notes}
                    onChange={(event) => setMatchForm((current) => ({ ...current, notes: event.target.value }))}
                    className="h-24 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Locatie op kaart</label>
                  <LocationMap
                    lat={matchForm.location_latitude}
                    lng={matchForm.location_longitude}
                    onLocationSelect={(lat, lng, data: LocationData) => {
                      setMatchForm((current) => ({
                        ...current,
                        location_latitude: lat,
                        location_longitude: lng,
                        location_city: current.location_city || data.city || current.location_city,
                        location_address: current.location_address || data.address || current.location_address,
                      }));
                    }}
                  />
                  {matchForm.location_latitude && (
                    <p className="mt-1 text-xs text-emerald-700">
                      Locatie geselecteerd ({matchForm.location_latitude.toFixed(5)}, {matchForm.location_longitude?.toFixed(5)})
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-emerald-100 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 sm:px-5 sm:pb-5">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    onClick={handleCreateMatchInvite}
                    disabled={matchActionLoading || !matchForm.sport_id || !matchForm.scheduled_at}
                    className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {matchActionLoading ? 'Versturen...' : 'Bevestigen'}
                  </button>
                  <button
                    onClick={() => setShowMatchScheduler(false)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {profilePopupUser && (
          <UserProfilePopup
            user={profilePopupUser}
            isOpen={Boolean(profilePopupUser)}
            onClose={() => setProfilePopupUser(null)}
            activeTab={profilePopupTab}
            onTabChange={setProfilePopupTab}
          />
        )}

        <Navbar />
      </div>
    </ProtectedRoute>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={<main className="flex min-h-screen items-center justify-center text-sm text-gray-500">Laden...</main>}
    >
      <ChatPageContent />
    </Suspense>
  );
}
