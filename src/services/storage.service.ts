import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { Express } from "express";

const uploadDir = process.env.UPLOAD_DIR || "./uploads";

export type StoredFile = {
  fileName: string;
  fileKey: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
};

export async function saveLocalFile(
  file: Express.Multer.File,
): Promise<StoredFile> {
  await fs.promises.mkdir(uploadDir, {
    recursive: true,
  });

  const extension = path.extname(file.originalname);
  const safeBaseName = path
    .basename(file.originalname, extension)
    .replace(/[^a-zA-Z0-9-_]/g, "_");

  const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${safeBaseName}${extension}`;
  const fileKey = uniqueName;
  const destinationPath = path.join(uploadDir, uniqueName);

  await fs.promises.writeFile(destinationPath, file.buffer);

  const checksum = crypto
    .createHash("sha256")
    .update(file.buffer)
    .digest("hex");

  return {
    fileName: file.originalname,
    fileKey,
    fileUrl: `/uploads/${fileKey}`,
    fileSize: file.size,
    mimeType: file.mimetype,
    checksum,
  };
}

export function getLocalFilePath(fileKey: string): string {
  return path.join(uploadDir, fileKey);
}
