import { useMemo, useState } from "react";
import { ListMusic, Pencil, Plus, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import type { Song, SongPayload } from "./types";
import type { ScreenProps } from "./actions";
import { AdminShell, Field, Panel, inputClass, selectClass } from "./layout";
import { Button, Readout } from "./primitives";
import { useNotice } from "./notice";
import { NoticeBar } from "./layout";
import { ConfirmDialog, MobileFilterSheet, SongEditor } from "./overlays";
import { getGradientCss, GRADIENTS } from "./types";
import { cn } from "./cn";
import { SwipeRow } from "./SwipeRow";

type SortKey = "custom" | "newest" | "title-asc" | "title-desc" | "most-lines" | "fewest-lines";

/**
 * Library — a searchable song-card catalogue with background filtering,
 * useful sort orders, and full song CRUD.
 */
export function SongsPage({
  songs,
  activeSongId,
  status,
  initialized,
  actions,
  navigate,
}: ScreenProps) {
  const { notice, setNotice, clearNotice, fail } = useNotice();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("custom");
  const [background, setBackground] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [editing, setEditing] = useState<Song | null | "new">(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Song | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = songs.filter((song) => {
      if (
        needle &&
        !song.title.toLowerCase().includes(needle) &&
        !song.lyrics.some((line) => line.toLowerCase().includes(needle))
      ) return false;
      if (background !== "all" && song.color !== background) return false;
      return true;
    });
    switch (sort) {
      case "newest":
        return [...list].sort((a, b) => Number(b.id) - Number(a.id));
      case "title-asc":
        return [...list].sort((a, b) => a.title.localeCompare(b.title));
      case "title-desc":
        return [...list].sort((a, b) => b.title.localeCompare(a.title));
      case "most-lines":
        return [...list].sort((a, b) => b.lyrics.length - a.lyrics.length);
      case "fewest-lines":
        return [...list].sort((a, b) => a.lyrics.length - b.lyrics.length);
      case "custom":
      default:
        return [...list].sort((a, b) => (a.sortOrder ?? 1e9) - (b.sortOrder ?? 1e9));
    }
  }, [songs, query, sort, background]);

  const filtersActive = query !== "" || background !== "all";

  const clearFilters = () => {
    setQuery("");
    setBackground("all");
  };

  const filterFields = (
    <div className="grid grid-cols-12 items-end gap-3">
      <Field label="Search the library" className="col-span-12 hidden md:block md:col-span-6">
        <div className="relative">
          <Search size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles and lyrics"
            aria-label="Search song titles and lyrics"
            className={cn(inputClass, "pr-10 pl-10")}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear song search" className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center text-ink-3 transition-colors hover:text-ink">
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </Field>
      <Field label="Sort order" className="col-span-12 md:col-span-3">
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort songs" className={selectClass}>
          <option value="custom">Custom order</option>
          <option value="newest">Latest added</option>
          <option value="title-asc">Title A–Z</option>
          <option value="title-desc">Title Z–A</option>
          <option value="most-lines">Most lines</option>
          <option value="fewest-lines">Fewest lines</option>
        </select>
      </Field>
      <Field label="Background" className="col-span-12 md:col-span-3">
        <select value={background} onChange={(e) => setBackground(e.target.value)} aria-label="Filter by background" className={selectClass}>
          <option value="all">All backgrounds</option>
          {GRADIENTS.map((g, index) => (
            <option key={g.id} value={g.id}>Background {String(index + 1).padStart(2, "0")}</option>
          ))}
        </select>
      </Field>
    </div>
  );

  const saveSong = async (payload: SongPayload, target: Song | null) => {
    setBusy(true);
    try {
      await actions.saveSong(payload, target);
      setEditing(null);
      setNotice({
        tone: "ok",
        text: target ? `Saved “${payload.title}”.` : `Added “${payload.title}” to the library.`,
      });
    } catch (error) {
      fail(error, "Could not save that song.");
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    if (deleting.id === activeSongId) {
      setDeleting(null);
      setNotice({ tone: "bad", text: "That song is on stage. Blackout first, then delete it." });
      return;
    }
    setBusy(true);
    try {
      await actions.deleteSong(deleting);
      setNotice({ tone: "ok", text: `Deleted “${deleting.title}”.` });
      setDeleting(null);
    } catch (error) {
      fail(error, "Could not delete that song.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell
      route="library"
      title="Song library"
      subtitle={`${filtered.length} shown · ${songs.length} in the library`}
      status={status}
      songs={songs}
      activeSongId={activeSongId}
      blackoutLive={activeSongId !== null}
      onBlackout={() => actions.setLive(null)}
      onSignOut={actions.signOut}
      navigate={navigate}
      headerActions={
        <Button size="sm" tone="lamp" onClick={() => setEditing("new")} aria-label="New song" className="hidden shrink-0 px-3 md:inline-flex md:h-8">
          <Plus size={15} aria-hidden="true" />
          New song
        </Button>
      }
    >
      <NoticeBar notice={notice} onDismiss={clearNotice} />
      <div className="mb-4 flex items-center gap-2 md:hidden">
        <div className="relative min-w-0 flex-1">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles and lyrics"
            aria-label="Search song titles and lyrics"
            className={cn(inputClass, "h-11 pl-10 pr-10")}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear song search" className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center text-ink-3 transition-colors hover:text-ink">
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <Button
          size="md"
          tone="quiet"
          onClick={() => setFiltersOpen(true)}
          aria-label={filtersActive ? "Filters, active" : "Filters"}
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
          className="h-11"
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filters{filtersActive && <span className="font-mono text-[11px] text-lamp">ON</span>}
        </Button>
      </div>
      <div className="flex flex-col gap-4 sm:gap-5">
        <Panel title="Find a song" action={filtersActive ? <Readout>FILTERS ON</Readout> : undefined} className="hidden md:block">
          <div className="px-4 py-4 sm:px-5">
            {filterFields}
            <div className="col-span-12 flex justify-end">
              <Button size="md" tone="ghost" onClick={clearFilters} disabled={!filtersActive}>
                <X size={14} aria-hidden="true" />
                Reset filters
              </Button>
            </div>
          </div>
        </Panel>

        <Panel title="Songs" action={<Readout>{filtered.length} RESULTS</Readout>}>
          {!initialized ? (
            <p className="px-4 py-6 text-[13px] text-ink-3 sm:px-5">Loading songs…</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-12 text-center sm:px-5">
              <ListMusic size={22} aria-hidden="true" className="text-ink-3" />
              <p className="mt-3 text-[14px] font-medium">
                {songs.length === 0 ? "The library is empty" : "No songs match these filters"}
              </p>
              <p className="mt-1 max-w-[46ch] text-[13px] text-ink-3">
                {songs.length === 0
                  ? "Add your first song — it becomes available to every event."
                  : "Loosen a filter, or clear them all to see everything."}
              </p>
              <div className="mt-4 flex gap-2">
                {filtersActive && <Button onClick={clearFilters}>Clear filters</Button>}
                {songs.length === 0 && (
                  <Button tone="lamp" onClick={() => setEditing("new")} className="hidden md:inline-flex">
                    <Plus size={15} aria-hidden="true" />
                    New song
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-4 xl:grid-cols-3">
              {filtered.map((song, index) => {
                const isLive = song.id === activeSongId;
                const needle = query.trim().toLowerCase();
                const previewLyric =
                  (needle && song.lyrics.find((line) => line.toLowerCase().includes(needle))) ||
                  song.lyrics.find((line) => line.trim()) ||
                  "No lyric text";
                const card = (mobile: boolean) => (
                  <article
                    className={cn(
                      "flex h-full flex-col border bg-console p-4 transition-colors sm:px-5 sm:pt-3 sm:pb-5",
                      mobile ? "max-h-24 min-h-0 overflow-hidden p-2.5" : "min-h-52",
                      isLive
                        ? "border-signal-ok/75 bg-signal-ok/[0.055]"
                        : "border-hairline hover:border-hairline-strong hover:bg-white/[0.02]",
                    )}
                  >
                    {mobile ? (
                      <>
                        <div className="flex min-w-0 items-center gap-2">
                          <Readout className={cn("shrink-0", isLive && "text-signal-ok!")}>
                            {sort === "custom"
                              ? String(song.sortOrder ?? index + 1).padStart(2, "0")
                              : String(index + 1).padStart(2, "0")}
                          </Readout>
                          <h3 className="min-w-0 flex-1 truncate text-[17px] leading-snug font-semibold">{song.title}</h3>
                          {isLive && <span className="shrink-0 font-mono text-[10px] font-semibold tracking-[0.1em] text-signal-ok uppercase">Live</span>}
                          <span
                            role="img"
                            aria-label={`Song background ${index + 1}`}
                            className="size-9 shrink-0 border border-hairline-strong"
                            style={{ backgroundImage: getGradientCss(song.color) }}
                          />
                        </div>
                        <div className="mt-1 flex min-w-0 items-center justify-between gap-2">
                          <p className="min-w-0 flex-1 truncate text-[13px] leading-relaxed text-ink-2">{previewLyric}</p>
                          <Readout className="shrink-0 text-[10px]">
                            {song.lyrics.length} {song.lyrics.length === 1 ? "line" : "lines"}
                          </Readout>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <Readout className={cn("pt-1", isLive && "text-signal-ok!")}>
                            {sort === "custom"
                              ? String(song.sortOrder ?? index + 1).padStart(2, "0")
                              : String(index + 1).padStart(2, "0")}
                          </Readout>
                          <span
                            role="img"
                            aria-label={`Song background ${index + 1}`}
                            className="size-11 shrink-0 border border-hairline-strong"
                            style={{ backgroundImage: getGradientCss(song.color) }}
                          />
                        </div>
                        <div className="mt-2 min-w-0">
                          <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[17px] leading-snug font-semibold">
                            <span className="min-w-0 break-words">{song.title}</span>
                            {isLive && (
                              <span className="border border-signal-ok/60 bg-signal-ok/10 px-2 py-1 font-mono text-[11px] font-semibold tracking-[0.12em] text-signal-ok uppercase">
                                Live now
                              </span>
                            )}
                          </h3>
                          <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-2">{previewLyric}</p>
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-3 border-t border-hairline pt-4">
                          <Readout>
                            {song.lyrics.length} {song.lyrics.length === 1 ? "line" : "lines"}
                          </Readout>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditing(song)}
                              aria-label={`Edit ${song.title}`}
                              title="Edit song"
                              className="grid size-11 place-items-center border border-hairline-strong bg-raised text-ink-2 transition-colors hover:text-ink"
                            >
                              <Pencil size={17} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(song)}
                              aria-label={`Delete ${song.title}`}
                              title="Delete song"
                              className="grid size-11 place-items-center border border-hairline-strong bg-raised text-ink-2 transition-colors hover:border-signal-bad/70 hover:bg-signal-bad/12 hover:text-signal-bad"
                            >
                              <Trash2 size={17} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </article>
                );

                return (
                  <div key={song.id} className="contents">
                    <div className="md:hidden">
                      <SwipeRow
                        label={song.title}
                        height={96}
                        fullSwipe={false}
                        actions={[
                          { id: "delete", label: "Delete", icon: <Trash2 size={18} aria-hidden="true" />, color: "#ff5964", onSelect: () => setDeleting(song) },
                          { id: "edit", label: "Edit", icon: <Pencil size={18} aria-hidden="true" />, onSelect: () => setEditing(song) },
                        ]}
                      >
                        {card(true)}
                      </SwipeRow>
                    </div>
                    <div className="hidden md:block">{card(false)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <Button
        tone="lamp"
        onClick={() => setEditing("new")}
        aria-label="Add a song"
        className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 h-12 px-4 shadow-lg md:hidden"
      >
        <Plus size={18} aria-hidden="true" />
        Add song
      </Button>

      {filtersOpen && (
        <MobileFilterSheet
          title="Song filters"
          onClose={() => setFiltersOpen(false)}
          onReset={clearFilters}
          resetDisabled={!filtersActive}
        >
          {filterFields}
        </MobileFilterSheet>
      )}

      {editing && (
        <SongEditor
          song={editing === "new" ? null : editing}
          nextOrder={songs.length + 1}
          saving={busy}
          onClose={() => setEditing(null)}
          onSave={saveSong}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete “${deleting.title}”?`}
          body="It is removed from the library and from every event that uses it. This cannot be undone."
          confirmLabel="Delete song"
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </AdminShell>
  );
}
