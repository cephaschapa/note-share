import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  saveLocalFile,
  getLocalFilePath,
} from "../services/storage.service.js";
import { noteProcessingQueue } from "../jobs/queue.js";
import { NoteVisibility, VersionStatus } from "../generated/prisma/client.js";

export const notesRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Only PDF, DOC, DOCX, and TXT files are allowed"));
    }

    cb(null, true);
  },
});

// upload schema
const uploadSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  subject: z.string().min(1),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional().default("PUBLIC"),
  changeNote: z.string().optional(),
});

notesRouter.post("/", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "File is required" });
  }

  const parsedBody = uploadSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: z.flattenError(parsedBody.error).fieldErrors,
    });
  }

  const storedFile = await saveLocalFile(req.file);

  const result = await prisma.$transaction(async (tx) => {
    const note = await tx.note.create({
      data: {
        title: parsedBody.data.title,
        description: parsedBody.data.description ?? null,
        subject: parsedBody.data.subject,
        visibility: parsedBody.data.visibility || "PUBLIC",
        ownerId: req.user?.userId as string,
      },
    });
    const version = await tx.noteVersion.create({
      data: {
        noteId: note.id,
        versionNumber: 1,
        fileName: storedFile.fileName,
        fileUrl: storedFile.fileUrl,
        fileKey: storedFile.fileKey,
        fileSize: storedFile.fileSize,
        mimeType: storedFile.mimeType,
        checksum: storedFile.checksum,
        changeNote: parsedBody.data.changeNote ?? null,
        uploadedById: req.user?.userId as string,
        status: VersionStatus.PROCESSING as VersionStatus,
      },
    });

    const updatedNote = await tx.note.update({
      where: { id: note.id },
      data: {
        currentVersionId: version.id,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        versions: true,
      },
    });
    return {
      note: updatedNote,
      version,
    };
  });

  await noteProcessingQueue.add("process-note", {
    noteId: result.note.id,
    versionId: result.version.id,
    fileKey: storedFile.fileKey,
  });

  return res.status(201).json({
    message: "Note uploaded successfully",
    result,
  });
});

notesRouter.get("/", requireAuth, async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const ownerId = req.query.ownerId as string | undefined;

  const where = {
    ...(ownerId
      ? { ownerId }
      : { visibility: NoteVisibility.PUBLIC }),
  };

  const notes = await prisma.note.findMany({
    where,
    skip: offset,
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
        take: 1,
      },
    },
  });

  const total = await prisma.note.count({ where });

  return res.status(200).json({
    notes,
    total,
    page,
    limit,
  });
});

notesRouter.get("/search", requireAuth, async (req, res) => {
  const query = req.query.query as string;

  if (!query) {
    return res.status(400).json({ message: "Query is required" });
  }

  const notes = await prisma.note.findMany({
    where: {
      visibility: "PUBLIC",
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { subject: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
        take: 1,
      },
    },
  });

  return res.status(200).json({
    query,
    total: notes.length,
    notes,
  });
});

notesRouter.get("/:id", requireAuth, async (req, res) => {
  const note = await prisma.note.findUnique({
    where: {
      id: req.params.id as string,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
        take: 1,
      },
    },
  });

  if (!note) {
    return res.status(404).json({ message: "Note not found" });
  }

  return res.status(200).json({
    note,
  });
});

const createNoteSchema = z.object({
  changeNote: z.string().optional(),
});

notesRouter.post(
  "/:id/versions",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    const parsedBody = createNoteSchema.safeParse(req.body);

    if (!parsedBody.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: z.flattenError(parsedBody.error).fieldErrors,
      });
    }
    const note = await prisma.note.findUnique({
      where: {
        id: req.params.id as string,
      },
      include: {
        versions: true,
      },
    });
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (note.ownerId !== req.user?.userId && req.user?.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const storedFile = await saveLocalFile(req.file);
    const nextVersionNumber =
      note.versions.length === 0
        ? 1
        : Math.max(...note.versions.map((v) => v.versionNumber)) + 1;

    const result = await prisma.$transaction(async (tx) => {
      const version = await tx.noteVersion.create({
        data: {
          noteId: note.id,
          versionNumber: nextVersionNumber,
          fileName: storedFile.fileName,
          fileUrl: storedFile.fileUrl,
          fileKey: storedFile.fileKey,
          fileSize: storedFile.fileSize,
          mimeType: storedFile.mimeType,
          checksum: storedFile.checksum,
          changeNote: parsedBody.data.changeNote ?? null,
          uploadedById: req.user!.userId,
          status: "PROCESSING",
        },
      });

      const updatedNote = await tx.note.update({
        where: {
          id: note.id,
        },
        data: {
          currentVersionId: version.id,
        },
        include: {
          versions: {
            orderBy: {
              versionNumber: "desc",
            },
          },
        },
      });

      return {
        note: updatedNote,
        version,
      };
    });

    await noteProcessingQueue.add("process-note", {
      noteId: result.note.id,
      versionId: result.version.id,
      fileKey: result.version.fileKey,
    });

    return res.status(201).json(result);
  },
);

