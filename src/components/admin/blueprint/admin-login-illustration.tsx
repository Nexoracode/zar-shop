// Small hand-built vector for the admin login side panel: a tilted dashboard card stack with a
// verified/secure-access badge, in the same accent palette as the rest of the Blueprint dark
// theme. No external asset dependency, so it can't ever 404 or fail to load.
export function AdminLoginIllustration() {
  return (
    <svg viewBox="0 0 320 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[260px]" aria-hidden="true">
      <defs>
        <linearGradient id="admin-login-card-back" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#597ea3" />
          <stop offset="1" stopColor="#2c455d" />
        </linearGradient>
        <linearGradient id="admin-login-card-front" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5f5f8" />
          <stop offset="1" stopColor="#d4d4d7" />
        </linearGradient>
        <linearGradient id="admin-login-badge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b5d9fd" />
          <stop offset="1" stopColor="#416180" />
        </linearGradient>
        <filter id="admin-login-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#0b1420" floodOpacity="0.35" />
        </filter>
      </defs>

      <g filter="url(#admin-login-shadow)">
        <g transform="rotate(-8 160 150)">
          <rect x="60" y="70" width="190" height="130" rx="18" fill="url(#admin-login-card-back)" />
        </g>
        <g transform="rotate(5 160 150)">
          <rect x="70" y="95" width="190" height="140" rx="18" fill="url(#admin-login-card-front)" />
          <rect x="92" y="118" width="80" height="8" rx="4" fill="#98989b" />
          <rect x="92" y="134" width="50" height="6" rx="3" fill="#c4c4c7" />
          <rect x="92" y="178" width="16" height="36" rx="4" fill="#749dc4" />
          <rect x="116" y="160" width="16" height="54" rx="4" fill="#416180" />
          <rect x="140" y="190" width="16" height="24" rx="4" fill="#94bce3" />
          <rect x="164" y="170" width="16" height="44" rx="4" fill="#597ea3" />
        </g>
        <circle cx="235" cy="95" r="34" fill="url(#admin-login-badge)" />
        <path d="M222 95l9 9 17-19" stroke="#f5f5f8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <circle cx="46" cy="232" r="5" fill="#749dc4" opacity="0.55" />
      <circle cx="274" cy="214" r="4" fill="#94bce3" opacity="0.5" />
      <circle cx="38" cy="86" r="3" fill="#b5d9fd" opacity="0.5" />
      <circle cx="285" cy="150" r="3.5" fill="#749dc4" opacity="0.4" />
    </svg>
  );
}
