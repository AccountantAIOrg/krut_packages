import type { Job } from 'bullmq';

export type { Job };

export type BackoffType = 'exponential' | 'fixed';

export interface JobRetryOptions {
    /**
     * Maximum number of attempts (including the first run).
     * Defaults to 3.
     */
    attempts?: number;
    backoff?: {
        type: BackoffType;
        /**
         * Delay in milliseconds.
         * - 'fixed': constant delay between retries.
         * - 'exponential': delay doubles on each attempt starting from this value.
         */
        delay: number;
    };
}

export interface JobOptions extends JobRetryOptions {
    /** Optional job identifier — BullMQ deduplicates by jobId within the queue. */
    jobId?: string;
    /** Delay in ms before the job is processed for the first time. */
    delay?: number;
    /** Remove job from queue on successful completion. */
    removeOnComplete?: boolean | number;
    /** Remove job from queue after failure (after all retries exhausted). */
    removeOnFail?: boolean | number;
    /** Job priority — lower number = higher priority. */
    priority?: number;
}

export type JobProcessor<T = unknown, R = unknown> = (job: Job<T>) => Promise<R>;

export interface WorkerEventHandlers<T = unknown, R = unknown> {
    onCompleted?: (job: Job<T>, result: R) => void | Promise<void>;
    onFailed?: (job: Job<T> | undefined, error: Error, prev: string) => void | Promise<void>;
    onError?: (error: Error) => void | Promise<void>;
}

export interface RegisterProcessorOptions<T = unknown, R = unknown> extends JobRetryOptions {
    /** Number of jobs processed concurrently by this worker. Defaults to 1. */
    concurrency?: number;
    events?: WorkerEventHandlers<T, R>;
}

/** Shape of the Redis config returned by the backend /config endpoint. */
export interface WorkerConfigResponse {
    host: string;
    port: number;
    password?: string;
    db?: number;
    tls?: boolean;
}

export interface WorkerServiceConfig {
    apiKey: string;
    serverUrl?: string;
    validateOnInit?: boolean;
    /** Default retry options applied to every job unless overridden per-job. */
    defaultJobOptions?: JobRetryOptions;
}
