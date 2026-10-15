import React from 'react';

interface AccountBadgeProps {
  email: string | null;
  className?: string;
}

export const AccountBadge: React.FC<AccountBadgeProps> = ({ email, className = '' }) => {
  if (!email) {
    return <span className="text-xs text-slate-400">Unknown account</span>;
  }

  // Consistent color hashing for account badge
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }

  const badgePalettes = [
    'bg-blue-50 text-blue-700 border-blue-200',
    'bg-emerald-50 text-emerald-700 border-emerald-200',
    'bg-purple-50 text-purple-700 border-purple-200',
    'bg-amber-50 text-amber-700 border-amber-200',
    'bg-rose-50 text-rose-700 border-rose-200',
    'bg-indigo-50 text-indigo-700 border-indigo-200',
  ];

  const palette = badgePalettes[Math.abs(hash) % badgePalettes.length];
  const initial = email.charAt(0).toUpperCase();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${palette} ${className}`}
      title={`Stored in Google Drive account: ${email}`}
    >
      <span className="w-3.5 h-3.5 rounded-full bg-current opacity-20 flex items-center justify-center text-[9px] font-bold">
        {initial}
      </span>
      <span className="truncate max-w-[140px]">{email}</span>
    </span>
  );
};
