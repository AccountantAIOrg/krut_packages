import { ComparisonApiClient, ComparisonClientConfig } from './api-client';
export { ComparisonApiClient, createComparisonClient, type ComparisonClientConfig } from './api-client';
export { StyledReporter } from './reporter';
export { DataLoader } from './loader';

export type {
    CompareFilesOptions,
    ComparisonApiResponse,
    PreviewResponse,
    FilePreview as ApiFilePreview,
} from './api-client';

/**
 * krutExcelComparison — convenience factory.
 * 
 * Creates a `ComparisonApiClient` instance configured to call the Krut comparison server.
 * 
 * @param config - Client configuration (apiKey and serverUrl)
 * @returns A `ComparisonApiClient` instance
 */
export function krutExcelComparison(config: ComparisonClientConfig): ComparisonApiClient {
    return new ComparisonApiClient(config);
}

export type {
    DataRecord,
    ComparisonResult,
    LoaderOptions,
    ExcelLoaderOptions,
    ReporterOptions,
    EngineOptions,
    ComparisonRequest,
    CodeGenerationResult,
    ExcelSchema,
} from './types';
