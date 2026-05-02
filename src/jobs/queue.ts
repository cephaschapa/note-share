import { Queue } from "bullmq";
import { Redis as IORedis } from "ioredis";

export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null,
});

export type NoteProcessingJob = {
  noteId: string;
  versionId: string;
  fileKey: string;
};

export const noteProcessingQueue = new Queue<NoteProcessingJob>(
  "note-processing",
  {
    connection: redisConnection,
  },
);
