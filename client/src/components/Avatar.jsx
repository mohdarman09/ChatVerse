import { useState } from "react";

const AVATAR_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E',
  '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#06B6D4', '#3B82F6', '#A855F7', '#D946EF'
];

function getColorFromSeed(seed) {
  let hash = 0;
  for (let i = 0; i < (seed || '').length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

function Avatar({ src, name, seed, className = '', ...props }) {
  const [imgError, setImgError] = useState(false);

  if (!src || imgError) {
    const initials = getInitials(name);
    const bgColor = getColorFromSeed(seed || name);

    return (
      <div
        className={`flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 ${className}`}
        style={{ backgroundColor: bgColor }}
        {...props}
      >
        <span className="font-bold text-white select-none" style={{ fontSize: 'calc(0.4em + 8px)' }}>
          {initials}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name || 'avatar'}
      className={`rounded-full object-cover flex-shrink-0 ${className}`}
      onError={() => setImgError(true)}
      {...props}
    />
  );
}

export default Avatar;
