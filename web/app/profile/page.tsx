"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  FileText,
  Loader2,
  LogOut,
  PlusSquare,
  Shield,
} from "lucide-react";
import { api, parseApiError } from "@/lib/api";
import { getTokenPayload } from "@/lib/auth";
import type { Note } from "@/app/types";
import type { User } from "@/app/types";
import { NoteCard } from "@/components/NoteCard";
import { NoteCardSkeleton } from "@/components/NoteCardSkeleton";

const PAGE_SIZE = 12;

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeSubject, setActiveSubject] = useState("All");

  useEffect(() => {
    if (!localStorage.getItem("note_share_token")) {
      router.replace("/login");
      return;
    }
    void loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const payload = getTokenPayload();
      if (!payload) { router.replace("/login"); return; }

      const [userRes, notesRes] = await Promise.all([
        api.get<{ user: User }>("/auth/me"),
        api.get<{ notes: Note[]; total: number }>("/notes", {
          params: { ownerId: payload.userId, page: 1, limit: PAGE_SIZE },
        }),
      ]);

      setUser(userRes.data.user);
      setNotes(notesRes.data.notes);
      setTotal(notesRes.data.total);
      setPage(1);
    } catch (err) {
      const e = parseApiError(err);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (loadingMore || !user) return;
    const payload = getTokenPayload();
    if (!payload) return;

    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { data } = await api.get<{ notes: Note[]; total: number }>("/notes", {
        params: { ownerId: payload.userId, page: nextPage, limit: PAGE_SIZE },
      });
      setNotes((prev) => [...prev, ...data.notes]);
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("note_share_token");
    router.push("/login");
  }

  const subjects = useMemo(() => {
    const unique = Array.from(new Set(notes.map((n) => n.subject))).sort();
    return ["All", ...unique];
  }, [notes]);

  const visibleNotes =
    activeSubject === "All" ? notes : notes.filter((n) => n.subject === activeSubject);

  const hasMore = notes.length < total;

  // ── Loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <ProfileSkeleton />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {Array.from({ length: 6 }).map((_, i) => <NoteCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* ── Profile card ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-white dark:text-black tracking-tight">
              {initials}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 truncate">
                {user.name}
              </h1>
              {user.role === "ADMIN" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                  <Shield className="w-3 h-3" />
                  Admin
                </span>
              )}
            </div>
            <p className="text-[14px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              {user.email}
            </p>
            <div className="flex items-center gap-4 mt-3 text-[13px] text-zinc-400 dark:text-zinc-500">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                {total} note{total !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Joined {memberSince}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            <Link
              href="/upload"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-[13px] font-semibold hover:opacity-90 transition-opacity"
            >
              <PlusSquare className="w-3.5 h-3.5" />
              Upload
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-[13px] font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* ── Notes section ─────────────────────────────────────────────── */}
      <div>
        <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
          My notes
        </h2>

        {/* Subject filter pills */}
        {subjects.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSubject(s)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeSubject === s
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {visibleNotes.length === 0 ? (
          <EmptyNotes />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleNotes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 animate-pulse">
      <div className="flex items-start gap-5">
        <div className="w-16 h-16 rounded-2xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="h-5 w-36 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-4 w-48 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          <div className="flex gap-4 mt-1">
            <div className="h-3.5 w-16 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-3.5 w-24 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyNotes() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
        <BookOpen className="w-7 h-7 text-zinc-400 dark:text-zinc-600" strokeWidth={1.5} />
      </div>
      <div>
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">No notes yet</p>
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1">
          Share your first note with the community.
        </p>
      </div>
      <Link
        href="/upload"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        <PlusSquare className="w-4 h-4" />
        Upload a note
      </Link>
    </div>
  );
}
