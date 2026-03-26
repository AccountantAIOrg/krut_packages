export { DataLoader } from './loader';
export type { ExcelDataFrame } from './loader';

export { ExecutionEngine } from './engine';
export { StyledReporter } from './reporter';

export { FileComparator, ExcelComparator } from './comparison';
export type {
    ComparisonOptions,
    MatchResult,
    ComparisonResult,
    FilePreview,
} from './comparison';

export { ComparisonApiClient, createComparisonClient } from './api-client';
export type {
    ComparisonApiOptions,
    CompareFilesOptions,
    ComparisonApiResponse,
    PreviewResponse,
    FilePreview as ApiFilePreview,
} from './api-client';

export type {
    DataRecord,
    ComparisonResult as LegacyComparisonResult,
    LoaderOptions,
    ExcelLoaderOptions,
    ReporterOptions,
    EngineOptions,
    ComparisonRequest,
    CodeGenerationResult,
    ExcelSchema,
} from './types';
