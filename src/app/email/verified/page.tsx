'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

type VerifyStatus = 'success' | 'already' | 'invalid';

const STATUS_CONTENT: Record<VerifyStatus, { title: string; message: string; tone: 'ok' | 'error' }> = {
  success: {
    title: 'E-mailadres geverifieerd',
    message: 'Bedankt! Je e-mailadres is bevestigd. Je kunt nu je profiel voltooien.',
    tone: 'ok',
  },
  already: {
    title: 'Al geverifieerd',
    message: 'Dit e-mailadres was al geverifieerd. Je kunt gewoon verder.',
    tone: 'ok',
  },
  invalid: {
    title: 'Link ongeldig of verlopen',
    message: 'Deze verificatielink is ongeldig of verlopen. Vraag vanuit je profiel een nieuwe aan.',
    tone: 'error',
  },
};

function EmailVerifiedContent() {
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const status = (searchParams.get('status') as VerifyStatus | null) ?? 'invalid';
  const content = STATUS_CONTENT[status] ?? STATUS_CONTENT.invalid;

  const [refreshed, setRefreshed] = useState(false);

  useEffect(() => {
    // Ververs de ingelogde gebruiker zodat email_verified_at meteen klopt
    // en de verificatie-banner verdwijnt.
    if (status === 'success' && user && !refreshed) {
      refreshUser()
        .catch(() => undefined)
        .finally(() => setRefreshed(true));
    }
  }, [status, user, refreshed, refreshUser]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4">
      <div className="w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
            content.tone === 'ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
          }`}
        >
          {content.tone === 'ok' ? '✓' : '!'}
        </div>
        <h1 className="mb-2 text-xl font-bold text-gray-800">{content.title}</h1>
        <p className="mb-6 text-sm text-gray-600">{content.message}</p>

        <Link
          href={user ? '/profile' : '/login'}
          className="inline-block rounded-xl bg-emerald-600 px-5 py-2 font-medium text-white transition-colors hover:bg-emerald-700"
        >
          {user ? 'Naar mijn profiel' : 'Naar inloggen'}
        </Link>
      </div>
    </main>
  );
}

export default function EmailVerifiedPage() {
  return (
    <Suspense
      fallback={<main className="flex min-h-screen items-center justify-center text-sm text-gray-500">Laden...</main>}
    >
      <EmailVerifiedContent />
    </Suspense>
  );
}
