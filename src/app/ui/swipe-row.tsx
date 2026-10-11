import { Check } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

export interface SwipeAction {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  tone?: 'brand' | 'danger' | 'neutral';
}

export interface SwipeRowProps {
  children: ReactNode;
  /** Revealed on the right by swiping the row to the left. */
  actions: SwipeAction[];
  /** Pressing and holding the row (starts the selection). */
  onLongPress?: () => void;
  /** Selection mode: a tap toggles the row instead of using its content. */
  selecting?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  /** Accessible name of the row's checkbox in selection mode. */
  selectLabel: string;
}

const ACTION_WIDTH = 64;
const LONG_PRESS_MS = 500;
/** Movement that tells a swipe or a scroll from a press. */
const SLOP = 8;

const tones = {
  brand: 'bg-brand text-brand-fg',
  danger: 'bg-danger text-danger-fg',
  neutral: 'bg-surface-3 text-fg',
};

/** Closes the row that is open, so only one shows its actions at a time. */
let closeOpenRow: (() => void) | null = null;

/**
 * A list row with touch shortcuts: swipe left to reveal action icons, press
 * and hold to start a selection. The same actions must stay reachable some
 * other way (a menu): these are shortcuts.
 */
export function SwipeRow({
  children,
  actions,
  onLongPress,
  selecting = false,
  selected = false,
  onToggle,
  selectLabel,
}: SwipeRowProps) {
  const width = actions.length * ACTION_WIDTH;
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const open = offset !== 0 && !dragging;
  // At rest the row is see-through (cover-tinted page backdrops show), and
  // the actions under it hidden; moved, it covers them with the page color.
  const [settling, setSettling] = useState(false);
  const moved = offset !== 0 || dragging || settling;
  const rootRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    base: number;
    mode: 'pending' | 'swipe' | 'scroll';
    /** Latest offset of the swipe (state may lag a frame behind). */
    last: number;
    timer?: ReturnType<typeof setTimeout>;
  } | null>(null);
  // The click that ends a swipe or a long press must not reach the content.
  const swallowClick = useRef(false);

  const close = useCallback(() => {
    // Keep covering the actions while the row slides back.
    if (offset !== 0) setSettling(true);
    setOffset(0);
  }, [offset]);

  useEffect(() => {
    if (!settling) return;
    const id = setTimeout(() => setSettling(false), 220);
    return () => clearTimeout(id);
  }, [settling]);

  useEffect(() => {
    if (!open) return;
    if (closeOpenRow !== close) closeOpenRow?.();
    closeOpenRow = close;
    const onOutside = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onOutside);
      document.removeEventListener('keydown', onKey);
      if (closeOpenRow === close) closeOpenRow = null;
    };
  }, [open, close]);

  useEffect(() => {
    if (selecting) setOffset(0);
  }, [selecting]);

  const endGesture = () => {
    clearTimeout(gesture.current?.timer);
    gesture.current = null;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    endGesture();
    swallowClick.current = false;
    gesture.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      base: offset,
      last: offset,
      mode: 'pending',
      timer: onLongPress
        ? setTimeout(() => {
            if (gesture.current?.mode !== 'pending') return;
            swallowClick.current = true;
            endGesture();
            navigator.vibrate?.(10);
            onLongPress();
          }, LONG_PRESS_MS)
        : undefined,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.mode === 'pending') {
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
      clearTimeout(g.timer);
      if (selecting || width === 0 || Math.abs(dy) >= Math.abs(dx)) {
        g.mode = 'scroll';
        return;
      }
      g.mode = 'swipe';
      setDragging(true);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    if (g.mode === 'swipe') {
      g.last = Math.max(-width, Math.min(0, g.base + dx));
      setOffset(g.last);
    }
  };

  const onPointerEnd = () => {
    const g = gesture.current;
    if (g?.mode === 'swipe') {
      swallowClick.current = true;
      setDragging(false);
      const next = g.last < -width / 2 ? -width : 0;
      if (next === 0 && g.last !== 0) setSettling(true);
      setOffset(next);
    }
    endGesture();
    // The click, if the browser sends one, follows right away.
    if (swallowClick.current)
      setTimeout(() => {
        swallowClick.current = false;
      }, 0);
  };

  return (
    <div
      ref={rootRef}
      // No text selection or iOS callout on a long press.
      className="relative overflow-hidden select-none [-webkit-touch-callout:none]"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onContextMenu={(e) => {
        // A long press opens the context menu on some browsers.
        if (onLongPress) e.preventDefault();
      }}
      onClickCapture={(e) => {
        if (swallowClick.current) {
          swallowClick.current = false;
          e.preventDefault();
          e.stopPropagation();
        } else if (
          open &&
          !(e.target as Element).closest('[data-swipe-action]')
        ) {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
      }}
    >
      {width > 0 && (
        <div
          className={`absolute inset-y-0 right-0 flex ${moved ? '' : 'invisible'}`}
          style={{ width }}
          inert={!open}
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              data-swipe-action
              aria-label={action.label}
              title={action.label}
              onClick={() => {
                close();
                action.onSelect();
              }}
              className={`flex flex-1 items-center justify-center [&>svg]:size-5 ${tones[action.tone ?? 'neutral']}`}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}
      <div
        className={`relative flex items-center ${moved ? 'bg-bg' : ''} ${dragging ? '' : 'transition-transform duration-200'}`}
        style={{
          transform: offset ? `translateX(${offset}px)` : undefined,
          touchAction: 'pan-y',
        }}
      >
        {selecting && (
          <span
            aria-hidden
            className={`mr-2 flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
              selected
                ? 'border-brand bg-brand text-brand-fg'
                : 'border-fg-subtle'
            }`}
          >
            {selected && <Check className="size-4" />}
          </span>
        )}
        <div className="min-w-0 flex-1" inert={selecting}>
          {children}
        </div>
        {selecting && (
          <button
            type="button"
            role="checkbox"
            aria-checked={selected}
            aria-label={selectLabel}
            onClick={onToggle}
            className="absolute inset-0"
          />
        )}
      </div>
    </div>
  );
}

export default SwipeRow;
