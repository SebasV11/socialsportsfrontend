import { User, UserSport } from '@/types';
import { SPORTS } from '@/constants/sports';
import SportBadge from './SportBadge';

interface PlayerCardProps {
  user: User;
  userSport: UserSport;
  onMatchRequest: (userId: number, sportId: number) => void;
}

// Herbruikbaar in Expo: vervang div -> View, p -> Text, button -> TouchableOpacity
export default function PlayerCard({ user, userSport, onMatchRequest }: PlayerCardProps) {
  const sport = SPORTS.find((s) => s.id === userSport.sport_id);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900">{user.name}</p>
          {user.city && <p className="mt-0.5 text-sm text-gray-500">📍 {user.city}</p>}
        </div>
        {sport && <SportBadge sportName={sport.name} color={sport.color} bgColor={sport.bgColor} size="sm" />}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-gray-900">{userSport.elo_rating}</span>
        <span className="text-sm text-gray-400">ELO</span>
      </div>

      <div className="flex gap-3 text-xs text-gray-500">
        <span>{userSport.matches_played} gespeeld</span>
        <span>{userSport.matches_won} gewonnen</span>
      </div>

      <button
        onClick={() => onMatchRequest(user.id, userSport.sport_id)}
        className="w-full rounded-xl bg-green-600 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
      >
        Match aanvragen
      </button>
    </div>
  );
}
