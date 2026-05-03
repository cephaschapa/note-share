export function NoteCardSkeleton() {
  return (
    <div className="flex flex-col bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden animate-pulse">
      {/* Accent bar */}
      <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-800" />

      <div className="p-4 flex flex-col gap-3">
        {/* File type + subject */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-12 rounded-md bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-4 w-24 rounded-md bg-zinc-100 dark:bg-zinc-800" />
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <div className="h-4 w-full rounded-md bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-4 w-3/4 rounded-md bg-zinc-100 dark:bg-zinc-800" />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <div className="h-3.5 w-full rounded-md bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-3.5 w-2/3 rounded-md bg-zinc-100 dark:bg-zinc-800" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/60 mt-2">
          <div className="h-3.5 w-20 rounded-md bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-3.5 w-14 rounded-md bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