notesRouter.get("/:id/versions", async (req, res) => {
  const versions = await prisma.noteVersion.findMany({
    where: {
      noteId: req.params.id,
    },
    orderBy: {
      versionNumber: "desc",
    },
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return res.json({
    noteId: req.params.id,
    versions,
  });
});

notesRouter.post(
  "/:id/versions/:versionId/restore",
  requireAuth,
  async (req, res) => {
    const noteId = req.params.id as string;
    const versionId = req.params.versionId as string;

    const note = await prisma.note.findUnique({
      where: {
        id: noteId,
      },
      include: {
        versions: true,
      },
    });

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    if (note.ownerId !== req.user!.userId && req.user!.role !== "ADMIN") {
      return res.status(403).json({
        message: "Only the owner or admin can restore a version",
      });
    }

    const versionToRestore = await prisma.noteVersion.findFirst({
      where: {
        id: versionId,
        noteId: note.id,
      },
    });

    if (!versionToRestore) {
      return res.status(404).json({
        message: "Version not found",
      });
    }

    const nextVersionNumber =
      note.versions.length === 0
        ? 1
        : Math.max(...note.versions.map((v) => v.versionNumber)) + 1;

    const restoredVersion = await prisma.noteVersion.create({
      data: {
        noteId: note.id,
        versionNumber: nextVersionNumber,
        fileName: versionToRestore.fileName,
        fileUrl: versionToRestore.fileUrl,
        fileKey: versionToRestore.fileKey,
        fileSize: versionToRestore.fileSize,
        mimeType: versionToRestore.mimeType,
        checksum: versionToRestore.checksum,
        changeNote: `Restored from version ${versionToRestore.versionNumber}`,
        uploadedById: req.user!.userId,
        status: versionToRestore.status,
      },
    });

    const updatedNote = await prisma.note.update({
      where: {
        id: note.id,
      },
      data: {
        currentVersionId: restoredVersion.id,
      },
      include: {
        versions: {
          orderBy: {
            versionNumber: "desc",
          },
        },
      },
    });

    return res.json({
      note: updatedNote,
      restoredVersion,
    });
  },
);

notesRouter.get("/:id/download", async (req, res) => {
  const note = await prisma.note.findUnique({
    where: {
      id: req.params.id,
    },
    include: {
      versions: true,
    },
  });

  if (!note || !note.currentVersionId) {
    return res.status(404).json({
      message: "Note or current version not found",
    });
  }

  const version = note.versions.find((v) => v.id === note.currentVersionId);

  if (!version) {
    return res.status(404).json({
      message: "Current version not found",
    });
  }

  await prisma.download.create({
    data: {
      noteId: note.id,
      versionId: version.id,
      userId: req.user?.userId ?? null,
      ipAddress: req.ip ?? null,
    },
  });

  return res.download(getLocalFilePath(version.fileKey), version.fileName);
});

notesRouter.get("/:id/versions/:versionId/download", async (req, res) => {
  const version = await prisma.noteVersion.findFirst({
    where: {
      id: req.params.versionId,
      noteId: req.params.id,
    },
    include: {
      note: true,
    },
  });

  if (!version) {
    return res.status(404).json({
      message: "Version not found",
    });
  }

  await prisma.download.create({
    data: {
      noteId: version.noteId,
      versionId: version.id,
      userId: req.user?.userId ?? null,
      ipAddress: req.ip ?? null,
    },
  });

  return res.download(getLocalFilePath(version.fileKey), version.fileName);
});
