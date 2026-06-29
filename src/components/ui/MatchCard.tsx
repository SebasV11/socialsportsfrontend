import { GameMatch } from '@/types';

interface MatchCardProps {
  match: GameMatch;
}

const statusStyles: Record<GameMatch['status'], { badge: string; label: string }> = {
  pending: { badge: 'bg-amber-100 text-amber-700 border-amber-300', label: 'In afwachting' },
  accepted: { badge: 'bg-emerald-100 text-emerald-700 border-emerald-300', label: 'Geaccepteerd' },
  declined: { badge: 'bg-red-100 text-red-700 border-red-300', label: 'Afgewezen' },
  cancelled: { badge: 'bg-gray-200 text-gray-700 border-gray-300', label: 'Geannuleerd' },
  completed: { badge: 'bg-blue-100 text-blue-700 border-blue-300', label: 'Voltooid' },
};

const sportEmojis: Record<string, string> = {
  'Voetbal': '⚽',
  'Padel': '🎾',
  'Tennis': '🎾',
  'Basketbal': '🏀',
  'Golf': '⛳',
};

export default function MatchCard({ match }: MatchCardProps) {
  const statusInfo = statusStyles[match.status];
  const sportEmoji = sportEmojis[match.sport?.name ?? ''] || '🏅';
  const dateTime = match.scheduled_at || match.played_at;
  const formattedDate = dateTime ? new Date(dateTime).toLocaleDateString('nl-NL', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  }) : 'Datum volgt';
  const formattedTime = dateTime ? new Date(dateTime).toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit'
  }) : '-';

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{sportEmoji}</span>
            <h3 className="font-semibold text-gray-900 text-lg">{match.sport?.name ?? 'Onbekende sport'}</h3>
          </div>

          <div className="mt-3 space-y-1">
            <p className="text-sm font-medium text-gray-900">
              {formattedTime} · {formattedDate}
            </p>
            <p className="text-sm text-gray-600">
              {match.location_name ?? 'Locatie volgt'}
              {match.location_city ? ` • ${match.location_city.trim()}` : ''}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold border whitespace-nowrap ${statusInfo.badge}`}>
          {statusInfo.label}
        </span>
      </div>
    </article>
  );
}
