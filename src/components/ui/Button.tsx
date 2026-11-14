import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';
type Size = 'normal' | 'icon' | 'xxl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  /** Obligatoire pour les boutons icône : lecteur d'écran et infobulle. */
  label?: string;
  /** React 19 : la ref est une prop, transmise au <button> via `rest`. */
  ref?: Ref<HTMLButtonElement>;
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
