/**
 * Job queue with BullMQ (when Redis is available) or inline processing (Vercel/serverless).
 *
 * When REDIS_URL is not set, jobs run inline in the request handler.
 */

export interface ImportJobData {
  importId: string;
  userId: string;
  sourceAccountId: string;
  sourceHandle?: string;
  accessToken: string;
}

export interface ResolveJobData {
  connectionId: string;
  importId: string;
}

export interface ActivityJobData {
  connectionId: string;
  goodreadsUserId: string;
}

export interface RefreshJobData {
  importId: string;
  userId: string;
  sourceAccountId: string;
  accessToken: string;
}

const useRedis = !!process.env.REDIS_URL;

async function getQueue(name: string) {
  if (!useRedis) return null;
  const { Queue } = await import("bullmq");
  const connection = {
    host: new URL(process.env.REDIS_URL!).hostname,
    port: parseInt(new URL(process.env.REDIS_URL!).port || "6379"),
  };
  return new Queue(name, { connection });
}

async function processInline<T>(
  processor: (data: T) => Promise<void>,
  data: T
) {
  processor(data).catch((err) =>
    console.error("Inline job processing failed:", err)
  );
}

export async function queueImportJob(data: ImportJobData) {
  const q = await getQueue("import-social-graph");
  if (q) {
    return q.add("import", data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    });
  }
  const { processImportJob } = await import("./import-social-graph");
  return processInline(processImportJob, data);
}

export async function queueResolveJob(data: ResolveJobData) {
  const q = await getQueue("resolve-connection");
  if (q) {
    return q.add("resolve", data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 3000 },
    });
  }
  const { processResolveJob } = await import("./resolve-connection");
  return processInline(processResolveJob, data);
}

export async function queueActivityJob(data: ActivityJobData) {
  const q = await getQueue("fetch-reading-activity");
  if (q) {
    return q.add("activity", data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    });
  }
  const { processActivityJob } = await import("./fetch-reading-activity");
  return processInline(processActivityJob, data);
}

export async function queueRefreshJob(data: RefreshJobData) {
  const q = await getQueue("refresh-social-graph");
  if (q) {
    return q.add("refresh", data, {
      attempts: 2,
      backoff: { type: "exponential", delay: 10000 },
    });
  }
  const { processImportJob } = await import("./import-social-graph");
  return processInline(processImportJob, {
    ...data,
    importId: data.importId,
    userId: data.userId,
  });
}
