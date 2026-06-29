'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../components/layout/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { adminService, AdminUpdateAdvertisementInput } from '@/lib/admin';
import { Advertisement, AdvertisementSettingsMap } from '@/types/admin';

// De vaste plaatsingen. Elke plaatsing heeft één gekoppelde advertentie.
const SLOTS = [
  {
    key: 'find_players_message',
    name: 'Advertentie 1',
    desc: 'Wordt getoond nadat een speler op "Bericht" klikt op Spelers zoeken.',
  },
  {
    key: 'friend_request',
    name: 'Advertentie 2',
    desc: 'Wordt getoond na het versturen van een vriendschapsverzoek op een profiel.',
  },
  {
    key: 'profile_save',
    name: 'Advertentie 3',
    desc: 'Wordt getoond na het opslaan van je gegevens op de profielpagina.',
  },
] as const;

interface EditForm {
  company_name: string;
  title: string;
  description: string;
  is_active: boolean;
}

function StatCard({ label, value, delay = 0 }: { label: string; value: string | number; delay?: number }) {
  return (
    <article
      style={{ animationDelay: `${delay}ms` }}
      className="anim-fade-up anim-sheen relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-100"
    >
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-emerald-700">{value}</p>
    </article>
  );
}

function formatCTR(clicks: number, views: number): string {
  if (views === 0) return '0%';
  return ((clicks / views) * 100).toFixed(1) + '%';
}

