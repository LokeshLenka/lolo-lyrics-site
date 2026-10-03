import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  LayoutDashboard,
  ListMusic,
  LogOut,
  Radio,
  ShieldAlert,
  X,
} from "lucide-react";
import type { ConnectionStatus } from "./types";
import type { Song } from "./types";
import type { Notice } from "./notice";
import { Button, Lamp } from "./primitives";
import { ConfirmDialog } from "./overlays";
import { cn } from "./cn";
import { ADMIN_PATHS, type Route } from "./route";

const NAV: { kind: Route["kind"]; label: string; path: string; icon: typeof LayoutDashboard }[] = [
  { kind: "dashboard", label: "Dashboard", path: ADMIN_PATHS.dashboard, icon: LayoutDashboard },
  { kind: "events", label: "Events", path: ADMIN_PATHS.events, icon: CalendarDays },
  { kind: "library", label: "Library", path: ADMIN_PATHS.library, icon: ListMusic },
  { kind: "live", label: "Live", path: ADMIN_PATHS.live, icon: Radio },
];

function statusLamp(status: ConnectionStatus) {
  if (status === "Connected") return { tone: "ok" as const, word: "Connected" };
  if (status === "Connecting") return { tone: "warn" as const, word: "Connecting" };
  return { tone: "bad" as const, word: "Offline" };
}

/**
 * Admin shell — sidebar navigation, top bar with the blackout lever, and a
 * calm content column. Every admin page wears this; the audience screen
 * stays chromeless.
 */
