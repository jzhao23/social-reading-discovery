import { Worker } from "bullmq";
import { processImportJob } from "./import-social-graph";
import { processResolveJob } from "./resolve-connection";
import { processActivityJob } from "./fetch-reading-activity";
import type {
  ImportJobData,
  ResolveJobData,
  ActivityJobData,
  RefreshJobData,
} from "./queue";

const connection = {
  host: new URL(process.env.REDIS_URL || "redis://localhost:6379").hostname,
  port: parseInt(
    new URL(process.env.REDIS_URL || "redis://localhost:6379").port || "6379"
  ),
};

// Import worker
const importWorker = new Worker(
  "import-social-graph",
  async (job) => {
    console.log(`Processing import job ${job.id}`);
    await processImportJob(job.data as ImportJobData);
  },
  {
    connection,
    concurrency: 2,
  }
);

// Resolution worker — higher concurrency since each job is independent
const resolveWorker = new Worker(
  "resolve-connection",
  async (job) => {
    await processResolveJob(job.data as ResolveJobData);
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000, // 10 per second to respect Goodreads rate limits
    },
  }
);

// Activity fetch worker
const activityWorker = new Worker(
  "fetch-reading-activity",
  async (job) => {
    await processActivityJob(job.data as ActivityJobData);
  },
  {
    connection,
    concurrency: 3,
    limiter: {
      max: 5,
      duration: 1000,
    },
  }
);

// Refresh worker — runs weekly via cron
const refreshWorker = new Worker(
  "refresh-social-graph",
  async (job) => {
    const data = job.data as RefreshJobData;
    console.log(`Refreshing social graph for import ${data.importId}`);
    // Re-use the import logic for refresh
    await processImportJob({
      ...data,
      importId: data.importId,
      userId: data.userId,
    });
  },
  {
    connection,
    concurrency: 1,
  }
);

// Error handlers
for (const worker of [importWorker, resolveWorker, activityWorker, refreshWorker]) {
  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} in ${worker.name} failed:`, err.message);
  });

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} in ${worker.name} completed`);
  });
}

console.log("Workers started: import, resolve, activity, refresh");

export { importWorker, resolveWorker, activityWorker, refreshWorker };
