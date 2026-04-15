import { Queue, Worker } from 'bullmq';
import { validateApiKey, validateApiKeyFormat, KrutAIKeyValidationError } from 'krutai';
import type {
    WorkerServiceConfig,
    WorkerConfigResponse,
    JobOptions,
    JobProcessor,
    RegisterProcessorOptions,
} from './types';

export { KrutAIKeyValidationError };

export const DEFAULT_SERVER_URL = 'http://localhost:8000';
export const DEFAULT_WORKER_MANAGE_PREFIX = '/worker-manage';

function toIoRedisConnection(cfg: WorkerConfigResponse) {
    return {
        host: cfg.host,
        port: cfg.port,
        ...(cfg.password !== undefined && { password: cfg.password }),
        ...(cfg.db !== undefined && { db: cfg.db }),
        ...(cfg.tls === true && { tls: {} }),
    };
}

export class WorkerService {
    private readonly apiKey: string;
    private readonly serverUrl: string;
    private readonly workerManagePrefix: string;
    private readonly config: WorkerServiceConfig;
    private initialized = false;
    private redisConfig: WorkerConfigResponse | null = null;

    private readonly queues = new Map<string, Queue>();
    private readonly workers = new Map<string, Worker>();

    constructor(config: WorkerServiceConfig) {
        this.config = config;
        this.apiKey = config.apiKey || process.env.KRUTAI_API_KEY || '';
        this.serverUrl = (config.serverUrl ?? DEFAULT_SERVER_URL).replace(/\/$/, '');
        this.workerManagePrefix = DEFAULT_WORKER_MANAGE_PREFIX.replace(/\/$/, '');

        validateApiKeyFormat(this.apiKey);

        if (config.validateOnInit === false) {
            this.initialized = true;
        }
    }

    private headers(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'x-api-key': this.apiKey,
        };
    }

    private url(path: string): string {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${this.serverUrl}${this.workerManagePrefix}${cleanPath}`;
    }

    /**
     * Validates the API key with the backend and fetches the Redis connection
     * config. Must be called before addJob() or registerProcessor() unless
     * validateOnInit is set to false (in which case fetchRedisConfig() must be
     * called manually before using queues).
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        await validateApiKey(this.apiKey, this.serverUrl);
        await this.fetchRedisConfig();

        this.initialized = true;
    }

    /**
     * Fetches the Redis connection config from the backend.
     * Called automatically by initialize(); can also be called manually to
     * refresh the config.
     */
    async fetchRedisConfig(): Promise<WorkerConfigResponse> {
        const response = await fetch(this.url('/config'), {
            method: 'GET',
            headers: this.headers(),
        });

        if (!response.ok) {
            let message = `Worker service returned HTTP ${response.status} for /config`;
            try {
                const errorData = (await response.json()) as {
                    message?: string;
                    error?: string;
                };
                message = errorData.error ?? errorData.message ?? message;
            } catch {
                // ignore malformed error payloads
            }
            throw new Error(message);
        }

        this.redisConfig = (await response.json()) as WorkerConfigResponse;
        return this.redisConfig;
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    private assertInitialized(): void {
        if (!this.initialized || !this.redisConfig) {
            throw new Error(
                'WorkerService not initialized. Call initialize() first or set validateOnInit to false and call fetchRedisConfig().',
            );
        }
    }

    private getOrCreateQueue(queueName: string): Queue {
        this.assertInitialized();

        const existing = this.queues.get(queueName);
        if (existing) return existing;

        const queue = new Queue(queueName, {
            connection: toIoRedisConnection(this.redisConfig!),
        });

        this.queues.set(queueName, queue);
        return queue;
    }

    /**
     * Enqueue a job on the given queue.
     * Retry behaviour is resolved from (in order of precedence):
     *   1. per-call `options`
     *   2. `config.defaultJobOptions`
     *   3. built-in defaults (3 attempts, exponential 1 s backoff)
     */
    async addJob<T>(
        queueName: string,
        jobName: string,
        data: T,
        options?: JobOptions,
    ): Promise<string> {
        const defaults = this.config.defaultJobOptions ?? {};

        const attempts = options?.attempts ?? defaults.attempts ?? 3;
        const backoff = options?.backoff ?? defaults.backoff ?? {
            type: 'exponential' as const,
            delay: 1000,
        };

        const queue = this.getOrCreateQueue(queueName);

        const job = await queue.add(jobName, data, {
            attempts,
            backoff,
            ...(options?.jobId !== undefined && { jobId: options.jobId }),
            ...(options?.delay !== undefined && { delay: options.delay }),
            ...(options?.priority !== undefined && { priority: options.priority }),
            ...(options?.removeOnComplete !== undefined && {
                removeOnComplete: options.removeOnComplete,
            }),
            ...(options?.removeOnFail !== undefined && {
                removeOnFail: options.removeOnFail,
            }),
        });

        return job.id ?? '';
    }

    /**
     * Register a processor function for the given queue.
     * BullMQ automatically retries failed jobs using the backoff strategy
     * configured when the job was added.
     */
    registerProcessor<T = unknown, R = unknown>(
        queueName: string,
        processor: JobProcessor<T, R>,
        options?: RegisterProcessorOptions<T, R>,
    ): void {
        this.assertInitialized();

        if (this.workers.has(queueName)) {
            throw new Error(
                `A processor is already registered for queue "${queueName}". Call close() first to replace it.`,
            );
        }

        const worker = new Worker<T, R>(queueName, processor, {
            connection: toIoRedisConnection(this.redisConfig!),
            concurrency: options?.concurrency ?? 1,
        });

        if (options?.events?.onCompleted) {
            const handler = options.events.onCompleted;
            worker.on('completed', (job, result) => {
                void handler(job, result);
            });
        }

        if (options?.events?.onFailed) {
            const handler = options.events.onFailed;
            worker.on('failed', (job, error, prev) => {
                void handler(job, error, prev);
            });
        }

        if (options?.events?.onError) {
            const handler = options.events.onError;
            worker.on('error', (error) => {
                void handler(error);
            });
        }

        this.workers.set(queueName, worker as unknown as Worker);
    }

    /** Pause a queue — no new jobs will be picked up until resumed. */
    async pauseQueue(queueName: string): Promise<void> {
        const queue = this.queues.get(queueName);
        if (!queue) throw new Error(`Queue "${queueName}" not found.`);
        await queue.pause();
    }

    /** Resume a previously paused queue. */
    async resumeQueue(queueName: string): Promise<void> {
        const queue = this.queues.get(queueName);
        if (!queue) throw new Error(`Queue "${queueName}" not found.`);
        await queue.resume();
    }

    /** Returns the number of jobs in the given state for a queue. */
    async getJobCounts(queueName: string): Promise<Record<string, number>> {
        const queue = this.getOrCreateQueue(queueName);
        return queue.getJobCounts('wait', 'active', 'completed', 'failed', 'delayed', 'paused');
    }

    /**
     * Gracefully close all queues and workers.
     * Should be called on application shutdown.
     */
    async close(): Promise<void> {
        await Promise.all([
            ...[...this.workers.values()].map((w) => w.close()),
            ...[...this.queues.values()].map((q) => q.close()),
        ]);
        this.workers.clear();
        this.queues.clear();
    }
}

export function workerService(config: WorkerServiceConfig): WorkerService {
    return new WorkerService(config);
}