export function AdminShell({
  route,
  title,
  subtitle,
  status,
  songs,
  activeSongId,
  blackoutLive,
  onBlackout,
  onSignOut,
  navigate,
  headerActions,
  children,
}: {
  route: Route["kind"];
  title: string;
  subtitle?: string;
  status: ConnectionStatus;
  songs: Song[];
  activeSongId: string | null;
  blackoutLive: boolean;
  onBlackout: () => Promise<void>;
  onSignOut: () => void;
  navigate: (to: string) => void;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  const lamp = statusLamp(status);
  const liveSong = songs.find((song) => song.id === activeSongId) ?? null;
  const [asking, setAsking] = useState(false);
  const [askingSignOut, setAskingSignOut] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirmBlackout = async () => {
    setBusy(true);
    try {
      await onBlackout();
    } finally {
      setBusy(false);
      setAsking(false);
    }
  };

  return (
    <div className="admin-shell min-h-dvh text-ink sm:grid sm:grid-cols-[13.5rem_1fr]">
      {/* Sidebar — desktop */}
      <aside className="admin-rail relative sticky top-0 hidden h-dvh flex-col border-r px-3 py-5 sm:flex">
        <button
          type="button"
          onClick={() => navigate(ADMIN_PATHS.dashboard)}
          aria-label="LOLO SYNC dashboard"
          className="px-2 text-left"
        >
          <span className="brand-mark text-[19px] font-bold">
            LOLO <em>SYNC</em>
          </span>
          <span className="mt-0.5 block font-mono text-[10px] tracking-[0.22em] text-ink-3 uppercase">
            Admin
          </span>
        </button>

        <nav aria-label="Admin sections" className="mt-6 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = route === item.kind;
            const Icon = item.icon;
            return (
              <button
                key={item.kind}
                type="button"
                onClick={() => navigate(item.path)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                  active ? "bg-raised text-ink ring-1 ring-hairline-strong" : "text-ink-3 hover:bg-white/[0.04] hover:text-ink-2",
                )}
              >
                <Icon size={17} className={active ? "text-lamp" : undefined} aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3 px-2">
          <div className="min-w-0" aria-live="polite">
            <Lamp tone={liveSong ? "ok" : "idle"}>{liveSong ? "On air" : "Live is blank"}</Lamp>
            {liveSong && (
              <p className="mt-1 line-clamp-2 break-words text-[13px] leading-snug text-ink">
                {liveSong.title}
              </p>
            )}
          </div>
          <Lamp tone={lamp.tone}>{lamp.word}</Lamp>
          <button
            type="button"
            onClick={() => setAskingSignOut(true)}
            className="flex items-center gap-2 text-[13px] font-medium text-ink-3 transition-colors hover:text-ink"
          >
            <LogOut size={15} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        {/* Top bar */}
        <header className="admin-topbar sticky top-0 z-30 border-b backdrop-blur">
          <div className="mx-auto flex admin-content items-center gap-2.5 px-4 py-3 sm:gap-3 sm:px-8">
            <button
              type="button"
              onClick={() => navigate(ADMIN_PATHS.dashboard)}
              aria-label="LOLO SYNC dashboard"
              className="brand-mark text-[17px] font-bold sm:hidden"
            >
              LOLO <em className="text-lamp not-italic">SYNC</em>
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-semibold tracking-[-0.02em]">{title}</h1>
              {subtitle && <p className="truncate text-[12px] text-ink-3">{subtitle}</p>}
            </div>
            {headerActions}
            <Button
              tone="danger"
              size="sm"
              onClick={() => setAsking(true)}
              disabled={!blackoutLive}
              aria-label="Blackout stage"
              title="Blackout stage: stop showing the current song on audience screens"
              className="rounded-full px-2.5 sm:px-3.5"
            >
              <ShieldAlert size={15} aria-hidden="true" />
              <span className="hidden sm:inline">Blackout stage</span>
            </Button>
          </div>
          {/* Mobile section nav */}
          <nav
            aria-label="Admin sections"
            className="flex gap-1 overflow-x-auto border-t border-hairline px-3 py-2 sm:hidden"
          >
            {NAV.map((item) => {
              const active = route === item.kind;
              return (
                <button
                  key={item.kind}
                  type="button"
                  onClick={() => navigate(item.path)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                    active ? "bg-raised text-ink" : "text-ink-3 hover:text-ink-2",
                  )}
                >
                  <item.icon size={14} aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </header>

        <main className="admin-content mx-auto w-full flex-1 px-4 py-6 sm:px-8 sm:py-9">{children}</main>
      </div>

      {asking && (
        <ConfirmDialog
          title="Blackout audience screens?"
          body="The current song will stop displaying. Audience screens return to Awaiting Signal; the song stays in the queue."
          confirmLabel="Blackout stage"
          busy={busy}
          onCancel={() => setAsking(false)}
          onConfirm={() => void confirmBlackout()}
        />
      )}
      {askingSignOut && (
        <ConfirmDialog
          title="Sign out?"
          body="You’ll need to sign in again to manage the library, events, and live stage."
          confirmLabel="Sign out"
          cancelLabel="Stay signed in"
          busy={false}
          onCancel={() => setAskingSignOut(false)}
          onConfirm={() => {
            setAskingSignOut(false);
            onSignOut();
          }}
        />
      )}
    </div>
  );
}

/* --- Shared panel pieces: stat cards, filter bars, tables --- */

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="console-stat rounded-2xl border border-hairline bg-panel p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">{label}</p>
        {icon && <span className="text-ink-3">{icon}</span>}
      </div>
      <p className="tnum mt-2 text-[28px] leading-none font-semibold tracking-[-0.02em]">{value}</p>
      {hint && <p className="mt-1.5 truncate text-[12px] text-ink-3">{hint}</p>}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("console-panel rounded-2xl border border-hairline bg-panel", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3 sm:px-5">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="font-mono text-[10px] tracking-[0.14em] text-ink-3 uppercase">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "console-input h-10 w-full rounded-xl border border-hairline bg-console px-3 text-[13px] text-ink transition-colors placeholder:text-ink-3 focus:outline-none";

export const selectClass =
  "console-input h-10 w-full appearance-none rounded-xl border border-hairline bg-console px-3 text-[13px] text-ink transition-colors focus:outline-none";

/* --- Notices: one bar, auto-fades, says what happened --- */

export function NoticeBar({
  notice,
  onDismiss,
}: {
  notice: Notice | null;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden rounded-xl border border-hairline"
        >
          <div
            className={cn(
              "flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]",
              notice.tone === "bad" ? "bg-signal-bad/10 text-signal-bad" : "bg-white/[0.04] text-ink-2",
            )}
          >
            <span>{notice.text}</span>
            <div className="flex items-center gap-2">
              {notice.action && (
                <button
                  type="button"
                  onClick={() => {
                    notice.action!.onClick();
                    onDismiss();
                  }}
                  className="shrink-0 font-medium text-lamp transition-colors hover:text-lamp/80"
                >
                  {notice.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss"
                className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
