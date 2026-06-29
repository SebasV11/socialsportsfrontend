'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { chatService } from '@/lib/chat';
import { isProfileComplete } from '@/lib/profile';

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const isActive = (href: string) => pathname === href || (href === '/find-players' && pathname === '/dashboard');
  const showProfileWarning = user ? !isProfileComplete(user) : false;
  const hasPendingRequests = (user?.pending_friend_requests_count ?? 0) > 0;

  useEffect(() => {
    let active = true;

    const loadUnreadCounts = async () => {
      if (!user) {
        if (active) {
          setUnreadMessagesCount(0);
        }
        return;
      }

      try {
        const conversations = await chatService.getConversations();
        if (!active) return;

        const unreadTotal = conversations.reduce((total, conversation) => total + conversation.unread_count, 0);
        setUnreadMessagesCount(unreadTotal);
      } catch {
        if (active) {
          setUnreadMessagesCount(0);
        }
      }
    };

    void loadUnreadCounts();
    const intervalId = window.setInterval(() => {
      void loadUnreadCounts();
    }, 30000);

    const onFocus = () => {
      void loadUnreadCounts();
    };

    window.addEventListener('focus', onFocus);

    return () => {
      active = false;
      window.removeEventListener('focus', onFocus);
      window.clearInterval(intervalId);
    };
  }, [pathname, user]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-emerald-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-center justify-around px-2 py-2">
        <Link
          href="/find-players"
          title="Spelers zoeken"
          aria-label="Spelers zoeken"
          className={`rounded-lg p-2.5 transition-colors ${
            isActive('/find-players') ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-700'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5L12 4l9 7.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 10.5V20h13V10.5" />
          </svg>
        </Link>

        <Link
          href="/scoreboard"
          title="Ranglijst"
          aria-label="Ranglijst"
          className={`rounded-lg p-2.5 transition-colors ${
            isActive('/scoreboard') ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-700'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16" />
            <rect x="5" y="11" width="3" height="6" rx="1" />
            <rect x="10.5" y="8" width="3" height="9" rx="1" />
            <rect x="16" y="5" width="3" height="12" rx="1" />
          </svg>
        </Link>

        <Link
          href="/matches"
          title="Wedstrijden"
          aria-label="Wedstrijden"
          className={`rounded-lg p-2.5 transition-colors ${
            isActive('/matches') ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-700'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 10-2.34 5.66" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7v5h-5" />
          </svg>
        </Link>

        <Link
          href="/chat"
          title="Chat"
          aria-label="Chat"
          className={`relative rounded-lg p-2.5 transition-colors ${
            isActive('/chat') ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-700'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v7A2.5 2.5 0 0117.5 16H10l-4 4v-4H6.5A2.5 2.5 0 014 13.5v-7z" />
          </svg>

          {unreadMessagesCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white" aria-hidden="true">
              {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
            </span>
          )}
        </Link>

        <Link
          href="/profile"
          title="Profiel"
          aria-label="Profiel"
          className={`relative rounded-lg p-2.5 transition-colors ${
            isActive('/profile') ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-700'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 0114 0" />
          </svg>

          {(showProfileWarning || hasPendingRequests) && (
            <span className="absolute right-0.5 top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white" aria-hidden="true">
              !
            </span>
          )}
        </Link>
      </div>
    </nav>
  );
}
