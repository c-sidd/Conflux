import React from 'react';

/**
 * Modern vector SVG illustrations for clean empty states and landing visuals.
 */

export const CloudConnectIllustration: React.FC<{ className?: string }> = ({ className = 'w-64 h-48' }) => (
  <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.05" />
      </linearGradient>
      <linearGradient id="hubGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2563EB" />
        <stop offset="100%" stopColor="#1E40AF" />
      </linearGradient>
      <filter id="hubGlow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    {/* Background Soft Glow Ring */}
    <circle cx="160" cy="110" r="85" fill="url(#cloudGrad)" />
    <circle cx="160" cy="110" r="60" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="4 4" />

    {/* Connecting Flow Lines */}
    <path d="M70 70 Q110 85 160 110" stroke="#93C5FD" strokeWidth="2" strokeDasharray="3 3" />
    <path d="M250 70 Q210 85 160 110" stroke="#93C5FD" strokeWidth="2" strokeDasharray="3 3" />
    <path d="M160 180 L160 125" stroke="#93C5FD" strokeWidth="2" strokeDasharray="3 3" />

    {/* Satellite Account 1 (Left - Work Account) */}
    <g transform="translate(45, 45)">
      <rect width="52" height="42" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.04))" />
      <circle cx="26" cy="18" r="9" fill="#EEF2FF" />
      <path d="M21 21 C21 18 23 16 26 16 C29 16 31 18 31 21" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="26" cy="14" r="2.5" fill="#4F46E5" />
      <rect x="14" y="30" width="24" height="3" rx="1.5" fill="#CBD5E1" />
    </g>

    {/* Satellite Account 2 (Right - Personal Account) */}
    <g transform="translate(225, 45)">
      <rect width="52" height="42" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.04))" />
      <circle cx="26" cy="18" r="9" fill="#ECFDF5" />
      <path d="M21 21 C21 18 23 16 26 16 C29 16 31 18 31 21" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="26" cy="14" r="2.5" fill="#059669" />
      <rect x="14" y="30" width="24" height="3" rx="1.5" fill="#CBD5E1" />
    </g>

    {/* Satellite Account 3 (Bottom - Archive Account) */}
    <g transform="translate(134, 160)">
      <rect width="52" height="38" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.04))" />
      <circle cx="26" cy="16" r="8" fill="#FDF2F8" />
      <path d="M21 19 C21 17 23 15 26 15 C29 15 31 17 31 19" stroke="#DB2777" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="26" cy="12" r="2" fill="#DB2777" />
      <rect x="16" y="27" width="20" height="3" rx="1.5" fill="#CBD5E1" />
    </g>

    {/* Central Conflux Nexus Hub */}
    <g transform="translate(132, 82)">
      <circle cx="28" cy="28" r="26" fill="url(#hubGrad)" filter="url(#hubGlow)" />
      {/* Nexus HardDrive Logo */}
      <rect x="18" y="21" width="20" height="13" rx="3" fill="#FFFFFF" />
      <circle cx="23" cy="27" r="1.5" fill="#2563EB" />
      <circle cx="28" cy="27" r="1.5" fill="#2563EB" />
      <path d="M33 27 L34 27" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  </svg>
);

