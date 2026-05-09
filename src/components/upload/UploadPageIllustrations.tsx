'use client';

import React from 'react';

/** Carpeta + archivo Excel emergente — zona de drop */
export function IllustrationFolderExcel({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="uf-folder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="uf-sheet" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ecfdf5" />
          <stop offset="100%" stopColor="#d1fae5" />
        </linearGradient>
        <filter id="uf-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.18" />
        </filter>
      </defs>
      <ellipse cx="100" cy="138" rx="72" ry="10" fill="#0f172a" opacity="0.06" />
      <path
        filter="url(#uf-shadow)"
        d="M28 108V52c0-4 4-8 8-8h38l14 14h74c8 0 14 6 14 14v52c0 6-5 10-11 10H38c-6 0-11-5-11-11"
        fill="url(#uf-folder)"
      />
      <path d="M28 108V74h144v34c0 6-5 11-11 11H38c-6 0-11-5-11-11Z" fill="#3b82f6" opacity="0.9" />
      <rect x="78" y="28" width="76" height="92" rx="8" fill="url(#uf-sheet)" filter="url(#uf-shadow)" />
      <rect x="84" y="36" width="64" height="8" rx="2" fill="#34d399" opacity="0.35" />
      <rect x="84" y="50" width="48" height="6" rx="2" fill="#cbd5e1" />
      <rect x="84" y="62" width="56" height="6" rx="2" fill="#cbd5e1" opacity="0.7" />
      <rect x="100" y="78" width="36" height="36" rx="6" fill="#22c55e" />
      <text x="118" y="102" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold" fontFamily="system-ui,sans-serif">
        X
      </text>
    </svg>
  );
}

/** Portapapeles + íconos — caja información azul */
export function IllustrationClipboardTarget({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 140" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="uc-board" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>
      <rect x="20" y="24" width="72" height="96" rx="10" fill="url(#uc-board)" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="38" y="12" width="36" height="18" rx="6" fill="#cbd5e1" />
      <circle cx="40" cy="52" r="5" fill="#22c55e" />
      <rect x="50" y="48" width="34" height="4" rx="2" fill="#94a3b8" />
      <circle cx="40" cy="68" r="5" fill="#22c55e" />
      <rect x="50" y="64" width="28" height="4" rx="2" fill="#94a3b8" />
      <circle cx="40" cy="84" r="5" fill="#e2e8f0" />
      <rect x="50" y="80" width="38" height="4" rx="2" fill="#cbd5e1" />
      <circle cx="88" cy="100" r="26" fill="#e9d5ff" stroke="#a855f7" strokeWidth="2" opacity="0.95" />
      <circle cx="88" cy="100" r="14" fill="#fce7f3" stroke="#db2777" strokeWidth="1.5" />
      <circle cx="88" cy="100" r="5" fill="#be123c" />
    </svg>
  );
}

/** Escudo + check — formato teléfonos */
export function IllustrationShieldCheck({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 130" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="ush-shield" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <path
        d="M60 12 L98 26 V58c0 28-18 54-38 62-20-8-38-34-38-62V26L60 12Z"
        fill="url(#ush-shield)"
        stroke="#2563eb"
        strokeWidth="2"
      />
      <path
        d="M52 72 L72 92 L94 62"
        fill="none"
        stroke="#22c55e"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="60" cy="52" fill="#bfdbfe" r="28" opacity="0.35" />
    </svg>
  );
}

/** Dianas — consejos */
export function IllustrationTargetArrow({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 140" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <ellipse cx="70" cy="125" rx="48" ry="8" fill="#0f172a" opacity="0.06" />
      <circle cx="72" cy="66" r="52" fill="#f5f3ff" stroke="#ddd6fe" strokeWidth="4" />
      <circle cx="72" cy="66" r="38" fill="#ede9fe" stroke="#c4b5fd" strokeWidth="3" />
      <circle cx="72" cy="66" r="24" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
      <circle cx="72" cy="66" r="10" fill="#dc2626" />
      <path
        d="M132 24 L112 72 L94 62 L132 24Z"
        fill="#7c3aed"
        stroke="#5b21b6"
        strokeWidth="1"
      />
      <path d="M116 52 L132 24 L138 54 Z" fill="#a78bfa" />
    </svg>
  );
}

/** Badge mini Excel para vista previa */
export function IllustrationMiniExcelBadge({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="8" y="10" width="32" height="36" rx="4" fill="#ecfdf5" stroke="#22c55e" strokeWidth="2" />
      <path d="M18 38 h12 M18 32 h18 M18 26 h14" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <rect x="24" y="14" width="14" height="14" rx="3" fill="#22c55e" />
      <text x="31" y="25" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
        X
      </text>
    </svg>
  );
}
