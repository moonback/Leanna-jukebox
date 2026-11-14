import { NavLink } from 'react-router-dom';
import { BookOpen, Home, Library, ListMusic } from 'lucide-react';

const items = [
  { to: '/', label: 'Accueil', icon: Home, end: true },
  { to: '/library', label: 'Bibliothèque', icon: Library, end: false },
  { to: '/list/favorites', label: 'Favoris', icon: ListMusic, end: false },
  { to: '/imagier', label: 'Imagier', icon: BookOpen, end: false },
];

/** Navigation enfant : quatre grandes cibles, espacées pour éviter les mauvaises manipulations. */
export function ChildNavigation() {
  return (
    <nav
      aria-label="Navigation principale"
      className="glass"
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'calc(var(--safe-bottom) + 12px)',
        width: 'min(560px, calc(100% - 32px))',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
        padding: 8,
        zIndex: 20,
      }}
    >
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          aria-label={label}
          style={({ isActive }) => ({
            display: 'grid',
            justifyItems: 'center',
            gap: 2,
            minHeight: 64,
            borderRadius: 20,
            textDecoration: 'none',
            color: 'var(--color-ink)',
            fontWeight: 800,
            fontSize: '0.85rem',
            background: isActive ? 'linear-gradient(135deg, #ffc2d6, #d9ccf6)' : 'transparent',
          })}
        >
          <Icon size={26} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
