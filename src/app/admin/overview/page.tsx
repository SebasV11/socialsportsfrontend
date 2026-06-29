'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../components/layout/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { adminService } from '@/lib/admin';
import { AdminMatchRow, AdminOverviewResponse, AdminUserRow } from '@/types/admin';
import { SPORTS } from '@/constants/sports';

type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

interface EditSportRow {
  sportId: number;
  selected: boolean;
  skill: SkillLevel;
  isActive: boolean;
}

interface EditForm {
  name: string;
  email: string;
  bio: string;
  city: string;
  is_active: boolean;
  is_admin: boolean;
  sports: EditSportRow[];
}

const MATCH_STATUS_LABELS: Record<string, string> = {
  pending: 'In afwachting',
  accepted: 'Geaccepteerd',
  completed: 'Voltooid',
  cancelled: 'Geannuleerd',
  declined: 'Afgewezen',
};

function matchStatusLabel(status?: string): string {
  return MATCH_STATUS_LABELS[status ?? ''] ?? status ?? '-';
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-emerald-700">{value}</p>
    </article>
  );
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (user && user.role !== 'admin') {
      router.replace('/');
      return;
    }

    void fetchOverview();
  }, [loading, router, user?.is_admin]);

  const fetchOverview = async () => {
    setIsRefreshing(true);
    setError('');

    try {
      const data = await adminService.getOverview();
      setOverview(data);
    } catch {
      setError('Admin overzicht kon niet worden geladen.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const rows = overview?.users ?? [];
    if (!search.trim()) return rows;

    const q = search.toLowerCase();
    return rows.filter((row) => row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q));
  }, [overview?.users, search]);

  const recentMatches: AdminMatchRow[] = overview?.matches ?? [];

  const openEdit = async (row: AdminUserRow) => {
    setEditingUser(row);
    setEditError('');
    setIsLoadingDetail(true);
    // Basis-formulier alvast tonen; sporten lazy laden.
    setEditForm({
      name: row.name,
      email: row.email,
      bio: row.bio ?? '',
      city: row.city ?? '',
      is_active: row.is_active,
      is_admin: row.is_admin,
      sports: SPORTS.map((sport) => ({ sportId: sport.id, selected: false, skill: 'beginner', isActive: true })),
    });

    try {
      const detail = await adminService.getUserDetail(row.id);
      setEditForm((current) =>
        current
          ? {
              ...current,
              bio: detail.bio ?? current.bio,
              city: detail.city ?? current.city,
              sports: SPORTS.map((sport) => {
                const existing = detail.user_sports?.find((item) => item.sport_id === sport.id);
                return {
                  sportId: sport.id,
                  selected: Boolean(existing),
                  skill: existing?.skill_level ?? 'beginner',
                  isActive: existing?.is_active ?? true,
                };
              }),
            }
          : current
      );
    } catch {
      setEditError('Kon de sporten van deze gebruiker niet laden.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditForm(null);
    setEditError('');
  };

  const updateForm = (patch: Partial<EditForm>) => {
    setEditForm((current) => (current ? { ...current, ...patch } : current));
  };

  const toggleEditSport = (sportId: number) => {
    setEditForm((current) =>
      current
        ? {
            ...current,
            sports: current.sports.map((item) =>
              item.sportId === sportId ? { ...item, selected: !item.selected } : item
            ),
          }
        : current
    );
  };

  const setEditSportField = (sportId: number, patch: Partial<EditSportRow>) => {
    setEditForm((current) =>
      current
        ? {
            ...current,
            sports: current.sports.map((item) => (item.sportId === sportId ? { ...item, ...patch } : item)),
          }
        : current
    );
  };

  const handleSaveEdit = async () => {
    if (!editingUser || !editForm) return;

    setIsSavingEdit(true);
    setEditError('');
    try {
      await adminService.updateUser(editingUser.id, {
        name: editForm.name,
        email: editForm.email,
        bio: editForm.bio,
        city: editForm.city,
        is_active: editForm.is_active,
        is_admin: editForm.is_admin,
        sports: editForm.sports
          .filter((sport) => sport.selected)
          .map((sport) => ({ sport_id: sport.sportId, skill_level: sport.skill, is_active: sport.isActive })),
      });
      closeEdit();
      await fetchOverview();
    } catch {
      setEditError('Opslaan is mislukt. Controleer de velden (bijv. e-mail al in gebruik).');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteUser = async (row: AdminUserRow) => {
    if (!window.confirm(`Weet je zeker dat je ${row.name} definitief wilt verwijderen?`)) {
      return;
    }

    setUpdatingUserId(row.id);
    setError('');
    try {
      await adminService.deleteUser(row.id);
      if (editingUser?.id === row.id) closeEdit();
      await fetchOverview();
    } catch {
      setError('Kon gebruiker niet verwijderen (mogelijk de laatste admin of je eigen account).');
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-slate-100 px-6 py-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Admin databaseoverzicht</h1>
              <p className="mt-1 text-sm text-slate-600">Desktop overzicht voor database-handhaving en gebruikersbeheer.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/admin/advertisements')}
                className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                📢 Advertentiebeheer
              </button>
              <button
                onClick={() => void fetchOverview()}
                className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                {isRefreshing ? 'Vernieuwen...' : 'Vernieuw'}
              </button>
            </div>
          </div>

          {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <StatCard label="Gebruikers" value={overview?.summary.users_total ?? 0} />
            <StatCard label="Admins" value={overview?.summary.admins_total ?? 0} />
            <StatCard label="Actief" value={overview?.summary.active_users ?? 0} />
            <StatCard label="Wedstrijden" value={overview?.summary.matches_total ?? 0} />
            <StatCard label="In afwachting" value={overview?.summary.pending_matches ?? 0} />
            <StatCard label="Berichten" value={overview?.summary.messages_total ?? 0} />
          </section>

          <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Gebruikers beheren</h2>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Zoek op naam of e-mail"
                className="w-72 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-2">Naam</th>
                    <th className="px-3 py-2">E-mail</th>
                    <th className="px-3 py-2">Stad</th>
                    <th className="px-3 py-2">Actief</th>
                    <th className="px-3 py-2">Admin</th>
                    <th className="px-3 py-2">Aangemaakt</th>
                    <th className="px-3 py-2">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100">
                      <td className="px-3 py-2 font-medium text-slate-900">{row.name}</td>
                      <td className="px-3 py-2 text-slate-700">{row.email}</td>
                      <td className="px-3 py-2 text-slate-700">{row.city ?? '-'}</td>
                      <td className="px-3 py-2">{row.is_active ? 'Ja' : 'Nee'}</td>
                      <td className="px-3 py-2">{row.is_admin ? 'Ja' : 'Nee'}</td>
                      <td className="px-3 py-2 text-slate-600">{new Date(row.created_at).toLocaleDateString('nl-NL')}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => void openEdit(row)}
                            disabled={updatingUserId === row.id}
                            className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                          >
                            Bewerken
                          </button>
                          <button
                            onClick={() => void handleDeleteUser(row)}
                            disabled={updatingUserId === row.id}
                            className="rounded-lg border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Verwijderen
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">
                        Geen gebruikers gevonden.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Recente wedstrijden</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Sport</th>
                    <th className="px-3 py-2">Spelers</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Stad</th>
                    <th className="px-3 py-2">Gepland</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMatches.map((match) => (
                    <tr key={match.id} className="border-b border-gray-100">
                      <td className="px-3 py-2 font-medium text-slate-900">#{match.id}</td>
                      <td className="px-3 py-2 text-slate-700">{match.sport?.name ?? '-'}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {match.initiator?.name ?? 'Onbekend'} vs {match.opponent?.name ?? 'Onbekend'}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{matchStatusLabel(match.status)}</td>
                      <td className="px-3 py-2 text-slate-700">{match.location_city ?? '-'}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {match.scheduled_at ? new Date(match.scheduled_at).toLocaleString('nl-NL') : '-'}
                      </td>
                    </tr>
                  ))}

                  {recentMatches.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                        Nog geen matches beschikbaar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {editingUser && editForm && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Gebruiker bewerken</h3>
                  <p className="text-xs text-slate-500">#{editingUser.id} · aangemaakt {new Date(editingUser.created_at).toLocaleDateString('nl-NL')}</p>
                </div>
                <button onClick={closeEdit} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-gray-100">
                  Sluiten
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Naam</label>
                  <input
                    value={editForm.name}
                    onChange={(event) => updateForm({ name: event.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">E-mail</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(event) => updateForm({ email: event.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Stad</label>
                  <input
                    value={editForm.city}
                    onChange={(event) => updateForm({ city: event.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Bio</label>
                  <textarea
                    value={editForm.bio}
                    onChange={(event) => updateForm({ bio: event.target.value })}
                    className="h-20 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                  />
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(event) => updateForm({ is_active: event.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Actief
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={editForm.is_admin}
                      onChange={(event) => updateForm({ is_admin: event.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    Admin
                  </label>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-slate-700">
                    Sporten &amp; niveau {isLoadingDetail && <span className="text-slate-400">(laden...)</span>}
                  </p>
                  <div className="space-y-2">
                    {editForm.sports.map((sportRow) => {
                      const sport = SPORTS.find((item) => item.id === sportRow.sportId);
                      if (!sport) return null;

                      return (
                        <div key={sport.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 p-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                            <input
                              type="checkbox"
                              checked={sportRow.selected}
                              onChange={() => toggleEditSport(sport.id)}
                              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>{sport.emoji} {sport.name}</span>
                          </label>

                          {sportRow.selected && (
                            <>
                              <select
                                value={sportRow.skill}
                                onChange={(event) => setEditSportField(sport.id, { skill: event.target.value as SkillLevel })}
                                className="rounded-lg border border-gray-200 px-2 py-1 text-xs outline-none ring-emerald-200 focus:ring"
                              >
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Gemiddeld</option>
                                <option value="advanced">Gevorderd</option>
                              </select>
                              <label className="flex items-center gap-1 text-xs text-slate-500">
                                <input
                                  type="checkbox"
                                  checked={sportRow.isActive}
                                  onChange={(event) => setEditSportField(sport.id, { isActive: event.target.checked })}
                                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                Actief
                              </label>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {editError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{editError}</p>}

              <div className="mt-5 flex items-center justify-between gap-2">
                <button
                  onClick={() => void handleDeleteUser(editingUser)}
                  disabled={isSavingEdit || updatingUserId === editingUser.id}
                  className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Verwijderen
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={closeEdit}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={() => void handleSaveEdit()}
                    disabled={isSavingEdit}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {isSavingEdit ? 'Opslaan...' : 'Opslaan'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
