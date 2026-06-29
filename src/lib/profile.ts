import { User } from '@/types';

/**
 * Standaard-avatars (avatar-1.svg t/m avatar-5.svg) zijn statische assets
 * die direct vanuit de Next.js `public/avatars/` map worden geserveerd.
 * Zo werken ze altijd na een clone/pull, zonder de Laravel `storage:link`
 * symlink. Alleen door gebruikers geüploade foto's gaan via /storage.
 */
const DEFAULT_AVATAR_PATTERN = /^(?:profiles\/)?(avatar-\d+\.svg)$/;

export function getUserProfileImageUrl(user?: User | null): string | null {
  const raw = user?.profile_picture;
  if (!raw) return null;

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }

  const defaultAvatarMatch = raw.match(DEFAULT_AVATAR_PATTERN);
  if (defaultAvatarMatch) {
    return `/avatars/${defaultAvatarMatch[1]}`;
  }

  const normalized = raw.startsWith('/') ? raw : `/storage/${raw}`;
  return normalized;
}

export function isProfileComplete(user?: User | null): boolean {
  if (!user) return false;

  const hasCity = Boolean(user.city?.trim());
  const hasBio = Boolean(user.bio?.trim());
  const hasSport = Boolean(user.user_sports && user.user_sports.length > 0);

  return hasCity && hasBio && hasSport;
}
