import React from 'react';

interface Props {
  size?: number;
}

// Capybara cute with gamepad - Gold Standard Icon
export const CapyLogo: React.FC<Props> = ({ size = 32 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className="drop-shadow-md shrink-0">
      {/* Background glow circle */}
      <circle cx="60" cy="60" r="56" fill="url(#bgGrad)" opacity="0.9" />
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0e4d7a" />
          <stop offset="100%" stopColor="#050d14" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" />

      {/* Capybara body */}
      <ellipse cx="60" cy="66" rx="30" ry="25" fill="#b07c42" />
      {/* Belly */}
      <ellipse cx="60" cy="73" rx="20" ry="14" fill="#9a6830" />
      
      {/* Snout */}
      <ellipse cx="60" cy="66" rx="9" ry="5" fill="#7a4e20" />
      {/* Nostrils */}
      <circle cx="57" cy="65" r="1.5" fill="#3a220f" />
      <circle cx="63" cy="65" r="1.5" fill="#3a220f" />

      {/* Ears */}
      <ellipse cx="35" cy="50" rx="7" ry="9" fill="#9a6830" transform="rotate(-15 35 50)" />
      <ellipse cx="85" cy="50" rx="7" ry="9" fill="#9a6830" transform="rotate(15 85 50)" />
      <ellipse cx="35" cy="50" rx="4" ry="5.5" fill="#c49a6c" transform="rotate(-15 35 50)" />
      <ellipse cx="85" cy="50" rx="4" ry="5.5" fill="#c49a6c" transform="rotate(15 85 50)" />

      {/* Eyes */}
      <ellipse cx="48" cy="56" rx="5" ry="6" fill="#1a1209" />
      <ellipse cx="72" cy="56" rx="5" ry="6" fill="#1a1209" />
      {/* Eye shine */}
      <circle cx="50" cy="54" r="2" fill="#ffffff" />
      <circle cx="74" cy="54" r="2" fill="#ffffff" />
      {/* Cute sparkle */}
      <circle cx="51.5" cy="52.5" r="0.8" fill="#ffffff" />
      <circle cx="75.5" cy="52.5" r="0.8" fill="#ffffff" />

      {/* Blush cheeks */}
      <ellipse cx="40" cy="62" rx="5" ry="3" fill="#f87171" opacity="0.55" />
      <ellipse cx="80" cy="62" rx="5" ry="3" fill="#f87171" opacity="0.55" />

      {/* Smile */}
      <path d="M 53 70 Q 60 76 67 70" stroke="#5a3010" strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* ===== GAMEPAD ===== */}
      {/* Controller body */}
      <rect x="30" y="88" width="60" height="22" rx="11" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
      
      {/* D-Pad left */}
      <rect x="38" y="95" width="8" height="3" rx="1.5" fill="#38bdf8" opacity="0.9" />
      <rect x="40.5" y="92.5" width="3" height="8" rx="1.5" fill="#38bdf8" opacity="0.9" />
      
      {/* ABXY buttons right */}
      <circle cx="77" cy="95" r="2.5" fill="#f97316" opacity="0.9" />   {/* A */}
      <circle cx="83" cy="95" r="2.5" fill="#a3e635" opacity="0.9" />   {/* B */}
      <circle cx="77" cy="101" r="2.5" fill="#38bdf8" opacity="0.9" />  {/* X */}
      <circle cx="83" cy="101" r="2.5" fill="#ec4899" opacity="0.9" />  {/* Y */}

      {/* Start/Select */}
      <rect x="55" y="97" width="5" height="2.5" rx="1.25" fill="#64748b" />
      <rect x="62" y="97" width="5" height="2.5" rx="1.25" fill="#64748b" />

      {/* Shoulder glow */}
      <rect x="34" y="87" width="15" height="4" rx="2" fill="#0ea5e9" opacity="0.4" />
      <rect x="71" y="87" width="15" height="4" rx="2" fill="#0ea5e9" opacity="0.4" />
    </svg>
  );
};
