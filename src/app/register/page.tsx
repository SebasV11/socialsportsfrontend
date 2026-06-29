'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  password_confirmation?: string;
  city?: string;
  form?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [city, setCity] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): FieldErrors => {
    const nextErrors: FieldErrors = {};

    if (!name.trim()) nextErrors.name = 'Naam is verplicht.';
    if (!email.trim()) nextErrors.email = 'E-mail is verplicht.';
    if (password.length < 8) nextErrors.password = 'Wachtwoord moet minimaal 8 tekens hebben.';
    if (password !== passwordConfirmation) {
      nextErrors.password_confirmation = 'Wachtwoorden komen niet overeen.';
    }

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
        city: city.trim() || undefined,
      });
      router.push('/profile');
    } catch {
      setErrors({ form: 'Registreren is mislukt. Probeer het later opnieuw.' });
      setPassword('');
      setPasswordConfirmation('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4">
      <div className="w-full max-w-lg rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
        <h1 className="mb-5 text-center text-2xl font-bold text-emerald-700">Account aanmaken</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
              Naam
            </label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none ring-emerald-200 focus:ring"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

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
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
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
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
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
            {errors.password_confirmation && <p className="mt-1 text-xs text-red-600">{errors.password_confirmation}</p>}
          </div>

          <div>
            <label htmlFor="city" className="mb-1 block text-sm font-medium text-gray-700">
              Stad (optioneel)
            </label>
            <input
              id="city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none ring-emerald-200 focus:ring"
            />
            {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
          </div>

          {errors.form && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-emerald-600 py-2 font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {isSubmitting ? 'Bezig met registreren...' : 'Registreren'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Heb je al een account?{' '}
          <Link href="/login" className="font-medium text-emerald-700 hover:underline">
            Terug naar login
          </Link>
        </p>
      </div>
    </main>
  );
}
