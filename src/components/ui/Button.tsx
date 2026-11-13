import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';
type Size = 'normal' | 'icon' | 'xxl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  /** Obligatoire pour les boutons icône : lecteur d'écran et infobulle. */
  label?: string;
}

export function Button({ variant = 'secondary', size = 'normal', icon, label, children, className = '', type = 'button', ...rest }: ButtonProps) {
  const classes = ['btn', `btn--${variant}`, size === 'icon' ? 'btn--icon' : '', size === 'xxl' ? 'btn--xxl' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={classes} aria-label={label} title={label} {...rest}>
      {icon}
      {children}
    </button>
  );
}
