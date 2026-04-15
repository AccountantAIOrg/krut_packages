# @krutai/worker

Background job producer + worker wrapper for KrutAI, powered by BullMQ.

## Install

```bash
npm install @krutai/worker
```

## Requirements

- Node.js 18+ (uses global `fetch`)
- Access to a KrutAI backend that exposes worker management endpoints
- KrutAI server URL (example: `http://localhost:8000`)
- A valid KrutAI API key

## Quick start

```ts
import { workerService } from '@krutai/worker';

const worker = workerService({
  apiKey: process.env.KRUTAI_API_KEY!,
  serverUrl: 'http://localhost:8000',
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
  },
});

await worker.initialize();
```

`initialize()` does two things:
- validates your API key
- fetches Redis connection config from the backend (`/worker-manage/config`)

## Enqueue jobs

```ts
const jobId = await worker.addJob(
  'emails',
  'send-welcome-email',
  { userId: 'u_123', email: 'user@example.com' },
  {
    attempts: 3,
    backoff: { type: 'fixed', delay: 2000 },
    removeOnComplete: true,
  },
);

console.log('enqueued job:', jobId);
```

## Register a processor

```ts
worker.registerProcessor(
  'emails',
  async (job) => {
    // your business logic
    await sendWelcomeEmail(job.data.email);
    return { ok: true };
  },
  {
    concurrency: 5,
    events: {
      onCompleted: async (job, result) => {
        console.log('completed', job.id, result);
      },
      onFailed: async (job, error) => {
        console.error('failed', job?.id, error.message);
      },
      onError: async (error) => {
        console.error('worker error', error.message);
      },
    },
  },
);
```

## Retry behavior

Retry options are resolved in this order:
1. options passed to `addJob(...)`
2. `defaultJobOptions` from `workerService(...)` config
3. fallback defaults: `attempts = 3`, `backoff = { type: 'exponential', delay: 1000 }`

## Queue controls and metrics

```ts
await worker.pauseQueue('emails');
await worker.resumeQueue('emails');

const counts = await worker.getJobCounts('emails');
console.log(counts); // wait, active, completed, failed, delayed, paused
```

## Shutdown

Always close workers and queues during app shutdown:

```ts
await worker.close();
```

## API summary

- `workerService(config)` -> creates a `WorkerService`
- `initialize()` -> validates key + loads Redis config
- `fetchRedisConfig()` -> refreshes Redis config manually
- `addJob(queueName, jobName, data, options?)` -> enqueue a job
- `registerProcessor(queueName, processor, options?)` -> attach worker processor
- `pauseQueue(queueName)` / `resumeQueue(queueName)` -> queue state control
- `getJobCounts(queueName)` -> queue counters
- `close()` -> graceful shutdown

## Error handling

- Invalid API key format throws `KrutAIKeyValidationError`
- Calling queue methods before initialization throws an initialization error

