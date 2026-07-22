const getInitials = (fullName) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
};

const getAvatarColor = (seed) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
        '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E',
        '#F97316', '#EAB308', '#22C55E', '#14B8A6',
        '#06B6D4', '#3B82F6', '#A855F7', '#D946EF'
    ];
    return colors[Math.abs(hash) % colors.length];
};

export const generateInitialsAvatar = (fullName, seed) => {
    const initials = getInitials(fullName);
    const bgColor = getAvatarColor(seed || fullName);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="${bgColor}" rx="50"/>
        <text x="50" y="50" text-anchor="middle" dominant-baseline="central" fill="white" font-size="36" font-weight="700" font-family="system-ui, -apple-system, sans-serif">${initials}</text>
    </svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

export const getInitialsFromName = getInitials;

export const getColorFromSeed = getAvatarColor;
