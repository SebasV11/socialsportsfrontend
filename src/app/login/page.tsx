'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Vul zowel je e-mailadres als wachtwoord in.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch {
      setError('Inloggen is mislukt. Controleer je gegevens en probeer opnieuw.');
      setPassword('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4">
      <div className="w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-3xl font-extrabold text-emerald-700">SportMatch</p>
          <p className="mt-1 text-sm text-gray-500">Vind een gelijkwaardige tegenstander in jouw buurt</p>
        </div>

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

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none ring-emerald-200 focus:ring"
            />
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="text-right">
            <Link href="/forgot-password" className="text-sm font-medium text-emerald-700 hover:underline">
              Wachtwoord vergeten?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-emerald-600 py-2 font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {isSubmitting ? 'Bezig met inloggen...' : 'Inloggen'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Nog geen account?{' '}
          <Link href="/register" className="font-medium text-emerald-700 hover:underline">
            Registreer hier
          </Link>
        </p>
      </div>
    </main>
  );
}
