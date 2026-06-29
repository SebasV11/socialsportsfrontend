'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import UserAvatar from './UserAvatar';
import { getUserProfileImageUrl } from '@/lib/profile';
import { socialService } from '@/lib/social';
import { advertisementService } from '@/lib/advertisement';
import VideoAdModal from '@/components/ads/VideoAdModal';
import { skillLevelLabel } from '@/constants/skillLevels';

const AD_SLOT = 'friend_request';

interface UserProfilePopupProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

type TabType = 'profile' | 'history' | 'elo';

export default function UserProfilePopup({ user, isOpen, onClose, activeTab, onTabChange }: UserProfilePopupProps) {
  const router = useRouter();
  const popupRef = useRef<HTMLDivElement>(null);
  const [requestState, setRequestState] = useState<'none' | 'sent' | 'received' | 'friend'>(
    user.is_friend ? 'friend' : user.has_pending_friend_request_received ? 'received' : user.has_pending_friend_request_sent ? 'sent' : 'none'
  );
  const [busy, setBusy] = useState(false);
  const [showAd, setShowAd] = useState(false);

  useEffect(() => {
    setRequestState(
      user.is_friend ? 'friend' : user.has_pending_friend_request_received ? 'received' : user.has_pending_friend_request_sent ? 'sent' : 'none'
    );
  }, [user]);

  const friendActionLabel = useMemo(() => {
    if (requestState === 'friend') return 'Jullie zijn vrienden';
    if (requestState === 'sent') return 'Verzoek verzonden';
    if (requestState === 'received') return 'Accepteer vriendschapsverzoek';
    return 'Voeg toe als vriend';
  }, [requestState]);

  const friendActionHint = useMemo(() => {
    if (requestState === 'friend') return 'Vriendschap verwijderen';
    if (requestState === 'sent') return 'Wachten op reactie';
    if (requestState === 'received') return 'Dit verzoek staat op jouw profiel';
    return 'Verstuur een verzoek';
  }, [requestState]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscapeKey);
        document.body.style.overflow = 'auto';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleMessage = () => {
    onClose();
    router.push(`/chat?userId=${user.id}`);
  };

  const handleFriendAction = async () => {
    if (busy || requestState === 'sent') {
      return;
    }

    setBusy(true);
    try {
      if (requestState === 'friend') {
        await socialService.removeFriend(user.id);
        setRequestState('none');
      } else if (requestState === 'received') {
        await socialService.acceptFriendRequest(user.id);
        setRequestState('friend');
      } else {
        await socialService.sendFriendRequest(user.id);
        setRequestState('sent');
        // Verse check zodat een net geüploade advertentie ook getoond wordt.
        try {
          const config = await advertisementService.getSlotConfig(AD_SLOT);
          if (config.has_ad) setShowAd(true);
        } catch {
          // Geen advertentie tonen als de config niet opgehaald kan worden.
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Blur overlay without opacity */}
      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-lg transition-opacity duration-200"
        onClick={onClose}
      >
        {/* Centered modal - smaller with auto margins */}
        <div
          ref={popupRef}
          className="w-full max-w-sm rounded-3xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="border-b border-emerald-50 px-6 py-4">
          <div className="flex items-center gap-4">
            <UserAvatar src={getUserProfileImageUrl(user)} name={user.name} size="md" />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-500">{user.city ?? 'Onbekende stad'}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-emerald-50">
          <button
            onClick={() => onTabChange('profile')}
            className={`flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'border-b-2 border-emerald-600 text-emerald-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            👤 Profiel
          </button>
          <button
            onClick={() => onTabChange('history')}
            className={`flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'border-b-2 border-emerald-600 text-emerald-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 Wedstrijdgeschiedenis
          </button>
          <button
            onClick={() => onTabChange('elo')}
            className={`flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${
              activeTab === 'elo'
                ? 'border-b-2 border-emerald-600 text-emerald-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🏆 Ranglijst
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500">BIO</p>
                <p className="mt-1 text-sm text-gray-700">{user.bio || 'Geen bio ingevuld'}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500">SPORTEN</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {user.user_sports && user.user_sports.length > 0 ? (
                    user.user_sports.map((sport) => (
                      <span key={sport.id} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                        {sport.sport?.name ?? 'Sport'} · {skillLevelLabel(sport.skill_level)}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Geen sporten ingevuld</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <p className="text-sm text-gray-600">📊 Wedstrijdgeschiedenis voor {user.name} wordt hier weergegeven</p>
              </div>
              <p className="text-xs text-gray-500">
                Totaal wedstrijden gespeeld: <span className="font-semibold text-gray-700">-</span>
              </p>
            </div>
          )}

          {activeTab === 'elo' && (
            <div className="space-y-4">
              {user.user_sports && user.user_sports.length > 0 ? (
                <div className="space-y-3">
                  {user.user_sports.map((userSport) => (
                    <div key={userSport.id} className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{userSport.sport?.name ?? 'Sport'}</p>
                          <p className="text-xs text-gray-600">ELO-rating</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-emerald-700">{userSport.elo_rating ?? 0}</p>
                          <p className="text-xs text-gray-600">{skillLevelLabel(userSport.skill_level)}</p>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-gray-600">
                        <p>Gewonnen: {userSport.matches_won ?? 0} | Verloren: {userSport.matches_lost ?? 0} | Gelijkspel: {userSport.matches_draw ?? 0}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                  <p className="text-sm text-gray-600">Geen scores beschikbaar</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-emerald-50 px-6 py-4">
          <div className="mb-2 grid grid-cols-1 gap-2">
            <button
              onClick={handleMessage}
              className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              Bericht sturen
            </button>

            <button
              onClick={handleFriendAction}
              disabled={busy || requestState === 'sent'}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Bezig...' : friendActionLabel}
            </button>
            <p className="text-center text-[11px] text-gray-500">{friendActionHint}</p>
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Sluiten
          </button>
        </div>
        </div>
      </div>

      <VideoAdModal
        isOpen={showAd}
        onClose={() => setShowAd(false)}
        onSkip={() => setShowAd(false)}
        slot={AD_SLOT}
      />
    </>
  );
}
