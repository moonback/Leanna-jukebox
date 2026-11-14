import { useRef, useState, type PointerEvent, type ReactNode } from 'react';

interface SwipeRowProps {
  children: ReactNode;
  /** Actions révélées en glissant vers la gauche. */
  rightActions?: ReactNode;
  /** Action révélée en glissant vers la droite. */
  leftAction?: ReactNode;
  /** Largeur (px) des actions de droite. */
  rightWidth?: number;
  /** Largeur (px) de l'action de gauche. */
  leftWidth?: number;
  /** Si défini et change, la ligne se referme. */
  closeSignal?: unknown;
}

/** Ligne glissable (swipe) : révèle des actions à gauche ou à droite, avec rebond magnétique. */
export function SwipeRow({ children, rightActions, leftAction, rightWidth = 150, leftWidth = 84, closeSignal }: SwipeRowProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; locked: boolean | null } | null>(null);
  const justDragged = useRef(false);
  const lastSignal = useRef(closeSignal);
  if (lastSignal.current !== closeSignal) {
    lastSignal.current = closeSignal;
    if (offset !== 0) setOffset(0);
  }

  const min = rightActions ? -rightWidth : 0;
  const max = leftAction ? leftWidth : 0;
  const clamp = (v: number) => Math.max(min - 24, Math.min(max + 24, v));

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, base: offset, locked: null };
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (s.locked === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      s.locked = Math.abs(dx) > Math.abs(dy);
      if (s.locked) {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
      }
    }
    if (s.locked) setOffset(clamp(s.base + dx));
  };
  const onUp = () => {
    const s = start.current;
    start.current = null;
    setDragging(false);
    if (!s?.locked) return;
    justDragged.current = true;
    window.setTimeout(() => { justDragged.current = false; }, 60);
    setOffset((cur) => {
      if (cur < -rightWidth / 3) return min;
      if (cur > leftWidth / 3) return max;
      return 0;
    });
  };

  return (
    <div className="swipe-row">
      {leftAction && (
        <div className="swipe-row__actions swipe-row__actions--left" style={{ width: leftWidth }} aria-hidden={offset <= 0}>
          {leftAction}
        </div>
      )}
      {rightActions && (
        <div className="swipe-row__actions swipe-row__actions--right" style={{ width: rightWidth }} aria-hidden={offset >= 0}>
          {rightActions}
        </div>
      )}
      <div
        className={`swipe-row__content${dragging ? ' is-dragging' : ''}`}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClickCapture={(e) => {
          if (justDragged.current) {
            e.stopPropagation();
            return;
          }
          if (offset !== 0) {
            e.stopPropagation();
            setOffset(0);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
