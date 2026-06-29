'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HistoryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/matches');
  }, [router]);

  return <main className="flex min-h-screen items-center justify-center text-sm text-gray-500">Doorsturen...</main>;
}
