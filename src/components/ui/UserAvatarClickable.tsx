import { useState } from 'react';
import UserAvatar from './UserAvatar';
import UserProfilePopup from './UserProfilePopup';
import { User } from '@/types';
import { getUserProfileImageUrl } from '@/lib/profile';

interface UserAvatarClickableProps {
  user: User;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export default function UserAvatarClickable({ user, size = 'md', onClick, className }: UserAvatarClickableProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'elo'>('profile');

  const openPopup = () => {
    setActiveTab('profile');
    setIsPopupOpen(true);
  };

  return (
    <>
      <div
        onClick={onClick ?? openPopup}
        className={`inline-block cursor-pointer transition-transform duration-200 hover:scale-110 ${className ?? ''}`}
      >
        <div className="rounded-full ring-2 ring-transparent transition-colors hover:ring-emerald-400">
          <UserAvatar src={getUserProfileImageUrl(user)} name={user.name} size={size} />
        </div>
      </div>

      <UserProfilePopup
        user={user}
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </>
  );
}