export const EmptyFilesIllustration: React.FC<{ className?: string }> = ({ className = 'w-48 h-36' }) => (
  <svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="folderBack" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#93C5FD" />
        <stop offset="100%" stopColor="#60A5FA" />
      </linearGradient>
      <linearGradient id="folderFront" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
    </defs>

    {/* Soft floor shadow */}
    <ellipse cx="120" cy="142" rx="75" ry="10" fill="#F1F5F9" />

    {/* Back floating document */}
    <g transform="translate(85, 30) rotate(-6)">
      <rect width="64" height="74" rx="6" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
      <rect x="12" y="16" width="38" height="4" rx="2" fill="#E2E8F0" />
      <rect x="12" y="26" width="30" height="4" rx="2" fill="#E2E8F0" />
      <rect x="12" y="36" width="20" height="4" rx="2" fill="#E2E8F0" />
    </g>

    {/* Front floating document */}
    <g transform="translate(100, 38) rotate(4)">
      <rect width="64" height="74" rx="6" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
      <rect x="12" y="16" width="38" height="4" rx="2" fill="#93C5FD" />
      <rect x="12" y="26" width="32" height="4" rx="2" fill="#E2E8F0" />
      <rect x="12" y="36" width="24" height="4" rx="2" fill="#E2E8F0" />
      <circle cx="48" cy="56" r="6" fill="#3B82F6" opacity="0.15" />
    </g>

    {/* Main Folder Back */}
    <path
      d="M55 75 C55 69 59 65 65 65 L95 65 L108 75 L175 75 C181 75 185 79 185 85 L185 130 C185 136 181 140 175 140 L65 140 C59 140 55 136 55 130 Z"
      fill="url(#folderBack)"
    />

    {/* Main Folder Front Flap */}
    <path
      d="M50 88 C50 83 54 80 59 80 L181 80 C186 80 190 83 190 88 L185 130 C185 136 180 140 175 140 L65 140 C60 140 55 136 55 130 Z"
      fill="url(#folderFront)"
    />

    {/* Sparkle decorative accents */}
    <path d="M195 40 L198 47 L205 50 L198 53 L195 60 L192 53 L185 50 L192 47 Z" fill="#FBBF24" />
    <circle cx="45" cy="55" r="3" fill="#60A5FA" />
  </svg>
);

export const EmptyAccountsIllustration: React.FC<{ className?: string }> = ({ className = 'w-48 h-36' }) => (
  <svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <ellipse cx="120" cy="140" rx="70" ry="8" fill="#F1F5F9" />

    {/* Cloud Shape */}
    <path
      d="M80 110 C68 110 58 100 58 88 C58 78 65 69 75 67 C78 52 92 40 108 40 C120 40 131 47 137 57 C142 54 148 52 154 52 C168 52 179 63 179 77 C185 80 189 87 189 94 C189 103 181 110 172 110 Z"
      fill="#EFF6FF"
      stroke="#BFDBFE"
      strokeWidth="2"
    />

    {/* Central Plus / Link Icon Badge */}
    <g transform="translate(104, 72)">
      <circle cx="16" cy="16" r="18" fill="#2563EB" />
      <path d="M16 10 L16 22 M10 16 L22 16" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    </g>

    {/* Little Orbiting Sparkles */}
    <circle cx="60" cy="50" r="2.5" fill="#3B82F6" />
    <circle cx="180" cy="45" r="3" fill="#F59E0B" />
    <circle cx="195" cy="115" r="2" fill="#10B981" />
  </svg>
);

export const EmptyTrashIllustration: React.FC<{ className?: string }> = ({ className = 'w-48 h-36' }) => (
  <svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <ellipse cx="120" cy="140" rx="60" ry="7" fill="#F1F5F9" />

    {/* Trash Can Body */}
    <path d="M85 65 L92 125 C93 130 97 134 102 134 L138 134 C143 134 147 130 148 125 L155 65 Z" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2" />
    <line x1="105" y1="80" x2="108" y2="120" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
    <line x1="120" y1="80" x2="120" y2="120" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
    <line x1="135" y1="80" x2="132" y2="120" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />

    {/* Trash Can Lid */}
    <rect x="78" y="55" width="84" height="8" rx="4" fill="#E2E8F0" stroke="#64748B" strokeWidth="2" />
    <path d="M108 55 C108 50 112 46 116 46 L124 46 C128 46 132 50 132 55" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />

    {/* Sparkles / Clean Vibes */}
    <path d="M165 45 L167 50 L172 52 L167 54 L165 59 L163 54 L158 52 L163 50 Z" fill="#10B981" />
    <path d="M72 85 L74 89 L78 90 L74 92 L72 96 L70 92 L66 90 L70 89 Z" fill="#3B82F6" />
  </svg>
);
