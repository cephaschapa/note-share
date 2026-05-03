"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Note } from "@/app/types";
import { NoteCard } from "@/components/NoteCard";
import { NoteCardSkeleton } from "@/components/NoteCardSkeleton";

const PAGE_SIZE = 12;

export default function HomePage() {
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSubject, setActiveSubject] = useState("All");

  useEffect(() => {
    if (!localStorage.getItem("note_share_token")) {
      router.replace("/login");
      return;
    }
    void fetchNotes(1, true);
  }, [router]);

  async function fetchNotes(p: number, reset = false) {
    try {
      reset ? setLoading(true) : setLoadingMore(true);
      setError(null);

      const { data } = await api.get<{
        notes: Note[];
        total: number;
        page: number;
        limit: number;
      }>("/notes", { params: { page: p, limit: PAGE_SIZE } });

      setNotes((prev) => (reset ? data.notes : [...prev, ...data.notes]));
      setTotal(data.total);
      setPage(p);
    } catch {
      setError("Failed to load notes. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // Derive unique subjects from loaded notes for the filter pills
  const subjects = useMemo(() => {
    const unique = Array.from(new Set(notes.map((n) => n.subject))).sort();
    return ["All", ...unique];
  }, [notes]);

  // Client-side subject filter
  const visibleNotes =
    activeSubject === "All"
      ? notes
      : notes.filter((n) => n.subject === activeSubject);

  const hasMore = notes.length < total;

  // ── Loading (initial) ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <FeedHeader />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <NoteCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <FeedHeader />
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">{error}</p>
          <button
            onClick={() => fetchNotes(1, true)}
            className="px-5 py-2 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <FeedHeader />

      {/* Subject filter pills */}
      {subjects.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

      {/* Empty state */}
      {visibleNotes.length === 0 ? (
        <EmptyFeed filtered={activeSubject !== "All"} />
      ) : (
        <>
          {/* Note grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center mt-10">
              <button
                onClick={() => fetchNotes(page + 1)}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}

          {/* End of feed */}
          {!hasMore && notes.length > 0 && (
            <p className="text-center text-zinc-400 dark:text-zinc-600 text-sm mt-10">
              You&apos;ve seen all {total} note{total !== 1 ? "s" : ""}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function FeedHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Feed
      </h1>
      <p className="text-[14px] text-zinc-500 dark:text-zinc-400 mt-1">
        Discover notes shared by the community
      </p>
    </div>
  );
}

function EmptyFeed({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
        <BookOpen
          className="w-7 h-7 text-zinc-400 dark:text-zinc-600"
          strokeWidth={1.5}
        />
      </div>
      <div>
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">
          {filtered ? "No notes in this subject" : "No notes yet"}
        </p>
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1">
          {filtered
            ? "Try selecting a different subject or clear the filter."
            : "Be the first to share a note with the community."}
        </p>
      </div>
    </div>
  );
}
