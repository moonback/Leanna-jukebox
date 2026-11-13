import type { CSSProperties } from 'react';
import type { IllustrationKey } from './illustrationKeys';

interface IllustrationProps {
  name: IllustrationKey;
  className?: string;
  label?: string;
  style?: CSSProperties;
}

/** Illustrations vectorielles intégrées : aucun fichier image à charger, rendu net sur tous les écrans. */
export function Illustration({ name, className, label, style }: IllustrationProps) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 120 120"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {renderArt(name)}
    </svg>
  );
}

function Face({ cx = 60, cy = 66, eye = '#4a3b52' }: { cx?: number; cy?: number; eye?: string }) {
  return (
    <g>
      <circle cx={cx - 14} cy={cy} r="4.5" fill={eye} />
      <circle cx={cx + 14} cy={cy} r="4.5" fill={eye} />
      <circle cx={cx - 13} cy={cy - 1.5} r="1.4" fill="#fff" />
      <circle cx={cx + 15} cy={cy - 1.5} r="1.4" fill="#fff" />
      <ellipse cx={cx - 22} cy={cy + 10} rx="6" ry="3.6" fill="#ff9eb9" opacity="0.7" />
      <ellipse cx={cx + 22} cy={cy + 10} rx="6" ry="3.6" fill="#ff9eb9" opacity="0.7" />
      <path d={`M ${cx - 6} ${cy + 9} Q ${cx} ${cy + 16} ${cx + 6} ${cy + 9}`} fill="none" stroke="#4a3b52" strokeWidth="2.6" strokeLinecap="round" />
    </g>
  );
}

function renderArt(name: IllustrationKey) {
  switch (name) {
    case 'bear':
      return (
        <g>
          <circle cx="30" cy="34" r="14" fill="#d9a77b" />
          <circle cx="90" cy="34" r="14" fill="#d9a77b" />
          <circle cx="30" cy="34" r="7" fill="#f3d3b5" />
          <circle cx="90" cy="34" r="7" fill="#f3d3b5" />
          <circle cx="60" cy="62" r="38" fill="#d9a77b" />
          <ellipse cx="60" cy="78" rx="16" ry="12" fill="#f3d3b5" />
          <ellipse cx="60" cy="72" rx="5" ry="3.6" fill="#4a3b52" />
          <Face />
        </g>
      );
    case 'bunny':
      return (
        <g>
          <ellipse cx="46" cy="30" rx="9" ry="28" fill="#f4eeff" stroke="#d7c8f2" strokeWidth="2" />
          <ellipse cx="74" cy="30" rx="9" ry="28" fill="#f4eeff" stroke="#d7c8f2" strokeWidth="2" />
          <ellipse cx="46" cy="30" rx="4" ry="18" fill="#ffc2d6" />
          <ellipse cx="74" cy="30" rx="4" ry="18" fill="#ffc2d6" />
          <circle cx="60" cy="72" r="36" fill="#f4eeff" stroke="#d7c8f2" strokeWidth="2" />
          <Face cy={70} />
        </g>
      );
    case 'fox':
      return (
        <g>
          <path d="M 22 40 L 40 14 L 52 44 Z" fill="#f08a4b" />
          <path d="M 98 40 L 80 14 L 68 44 Z" fill="#f08a4b" />
          <path d="M 60 30 C 90 30 100 60 90 90 C 80 108 40 108 30 90 C 20 60 30 30 60 30 Z" fill="#f6a46b" />
          <path d="M 60 62 C 72 62 80 74 76 92 C 70 100 50 100 44 92 C 40 74 48 62 60 62 Z" fill="#fff3e6" />
          <Face cy={66} />
        </g>
      );
    case 'cat':
      return (
        <g>
          <path d="M 28 46 L 32 16 L 52 34 Z" fill="#c9c3e6" />
          <path d="M 92 46 L 88 16 L 68 34 Z" fill="#c9c3e6" />
          <ellipse cx="60" cy="64" rx="40" ry="36" fill="#c9c3e6" />
          <path d="M 44 40 L 46 52 M 60 36 L 60 50 M 76 40 L 74 52" stroke="#a79dd6" strokeWidth="2.5" strokeLinecap="round" />
          <Face cy={66} />
        </g>
      );
    case 'panda':
      return (
        <g>
          <circle cx="30" cy="34" r="13" fill="#2f2a3d" />
          <circle cx="90" cy="34" r="13" fill="#2f2a3d" />
          <circle cx="60" cy="64" r="40" fill="#fff" stroke="#e8e4f2" strokeWidth="2" />
          <ellipse cx="42" cy="64" rx="11" ry="13" fill="#2f2a3d" transform="rotate(-20 42 64)" />
          <ellipse cx="78" cy="64" rx="11" ry="13" fill="#2f2a3d" transform="rotate(20 78 64)" />
          <circle cx="42" cy="62" r="4" fill="#fff" />
          <circle cx="78" cy="62" r="4" fill="#fff" />
          <ellipse cx="60" cy="80" rx="5" ry="3.6" fill="#2f2a3d" />
          <path d="M 53 86 Q 60 92 67 86" fill="none" stroke="#2f2a3d" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      );
    case 'star':
      return (
        <g>
          <path
            d="M 60 8 L 74 42 L 110 44 L 82 66 L 92 102 L 60 82 L 28 102 L 38 66 L 10 44 L 46 42 Z"
            fill="#ffd86b"
            stroke="#f2b84b"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <Face cy={62} />
        </g>
      );
    case 'cloud':
      return (
        <g>
          <circle cx="40" cy="62" r="22" fill="#e7f3ff" />
          <circle cx="66" cy="50" r="28" fill="#e7f3ff" />
          <circle cx="86" cy="68" r="20" fill="#e7f3ff" />
          <rect x="22" y="62" width="82" height="28" rx="14" fill="#e7f3ff" />
          <Face cx={60} cy={70} />
        </g>
      );
    case 'rainbow':
      return (
        <g fill="none" strokeLinecap="round">
          <path d="M 14 92 A 46 46 0 0 1 106 92" stroke="#ff9eb9" strokeWidth="11" />
          <path d="M 24 92 A 36 36 0 0 1 96 92" stroke="#ffd86b" strokeWidth="11" />
          <path d="M 34 92 A 26 26 0 0 1 86 92" stroke="#9ee6c4" strokeWidth="11" />
          <path d="M 44 92 A 16 16 0 0 1 76 92" stroke="#a9d8ff" strokeWidth="11" />
          <ellipse cx="22" cy="98" rx="12" ry="7" fill="#fff" />
          <ellipse cx="98" cy="98" rx="12" ry="7" fill="#fff" />
        </g>
      );
    case 'note':
      return (
        <g>
          <ellipse cx="42" cy="88" rx="16" ry="12" fill="#b9a6f0" transform="rotate(-20 42 88)" />
          <ellipse cx="82" cy="78" rx="16" ry="12" fill="#ffb6cf" transform="rotate(-20 82 78)" />
          <rect x="54" y="22" width="6" height="66" rx="3" fill="#5f4f8a" />
          <rect x="94" y="14" width="6" height="66" rx="3" fill="#5f4f8a" />
          <path d="M 54 22 Q 70 26 100 14 L 100 26 Q 70 36 54 32 Z" fill="#5f4f8a" />
        </g>
      );
    case 'sun':
      return (
        <g>
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x="56" y="4" width="8" height="16" rx="4" fill="#ffc857" transform={`rotate(${i * 45} 60 60)`} />
          ))}
          <circle cx="60" cy="60" r="34" fill="#ffd166" />
          <Face cy={62} />
        </g>
      );
    default:
      return null;
  }
}
