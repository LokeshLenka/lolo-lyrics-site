import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, Search, X } from "lucide-react";
import {
  DEFAULT_COLOR,
  GRADIENTS,
  getGradientCss,
  type Song,
  type SongPayload,
} from "./types";
import { Button } from "./primitives";
import { cn } from "./cn";

function useDismiss(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);
}

function Scrim({
  children,
  onBackdropClick,
}: {
  children: ReactNode;
  /** Only pickers dismiss on a backdrop tap — editors hold unsaved text,
   *  confirms need an explicit choice. */
  onBackdropClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onBackdropClick?.();
      }}
      className="fixed inset-0 z-50 flex bg-console/85 backdrop-blur-sm"
    >
      {children}
    </motion.div>
  );
}

/* --- Song editor: protected focus earns the modal (a long lyrics field) --- */

export function SongEditor({
  song,
  nextOrder,
  saving,
  onClose,
  onSave,
}: {
  song: Song | null;
  nextOrder: number;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: SongPayload, editing: Song | null) => Promise<void>;
}) {
  useDismiss(true, onClose);

  const [title, setTitle] = useState(song?.title ?? "");
  const [lyrics, setLyrics] = useState(song ? song.lyrics.join("\n") : "");
  const [color, setColor] = useState(song?.color ?? DEFAULT_COLOR);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError("Give the song a title.");
    if (!lyrics.trim()) return setError("Add at least one lyric line.");

    setError("");
    try {
      await onSave(
        {
          title: title.trim(),
          lyrics: lyrics.trim(),
          color,
          sort_order: song?.sortOrder ?? nextOrder,
        },
        song,
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the song.");
    }
  };

  const lineCount = lyrics.split("\n").length;

  return (
    <Scrim>
      <div className="flex w-full items-center justify-center p-0 sm:p-6">
        <motion.form
          role="dialog"
          aria-modal="true"
          aria-label={song ? `Edit ${song.title}` : "Add a song"}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          onSubmit={(e) => void submit(e)}
          className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden border border-hairline bg-panel sm:max-h-[90dvh] sm:rounded-xl"
        >
          <header className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4">
            <div>
              <h2 className="text-[17px] font-semibold tracking-[-0.02em]">
                {song ? "Edit song" : "New song"}
              </h2>
              <p className="mt-0.5 text-[12px] text-ink-3">
                {song ? `Song ${song.id} · in the library and every setlist` : "Saved to the song library"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid size-9 place-items-center rounded-md text-ink-3 transition-colors hover:bg-white/6 hover:text-ink"
            >
              <X size={18} />
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <label className="block">
              <span className="text-[11px] font-medium tracking-[0.1em] text-ink-3 uppercase">
                Title
              </span>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 h-11 w-full border border-hairline bg-console px-3 text-sm text-ink transition-colors placeholder:text-ink-3 focus:border-lamp/60 focus:outline-none"
                placeholder="Nuvvunte Chaley"
              />
            </label>

            <label className="block">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] font-medium tracking-[0.1em] text-ink-3 uppercase">
                  Lyrics — one line per row
                </span>
                <span className="tnum font-mono text-[11px] text-ink-3">{lineCount} lines</span>
              </span>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                rows={10}
                spellCheck={false}
                className="mt-2 w-full resize-y border border-hairline bg-console px-3 py-2.5 font-mono text-[13px] leading-6 text-ink transition-colors placeholder:text-ink-3 focus:border-lamp/60 focus:outline-none"
                placeholder={"Oka Chooputo Naalone Puttinde\nEdo Vintaga Gundelo Cherinde"}
              />
            </label>

            <fieldset>
              <legend className="text-[11px] font-medium tracking-[0.1em] text-ink-3 uppercase">
                Audience background
              </legend>
              <div className="mt-2 grid grid-cols-7 gap-1.5">
                {GRADIENTS.map((gradient) => (
                  <button
                    key={gradient.id}
                    type="button"
                    onClick={() => setColor(gradient.id)}
                    aria-label={`Background ${gradient.id.replace(/from-|via-|to-/g, "")}`}
                    aria-pressed={color === gradient.id}
                    className={cn(
                      "h-9 border transition-[border-color,transform] duration-150 hover:scale-[1.04]",
                      color === gradient.id
                        ? "border-lamp"
                        : "border-hairline hover:border-hairline-strong",
                    )}
                    style={{ backgroundImage: getGradientCss(gradient.id) }}
                  />
                ))}
              </div>
              <p className="mt-2 text-[12px] text-ink-3">
                Painted behind the lyrics on the audience screen.
              </p>
            </fieldset>

            {error && (
              <p role="alert" className="border border-signal-bad/40 bg-signal-bad/10 px-3 py-2 text-[13px] text-signal-bad">
                {error}
              </p>
            )}
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-hairline px-5 py-4">
            <Button size="lg" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" tone="lamp" size="lg" disabled={saving}>
              {saving ? "Saving…" : song ? "Save changes" : "Add to library"}
            </Button>
          </footer>
        </motion.form>
      </div>
    </Scrim>
  );
}