export default function AdvertisementManagementPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [settings, setSettings] = useState<AdvertisementSettingsMap>({});
  const [totalViews, setTotalViews] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [pageError, setPageError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState<Record<string, string>>({});
  const [busySlot, setBusySlot] = useState<string | null>(null);

  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (user && user.role !== 'admin') {
      router.replace('/');
      return;
    }
    void fetchAll();
  }, [loading, router, user?.is_admin]);

  const fetchAll = async () => {
    setIsRefreshing(true);
    setPageError('');
    try {
      const [ads, summaryData, settingsData] = await Promise.all([
        adminService.getAdvertisements(),
        adminService.getAdvertisementsSummary(),
        adminService.getAdvertisementSettings(),
      ]);
      setAdvertisements(ads);
      setTotalViews(summaryData.summary.total_views);
      setTotalClicks(summaryData.summary.total_clicks);
      setSettings(settingsData);
    } catch {
      setPageError('Kon gegevens niet laden.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const adForSlot = (slotKey: string): Advertisement | null => {
    const adId = settings[slotKey]?.advertisement_id ?? null;
    return advertisements.find((a) => a.id === adId) ?? null;
  };

  const setSlotMsg = (slotKey: string, msg: string) =>
    setUploadMsg((prev) => ({ ...prev, [slotKey]: msg }));

  const clearSlotMsg = (slotKey: string) =>
    setUploadMsg((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });

  // Upload een mp4: maakt de advertentie voor deze plaatsing aan als die nog niet bestaat.
  const handleUpload = async (slotKey: string, name: string, currentAd: Advertisement | null, file: File) => {
    setUploadingSlot(slotKey);
    setSlotMsg(slotKey, 'Uploaden...');
    setPageError('');
    try {
      let adId = currentAd?.id;
      if (!adId) {
        const newAd = await adminService.createAdvertisement({
          company_name: name,
          title: name,
          description: `${name} advertentie`,
          is_active: true,
        });
        adId = newAd.id;
        await adminService.updateAdvertisementSetting(slotKey, { advertisement_id: adId, frequency: 1 });
      }
      await adminService.uploadAdvertisementVideo(adId, file);
      setSlotMsg(slotKey, 'Geüpload!');
      await fetchAll();
      setTimeout(() => clearSlotMsg(slotKey), 2000);
    } catch {
      clearSlotMsg(slotKey);
      setPageError('Uploaden mislukt. Probeer opnieuw.');
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleDeleteVideo = async (currentAd: Advertisement | null) => {
    if (!currentAd) return;
    if (!window.confirm('Video van deze advertentie verwijderen?')) return;
    setBusySlot(`v-${currentAd.id}`);
    try {
      await adminService.deleteAdvertisementVideo(currentAd.id);
      await fetchAll();
    } catch {
      setPageError('Kon video niet verwijderen.');
    } finally {
      setBusySlot(null);
    }
  };

  const handleDeleteAd = async (currentAd: Advertisement | null) => {
    if (!currentAd) return;
    if (!window.confirm('Deze advertentie volledig verwijderen?')) return;
    setBusySlot(`a-${currentAd.id}`);
    try {
      await adminService.deleteAdvertisement(currentAd.id);
      await fetchAll();
    } catch {
      setPageError('Kon advertentie niet verwijderen.');
    } finally {
      setBusySlot(null);
    }
  };

  const openEdit = (currentAd: Advertisement) => {
    setEditError('');
    setEditingAd(currentAd);
    setEditForm({
      company_name: currentAd.company_name,
      title: currentAd.title,
      description: currentAd.description,
      is_active: currentAd.is_active,
    });
  };

  const closeEdit = () => {
    setEditingAd(null);
    setEditForm(null);
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editingAd || !editForm) return;
    setIsSavingEdit(true);
    setEditError('');
    try {
      const data: AdminUpdateAdvertisementInput = {
        company_name: editForm.company_name,
        title: editForm.title,
        description: editForm.description,
        is_active: editForm.is_active,
      };
      await adminService.updateAdvertisement(editingAd.id, data);
      closeEdit();
      await fetchAll();
    } catch {
      setEditError('Opslaan mislukt.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-5xl space-y-6">

          {/* Header */}
          <div className="anim-fade-up flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Advertentiebeheer</h1>
              <p className="mt-0.5 text-sm text-slate-500">Beheer de video-advertenties per plaatsing.</p>
            </div>
            <button
              onClick={() => void fetchAll()}
              disabled={isRefreshing}
              className="group flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-md active:scale-95 disabled:opacity-50"
            >
              <svg
                className={`h-4 w-4 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRefreshing ? 'Laden...' : 'Vernieuw'}
            </button>
          </div>

          {pageError && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Totale views" value={totalViews} delay={60} />
            <StatCard label="Totale clicks" value={totalClicks} delay={140} />
            <StatCard label="CTR" value={totalViews > 0 ? formatCTR(totalClicks, totalViews) : '0%'} delay={220} />
          </div>

          {/* Advertenties per plaatsing */}
          <section className="space-y-5">
            <h2 className="text-base font-semibold text-slate-900">Advertenties</h2>

            {SLOTS.map((slot, i) => {
              const ad = adForSlot(slot.key);
              const isUploading = uploadingSlot === slot.key;

              return (
                <article
                  key={slot.key}
                  style={{ animationDelay: `${300 + i * 120}ms` }}
                  className="anim-fade-up group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-100/60"
                >
                  <div className="border-b border-gray-100 px-5 py-4">
                    <h3 className="text-base font-semibold text-slate-900">{slot.name}</h3>
                    <p className="text-xs text-slate-500">{slot.desc}</p>
                  </div>

                  {/* Video preview */}
                  <div className="relative aspect-video overflow-hidden bg-gray-900">
                    {ad?.video_url ? (
                      <video
                        key={ad.video_url}
                        src={ad.video_url}
                        className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-500">
                        <div className="text-center">
                          <svg className="animate-float mx-auto mb-2 h-10 w-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                          </svg>
                          <p className="text-xs">Nog geen video — upload een mp4.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acties */}
                  <div className="p-5">
                    {ad && (
                      <div className="mb-3 flex gap-4 text-xs text-slate-500">
                        <span>{ad.views_count} views</span>
                        <span>{ad.clicks_count} clicks</span>
                        <span>CTR {formatCTR(ad.clicks_count, ad.views_count)}</span>
                        <span className={ad.is_active ? 'text-emerald-600' : 'text-gray-400'}>
                          {ad.is_active ? 'Actief' : 'Inactief'}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        accept="video/mp4,video/mov,video/avi,video/webm"
                        className="hidden"
                        id={`upload-${slot.key}`}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleUpload(slot.key, slot.name, ad, file);
                          e.target.value = '';
                        }}
                      />
                      <label
                        htmlFor={`upload-${slot.key}`}
                        className={`cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md active:scale-95 ${isUploading ? 'pointer-events-none opacity-60' : ''} ${uploadMsg[slot.key] === 'Geüpload!' ? 'anim-pulse-glow' : ''}`}
                      >
                        {uploadMsg[slot.key] || (ad?.video_url ? 'MP4 vervangen' : 'MP4 uploaden')}
                      </label>

                      {ad?.video_url && !isUploading && (
                        <button
                          onClick={() => void handleDeleteVideo(ad)}
                          disabled={busySlot === `v-${ad.id}`}
                          className="rounded-xl border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 transition duration-200 hover:-translate-y-0.5 hover:bg-amber-50 active:scale-95 disabled:opacity-50"
                        >
                          Video verwijderen
                        </button>
                      )}

                      {ad && (
                        <>
                          <button
                            onClick={() => openEdit(ad)}
                            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-gray-50 active:scale-95"
                          >
                            Bewerken
                          </button>
                          <button
                            onClick={() => void handleDeleteAd(ad)}
                            disabled={busySlot === `a-${ad.id}`}
                            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 active:scale-95 disabled:opacity-50"
                          >
                            Advertentie verwijderen
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </div>

        {/* Edit modal */}
        {editingAd && editForm && (
          <div className="anim-overlay fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="anim-pop-in w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-base font-semibold text-slate-900">Advertentie bewerken</h3>
                <button onClick={closeEdit} className="rounded-lg p-1 text-slate-400 transition hover:rotate-90 hover:bg-gray-100">✕</button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Bedrijfsnaam</label>
                  <input
                    value={editForm.company_name}
                    onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Titel</label>
                  <input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Beschrijving</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="h-20 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  Actief (advertentie wordt getoond)
                </label>
              </div>
              {editError && <p className="mt-3 text-xs text-red-600">{editError}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={closeEdit} className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-slate-700 transition duration-200 hover:bg-gray-50 active:scale-95">
                  Annuleren
                </button>
                <button
                  onClick={() => void handleSaveEdit()}
                  disabled={isSavingEdit}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md active:scale-95 disabled:opacity-60"
                >
                  {isSavingEdit ? 'Opslaan...' : 'Opslaan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
