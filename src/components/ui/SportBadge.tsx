interface SportBadgeProps {
  sportName: string;
  color: string;
  bgColor: string;
  size?: 'sm' | 'md';
}

// Herbruikbaar in Expo met kleine aanpassingen (View ipv div, Text ipv span)
export default function SportBadge({ sportName, color, bgColor, size = 'md' }: SportBadgeProps) {
  return (
    <span
      style={{ backgroundColor: bgColor, color, borderColor: color }}
      className={`inline-flex items-center rounded-full border font-medium ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      {sportName}
    </span>
  );
}
