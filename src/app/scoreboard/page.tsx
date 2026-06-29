'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/layout/Navbar';
import ProtectedRoute from '../../components/layout/ProtectedRoute';
import UserAvatarClickable from '../../components/ui/UserAvatarClickable';
import { matchDataService, ScoreboardRow } from '@/lib/matchData';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { SPORTS } from '@/constants/sports';

export default function ScoreboardPage() {
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('alle sporten');
  const [cityFilter, setCityFilter] = useState('Alle steden');

  useEffect(() => {
    matchDataService
      .getCities()
      .then(setCityOptions)
      .catch(() => setCityOptions([]));
  }, []);

  const sportId = useMemo(() => {
    if (sportFilter === 'alle sporten') return undefined;
    return SPORTS.find((sport) => sport.name === sportFilter)?.id;
  }, [sportFilter]);

  const fetchPage = useCallback(
    (page: number) =>
      matchDataService.getScoreboard({
        page,
        per_page: 10,
        q: search.trim() || undefined,
        city: cityFilter === 'Alle steden' ? undefined : cityFilter,
        sport_id: sportId,
      }),
    [search, cityFilter, sportId]
  );

  const resetKey = JSON.stringify({ search: search.trim(), cityFilter, sportId });

  const { items: rows, initialLoading, loading, hasMore, error, sentinelRef } = useInfiniteScroll<ScoreboardRow>(fetchPage, resetKey);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <main className="mx-auto w-full max-w-4xl px-4 py-6 pb-28 sm:px-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-emerald-800">Ranglijst</h1>
            <p className="mt-1 text-sm text-gray-600">Top spelers op basis van ELO.</p>
          </div>

          {/* Controls Section */}
          <section className="mb-6 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <button
              onClick={() => setShowFilters((current) => !current)}
              className="flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
              aria-expanded={showFilters}
              aria-controls="scoreboard-filters"
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
              <div id="scoreboard-filters" className="overflow-hidden">
                <div className="grid gap-3 pt-1 md:grid-cols-2">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Zoek spelers..."
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                  />
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
                </div>
              </div>
            </div>
          </section>

          {initialLoading && <p className="text-center text-sm text-gray-500">Laden...</p>}
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {/* Rankings List */}
          {!initialLoading && !error && (
            <section className="mt-4 space-y-2 divide-y-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              {rows.map((row) => (
                <article key={`${row.user.id}-${row.sport?.id ?? 0}`} className="flex items-center justify-between px-4 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-500">#{row.rank}</span>
                    </div>
                    <UserAvatarClickable user={row.user} size="sm" />
                    <div>
                      <p className="font-semibold text-gray-900">{row.user.name}</p>
                      <p className="text-xs text-gray-500">
                        {row.matches_played} {row.matches_played === 1 ? 'wedstrijd' : 'wedstrijden'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-600">{row.elo_rating}</p>
                    <p className="text-xs text-gray-500">ELO</p>
                  </div>
                </article>
              ))}

              {rows.length === 0 && <p className="px-4 py-8 text-center text-sm text-gray-500">Geen spelers gevonden.</p>}
            </section>
          )}

          <div ref={sentinelRef} aria-hidden="true" />
          {loading && !initialLoading && <p className="py-3 text-center text-sm text-gray-500">Meer laden...</p>}
          {!hasMore && rows.length > 0 && <p className="py-3 text-center text-xs text-gray-400">Einde van de ranglijst.</p>}
        </main>

        <Navbar />
      </div>
    </ProtectedRoute>
  );
}
