import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  GripVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Event, Song } from "./types";
import type { ScreenProps } from "./actions";
import { AdminShell, Field, Panel, inputClass, selectClass } from "./layout";
import { Button, Readout } from "./primitives";
import { useNotice } from "./notice";
import { NoticeBar } from "./layout";
import { AddSongsSheet, ConfirmDialog } from "./overlays";
import { cn } from "./cn";

type SortKey = "newest" | "oldest" | "name-asc" | "name-desc" | "most" | "fewest";
type Presence = "all" | "with-songs" | "empty";

const keepSetlistRowsAligned: Modifier = ({ transform }) => ({ ...transform, x: 0 });

function SortableEventSong({
  song,
  index,
  eventName,
  isLive,
  onRemove,
}: {
  song: Song;
  index: number;
  eventName: string;
  isLive: boolean;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: song.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "relative grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-hairline px-3 py-3 last:border-b-0 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:px-5",
        isDragging && "z-10 bg-raised opacity-60 ring-1 ring-lamp/70",
        isOver && !isDragging && "bg-lamp/[0.06]",
      )}
    >
      {isOver && !isDragging && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-1 border-2 border-dashed border-lamp/80" />
      )}
      <Readout className={cn("text-[14px]", isLive && "text-lamp")}>
        {String(index + 1).padStart(2, "0")}
      </Readout>
      <div className="min-w-0">
        <p className="break-words text-[15px] leading-snug font-medium">{song.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-[14px] text-ink-3">
          <span>{song.lyrics.length} {song.lyrics.length === 1 ? "line" : "lines"}</span>
          {isLive && (
            <span className="border border-lamp/50 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.12em] text-lamp uppercase">
              Live now
            </span>
          )}
        </p>
      </div>
      <div className="relative z-10 flex items-center gap-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${song.title}`}
          title="Drag to reorder"
          className="grid size-11 cursor-grab touch-none place-items-center border border-hairline-strong bg-raised text-ink-2 transition-colors hover:border-lamp/70 hover:bg-lamp-soft hover:text-lamp focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lamp active:cursor-grabbing"
        >
          <GripVertical size={19} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${song.title} from ${eventName}`}
          title="Remove from event"
          className="grid size-11 place-items-center text-ink-3 transition-colors hover:bg-signal-bad/10 hover:text-signal-bad focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lamp"
        >
          <X size={17} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

/**
 * Events — an event index beside a focused setlist workspace. Search,
 * filtering, CRUD, and running-order controls stay in one predictable place.
 */
export function EventsPage({
  songs,
  events,
  eventSongCounts,
  loadSongsForEvent,
  activeSongId,
  status,
  initialized,
  actions,
  navigate,
}: ScreenProps) {
  const { notice, setNotice, clearNotice, fail } = useNotice();

  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minSongs, setMinSongs] = useState("");
  const [maxSongs, setMaxSongs] = useState("");
  const [presence, setPresence] = useState<Presence>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const [editing, setEditing] = useState<null | "new" | Event>(null);
  const [nameValue, setNameValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Event | null>(null);

  const [managingId, setManagingId] = useState<string | null>(null);
  const [manageSongs, setManageSongs] = useState<Song[]>([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const min = minSongs === "" ? null : Number(minSongs);
    const max = maxSongs === "" ? null : Number(maxSongs);
    const list = events.filter((event) => {
      const count = eventSongCounts[event.id] ?? 0;
      if (needle && !event.name.toLowerCase().includes(needle)) return false;
      if (dateFrom && event.createdAt.slice(0, 10) < dateFrom) return false;
      if (dateTo && event.createdAt.slice(0, 10) > dateTo) return false;
      if (min !== null && count < min) return false;
      if (max !== null && count > max) return false;
      if (presence === "with-songs" && count === 0) return false;
      if (presence === "empty" && count > 0) return false;
      return true;
    });
    const countOf = (event: Event) => eventSongCounts[event.id] ?? 0;
    switch (sort) {
      case "oldest":
        return [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      case "name-asc":
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return [...list].sort((a, b) => b.name.localeCompare(a.name));
      case "most":
        return [...list].sort((a, b) => countOf(b) - countOf(a));
      case "fewest":
        return [...list].sort((a, b) => countOf(a) - countOf(b));
      case "newest":
      default:
        return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }, [events, eventSongCounts, query, dateFrom, dateTo, minSongs, maxSongs, presence, sort]);

  const filtersActive =
    query !== "" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    minSongs !== "" ||
    maxSongs !== "" ||
    presence !== "all";

  const clearFilters = () => {
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setMinSongs("");
    setMaxSongs("");
    setPresence("all");
  };

  const reloadManaged = async (eventId: string) => {
    setManageLoading(true);
    try {
      setManageSongs(await loadSongsForEvent(eventId));
    } catch (error) {
      fail(error, "Could not load that event's songs.");
    } finally {
      setManageLoading(false);
    }
  };

  useEffect(() => {
    if (managingId) void reloadManaged(managingId);
    else setManageSongs([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managingId]);

  useEffect(() => {
    if (filtered.some((event) => event.id === managingId)) return;
    setManagingId(filtered[0]?.id ?? null);
  }, [filtered, managingId]);

  const openCreate = () => {
    setNameValue("");
    setEditing("new");
  };

  const openRename = (event: Event) => {
    setNameValue(event.name);
    setEditing(event);
  };

  const submitName = async () => {
    const name = nameValue.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      if (editing === "new") {
        await actions.createEvent(name);
        setManagingId(null);
        setNotice({ tone: "ok", text: `Created “${name}”.` });
      } else if (editing) {
        await actions.renameEvent(editing.id, name);
        setNotice({ tone: "ok", text: `Renamed to “${name}”.` });
      }
      setEditing(null);
    } catch (error) {
      fail(error, "Could not save that event.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    if (deleting.id === managingId) setManagingId(null);
    setBusy(true);
    try {
      await actions.deleteEvent(deleting.id);
      setNotice({ tone: "ok", text: `Deleted “${deleting.name}”.` });
      setDeleting(null);
    } catch (error) {
      fail(error, "Could not delete that event.");
    } finally {
      setBusy(false);
    }
  };

  const inManageIds = useMemo(() => new Set(manageSongs.map((s) => s.id)), [manageSongs]);

  const addManaged = async (song: Song) => {
    if (!managingId || inManageIds.has(song.id)) return;
    try {
      await actions.addSongsToEvent(managingId, [song.id], manageSongs);
      await reloadManaged(managingId);
      setNotice({ tone: "ok", text: `Added “${song.title}”.` });
    } catch (error) {
      fail(error, "Could not add that song.");
    }
  };

  const removeManaged = async (song: Song) => {
    if (!managingId) return;
    if (song.id === activeSongId) {
      setNotice({ tone: "bad", text: "That song is on stage. Blackout first, then remove it." });
      return;
    }
    try {
      await actions.removeSongFromEvent(managingId, song);
      await reloadManaged(managingId);
    } catch (error) {
      fail(error, "Could not remove that song.");
    }
  };

  const reorderManaged = async ({ active, over }: DragEndEvent) => {
    if (!managingId || !over || active.id === over.id) return;
    const sourceIndex = manageSongs.findIndex((song) => song.id === String(active.id));
    const targetIndex = manageSongs.findIndex((song) => song.id === String(over.id));
    if (sourceIndex < 0 || targetIndex < 0) return;
    const previous = manageSongs;
    const next = arrayMove(manageSongs, sourceIndex, targetIndex);
    setManageSongs(next);
    try {
      await actions.reorder(
        "event",
        managingId,
        next.map((s) => s.id),
      );
    } catch (error) {
      setManageSongs(previous);
      fail(error, "Could not save the new order. It has been put back.");
    }
  };

  return (
    <AdminShell
      route="events"
      title="Events"
      subtitle={`${filtered.length} of ${events.length} events`}
      status={status}
      songs={songs}
      activeSongId={activeSongId}
      blackoutLive={activeSongId !== null}
      onBlackout={() => actions.setLive(null)}
      onSignOut={actions.signOut}
      navigate={navigate}
      headerActions={
        <Button size="sm" tone="lamp" onClick={openCreate} className="rounded-none">
          <Plus size={15} aria-hidden="true" />
          <span className="hidden sm:inline">New event</span>
        </Button>
      }
    >
      <NoticeBar notice={notice} onDismiss={clearNotice} />
      <div className="flex flex-col gap-4 sm:gap-5">
        <Panel title="Find an event" action={filtersActive ? <Readout>FILTERS ON</Readout> : undefined} className="rounded-none">
          <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_12rem_12rem] sm:px-5">
            <Field label="Search events">
              <div className="relative">
                <Search size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by event name"
                  aria-label="Search events by name"
                  className={cn(inputClass, "pr-10 pl-10")}
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} aria-label="Clear event search" className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center text-ink-3 transition-colors hover:text-ink">
                    <X size={15} aria-hidden="true" />
                  </button>
                )}
              </div>
            </Field>
            <Field label="Event status">
              <select value={presence} onChange={(e) => setPresence(e.target.value as Presence)} aria-label="Filter by song presence" className={selectClass}>
                <option value="all">All events</option>
                <option value="with-songs">With songs</option>
                <option value="empty">No songs yet</option>
              </select>
            </Field>
            <Field label="Sort events">
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort events" className={selectClass}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
                <option value="most">Most songs</option>
                <option value="fewest">Fewest songs</option>
              </select>
            </Field>
          </div>
          <details open={Boolean(dateFrom || dateTo || minSongs || maxSongs)} className="border-t border-hairline px-4 sm:px-5">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-[14px] font-medium text-ink-2 marker:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lamp">
              Date and setlist size
              {(dateFrom || dateTo || minSongs || maxSongs) && <Readout>ACTIVE</Readout>}
            </summary>
            <div className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-4">
              <Field label="Created from">
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Created from date" className={cn(inputClass, "[color-scheme:dark]")} />
              </Field>
              <Field label="Created to">
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Created to date" className={cn(inputClass, "[color-scheme:dark]")} />
              </Field>
              <Field label="Minimum songs">
                <input type="number" min={0} value={minSongs} onChange={(e) => setMinSongs(e.target.value)} placeholder="Any" aria-label="Minimum songs" className={inputClass} />
              </Field>
              <Field label="Maximum songs">
                <input type="number" min={0} value={maxSongs} onChange={(e) => setMaxSongs(e.target.value)} placeholder="Any" aria-label="Maximum songs" className={inputClass} />
              </Field>
            </div>
          </details>
          {filtersActive && (
            <div className="flex justify-end border-t border-hairline px-4 py-2 sm:px-5">
              <Button size="sm" tone="ghost" onClick={clearFilters} className="rounded-none">Clear filters</Button>
            </div>
          )}
        </Panel>

        {!initialized ? (
          <Panel title="Events" className="rounded-none">
            <p className="px-4 py-6 text-[14px] text-ink-3 sm:px-5">Loading events…</p>
          </Panel>
        ) : filtered.length === 0 ? (
          <Panel title="Events" className="rounded-none">
            <div className="flex flex-col items-center px-4 py-12 text-center sm:px-5">
              <CalendarDays size={24} aria-hidden="true" className="text-ink-3" />
              <p className="mt-3 text-[16px] font-medium">{events.length === 0 ? "No events yet" : "No events match these filters"}</p>
              <p className="mt-1 max-w-[46ch] text-[14px] text-ink-3">
                {events.length === 0 ? "Create an event, then build its running order from the song library." : "Try another search or clear your filters."}
              </p>
              <div className="mt-4 flex gap-2">
                {filtersActive && <Button onClick={clearFilters} className="rounded-none">Clear filters</Button>}
                {events.length === 0 && <Button tone="lamp" onClick={openCreate} className="rounded-none"><Plus size={15} aria-hidden="true" />New event</Button>}
              </div>
            </div>
          </Panel>
        ) : (
          <>
            <Field label="Selected event" className="lg:hidden">
              <select value={managingId ?? ""} onChange={(e) => setManagingId(e.target.value)} aria-label="Choose event to manage" className={selectClass}>
                {filtered.map((event) => <option key={event.id} value={event.id}>{event.name} · {eventSongCounts[event.id] ?? 0} songs</option>)}
              </select>
            </Field>
            <div className="grid gap-4 lg:grid-cols-[minmax(16rem,0.36fr)_minmax(0,0.64fr)] xl:gap-5">
              <Panel title="Event index" action={<Readout>{filtered.length} EVENTS</Readout>} className="hidden rounded-none lg:block">
                <div className="max-h-[68vh] overflow-y-auto">
                  {filtered.map((event) => {
                    const selected = managingId === event.id;
                    const count = eventSongCounts[event.id] ?? 0;
                    return (
                      <button key={event.id} type="button" onClick={() => setManagingId(event.id)} aria-pressed={selected} className={cn("flex w-full items-start gap-3 border-b border-hairline px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-white/[0.03] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lamp", selected && "bg-lamp/[0.08]")}>
                        <span className={cn("mt-1.5 size-2 shrink-0 border", selected ? "border-lamp bg-lamp" : "border-hairline-strong")} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-[15px] leading-snug font-medium">{event.name}</span>
                          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-ink-3">
                            <span>{new Date(event.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
                            <span aria-hidden="true">·</span>
                            <span>{count} {count === 1 ? "song" : "songs"}</span>
                          </span>
                        </span>
                        {selected && <Readout className="pt-0.5 text-lamp">OPEN</Readout>}
                      </button>
                    );
                  })}
                </div>
              </Panel>

              {(() => {
                const event = filtered.find((item) => item.id === managingId) ?? filtered[0];
                const count = eventSongCounts[event.id] ?? 0;
                return (
                  <Panel title={event.name} action={<Readout>{count} {count === 1 ? "SONG" : "SONGS"}</Readout>} className="rounded-none">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3 sm:px-5">
                      <div className="flex min-w-0 items-center gap-2 text-[14px] text-ink-3">
                        <CalendarDays size={15} aria-hidden="true" />
                        <span>Created {new Date(event.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openRename(event)} aria-label={`Rename ${event.name}`} title="Rename event" className="grid size-10 place-items-center text-ink-3 transition-colors hover:bg-white/[0.05] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lamp">
                          <Pencil size={17} aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => setDeleting(event)} aria-label={`Delete ${event.name}`} title="Delete event" className="grid size-10 place-items-center text-ink-3 transition-colors hover:bg-signal-bad/10 hover:text-signal-bad focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lamp">
                          <Trash2 size={17} aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
                      <div>
                        <h2 className="text-[17px] font-semibold">Running order</h2>
                        <p className="mt-1 text-[14px] text-ink-3">Reorder songs for this event’s setlist.</p>
                      </div>
                      <Button size="md" tone="quiet" onClick={() => setAdding(true)} className="rounded-none">
                        <Plus size={16} aria-hidden="true" />Add songs
                      </Button>
                    </div>

                    <div className="h-[min(58vh,38rem)] min-h-64 overflow-x-hidden overflow-y-auto overscroll-contain border-t border-hairline">
                      {manageLoading ? (
                        <div className="grid h-full place-items-center px-4 py-5 text-[14px] text-ink-3 sm:px-5">Loading this setlist…</div>
                      ) : manageSongs.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center sm:px-5">
                          <p className="text-[15px] font-medium">This setlist is empty</p>
                          <p className="mt-1 text-[14px] text-ink-3">Add songs from your library to set the running order.</p>
                          <Button size="md" tone="lamp" onClick={() => setAdding(true)} className="mt-4 rounded-none"><Plus size={16} aria-hidden="true" />Add songs</Button>
                        </div>
                      ) : (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          modifiers={[keepSetlistRowsAligned]}
                          onDragEnd={(dragEvent) => void reorderManaged(dragEvent)}
                        >
                          <SortableContext
                            items={manageSongs.map((song) => song.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <ol aria-label={`${event.name} running order`}>
                              {manageSongs.map((song, index) => (
                                <SortableEventSong
                                  key={song.id}
                                  song={song}
                                  index={index}
                                  eventName={event.name}
                                  isLive={song.id === activeSongId}
                                  onRemove={() => void removeManaged(song)}
                                />
                              ))}
                            </ol>
                          </SortableContext>
                        </DndContext>
                      )}
                    </div>
                  </Panel>
                );
              })()}
            </div>
          </>
        )}
      </div>

      {/* Create / rename dialog */}
      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editing === "new" ? "New event" : `Rename event`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-console/85 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditing(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitName();
            }}
            className="w-full max-w-md border border-hairline bg-panel p-5"
          >
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">
              {editing === "new" ? "New event" : "Rename event"}
            </h2>
            <label className="mt-4 block">
              <span className="font-mono text-[11px] tracking-[0.1em] text-ink-3 uppercase">
                Event name
              </span>
              <input
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
                placeholder="Sunday Service"
                aria-label="Event name"
                className={cn(inputClass, "mt-2 h-11 text-sm")}
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Button size="lg" onClick={() => setEditing(null)} className="rounded-none">
                Cancel
              </Button>
              <Button
                type="submit"
                tone="lamp"
                size="lg"
                disabled={busy || !nameValue.trim()}
                className="rounded-none"
              >
                {busy ? "Saving…" : editing === "new" ? "Create event" : "Save"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete “${deleting.name}”?`}
          body="The event and its running order are removed. Songs stay in the library."
          confirmLabel="Delete event"
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}

      {adding && managingId && (
        <AddSongsSheet
          songs={songs}
          inSetlistIds={inManageIds}
          onAdd={addManaged}
          onClose={() => setAdding(false)}
        />
      )}
    </AdminShell>
  );
}
