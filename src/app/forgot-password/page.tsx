'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { authService } from '@/lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Vul je e-mailadres in.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authService.forgotPassword(email);
      setMessage(result);
    } catch {
      setError('Er ging iets mis. Probeer het later opnieuw.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4">
      <div className="w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-3xl font-extrabold text-emerald-700">Wachtwoord vergeten</p>
          <p className="mt-1 text-sm text-gray-500">Vul je e-mailadres in en we sturen je een resetlink.</p>
        </div>

        {message ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-700">{message}</p>
            <Link
              href="/login"
              className="block w-full rounded-xl bg-emerald-600 py-2 text-center font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Terug naar inloggen
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value.toLowerCase())}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none ring-emerald-200 focus:ring"
              />
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-emerald-600 py-2 font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {isSubmitting ? 'Bezig...' : 'Verstuur resetlink'}
            </button>

            <p className="text-center text-sm text-gray-600">
              <Link href="/login" className="font-medium text-emerald-700 hover:underline">
                Terug naar inloggen
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
