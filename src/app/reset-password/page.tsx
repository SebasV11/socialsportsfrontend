'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/auth';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const linkValid = token.length > 0 && email.length > 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 8) {
      setError('Je wachtwoord moet minimaal 8 tekens bevatten.');
      return;
    }

    if (password !== passwordConfirmation) {
      setError('De wachtwoorden komen niet overeen.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authService.resetPassword({
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      setMessage(result);
      setTimeout(() => router.push('/login'), 1500);
    } catch {
      setError('Deze resetlink is ongeldig of verlopen. Vraag een nieuwe aan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4">
      <div className="w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-3xl font-extrabold text-emerald-700">Nieuw wachtwoord</p>
          <p className="mt-1 text-sm text-gray-500">Kies een nieuw wachtwoord voor {email || 'je account'}.</p>
        </div>

        {!linkValid ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-red-50 px-3 py-3 text-sm text-red-700">
              Deze resetlink is ongeldig. Vraag een nieuwe aan via &quot;Wachtwoord vergeten&quot;.
            </p>
            <Link
              href="/forgot-password"
              className="block w-full rounded-xl bg-emerald-600 py-2 text-center font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Nieuwe resetlink aanvragen
            </Link>
          </div>
        ) : message ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-700">{message}</p>
            <Link
              href="/login"
              className="block w-full rounded-xl bg-emerald-600 py-2 text-center font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Naar inloggen
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                Nieuw wachtwoord
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none ring-emerald-200 focus:ring"
              />
            </div>

            <div>
              <label htmlFor="password_confirmation" className="mb-1 block text-sm font-medium text-gray-700">
                Bevestig wachtwoord
              </label>
              <input
                id="password_confirmation"
                type="password"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none ring-emerald-200 focus:ring"
              />
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-emerald-600 py-2 font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {isSubmitting ? 'Bezig...' : 'Wachtwoord opslaan'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center text-sm text-gray-500">Laden...</main>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
