/* eslint-disable @next/next/no-img-element */

interface UserAvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClassMap: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

export default function UserAvatar({ src, name, size = 'md' }: UserAvatarProps) {
  const sizeClass = sizeClassMap[size];
  const avatarClass = `${sizeClass} aspect-square shrink-0 rounded-full object-cover block`;

  if (src) {
    return <img src={src} alt={`Profielfoto van ${name}`} className={avatarClass} />;
  }

  return (
    <div className={`${sizeClass} aspect-square shrink-0 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-700`} aria-label={`Standaard profielicoon voor ${name}`}>
      <svg viewBox="0 0 24 24" fill="none" className="h-2/3 w-2/3" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 0114 0" />
      </svg>
    </div>
  );
}
