'use client';

import { useCallback, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import UserAvatarClickable from '@/components/ui/UserAvatarClickable';
import LocationMap from '@/components/ui/LocationMap';
import { useAuth } from '@/hooks/useAuth';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { matchDataService } from '@/lib/matchData';
import { GameMatch } from '@/types';

type Tab = 'upcoming' | 'history';

export default function MatchesPage() {
  const { user } = useAuth();
  const MATCH_AD_URL = 'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026';
  const [tab, setTab] = useState<Tab>('upcoming');
  const [activeMatch, setActiveMatch] = useState<GameMatch | null>(null);
  const [initiatorScore, setInitiatorScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [showMatchAd, setShowMatchAd] = useState(false);

  const fetchPage = useCallback(
    (page: number) =>
      tab === 'upcoming'
        ? matchDataService.getMatches({ scope: 'upcoming', page, per_page: 10 })
        : matchDataService.getHistory({ page, per_page: 10 }),
    [tab]
  );

  const { items: matches, initialLoading, loading, hasMore, error, sentinelRef, reload } = useInfiniteScroll<GameMatch>(fetchPage, tab);

  const isMatchOwner = (match: GameMatch) => match.initiator_id === user?.id;

  const openResultModal = (match: GameMatch) => {
    setActiveMatch(match);
    setInitiatorScore(match.result?.initiator_score?.toString() ?? '');
    setOpponentScore(match.result?.opponent_score?.toString() ?? '');
  };

  const handleAction = async (match: GameMatch, action: 'accept' | 'decline' | 'cancel') => {
    setActionLoadingId(match.id);
    try {
      if (action === 'accept') {
        await matchDataService.acceptMatch(match.id);
      } else if (action === 'decline') {
        await matchDataService.declineMatch(match.id);
      } else {
        await matchDataService.cancelMatch(match.id);
      }

      reload();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSubmitResult = async () => {
    if (!activeMatch) return;

    setActionLoadingId(activeMatch.id);
    try {
      await matchDataService.reportMatchResult(activeMatch.id, {
        initiator_score: Number(initiatorScore),
        opponent_score: Number(opponentScore),
      });

      setActiveMatch(null);
      setInitiatorScore('');
      setOpponentScore('');
      setShowMatchAd(true);
      reload();
    } finally {
      setActionLoadingId(null);
    }
  };

  const sportEmoji = (name?: string) => {
    const map: Record<string, string> = { Voetbal: '⚽', Padel: '🎾', Tennis: '🎾', Basketbal: '🏀', Golf: '⛳' };
    return map[name ?? ''] ?? '🏅';
  };

  const statusLabel = (status?: string) => {
    const map: Record<string, string> = {
      pending: 'In afwachting',
      accepted: 'Geaccepteerd',
      completed: 'Voltooid',
      cancelled: 'Geannuleerd',
      declined: 'Afgewezen',
    };
    return map[status ?? ''] ?? status ?? '';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50">
        <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-28 sm:px-6">
          <div className="mb-5 space-y-3">
            <div>
              <h1 className="text-2xl font-bold text-emerald-800">Wedstrijden</h1>
              <p className="mt-1 text-sm text-gray-600">Plan, beheer en bekijk je komende en gespeelde wedstrijden.</p>
            </div>

            {showMatchAd && (
              <div className="rounded-3xl border border-amber-200 bg-gradient-to-r from-yellow-50 via-white to-sky-50 p-4 shadow-sm">
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

            <div className="flex rounded-2xl border border-emerald-100 bg-white p-1 shadow-sm">
              <button
                onClick={() => setTab('upcoming')}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${tab === 'upcoming' ? 'bg-emerald-600 text-white' : 'text-gray-600'}`}
              >
                Aankomend
              </button>
              <button
                onClick={() => setTab('history')}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${tab === 'history' ? 'bg-emerald-600 text-white' : 'text-gray-600'}`}
              >
                Geschiedenis
              </button>
            </div>
          </div>

          {initialLoading && <p className="text-sm text-gray-500">Laden...</p>}
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <section className="mt-4 space-y-3">
            {matches.map((match) => {
              const opponent = isMatchOwner(match) ? match.opponent : match.initiator;
              const canCancel = isMatchOwner(match) && match.status !== 'cancelled' && match.status !== 'completed';
              const canAccept = match.status === 'pending' && match.opponent_id === user?.id;
              const canReport = match.status === 'accepted' && isMatchOwner(match);
              const hasPendingResultConfirmation = match.status === 'accepted' && Boolean(match.result);

              return (
                <article key={match.id} className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
                  <div className="border-b border-emerald-50 bg-gradient-to-r from-emerald-50 via-white to-white px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <UserAvatarClickable user={opponent ?? match.opponent ?? match.initiator ?? user!} size="md" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{sportEmoji(match.sport?.name)}</span>
                            <p className="truncate text-base font-semibold text-gray-900">{match.sport?.name ?? 'Match'}</p>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">Tegen: {opponent?.name ?? 'Onbekend'}</p>
                          <p className="text-xs text-gray-500">
                            {match.scheduled_at
                              ? new Date(match.scheduled_at).toLocaleString('nl-NL', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false,
                                })
                              : 'Datum volgt'}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {statusLabel(match.status)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 px-4 py-4">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl bg-gray-50 px-3 py-2">
                        <p className="text-[11px] text-gray-500">Locatie</p>
                        <p className="text-sm font-semibold text-gray-900">{match.location_name ?? 'Nog niet ingevuld'}</p>
                        <p className="text-xs text-gray-500">{match.location_city ?? ''}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 px-3 py-2">
                        <p className="text-[11px] text-gray-500">Status</p>
                        <p className="text-sm font-semibold text-gray-900">{statusLabel(match.status)}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 px-3 py-2">
                        <p className="text-[11px] text-gray-500">Resultaat</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {match.result ? `${match.result.initiator_score ?? '-'} - ${match.result.opponent_score ?? '-'}` : 'Nog niet'}
                        </p>
                      </div>
                    </div>

                    {match.location_latitude && match.location_longitude && (
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-gray-500">Locatie op kaart</p>
                        <LocationMap
                          lat={match.location_latitude}
                          lng={match.location_longitude}
                          readOnly
                        />
                      </div>
                    )}

                    {tab === 'upcoming' && (
                      <div className="flex flex-wrap gap-2">
                        {canAccept && (
                          <>
                            <button
                              onClick={() => handleAction(match, 'accept')}
                              disabled={actionLoadingId === match.id}
                              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                            >
                              Accepteren
                            </button>
                            <button
                              onClick={() => handleAction(match, 'decline')}
                              disabled={actionLoadingId === match.id}
                              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-60"
                            >
                              Afwijzen
                            </button>
                          </>
                        )}

                        {canCancel && (
                          <button
                            onClick={() => handleAction(match, 'cancel')}
                            disabled={actionLoadingId === match.id}
                            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-60"
                          >
                            Annuleren
                          </button>
                        )}

                        {canReport && (
                          <button
                            onClick={() => openResultModal(match)}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                          >
                            {hasPendingResultConfirmation ? 'Resultaat aanpassen' : 'Resultaat invullen'}
                          </button>
                        )}
                      </div>
                    )}

                    {match.status === 'accepted' && (
                      <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                        {hasPendingResultConfirmation
                          ? isMatchOwner(match)
                            ? 'Resultaat is ingevuld. Wachten op bevestiging van tegenstander.'
                            : 'De organisator heeft het resultaat ingevuld. Bevestig dit in de chat.'
                          : isMatchOwner(match)
                            ? 'Afspraak geaccepteerd. Jij bent de organisator: vul na de wedstrijd de uitslag in.'
                            : 'Afspraak geaccepteerd. De organisator vult na de wedstrijd de uitslag in.'}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}

            {!initialLoading && !error && matches.length === 0 && (
              <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
                Geen matches in deze tab.
              </p>
            )}

            <div ref={sentinelRef} aria-hidden="true" />
            {loading && !initialLoading && <p className="py-3 text-center text-sm text-gray-500">Meer laden...</p>}
            {!hasMore && matches.length > 0 && <p className="py-3 text-center text-xs text-gray-400">Geen verdere matches.</p>}
          </section>
        </main>

        {activeMatch && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 sm:items-center sm:p-4">
            <div className="w-full max-h-[92dvh] overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl">
              <div className="border-b border-emerald-100 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Resultaat invullen</p>
                    <p className="text-sm text-gray-500">Bevestig de score voordat de match voltooid wordt.</p>
                  </div>
                  <button onClick={() => setActiveMatch(null)} className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100">
                    Sluiten
                  </button>
                </div>
              </div>

              <div className="max-h-[calc(92dvh-10.5rem)] space-y-3 overflow-y-auto p-4 sm:max-h-[65dvh] sm:p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Jouw score</label>
                    <input
                      type="number"
                      min="0"
                      value={initiatorScore}
                      onChange={(event) => setInitiatorScore(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Tegenstander score</label>
                    <input
                      type="number"
                      min="0"
                      value={opponentScore}
                      onChange={(event) => setOpponentScore(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-emerald-100 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-3 sm:px-5 sm:pb-5">
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmitResult}
                    disabled={actionLoadingId === activeMatch.id}
                    className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Versturen naar tegenstander
                  </button>
                  <button onClick={() => setActiveMatch(null)} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700">
                    Annuleren
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Navbar />
      </div>
    </ProtectedRoute>
  );
}
