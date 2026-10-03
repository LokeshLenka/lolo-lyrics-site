import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import "./SwipeRow.css";

export type SwipeAction = {
  id: string;
  label: string;
  icon?: ReactNode;
  color?: string;
  onSelect: () => void;
};

type SwipeRowProps = {
  children: ReactNode;
  actions: SwipeAction[];
  label: string;
  height: number;
  actionWidth?: number;
  rowColor?: string;
  drawerColor?: string;
  textColor?: string;
  fullSwipe?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Touch-first swipe actions with vertical scrolling and reduced-motion support. */
export function SwipeRow({
  children,
  actions,
  label,
  height,
  actionWidth = 76,
  rowColor = "#08070b",
  drawerColor = "#1a1421",
  textColor = "#f8f4fb",
  fullSwipe = false,
  disabled = false,
  className = "",
  style,
}: SwipeRowProps) {
  const offset = useMotionValue(0);
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const gesture = useRef<{ id: number; x: number; y: number; start: number; horizontal: boolean } | null>(null);
  const revealWidth = actions.length * actionWidth;

  const settle = (nextOpen: boolean) => {
    setOpen(nextOpen);
    void animate(offset, nextOpen ? -revealWidth : 0, {
      type: "spring",
      stiffness: reduceMotion ? 700 : 420,
      damping: 34,
      duration: reduceMotion ? 0.12 : undefined,
    });
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0 || (event.target as HTMLElement).closest("[data-swipe-ignore]")) return;
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      start: offset.get(),
      horizontal: false,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.horizontal && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) current.horizontal = true;
    if (!current.horizontal) return;
    event.preventDefault();
    const maxTravel = fullSwipe ? Math.max(revealWidth, event.currentTarget.clientWidth) : revealWidth;
    offset.set(clamp(current.start + dx, -maxTravel - 20, 20));
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    gesture.current = null;
    if (!current.horizontal) return;
    const commitThreshold = Math.max(event.currentTarget.clientWidth * 0.6, revealWidth + actionWidth / 2);
    if (fullSwipe && offset.get() <= -commitThreshold && actions[0]) {
      settle(false);
      actions[0].onSelect();
      return;
    }
    settle(offset.get() <= -revealWidth * 0.38);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      settle(true);
    } else if (event.key === "ArrowRight" || event.key === "Escape") {
      event.preventDefault();
      settle(false);
    }
  };

  const chooseAction = (action: SwipeAction) => {
    settle(false);
    action.onSelect();
  };

  return (
    <div
      role="group"
      aria-label={label}
      className={`swipe-row${className ? ` ${className}` : ""}`}
      data-open={open ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      style={{
        "--swipe-height": `${height}px`,
        "--swipe-action-width": `${actionWidth}px`,
        "--swipe-row-color": rowColor,
        "--swipe-drawer-color": drawerColor,
        "--swipe-text-color": textColor,
        ...style,
      } as CSSProperties}
    >
      <div className="swipe-row__drawer" aria-hidden={!open}>
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            tabIndex={open ? 0 : -1}
            onClick={() => chooseAction(action)}
            className="swipe-row__action"
            style={{ backgroundColor: action.color ?? drawerColor }}
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>
      <motion.div
        className="swipe-row__surface"
        style={{ x: offset }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
        <button
          type="button"
          className="swipe-row__keyboard-toggle"
          aria-label={`${open ? "Hide" : "Show"} actions for ${label}`}
          aria-expanded={open}
          onKeyDown={onKeyDown}
          onClick={() => settle(!open)}
        >
          {actions.length} {actions.length === 1 ? "action" : "actions"}
        </button>
      </motion.div>
    </div>
  );
}
