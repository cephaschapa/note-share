import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { Express } from "express";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const uploadDir = process.env.UPLOAD_DIR || "./uploads";

const storageDriver = process.env.STORAGE_DRIVER || "local";

const awsRegion = process.env.AWS_REGION || "af-south-1";
const s3Bucket = process.env.AWS_S3_BUCKET;

const s3Credentials =
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined;

const s3 = new S3Client({
  region: awsRegion,
  ...(s3Credentials ? { credentials: s3Credentials } : {}),
});

export type StoredFile = {
  fileName: string;
  fileKey: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
  storageDriver: "local" | "s3";
};

function createSafeFileKey(originalName: string) {
  const extension = path.extname(originalName);
  const safeBaseName = path
    .basename(originalName, extension)
    .replace(/[^a-zA-Z0-9-_]/g, "_");

  return `${Date.now()}-${crypto.randomUUID()}-${safeBaseName}${extension}`;
}

function createChecksum(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function saveFile(file: Express.Multer.File): Promise<StoredFile> {
  if (storageDriver === "s3") {
    return saveS3File(file);
  }

  return saveLocalFile(file);
}

export async function saveLocalFile(
  file: Express.Multer.File,
): Promise<StoredFile> {
  await fs.promises.mkdir(uploadDir, { recursive: true });

  const fileKey = createSafeFileKey(file.originalname);
  const destinationPath = path.join(uploadDir, fileKey);

  await fs.promises.writeFile(destinationPath, file.buffer);

  const checksum = createChecksum(file.buffer);

  return {
    fileName: file.originalname,
    fileKey,
    fileUrl: `/uploads/${fileKey}`,
    fileSize: file.size,
    mimeType: file.mimetype,
    checksum,
    storageDriver: "local",
  };
}

export async function saveS3File(
  file: Express.Multer.File,
): Promise<StoredFile> {
  if (!s3Bucket) {
    throw new Error("AWS_S3_BUCKET is required when STORAGE_DRIVER=s3");
  }

  const fileKey = `notes/${createSafeFileKey(file.originalname)}`;
  const checksum = createChecksum(file.buffer);

  await s3.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        checksum,
        originalFileName: file.originalname,
      },
    }),
  );

  return {
    fileName: file.originalname,
    fileKey,
    fileUrl: `s3://${s3Bucket}/${fileKey}`,
    fileSize: file.size,
    mimeType: file.mimetype,
    checksum,
    storageDriver: "s3",
  };
}

export function getLocalFilePath(fileKey: string) {
  return path.join(uploadDir, fileKey);
}

export async function getDownloadUrl(fileKey: string) {
  if (storageDriver === "s3") {
    if (!s3Bucket) {
      throw new Error("AWS_S3_BUCKET is required when STORAGE_DRIVER=s3");
    }

    const command = new GetObjectCommand({
      Bucket: s3Bucket,
      Key: fileKey,
    });

    return getSignedUrl(s3, command, {
      expiresIn: 60 * 5,
    });
  }

  return null;
}
