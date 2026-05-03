"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { api, parseApiError } from "@/lib/api";
import type { Note } from "@/app/types";
import { NoteCard } from "@/components/NoteCard";
import { NoteCardSkeleton } from "@/components/NoteCardSkeleton";

const PAGE_SIZE = 18;
const SEARCH_DEBOUNCE_MS = 350;

// ── Types ────────────────────────────────────────────────────────────────────

type BrowseState = {
  mode: "browse";
  notes: Note[];
  total: number;
  page: number;
  loadingMore: boolean;
};

type SearchState = {
  mode: "search";
  query: string;
  notes: Note[];
  total: number;
};

type FeedState = BrowseState | SearchState;

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [activeSubject, setActiveSubject] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedState>({
    mode: "browse",
    notes: [],
    total: 0,
    page: 1,
    loadingMore: false,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth guard ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!localStorage.getItem("note_share_token")) {
      router.replace("/login");
    }
  }, [router]);

  // ── Initial browse load ─────────────────────────────────────────────
  useEffect(() => {
    void loadBrowse(1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Debounced search trigger ────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      // Return to browse mode
      setFeed((prev) =>
        prev.mode === "browse"
          ? prev
          : { mode: "browse", notes: [], total: 0, page: 1, loadingMore: false }
      );
      void loadBrowse(1, true);
      return;
    }

    debounceRef.current = setTimeout(() => {
      void runSearch(query.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // ── Data fetchers ───────────────────────────────────────────────────
  async function loadBrowse(page: number, reset: boolean) {
    try {
      reset ? setLoading(true) : void 0;
      setError(null);

      const { data } = await api.get<{
        notes: Note[];
        total: number;
        page: number;
      }>("/notes", { params: { page, limit: PAGE_SIZE } });

      setFeed((prev) => ({
        mode: "browse",
        notes: reset
          ? data.notes
          : prev.mode === "browse"
          ? [...prev.notes, ...data.notes]
          : data.notes,
        total: data.total,
        page,
        loadingMore: false,
      }));
    } catch (err) {
      const e = parseApiError(err);
      setError(e.type === "field" ? "Validation error" : e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (feed.mode !== "browse" || feed.loadingMore) return;
    const nextPage = feed.page + 1;
    setFeed((prev) => ({ ...prev, loadingMore: true } as BrowseState));
    await loadBrowse(nextPage, false);
  }

  const runSearch = useCallback(async (q: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await api.get<{ notes: Note[]; total: number }>(
        "/notes/search",
        { params: { query: q } }
      );

      setFeed({ mode: "search", query: q, notes: data.notes, total: data.total });
    } catch (err) {
      const e = parseApiError(err);
      setError(e.type === "field" ? "Validation error" : e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Derived values ──────────────────────────────────────────────────
  const subjects = useMemo(() => {
    if (feed.mode !== "browse") return [];
    const unique = Array.from(new Set(feed.notes.map((n) => n.subject))).sort();
    return ["All", ...unique];
  }, [feed]);

  const visibleNotes =
    feed.mode === "browse" && activeSubject !== "All"
      ? feed.notes.filter((n) => n.subject === activeSubject)
      : feed.notes;

  const hasMore =
    feed.mode === "browse" && feed.notes.length < feed.total;

  const isSearchMode = feed.mode === "search";

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Explore
        </h1>
        <p className="text-[14px] text-zinc-500 dark:text-zinc-400 mt-1">
          Browse and search public notes
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, subject, or description…"
          className="w-full pl-10 pr-10 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-[15px] text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search mode: result count */}
      {isSearchMode && !loading && (
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mb-5">
          {feed.total === 0
            ? `No results for "${feed.query}"`
            : `${feed.total} result${feed.total !== 1 ? "s" : ""} for "${feed.query}"`}
        </p>
      )}

      {/* Browse mode: subject pills */}
      {!isSearchMode && subjects.length > 1 && !loading && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {subjects.map((subject) => (
            <button
              key={subject}
              onClick={() => setActiveSubject(subject)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeSubject === subject
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                  : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              {subject}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm flex items-center justify-between gap-4">
          <span>{error}</span>
          <button
            onClick={() =>
              isSearchMode
                ? runSearch(feed.query)
                : loadBrowse(1, true)
            }
            className="shrink-0 underline underline-offset-2 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <NoteCardSkeleton key={i} />
          ))}
        </div>
      ) : visibleNotes.length === 0 ? (
        <EmptyState isSearch={isSearchMode} query={isSearchMode ? feed.query : ""} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>

          {/* Load more (browse only) */}
          {hasMore && (
            <div className="flex justify-center mt-10">
              <button
                onClick={loadMore}
                disabled={feed.mode === "browse" && feed.loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {feed.mode === "browse" && feed.loadingMore && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {feed.mode === "browse" && feed.loadingMore
                  ? "Loading…"
                  : "Load more"}
              </button>
            </div>
          )}

          {/* End of results */}
          {!hasMore && !isSearchMode && feed.notes.length > 0 && (
            <p className="text-center text-zinc-400 dark:text-zinc-600 text-sm mt-10">
              All {feed.total} note{feed.total !== 1 ? "s" : ""} loaded
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyState({ isSearch, query }: { isSearch: boolean; query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
        <Search
          className="w-6 h-6 text-zinc-400 dark:text-zinc-600"
          strokeWidth={1.5}
        />
      </div>
      <div>
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">
          {isSearch ? `No results for "${query}"` : "No notes yet"}
        </p>
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1">
          {isSearch
            ? "Try a different keyword or browse the full collection."
            : "No public notes have been shared yet."}
        </p>
      </div>
    </div>
  );
}
