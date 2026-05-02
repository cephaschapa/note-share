import "dotenv/config";
import { Worker } from "bullmq";
import { prisma } from "../lib/prisma.js";
import {
  redisConnection,
  noteProcessingQueue,
  type NoteProcessingJob,
} from "./queue.js";
import { VersionStatus } from "../generated/prisma/client.js";
import { logger } from "../lib/logger.js";

const worker = new Worker<NoteProcessingJob>("note-processing", async (job) => {
  const { versionId } = job.data;

  logger.info({ versionId }, "Processing note version");

  // Placeholder for future tasks
  // 1. Virus scanning
  // 2. Text extraction
  // 3. PDF Preview generation
  // 4. Search indexing

  await new Promise((resolve) => setTimeout(resolve, 1500));

  await prisma.noteVersion.update({
    where: {
      id: versionId,
    },
    data: {
      status: VersionStatus.READY,
    },
  });

  logger.info({ versionId }, "Note version processed successfully");
}, { connection: redisConnection });

worker.on("failed", async (job, error) => {
  logger.error({ jobId: job?.id, error }, "Note processing failed");

  const versionId = job?.data?.versionId;
  if (versionId) {
    await prisma.noteVersion.update({
      where: { id: versionId },
      data: { status: VersionStatus.FAILED },
    });
  }
});

logger.info("Note processing worker started");
