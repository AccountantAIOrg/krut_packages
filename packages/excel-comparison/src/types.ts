export interface DataRecord {
    [key: string]: unknown;
}

export interface ComparisonResult {
    data: DataRecord[];
    summary: {
        totalRows: number;
        differencesFound: number;
        matchesFound: number;
        status: 'SUCCESS' | 'PARTIAL' | 'NO_MATCH';
    };
    metadata?: {
        file1Columns?: string[];
        file2Columns?: string[];
        executionTime?: number;
    };
}

export interface ExcelLoaderOptions {
    sheetIndex?: number;
    sheetName?: string;
    headerRow?: number;
    skipRows?: number;
    sampleRows?: number;
}

export interface LoaderOptions {
    sheetName?: string;
    headerRow?: number;
    skipRows?: number;
}

export interface ReporterOptions {
    headerColor?: string;
    differenceColor?: string;
    matchColor?: string;
    sheetName?: string;
    includeSummary?: boolean;
}

export interface EngineOptions {
    timeout?: number;
    maxMemory?: number;
}

export interface CodeGenerationResult {
    code: string;
    humanExplanation: string[];
    constants?: Record<string, unknown>;
}

export interface ComparisonRequest {
    file1Data: DataRecord[];
    file2Data: DataRecord[];
    file1Columns?: string[];
    file2Columns?: string[];
    file1Sample?: DataRecord[];
    file2Sample?: DataRecord[];
    prompt?: string;
}

export interface ExcelSchema {
    headers: string[];
    rowCount: number;
    columnCount: number;
    sample: DataRecord[];
    data: DataRecord[];
}
