export {
    WorkerService,
    workerService,
    KrutAIKeyValidationError,
    DEFAULT_SERVER_URL,
    DEFAULT_WORKER_MANAGE_PREFIX,
} from './service';

export type {
    WorkerServiceConfig,
    WorkerConfigResponse,
    JobOptions,
    JobRetryOptions,
    BackoffType,
    JobProcessor,
    WorkerEventHandlers,
    RegisterProcessorOptions,
    Job,
} from './types';

export const VERSION = '1.0.0';
