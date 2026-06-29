'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/layout/Navbar';
import ProtectedRoute from '../../components/layout/ProtectedRoute';
import UserAvatarClickable from '../../components/ui/UserAvatarClickable';
import UserProfilePopup from '@/components/ui/UserProfilePopup';
import VideoAdModal from '@/components/ads/VideoAdModal';
import { matchDataService } from '@/lib/matchData';
import { advertisementService } from '@/lib/advertisement';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useAuth } from '@/hooks/useAuth';
import { User, UserSport } from '@/types';
import { SPORTS } from '@/constants/sports';
import { skillLevelLabel } from '@/constants/skillLevels';

const DISTANCE_OPTIONS = [5, 10, 25, 50, 100];

const AD_SLOT = 'find_players_message';

export default function FindPlayersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState('Alle steden');
  const [sportFilter, setSportFilter] = useState('alle sporten');
  const [skillFilter, setSkillFilter] = useState('alle');
  const [distanceFilter, setDistanceFilter] = useState('alle');
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<User | null>(null);
  const [profileTab, setProfileTab] = useState<'profile' | 'history' | 'elo'>('profile');
  const [showAdModal, setShowAdModal] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [adHasAd, setAdHasAd] = useState(false);

  const hasKnownCity = Boolean(user?.city && user.city.trim().length > 0);

  useEffect(() => {
    matchDataService
      .getCities()
      .then(setCityOptions)
      .catch(() => setCityOptions([]));
  }, []);

  useEffect(() => {
    advertisementService
      .getSlotConfig(AD_SLOT)
      .then((config) => setAdHasAd(config.has_ad))
      .catch(() => setAdHasAd(false));
  }, []);

  const sportId = useMemo(() => {
    if (sportFilter === 'alle sporten') return undefined;
    return SPORTS.find((sport) => sport.name === sportFilter)?.id;
  }, [sportFilter]);

  const fetchPage = useCallback(
    (page: number) =>
      matchDataService.getPlayers({
        page,
        per_page: 10,
        q: search.trim() || undefined,
        city: cityFilter === 'Alle steden' ? undefined : cityFilter,
        sport_id: sportId,
        skill_level: skillFilter === 'alle' ? undefined : skillFilter,
        max_distance: distanceFilter === 'alle' ? undefined : Number(distanceFilter),
      }),
    [search, cityFilter, sportId, skillFilter, distanceFilter]
  );

  const resetKey = JSON.stringify({ search: search.trim(), cityFilter, sportId, skillFilter, distanceFilter });

  const { items: players, initialLoading, loading, hasMore, error, sentinelRef } = useInfiniteScroll<User>(fetchPage, resetKey);

  const playerSportCards = useMemo(() => {
    const cards: { player: User; userSport: UserSport }[] = [];

    players.forEach((player) => {
      const activeSports = player.user_sports?.filter((sport) => sport.is_active) ?? [];
      activeSports.forEach((userSport) => {
        if (sportFilter !== 'alle sporten' && userSport.sport?.name !== sportFilter) {
          return;
        }
        if (skillFilter !== 'alle' && userSport.skill_level !== skillFilter) {
          return;
        }
        cards.push({ player, userSport });
      });
    });

    return cards;
  }, [players, sportFilter, skillFilter]);

  const handleMessage = async (playerId: number) => {
    setActionError('');
    if (adHasAd) {
      setPendingUserId(playerId);
      setShowAdModal(true);
    } else {
      router.push(`/chat?userId=${playerId}`);
    }
  };

  const handleAdSkip = () => {
    setShowAdModal(false);
    if (pendingUserId) {
      router.push(`/chat?userId=${pendingUserId}`);
      setPendingUserId(null);
    }
  };

  const openProfile = (player: User) => {
    setSelectedProfileUser(player);
    setProfileTab('profile');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <main className="mx-auto w-full max-w-4xl px-4 py-6 pb-28 sm:px-6">
          <h1 className="text-2xl font-bold text-emerald-800">Spelers zoeken</h1>
          <p className="mt-1 text-sm text-gray-600">Vind beschikbare matches en filter op niveau, plaats, afstand en tijd.</p>

          <section className="mt-5 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <button
              onClick={() => setShowFilters((current) => !current)}
              className="flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
              aria-expanded={showFilters}
              aria-controls="find-players-filters"
            >
              <span>Filteren</span>
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className={`h-5 w-5 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`}
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8l5 5 5-5" />
              </svg>
            </button>

            <div className={`grid transition-all duration-300 ease-in-out ${showFilters ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div id="find-players-filters" className="overflow-hidden">
                <div className="grid gap-3 pt-1 md:grid-cols-3">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Zoek speler"
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                  />

                  <select
                    value={cityFilter}
                    onChange={(event) => setCityFilter(event.target.value)}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                  >
                    <option>Alle steden</option>
                    {cityOptions.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>

                  <select
                    value={sportFilter}
                    onChange={(event) => setSportFilter(event.target.value)}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                  >
                    <option value="alle sporten">Alle sporten</option>
                    {SPORTS.map((sport) => (
                      <option key={sport.id} value={sport.name}>
                        {sport.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={skillFilter}
                    onChange={(event) => setSkillFilter(event.target.value)}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                  >
                    <option value="alle">Alle niveaus</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Gemiddeld</option>
                    <option value="advanced">Gevorderd</option>
                  </select>

                  <div>
                    <select
                      value={distanceFilter}
                      onChange={(event) => setDistanceFilter(event.target.value)}
                      disabled={!hasKnownCity}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="alle">Alle afstanden</option>
                      {DISTANCE_OPTIONS.map((km) => (
                        <option key={km} value={km}>
                          Binnen {km} km
                        </option>
                      ))}
                    </select>
                    {!hasKnownCity && (
                      <p className="mt-1 text-[11px] text-gray-400">Stel je stad in je profiel in om op afstand te filteren.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {initialLoading && <p className="mt-4 text-sm text-gray-500">Laden...</p>}
          {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {actionError && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>}

          <section className="mt-4 space-y-3">
            {playerSportCards.map(({ player, userSport }) => {
              const sportMeta = SPORTS.find((s) => s.name === userSport.sport?.name);
              const winRate = userSport.matches_played > 0
                ? Math.round((userSport.matches_won / userSport.matches_played) * 100)
                : 0;

              return (
                <article
                  key={`${player.id}-${userSport.id}`}
                  onClick={() => openProfile(player)}
                  className="group cursor-pointer overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-100/80"
                >
                  <div className="border-b border-emerald-50 bg-gradient-to-r from-emerald-50/80 via-white to-white px-4 py-3 sm:px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <UserAvatarClickable user={player} size="md" onClick={() => openProfile(player)} />
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-gray-900 sm:text-lg">{player.name}</p>
                          <p className="mt-0.5 truncate text-xs text-gray-500 sm:text-sm">
                            📍 {player.city ?? 'Onbekende stad'}
                            {typeof player.distance_km === 'number' && (
                              <span className="ml-1 text-emerald-600">· ~{player.distance_km} km</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${player.is_friend ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        {player.is_friend ? 'Vriend' : 'Speler'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 px-4 py-4 sm:px-5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5">
                      <span className="text-base">{sportMeta?.emoji ?? '🏅'}</span>
                      <span className="text-sm font-semibold text-emerald-700">{userSport.sport?.name ?? 'Sport'}</span>
                      <span className="text-xs text-emerald-500">•</span>
                      <span className="text-xs font-medium text-emerald-700">{skillLevelLabel(userSport.skill_level)}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-gray-100 bg-gray-50 px-2 py-2 text-center">
                        <p className="text-[11px] text-gray-500">ELO</p>
                        <p className="mt-0.5 text-sm font-bold text-gray-900">{userSport.elo_rating}</p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50 px-2 py-2 text-center">
                        <p className="text-[11px] text-gray-500">Wedstrijden</p>
                        <p className="mt-0.5 text-sm font-bold text-gray-900">{userSport.matches_played}</p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50 px-2 py-2 text-center">
                        <p className="text-[11px] text-gray-500">Winst%</p>
                        <p className="mt-0.5 text-sm font-bold text-gray-900">{winRate}%</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-500">Start direct een gesprek</p>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleMessage(player.id);
                        }}
                        className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700"
                      >
                        Bericht
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {!initialLoading && !error && playerSportCards.length === 0 && (
              <p className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">Geen spelers gevonden met deze filters.</p>
            )}

            <div ref={sentinelRef} aria-hidden="true" />
            {loading && !initialLoading && <p className="py-3 text-center text-sm text-gray-500">Meer laden...</p>}
            {!hasMore && players.length > 0 && <p className="py-3 text-center text-xs text-gray-400">Je hebt alle spelers gezien.</p>}
          </section>

          {selectedProfileUser && (
            <UserProfilePopup
              user={selectedProfileUser}
              isOpen={Boolean(selectedProfileUser)}
              onClose={() => setSelectedProfileUser(null)}
              activeTab={profileTab}
              onTabChange={setProfileTab}
            />
          )}

        <VideoAdModal
          isOpen={showAdModal}
          onClose={() => setShowAdModal(false)}
          onSkip={handleAdSkip}
          slot="find_players_message"
        />
        </main>

        <Navbar />
      </div>
    </ProtectedRoute>
  );
}
