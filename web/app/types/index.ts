export type User = {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "ADMIN";
  createdAt: string;
};

export type NoteVersion = {
  id: string;
  noteId: string;
  versionNumber: number;
  fileName: string;
  fileUrl: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  checksum?: string | null;
  changeNote?: string | null;
  status: "PROCESSING" | "READY" | "FAILED";
  uploadedById: string;
  createdAt: string;
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
  };
};

export type Note = {
  id: string;
  title: string;
  description?: string | null;
  subject: string;
  visibility: "PUBLIC" | "PRIVATE";
  ownerId: string;
  currentVersionId?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    name: string;
    email?: string;
  };
  versions?: NoteVersion[];
};
