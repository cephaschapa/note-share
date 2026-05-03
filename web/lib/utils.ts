export function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type FileTypeInfo = {
  label: string;
  accentClass: string;
  badgeClass: string;
};

export function getFileTypeInfo(mimeType: string | undefined): FileTypeInfo {
  if (!mimeType) {
    return {
      label: "FILE",
      accentClass: "bg-zinc-400",
      badgeClass: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400",
    };
  }
  if (mimeType === "application/pdf") {
    return {
      label: "PDF",
      accentClass: "bg-red-500",
      badgeClass: "bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400",
    };
  }
  if (mimeType.includes("word") || mimeType.includes("msword")) {
    return {
      label: "DOC",
      accentClass: "bg-blue-500",
      badgeClass: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400",
    };
  }
  if (mimeType === "text/plain") {
    return {
      label: "TXT",
      accentClass: "bg-zinc-400",
      badgeClass: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400",
    };
  }
  return {
    label: "FILE",
    accentClass: "bg-zinc-400",
    badgeClass: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400",
  };
}
