import Link from "next/link";
import { Clock, FileText, User } from "lucide-react";
import type { Note } from "@/app/types";
import { formatFileSize, getFileTypeInfo, timeAgo } from "@/lib/utils";

export function NoteCard({ note }: { note: Note }) {
  const latestVersion = note.versions?.[0];
  const fileInfo = getFileTypeInfo(latestVersion?.mimeType);

  return (
    <Link href={`/notes/${note.id}`}>
      <article className="group flex flex-col bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 h-full cursor-pointer">
        {/* Accent bar */}
        <div className={`h-1 w-full shrink-0 ${fileInfo.accentClass}`} />

        <div className="flex flex-col flex-1 p-4 gap-3">
          {/* File type + subject row */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md tracking-wide ${fileInfo.badgeClass}`}
            >
              <FileText className="w-3 h-3" />
              {fileInfo.label}
            </span>
            <span className="text-[12px] text-zinc-400 dark:text-zinc-500 truncate">
              {note.subject}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-[15px] leading-snug text-zinc-900 dark:text-zinc-50 line-clamp-2 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
            {note.title}
          </h3>

          {/* Description */}
          {note.description && (
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
              {note.description}
            </p>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
            <div className="flex items-center gap-1.5 text-[12px] text-zinc-400 dark:text-zinc-500 min-w-0">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[90px]">
                {note.owner?.name ?? "Unknown"}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[12px] text-zinc-400 dark:text-zinc-500 shrink-0">
              {latestVersion?.fileSize != null && (
                <span>{formatFileSize(latestVersion.fileSize)}</span>
              )}
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{timeAgo(note.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
