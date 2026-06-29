'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/layout/Navbar';
import ProtectedRoute from '../../components/layout/ProtectedRoute';
import UserAvatar from '../../components/ui/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { SPORTS } from '@/constants/sports';
import { getUserProfileImageUrl, isProfileComplete } from '@/lib/profile';
import { socialService } from '@/lib/social';
import { adminService } from '@/lib/admin';
import { advertisementService } from '@/lib/advertisement';
import VideoAdModal from '@/components/ads/VideoAdModal';
import { authService } from '@/lib/auth';
import { FriendRequest } from '@/types';
import { AdminTestRunResponse } from '@/types/admin';

type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

type SetupSport = {
  sportId: number;
  selected: boolean;
  skill: SkillLevel;
  isActive: boolean;
};

const skillLabels: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Gemiddeld',
  advanced: 'Gevorderd',
};

const AD_SLOT = 'profile_save';

function createSportStateFromUser(userSports: { sport_id: number; skill_level?: SkillLevel; is_active?: boolean }[] | undefined): SetupSport[] {
  return SPORTS.map((sport) => {
    const existing = userSports?.find((item) => item.sport_id === sport.id);
    return {
      sportId: sport.id,
      selected: Boolean(existing),
      skill: existing?.skill_level ?? 'beginner',
      isActive: existing?.is_active ?? true,
    };
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, setAdminMode, updateProfile, refreshUser } = useAuth();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [showAd, setShowAd] = useState(false);

  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');

  const [isTogglingAdmin, setIsTogglingAdmin] = useState(false);
  const [adminToggleError, setAdminToggleError] = useState('');

  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [sports, setSports] = useState<SetupSport[]>([]);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestActionLoadingId, setRequestActionLoadingId] = useState<number | null>(null);
  const [runningAdminTest, setRunningAdminTest] = useState<'unit' | 'ui' | 'pentest' | null>(null);
  const [adminTestOutput, setAdminTestOutput] = useState('');
  const [adminTestSummary, setAdminTestSummary] = useState<AdminTestRunResponse | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState('');
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    setCity(user.city ?? '');
    setBio(user.bio ?? '');
    setSports(createSportStateFromUser(user.user_sports));
    setProfilePictureFile(null);
    setProfilePicturePreview(getUserProfileImageUrl(user));

    if (!isProfileComplete(user)) {
      setIsEditingProfile(true);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const loadRequests = async () => {
      setLoadingRequests(true);
      try {
        const data = await socialService.getFriendRequests();
        setIncomingRequests(data.incoming);
        setOutgoingRequests(data.outgoing);
      } finally {
        setLoadingRequests(false);
      }
    };

    void loadRequests();
  }, [user]);

  const selectedSports = useMemo(() => sports.filter((sport) => sport.selected), [sports]);

  const setupStepOneDone = city.trim().length > 0 && bio.trim().length > 0;
  const setupStepTwoDone = selectedSports.length > 0;
  const completedSteps = Number(setupStepOneDone) + Number(setupStepTwoDone);
  const profileCompleted = Boolean(user && isProfileComplete(user));
  const emailVerified = Boolean(user?.email_verified_at);

  const handleToggleSport = (sportId: number) => {
    setSports((current) =>
      current.map((item) =>
        item.sportId === sportId
          ? {
              ...item,
              selected: !item.selected,
            }
          : item
      )
    );
  };

  const handleSkillChange = (sportId: number, skill: SkillLevel) => {
    setSports((current) =>
      current.map((item) =>
        item.sportId === sportId
          ? {
              ...item,
              skill,
            }
          : item
      )
    );
  };

  const handleActiveChange = (sportId: number, isActive: boolean) => {
    setSports((current) =>
      current.map((item) =>
        item.sportId === sportId
          ? {
              ...item,
              isActive,
            }
          : item
      )
    );
  };

  const handlePictureChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setProfilePictureFile(file);

    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setProfilePicturePreview(objectUrl);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleToggleAdminMode = async () => {
    if (!user) return;

    setAdminToggleError('');
    setIsTogglingAdmin(true);

    try {
      await setAdminMode(!user.is_admin_mode);
    } catch {
      setAdminToggleError('Admin mode kon niet worden aangepast. Probeer opnieuw.');
    } finally {
      setIsTogglingAdmin(false);
    }
  };

  const handleResendVerification = async () => {
    setVerificationMessage('');
    setIsResendingVerification(true);
    try {
      const message = await authService.resendVerificationEmail();
      setVerificationMessage(message);
    } catch {
      setVerificationMessage('Versturen is mislukt. Probeer het later opnieuw.');
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleSaveProfile = async () => {
    if (selectedSports.length === 0) {
      setProfileError('Selecteer minimaal een sport om je profiel te voltooien.');
      return;
    }

    setProfileError('');
    setProfileSuccess('');
    setIsSavingProfile(true);

    try {
      await updateProfile({
        city,
        bio,
        profilePicture: profilePictureFile,
        sports: selectedSports.map((sport) => ({
          sport_id: sport.sportId,
          skill_level: sport.skill,
          is_active: sport.isActive,
        })),
      });

      setProfileSuccess('Profiel opgeslagen.');
      setIsEditingProfile(false);
      setProfilePictureFile(null);
      // Verse check zodat een net geüploade advertentie ook getoond wordt.
      try {
        const config = await advertisementService.getSlotConfig(AD_SLOT);
        if (config.has_ad) setShowAd(true);
      } catch {
        // Geen advertentie tonen als de config niet opgehaald kan worden.
      }
    } catch (error) {
      const response = (error as { response?: { status?: number; data?: { email_not_verified?: boolean; message?: string } } })
        .response;
      if (response?.status === 403 && response.data?.email_not_verified) {
        setProfileError(
          response.data.message ?? 'Verifieer eerst je e-mailadres voordat je je profiel kunt voltooien.'
        );
      } else {
        setProfileError('Profiel opslaan is mislukt. Controleer je input en probeer opnieuw.');
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAcceptRequest = async (senderId: number) => {
    setRequestActionLoadingId(senderId);
    try {
      await socialService.acceptFriendRequest(senderId);
      const data = await socialService.getFriendRequests();
      setIncomingRequests(data.incoming);
      setOutgoingRequests(data.outgoing);
      await refreshUser();
    } finally {
      setRequestActionLoadingId(null);
    }
  };

  const handleDeclineRequest = async (senderId: number) => {
    setRequestActionLoadingId(senderId);
    try {
      await socialService.declineFriendRequest(senderId);
      const data = await socialService.getFriendRequests();
      setIncomingRequests(data.incoming);
      setOutgoingRequests(data.outgoing);
      await refreshUser();
    } finally {
      setRequestActionLoadingId(null);
    }
  };

  const runAdminTest = async (suite: 'unit' | 'ui' | 'pentest') => {
    setRunningAdminTest(suite);
    setAdminTestOutput('Tests worden uitgevoerd...');

    try {
      const result =
        suite === 'unit'
          ? await adminService.runUnitTests()
          : suite === 'ui'
            ? await adminService.runUiTests()
            : await adminService.runPentest();

      setAdminTestSummary(result);
      setAdminTestOutput(result.output);
    } catch {
      setAdminTestSummary(null);
      setAdminTestOutput('FAILED\nKon tests niet uitvoeren.');
    } finally {
      setRunningAdminTest(null);
    }
  };

  const clearAdminTestOutput = () => {
    setAdminTestOutput('');
    setAdminTestSummary(null);
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 8) {
      setPasswordError('Je nieuwe wachtwoord moet minimaal 8 tekens bevatten.');
      return;
    }

    if (newPassword !== newPasswordConfirmation) {
      setPasswordError('De nieuwe wachtwoorden komen niet overeen.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const message = await authService.changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: newPasswordConfirmation,
      });
      setPasswordSuccess(message);
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirmation('');
    } catch {
      setPasswordError('Wachtwoord wijzigen is mislukt. Controleer je huidige wachtwoord.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteAccountError('');

    if (!deleteAccountPassword.trim()) {
      setDeleteAccountError('Voer je wachtwoord in om je account te verwijderen.');
      return;
    }

    setIsDeletingAccount(true);
    try {
      await authService.deleteAccount(deleteAccountPassword);
      await logout();
      router.push('/login');
    } catch {
      setDeleteAccountError('Account verwijderen is mislukt. Controleer je wachtwoord.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const isAdminViewer = user?.role === 'admin';

  const renderTerminalLine = (line: string, index: number) => {
    const parts = line.split(/(PASSED|FAILED)/g);

    return (
      <p key={`${index}-${line}`} className="whitespace-pre-wrap break-words">
        {parts.map((part, partIndex) => {
          if (part === 'PASSED') {
            return (
              <span key={`${index}-${partIndex}`} className="text-emerald-400">
                PASSED
              </span>
            );
          }

          if (part === 'FAILED') {
            return (
              <span key={`${index}-${partIndex}`} className="text-red-400">
                FAILED
              </span>
            );
          }

          return <span key={`${index}-${partIndex}`}>{part}</span>;
        })}
      </p>
    );
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50">
        <main className="mx-auto w-full max-w-3xl px-4 py-6 pb-28 sm:px-6">
          {/* Hero header */}
          <header className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-600 shadow-lg shadow-emerald-200/60">
            <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col items-center gap-4 px-6 py-7 text-center sm:flex-row sm:text-left">
              <div className="shrink-0 rounded-full bg-white/20 p-1.5 ring-4 ring-white/30">
                <UserAvatar src={profilePicturePreview} name={user?.name ?? 'Gebruiker'} size="lg" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-2xl font-bold text-white">{user?.name ?? 'Gebruiker'}</h1>
                <p className="truncate text-sm text-emerald-50/90">{user?.email ?? '-'}</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    👥 {user?.friends_count ?? 0} vrienden
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    🏅 {user?.user_sports?.length ?? 0} sporten
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur ${
                      profileCompleted ? 'bg-white text-emerald-700' : 'bg-amber-300/90 text-amber-900'
                    }`}
                  >
                    {profileCompleted ? '✓ Profiel compleet' : '! Profiel onvolledig'}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {!emailVerified && (
            <section className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
                    <span aria-hidden>✉️</span>
                    Verifieer je e-mailadres
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    We hebben een verificatielink gestuurd naar <span className="font-semibold">{user?.email}</span>. Klik
                    op de link om je profiel te kunnen voltooien.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResendingVerification}
                  className="shrink-0 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResendingVerification ? 'Bezig...' : 'Opnieuw versturen'}
                </button>
              </div>
              {verificationMessage && <p className="mt-3 text-xs font-medium text-amber-900">{verificationMessage}</p>}
            </section>
          )}

          {(!profileCompleted || isEditingProfile) && (
            <section className="mt-4 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-100/40">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    <span className="h-4 w-1 rounded-full bg-emerald-500" />
                    Profiel voltooien
                  </p>
                  <p className="text-xs text-gray-500">{completedSteps}/2 stappen voltooid. Voltooi de stappen om te beginnen met spelen.</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${profileCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {profileCompleted ? 'Compleet' : 'Niet compleet'}
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(completedSteps / 2) * 100}%` }} />
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor="profile_picture" className="mb-1 block text-sm font-medium text-gray-700">
                    Profielfoto
                  </label>
                  <input
                    id="profile_picture"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handlePictureChange}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="mb-1 block text-sm font-medium text-gray-700">
                    Stad
                  </label>
                  <input
                    id="city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                  />
                </div>

                <div>
                  <label htmlFor="bio" className="mb-1 block text-sm font-medium text-gray-700">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    className="h-24 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                  />
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">Sporten & niveau</p>
                  <div className="space-y-2">
                    {sports.map((sportRow) => {
                      const sport = SPORTS.find((item) => item.id === sportRow.sportId);
                      if (!sport) return null;

                      return (
                        <div
                          key={sport.id}
                          className={`overflow-hidden rounded-xl border p-3 transition-all duration-300 ${
                            sportRow.selected ? 'border-emerald-300 bg-emerald-50/60' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                              <input
                                type="checkbox"
                                checked={sportRow.selected}
                                onChange={() => handleToggleSport(sport.id)}
                                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 transition-transform"
                              />
                              <span>{sport.emoji} {sport.name}</span>
                            </label>

                            <div
                              className={`flex items-center gap-3 transition-all duration-300 overflow-hidden ${
                                sportRow.selected ? 'opacity-100 max-w-md' : 'opacity-0 max-w-0'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Actief</span>
                                <input
                                  type="checkbox"
                                  checked={sportRow.isActive}
                                  onChange={(event) => handleActiveChange(sport.id, event.target.checked)}
                                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 transition-transform"
                                />
                              </div>
                              <select
                                value={sportRow.skill}
                                onChange={(event) => handleSkillChange(sport.id, event.target.value as SkillLevel)}
                                className="rounded-lg border border-gray-200 px-2 py-1 text-xs outline-none ring-emerald-200 focus:ring transition-all"
                              >
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Gemiddeld</option>
                                <option value="advanced">Gevorderd</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {profileError && <p className="mt-3 text-xs text-red-600">{profileError}</p>}
              {profileSuccess && <p className="mt-3 text-xs text-emerald-700">{profileSuccess}</p>}

              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile || !emailVerified}
                  title={!emailVerified ? 'Verifieer eerst je e-mailadres' : undefined}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingProfile ? 'Opslaan...' : 'Opslaan'}
                </button>

                {profileCompleted && (
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Annuleren
                  </button>
                )}
              </div>
            </section>
          )}

          {profileCompleted && !isEditingProfile && (
            <section className="mt-4 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-100/40">
              <div className="flex items-start justify-between gap-3">
                <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <span className="h-4 w-1 rounded-full bg-emerald-500" />
                  Over jou
                </h2>
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="rounded-xl border border-emerald-200 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                >
                  Aanpassen
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-emerald-50/60 px-4 py-3">
                  <p className="text-xs font-medium text-emerald-700">📍 Stad</p>
                  <p className="mt-0.5 font-semibold text-gray-900">{user?.city ?? '-'}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50/60 px-4 py-3">
                  <p className="text-xs font-medium text-emerald-700">📝 Bio</p>
                  <p className="mt-0.5 text-sm text-gray-800">{user?.bio?.trim() || 'Geen bio ingevuld'}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Jouw sporten</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {user?.user_sports?.map((userSport) => {
                    const sportMeta = SPORTS.find((item) => item.name === userSport.sport?.name);
                    return (
                      <span
                        key={userSport.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"
                      >
                        <span>{sportMeta?.emoji ?? '🏅'}</span>
                        {userSport.sport?.name ?? 'Sport'}
                        <span className="text-emerald-400">·</span>
                        <span className="font-medium text-emerald-600">{skillLabels[userSport.skill_level ?? 'beginner']}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {user?.is_admin && (
            <section className="mt-4 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-100/40">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    <span className="h-4 w-1 rounded-full bg-emerald-500" />
                    Admin modus
                  </p>
                  <p className="text-xs text-gray-500">Schakel het admin-paneel aan of uit zonder je admin-account te verliezen.</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    user?.is_admin_mode ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {user?.is_admin_mode ? 'AAN' : 'UIT'}
                </span>
              </div>

              <button
                onClick={handleToggleAdminMode}
                disabled={isTogglingAdmin || !user}
                className="mt-4 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isTogglingAdmin ? 'Bezig...' : user?.is_admin_mode ? 'Admin modus uitschakelen' : 'Admin modus inschakelen'}
              </button>

              <button
                onClick={() => router.push('/admin/overview')}
                disabled={!user?.is_admin}
                className="ml-2 mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Open database overzicht
              </button>

              {adminToggleError && <p className="mt-2 text-xs text-red-600">{adminToggleError}</p>}

              {isAdminViewer && (
                <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Admin testpaneel</p>
                      <p className="text-xs text-slate-500">Start unit-, UI- en pentestchecks rechtstreeks vanuit je profiel.</p>
                    </div>

                    {runningAdminTest && (
                      <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                        Tests worden uitgevoerd...
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">SEBAS</p>
                      <p className="mt-2 text-sm font-medium text-slate-900">Unit tests</p>
                      <button
                        onClick={() => void runAdminTest('unit')}
                        disabled={runningAdminTest !== null}
                        className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Unit tests uitvoeren
                      </button>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">MARCUS</p>
                      <p className="mt-2 text-sm font-medium text-slate-900">UI tests</p>
                      <button
                        onClick={() => void runAdminTest('ui')}
                        disabled={runningAdminTest !== null}
                        className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        UI tests uitvoeren
                      </button>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">MATTHEW</p>
                      <p className="mt-2 text-sm font-medium text-slate-900">Pentest</p>
                      <button
                        onClick={() => void runAdminTest('pentest')}
                        disabled={runningAdminTest !== null}
                        className="mt-4 w-full rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Pentest uitvoeren
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Terminaluitvoer</p>
                        {adminTestSummary && (
                          <p className="mt-1 text-[11px] text-slate-500">
                            Tests uitgevoerd: {adminTestSummary.tests_run} · Mislukt: {adminTestSummary.failures}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={clearAdminTestOutput}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-900"
                      >
                        Wissen
                      </button>
                    </div>

                    <div className="max-h-72 overflow-auto rounded-xl bg-slate-950 font-mono text-xs text-slate-200">
                      {adminTestOutput ? (
                        <div className="space-y-1 p-4">
                          {adminTestOutput.split('\n').map((line, index) => renderTerminalLine(line, index))}
                        </div>
                      ) : (
                        <p className="p-4 text-slate-500">Geen output beschikbaar.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="mt-4 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-100/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <span className="h-4 w-1 rounded-full bg-emerald-500" />
                  Vriendschapsverzoeken
                </p>
                <p className="mt-1 text-xs text-gray-500">Beheer je openstaande inkomende en uitgaande verzoeken.</p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                Open: {incomingRequests.length}
              </span>
            </div>

            {loadingRequests && <p className="mt-3 text-xs text-gray-500">Verzoeken laden...</p>}

            {!loadingRequests && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Inkomend</p>
                  <div className="mt-2 space-y-2">
                    {incomingRequests.map((request) => (
                      <div key={request.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-sm font-semibold text-gray-900">{request.sender?.name ?? 'Speler'}</p>
                        <p className="text-xs text-gray-500">{request.sender?.city ?? 'Onbekende stad'}</p>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => handleAcceptRequest(request.sender_id)}
                            disabled={requestActionLoadingId === request.sender_id}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            Accepteren
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(request.sender_id)}
                            disabled={requestActionLoadingId === request.sender_id}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                          >
                            Afwijzen
                          </button>
                        </div>
                      </div>
                    ))}

                    {incomingRequests.length === 0 && <p className="text-xs text-gray-500">Geen inkomende verzoeken.</p>}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Uitgaand</p>
                  <div className="mt-2 space-y-2">
                    {outgoingRequests.map((request) => (
                      <div key={request.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-sm font-semibold text-gray-900">{request.receiver?.name ?? 'Speler'}</p>
                        <p className="text-xs text-gray-500">Verzoek verzonden</p>
                      </div>
                    ))}

                    {outgoingRequests.length === 0 && <p className="text-xs text-gray-500">Geen uitgaande verzoeken.</p>}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="mt-4 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-100/40">
            <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <span className="h-4 w-1 rounded-full bg-emerald-500" />
              Wachtwoord wijzigen
            </p>
            <p className="mt-1 text-xs text-gray-500">Voer je huidige wachtwoord in en kies een nieuw wachtwoord.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="current_password" className="mb-1 block text-xs font-medium text-gray-700">
                  Huidig wachtwoord
                </label>
                <input
                  id="current_password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                />
              </div>
              <div>
                <label htmlFor="new_password" className="mb-1 block text-xs font-medium text-gray-700">
                  Nieuw wachtwoord
                </label>
                <input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                />
              </div>
              <div>
                <label htmlFor="new_password_confirmation" className="mb-1 block text-xs font-medium text-gray-700">
                  Bevestig wachtwoord
                </label>
                <input
                  id="new_password_confirmation"
                  type="password"
                  value={newPasswordConfirmation}
                  onChange={(event) => setNewPasswordConfirmation(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
                />
              </div>
            </div>

            {passwordError && <p className="mt-3 text-xs text-red-600">{passwordError}</p>}
            {passwordSuccess && <p className="mt-3 text-xs text-emerald-700">{passwordSuccess}</p>}

            <button
              onClick={handleChangePassword}
              disabled={isChangingPassword || !currentPassword || !newPassword}
              className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isChangingPassword ? 'Bezig...' : 'Wachtwoord wijzigen'}
            </button>
          </section>

          <section className="mt-4 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-100/40">
            <button
              onClick={handleLogout}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 sm:w-auto"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3m0 0l4-4m-4 4l4 4M21 4v16" />
              </svg>
              Uitloggen
            </button>

            <button
              onClick={() => {
                setIsDeleteAccountModalOpen(true);
                setDeleteAccountPassword('');
                setDeleteAccountError('');
              }}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 sm:w-auto"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Account verwijderen
            </button>
          </section>
        </main>

        {/* Delete Account Modal */}
        {isDeleteAccountModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Account verwijderen</h3>
                  <p className="text-xs text-slate-500">Voer je wachtwoord in om je account permanent te verwijderen</p>
                </div>
                <button
                  onClick={() => setIsDeleteAccountModalOpen(false)}
                  className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-gray-100"
                >
                  Sluiten
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-700">
                    ⚠️ Dit is permanent - je account kan niet meer worden hersteld.
                  </p>
                  <p className="mb-3 text-xs text-slate-600">
                    Voer je wachtwoord in om je account te bevestigen en te verwijderen.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Wachtwoord</label>
                  <input
                    type="password"
                    value={deleteAccountPassword}
                    onChange={(event) => setDeleteAccountPassword(event.target.value)}
                    placeholder="Voer je wachtwoord in"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none ring-red-200 focus:ring"
                    autoFocus
                  />
                </div>

                {deleteAccountError && (
                  <p className="text-xs text-red-600">{deleteAccountError}</p>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setIsDeleteAccountModalOpen(false)}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount || !deleteAccountPassword.trim()}
                  className="flex-1 rounded-xl border border-red-200 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeletingAccount ? 'Bezig...' : 'Verwijderen'}
                </button>
              </div>
            </div>
          </div>
        )}

        <Navbar />

        <VideoAdModal
          isOpen={showAd}
          onClose={() => setShowAd(false)}
          onSkip={() => setShowAd(false)}
          slot={AD_SLOT}
        />
      </div>
    </ProtectedRoute>
  );
}