/* --- Confirm: destructive actions get one honest question --- */

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel = "Keep it",
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useDismiss(true, onCancel);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  return (
    <Scrim>
      <div className="flex w-full items-center justify-center p-4">
        <motion.div
          role="alertdialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md border border-hairline bg-panel p-5"
        >
          <h2 className="text-[17px] font-semibold tracking-[-0.02em]">{title}</h2>
          <p className="mt-2 text-[13px] leading-5 text-ink-2">{body}</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button size="lg" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button ref={confirmRef} tone="danger" size="lg" onClick={onConfirm} disabled={busy}>
              {busy ? "Working…" : confirmLabel}
            </Button>
          </div>
        </motion.div>
      </div>
    </Scrim>
  );
}

/* --- Add songs: pickers are ruled lists inside a sheet — cards stay on screens --- */

export function AddSongsSheet({
  songs,
  inSetlistIds,
  onAdd,
  onClose,
}: {
  songs: Song[];
  inSetlistIds: Set<string>;
  onAdd: (song: Song) => Promise<void>;
  onClose: () => void;
}) {
  useDismiss(true, onClose);

  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const needle = query.trim().toLowerCase();
  const filtered = needle ? songs.filter((song) => song.title.toLowerCase().includes(needle)) : songs;

  const add = async (song: Song) => {
    if (pending !== null) return;
    setPending(song.id);
    try {
      await onAdd(song);
    } finally {
      setPending(null);
    }
  };

  return (
    <Scrim onBackdropClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Add songs"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="ml-auto flex h-full w-full max-w-md flex-col border-l border-hairline bg-panel"
      >
        <header className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
          <div>
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Add songs</h2>
            <p className="mt-0.5 text-[12px] text-ink-3">
              Tap a song to add it to the running order.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-md text-ink-3 transition-colors hover:bg-white/6 hover:text-ink"
          >
            <X size={18} />
          </button>
        </header>

        <div className="border-b border-hairline px-4 py-3">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
            />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search songs"
              aria-label="Search songs"
              className="h-10 w-full border border-hairline bg-console pr-3 pl-9 text-sm text-ink transition-colors placeholder:text-ink-3 focus:border-lamp/60 focus:outline-none"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <p className="text-[13px] text-ink-3">No songs match “{query}”.</p>
              <Button size="sm" onClick={() => setQuery("")}>
                Clear search
              </Button>
            </div>
          ) : (
            <ul>
              {filtered.map((song) => {
                const inOrder = inSetlistIds.has(song.id) || pending === song.id;
                return (
                  <li key={song.id} className="border-b border-hairline last:border-b-0">
                    {inOrder ? (
                      <div
                        data-state="in-order"
                        className="flex w-full items-center gap-3 bg-signal-ok/10 px-4 py-3"
                      >
                        <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">
                          {song.title}
                          <span className="sr-only">, in the running order</span>
                        </span>
                        <Check size={15} aria-hidden="true" className="shrink-0 text-signal-ok" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        data-state="addable"
                        onClick={() => void add(song)}
                        aria-label={`Add ${song.title} to the running order`}
                        className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-lamp active:bg-white/[0.08]"
                      >
                        <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">
                          {song.title}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-ink-3 transition-colors group-hover:text-lamp">
                          <Plus size={14} />
                          Add
                        </span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </motion.div>
    </Scrim>
  );
}

export function Overlays({ children }: { children: ReactNode }) {
  return <AnimatePresence>{children}</AnimatePresence>;
}
