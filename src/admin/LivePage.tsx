import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  GripVertical,
  ListVideo,
  Pause,
  Play,
  Plus,
  Radio,
  Search,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import type { Song } from "./types";
import type { ScreenProps } from "./actions";
import { AdminShell, Field, Panel, inputClass, selectClass } from "./layout";
import { Button, Lamp, Readout } from "./primitives";
import { useNotice } from "./notice";
import { NoticeBar } from "./layout";
import { AddSongsSheet, ConfirmDialog } from "./overlays";
import { getGradientCss } from "./types";
import { cn } from "./cn";
import { SwipeRow } from "./SwipeRow";

/**
 * Live — enterprise-grade queue runner with drag-and-drop reordering,
 * keyboard shortcuts, skeleton loading, and toast notifications with Undo.
 */
export function LivePage({
  songs,
  events,
  loadSongsForEvent,
  activeSongId,
  playedSongIds,
  status,
  initialized,
  actions,
  navigate,
}: ScreenProps) {
  const { notice, setNotice, clearNotice, fail } = useNotice();

  const [liveEventId, setLiveEventId] = useState<string | null>(null);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueSearch, setQueueSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [stagedId, setStagedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<Song | null>(null);
  const [adding, setAdding] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!initialized) return;
    if (liveEventId === null && events.length > 0) setLiveEventId(events[0].id);
  }, [initialized, events, liveEventId]);

  const reloadQueue = useCallback(
    async (eventId: string) => {
      setLoading(true);
      try {
        setQueue(await loadSongsForEvent(eventId));
      } catch (error) {
        fail(error, "Could not load that event's songs.");
      } finally {
        setLoading(false);
      }
    },
    [loadSongsForEvent, fail],
  );

  useEffect(() => {
    if (liveEventId) {
      setStagedId(null);
      setQueueSearch("");
      void reloadQueue(liveEventId);
    } else {
      setQueue([]);
    }
  }, [liveEventId, reloadQueue]);

  const liveEvent = useMemo(
    () => events.find((e) => e.id === liveEventId) ?? null,
    [events, liveEventId],
  );
  const pendingEvent = useMemo(
    () => events.find((event) => event.id === pendingEventId) ?? null,
    [events, pendingEventId],
  );
  const liveSong = useMemo(
    () => queue.find((s) => s.id === activeSongId) ?? null,
    [queue, activeSongId],
  );
  const stagedSong = useMemo(
    () => queue.find((s) => s.id === stagedId) ?? null,
    [queue, stagedId],
  );
  const inQueueIds = useMemo(() => new Set(queue.map((s) => s.id)), [queue]);
  const visibleQueue = useMemo(() => {
    const needle = queueSearch.trim().toLocaleLowerCase();
    return queue
      .map((song, index) => ({ song, index }))
      .filter(({ song }) => !needle || song.title.toLocaleLowerCase().includes(needle) || song.lyrics.some((line) => line.toLocaleLowerCase().includes(needle)));
  }, [queue, queueSearch]);
  const liveIndex = queue.findIndex((s) => s.id === activeSongId);

  const goLive = useCallback(
    async (id: string | null) => {
      setBusy(true);
      try {
        await actions.setLive(id);
        setStagedId(null);
        if (id !== null) {
          const song = queue.find((s) => s.id === id);
          setNotice({ tone: "ok", text: song ? `"${song.title}" is live.` : "Sent live." });
        }
      } catch (error) {
        fail(error, "Could not send that song live.");
      } finally {
        setBusy(false);
      }
    },
    [actions, queue, fail, setNotice],
  );

  const step = useCallback(
    (direction: 1 | -1) => {
      if (queue.length === 0 || busy) return;
      const next =
        liveIndex >= 0
          ? queue[(liveIndex + direction + queue.length) % queue.length]
          : queue[0];
      setStagedId(next.id);
    },
    [queue, busy, liveIndex],
  );

  const addToQueue = async (song: Song) => {
    if (!liveEventId || inQueueIds.has(song.id)) return;
    try {
      const nextQueue = [song, ...queue];
      await actions.addSongsToEvent(liveEventId, [song.id], queue);
      await actions.reorder("event", liveEventId, nextQueue.map((item) => item.id));
      await reloadQueue(liveEventId);
      setNotice({ tone: "ok", text: `Added "${song.title}" to the top of the queue.` });
    } catch (error) {
      fail(error, "Could not add that song.");
    }
  };

  const removeFromQueue = async (song: Song) => {
    if (!liveEventId) return;
    if (song.id === activeSongId) {
      setNotice({ tone: "bad", text: "Blackout the stage first to stop projecting this song, then remove it from the queue." });
      return;
    }
    const previous = queue;
    const next = queue.filter((s) => s.id !== song.id);
    setQueue(next);
    setRemoving(true);
    try {
      await actions.removeSongFromEvent(liveEventId, song);
      if (stagedId === song.id) setStagedId(null);
      setNotice({
        tone: "ok",
        text: `Removed "${song.title}".`,
        action: { label: "Undo", onClick: () => setQueue(previous) },
      });
    } catch (error) {
      setQueue(previous);
      fail(error, "Could not remove that song.");
    } finally {
      setRemoving(false);
    }
  };

  const moveInQueue = async (index: number, direction: -1 | 1) => {
    if (!liveEventId) return;
    const target = index + direction;
    if (target < 0 || target >= queue.length) return;
    const previous = queue;
    const next = [...queue];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setQueue(next);
    try {
      await actions.reorder("event", liveEventId, next.map((s) => s.id));
    } catch (error) {
      setQueue(previous);
      fail(error, "Could not save the new order. It has been put back.");
    }
  };

  const handleDragStart = useCallback((e: React.DragEvent, songId: string) => {
    setDraggingId(songId);
    e.dataTransfer.setData("song-id", songId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTargetIndex(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      const songId = e.dataTransfer.getData("song-id");
      const sourceIndex = queue.findIndex((s) => s.id === songId);
      setDraggingId(null);
      setDropTargetIndex(null);
      if (sourceIndex === -1 || sourceIndex === targetIndex) return;
      const previous = queue;
      const next = [...queue];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      setQueue(next);
      try {
        await actions.reorder("event", liveEventId!, next.map((s) => s.id));
      } catch (error) {
        setQueue(previous);
        fail(error, "Could not save the new order.");
      }
    },
    [actions, fail, queue, liveEventId],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTargetIndex(null);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "n") {
        e.preventDefault();
        step(1);
      } else if (e.altKey && e.key === "p") {
        e.preventDefault();
        step(-1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step]);

  return (
    <AdminShell
      route="live"
      title="Live"
      subtitle={liveEvent ? liveEvent.name : "Select an event to start"}
      status={status}
      songs={songs}
      activeSongId={activeSongId}
      blackoutLive={activeSongId !== null}
      onBlackout={() => actions.setLive(null)}
      onSignOut={actions.signOut}
      navigate={navigate}
    >
      <NoticeBar notice={notice} onDismiss={clearNotice} />
      <div className="flex flex-col gap-4 pb-16 sm:gap-5 md:pb-0">
        {/* Control bar — event picker + transport */}
        <Panel>
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-end lg:justify-between">
            <Field label="Event on stage" className="lg:flex-1">
              <div className="relative">
                <select
                  value={liveEventId ?? ""}
                  onChange={(e) => {
                    const nextEventId = e.target.value || null;
                    if (nextEventId && nextEventId !== liveEventId) {
                      setPendingEventId(nextEventId);
                    }
                  }}
                  aria-label="Event on stage"
                  className={cn(selectClass, "pr-9")}
                >
                  {events.length === 0 && <option value="">No events yet</option>}
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={15}
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-3"
                />
              </div>
            </Field>
            {/* Transport */}
            <div
              role="group"
              aria-label="Show transport"
              className="flex h-10 w-full items-center justify-center gap-1.5 self-stretch rounded-full border border-hairline bg-console p-0 lg:w-auto lg:self-auto"
            >
              <button
                type="button"
                onClick={() => step(-1)}
                disabled={queue.length === 0 || busy}
                aria-label="Previous song (Alt+P)"
                title="Previous song (Alt+P)"
                className="grid size-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-white/6 hover:text-ink disabled:opacity-30"
              >
                <SkipBack size={16} aria-hidden="true" />
              </button>
              {stagedSong ? (
                <Lamp tone="warn">Staged</Lamp>
              ) : (
                <Button
                  size="sm"
                  onClick={() => step(1)}
                  disabled={queue.length === 0 || busy}
                  className="min-w-28 flex-1 rounded-full"
                >
                  <Play size={14} aria-hidden="true" />
                  {liveSong ? "Stage next" : "Stage first"}
                </Button>
              )}
              <button
                type="button"
                onClick={() => step(1)}
                disabled={queue.length === 0 || busy}
                aria-label="Next song (Alt+N)"
                title="Next song (Alt+N)"
                className="grid size-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-white/6 hover:text-ink disabled:opacity-30"
              >
                <SkipForward size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </Panel>

        {/* Now playing + Up next */}
        <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-5 lg:grid-cols-5">
          {/* Now playing */}
          <section
            aria-label="On stage"
            className="flex h-full min-h-36 flex-col overflow-hidden rounded-2xl border border-hairline bg-panel lg:col-span-3"
          >
            {liveSong ? (
              <div
                className="relative min-h-full flex-1"
                style={{ backgroundImage: getGradientCss(liveSong.color) }}
              >
                <div className="h-full bg-black/45 px-5 py-5 sm:px-6 sm:py-6">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-white/80">
                      On stage
                    </h2>
                    <Lamp tone="ok" pulse>
                      Live
                    </Lamp>
                  </div>
                  <p className="mt-2 max-w-[24ch] text-[19px] leading-tight font-semibold tracking-[-0.02em] text-white">
                    {liveSong.title}
                  </p>
                  <Readout className="mt-2 text-white/60!">
                    {liveSong.lyrics.length} lines on the room screens
                  </Readout>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 text-center sm:px-6">
                <Lamp tone="idle">No song live</Lamp>
                <p className="mt-3 max-w-[32ch] text-[13px] text-ink-3">
                  {!liveEventId
                    ? "Select an event above to load its running order."
                    : queue.length === 0
                      ? "This event has no songs yet — add some below."
                      : "Nothing on stage. Stage a song from the queue, then go live."}
                </p>
              </div>
            )}
          </section>

          {/* Up next */}
          <Panel title="Up next" className="lg:col-span-2">
            <div className="flex flex-col justify-center px-4 pt-4 pb-5 sm:px-5">
              {stagedSong ? (
                <>
                  <Lamp tone="warn">Staged</Lamp>
                  <p className="mt-2 text-[17px] font-semibold tracking-[-0.01em]">
                    {stagedSong.title}
                  </p>
                  <Readout className="mt-1">
                    {stagedSong.lyrics.length} lines ready
                  </Readout>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <Button
                      tone="lamp"
                      size="sm"
                      onClick={() => void goLive(stagedSong.id)}
                      disabled={busy}
                      className="w-full"
                    >
                      <Play size={14} aria-hidden="true" />
                      Push to live
                    </Button>
                    <Button
                      size="sm"
                      tone="ghost"
                      onClick={() => setStagedId(null)}
                      className="w-full"
                    >
                      <Pause size={13} aria-hidden="true" />
                      Clear staged
                    </Button>
                  </div>
                  <div className="mt-3 border-t border-hairline pt-3">
                    <p className="text-[12px] leading-relaxed text-ink-2">
                      Clears only the pending choice. The current song remains live on screen.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Radio size={18} aria-hidden="true" className="text-ink-3" />
                  <p className="mt-2 text-[13px] text-ink-3">
                    Click a queued song to stage it. Push to live sends it to audience screens.
                  </p>
                </>
              )}
            </div>
          </Panel>
        </div>

        {/* Queue */}
        <Panel
          title="Queue"
          action={
            <div className="flex items-center gap-3">
              <Readout>
                {queue.length} {queue.length === 1 ? "song" : "songs"}
              </Readout>
              <Button size="sm" onClick={() => setAdding(true)} disabled={!liveEventId} className="hidden md:inline-flex">
                <Plus size={14} aria-hidden="true" />
                Add songs
              </Button>
            </div>
          }
        >
          {!initialized || loading ? (
            <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 sm:px-5 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex min-h-36 flex-col justify-between border border-hairline bg-console p-4">
                  <div className="h-4 w-5 animate-pulse rounded bg-white/5" />
                  <div className="h-4 flex-1 animate-pulse rounded bg-white/5" />
                  <div className="h-7 w-16 animate-pulse rounded-full bg-white/5" />
                </div>
              ))}
            </div>
          ) : !liveEventId ? (
            <p className="px-4 py-6 text-[13px] text-ink-3 sm:px-5">No event selected.</p>
          ) : queue.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-12 text-center sm:px-5">
              <ListVideo size={24} aria-hidden="true" className="text-ink-3" />
              <p className="mt-3 text-[14px] font-medium">Queue is empty</p>
              <p className="mt-1 max-w-[40ch] text-[13px] text-ink-3">
                Add songs from the library — each new song is placed at the top of this queue.
              </p>
            </div>
          ) : (
            <>
              <div className="px-3 pt-3 sm:px-4">
                <div className="relative">
                  <Search size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
                  <input
                    value={queueSearch}
                    onChange={(event) => setQueueSearch(event.target.value)}
                    placeholder="Search queue"
                    aria-label="Search queued songs"
                    className={cn(inputClass, "h-11 pl-10 pr-10")}
                  />
                  {queueSearch && (
                    <button type="button" onClick={() => setQueueSearch("")} aria-label="Clear queue search" className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center text-ink-3 transition-colors hover:text-ink">
                      <X size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
              {visibleQueue.length === 0 ? (
                <p className="px-4 py-6 text-[13px] text-ink-3 sm:px-5">No songs match this queue search.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 px-3 py-3 sm:grid-cols-2 sm:px-4 xl:grid-cols-3">
                  {visibleQueue.map(({ song, index }) => {
                const isLive = song.id === activeSongId;
                const isStaged = song.id === stagedId;
                const played = playedSongIds.includes(song.id);
                const isDragging = draggingId === song.id;
                const isDropTarget = dropTargetIndex === index && draggingId !== null;
                const draggable = !isLive && !busy;
                const queueCard = (
                  <div
                    className={cn(
                      "group relative flex h-24 min-h-24 cursor-pointer flex-wrap items-center gap-2 border border-hairline bg-console p-3 transition-all duration-200 md:h-auto md:min-h-36 md:p-4",
                      isLive
                        ? "border-signal-ok bg-signal-ok/[0.12] ring-1 ring-signal-ok/65"
                        : isStaged
                          ? "border-signal-warn/80 bg-signal-warn/[0.10] ring-1 ring-signal-warn/45"
                          : "hover:border-hairline-strong hover:bg-white/[0.025]",
                      isDragging && "scale-[0.98] border-dashed border-lamp bg-lamp/10 opacity-70 shadow-[0_12px_30px_rgba(224,64,252,.18)]",
                    )}
                    onClick={() => {
                      if (draggable) setStagedId(song.id);
                    }}
                    onDragOver={(e) => draggable && handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if ((event.key === "Enter" || event.key === " ") && draggable) {
                        event.preventDefault();
                        setStagedId(song.id);
                        return;
                      }
                      if (!event.altKey) return;
                      if (event.key === "ArrowUp" && draggable) {
                        event.preventDefault();
                        void moveInQueue(index, -1);
                      } else if (event.key === "ArrowDown" && draggable) {
                        event.preventDefault();
                        void moveInQueue(index, 1);
                      }
                    }}
                    tabIndex={draggable ? 0 : undefined}
                    role="group"
                    aria-label={`${song.title}, position ${index + 1}. Click to stage. Use the drag handle or Alt plus arrow keys to reorder.`}
                  >
                    {isDropTarget && (
                      <div className="pointer-events-none absolute inset-2 z-20 border-2 border-dashed border-lamp bg-lamp/10" />
                    )}
                    <button
                      type="button"
                      draggable={draggable}
                      disabled={!draggable}
                      onClick={(event) => event.stopPropagation()}
                      onDragStart={(event) => {
                        if (!draggable) return;
                        event.stopPropagation();
                        handleDragStart(event, song.id);
                      }}
                      onDragEnd={handleDragEnd}
                      aria-label={draggable ? `Drag to reorder ${song.title}` : `${song.title} cannot be reordered while live`}
                      title={draggable ? "Drag to reorder" : "Live song cannot be reordered"}
                      data-swipe-ignore
                      className="absolute top-1/2 right-2 z-10 grid size-11 -translate-y-1/2 cursor-grab place-items-center border border-hairline-strong bg-raised p-0 text-ink-2 transition-colors hover:border-lamp/70 hover:bg-lamp-soft hover:text-lamp disabled:cursor-not-allowed disabled:opacity-40 active:cursor-grabbing md:top-2 md:translate-y-0"
                    >
                      <GripVertical size={20} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (draggable) setStagedId(song.id);
                      }}
                      aria-pressed={isStaged}
                      aria-label={`${isStaged ? "Staged" : "Stage"} ${song.title}`}
                      className="order-first basis-full min-w-0 w-full pr-14 text-left text-[17px] leading-snug font-semibold transition-colors hover:text-lamp focus-visible:outline-2 focus-visible:outline-lamp"
                    >
                      <span className={cn("mr-2 font-mono text-[12px] font-medium", isLive ? "text-signal-ok" : "text-ink-3")}>
                        {String(index + 1).padStart(2, "0")}.
                      </span>
                      <span className={cn(isLive ? "text-white" : played && !isLive ? "text-ink-3" : "text-ink")}>
                        {song.title}
                      </span>
                      {isLive && (
                        <span className="ml-2 inline-block border border-signal-ok/70 bg-signal-ok/15 px-2 py-1 font-mono text-[12px] font-semibold tracking-[0.12em] text-signal-ok uppercase">
                          Live now
                        </span>
                      )}
                      {played && !isLive && (
                        <Check size={12} aria-label="Played" className="ml-1.5 inline text-signal-ok" />
                      )}
                      {isStaged && (
                        <span className="ml-2 inline-block border border-signal-warn/70 bg-signal-warn/15 px-2 py-1 font-mono text-[11px] font-semibold tracking-[0.12em] text-signal-warn uppercase">
                          Staged next
                        </span>
                      )}
                    </button>
                    <Readout className="mr-auto ml-1 pr-14">{song.lyrics.length} lines</Readout>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setPendingRemoval(song);
                      }}
                      aria-label={`Remove ${song.title} from the queue`}
                      title="Remove from queue"
                      className="absolute right-2 bottom-2 z-10 hidden size-11 shrink-0 place-items-center border border-hairline-strong bg-raised p-0 text-ink-2 transition-colors hover:border-signal-bad/70 hover:bg-signal-bad/12 hover:text-signal-bad md:grid"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                );
                return (
                  <div key={song.id} className="contents">
                    <div className="md:hidden">
                      <SwipeRow
                        label={song.title}
                        height={96}
                        fullSwipe={false}
                        actions={[{ id: "remove", label: "Remove", icon: <X size={18} aria-hidden="true" />, color: "#ff5964", onSelect: () => setPendingRemoval(song) }]}
                      >
                        {queueCard}
                      </SwipeRow>
                    </div>
                    <div className="hidden md:block">{queueCard}</div>
                  </div>
                );
              })}
                </div>
              )}
            </>
          )}
        </Panel>
      </div>

      <Button
        tone="lamp"
        onClick={() => setAdding(true)}
        disabled={!liveEventId}
        aria-label="Add songs to queue"
        className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 h-12 rounded-none px-4 shadow-lg md:hidden"
      >
        <Plus size={18} aria-hidden="true" />
        Add songs
      </Button>

      {adding && liveEventId && (
        <AddSongsSheet
          songs={songs}
          inSetlistIds={inQueueIds}
          onAdd={addToQueue}
          onClose={() => setAdding(false)}
        />
      )}
      {pendingRemoval && (
        <ConfirmDialog
          title={`Remove ${pendingRemoval.title} from queue?`}
          body="The song will be removed from this event's running order."
          confirmLabel="Remove song"
          busy={removing}
          onCancel={() => {
            if (!removing) setPendingRemoval(null);
          }}
          onConfirm={() => {
            const song = pendingRemoval;
            void removeFromQueue(song).finally(() => setPendingRemoval(null));
          }}
        />
      )}
      {pendingEvent && (
        <ConfirmDialog
          title={`Switch to ${pendingEvent.name}?`}
          body="This loads that event’s queue and clears the staged song. The song currently live on screen will stay live."
          confirmLabel="Switch event"
          cancelLabel="Stay here"
          busy={false}
          onCancel={() => setPendingEventId(null)}
          onConfirm={() => {
            setLiveEventId(pendingEvent.id);
            setPendingEventId(null);
          }}
        />
      )}
    </AdminShell>
  );
}
