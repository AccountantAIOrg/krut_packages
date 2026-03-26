import express, { type Request, type Response, type Router } from 'express';
import multer from 'multer';
import { DataLoader, StyledReporter } from './index.js';
import type { DataRecord } from './types.js';

export interface ComparisonOptions {
    matchColumn?: string;
    ignoreColumns?: string[];
    tolerance?: number;
    caseSensitive?: boolean;
}

export interface MatchResult {
    status: 'MATCH' | 'DIFFERENCE' | 'UNIQUE_TO_FILE1' | 'UNIQUE_TO_FILE2';
    file1Row?: DataRecord;
    file2Row?: DataRecord;
    differences?: Record<string, { file1: unknown; file2: unknown }>;
}

function normalizeValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return String(value);
    if (value instanceof Date) return value.toISOString();
    return String(value).trim();
}

function getCanonicalName(col: string): string {
    return col.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function columnsAreSimilar(col1: string, col2: string): boolean {
    if (!col1 || !col2) return false;
    const c1 = getCanonicalName(col1);
    const c2 = getCanonicalName(col2);
    if (c1 === c2) return true;
    
    // Check if one is a suffix of the other (for cases like "Description" vs "Credit Note Description")
    if (c1.length >= 5 && c2.length >= 5) {
        if (c1.endsWith(c2) || c2.endsWith(c1)) return true;
    }
    
    // Hardcoded common semantic mappings
    const commonMappings = [
        ['description', 'creditnotedescription'],
        ['invoicedate', 'date'],
        ['grossamount', 'amount'],
        ['grossamount', 'totalamount'],
        ['taxablevalue', 'netamount'],
        ['taxablevalue', 'amount'],
        ['gstin', 'gstno']
    ];
    
    for (const [m1, m2] of commonMappings) {
        if ((c1 === m1 && c2 === m2) || (c1 === m2 && c2 === m1)) return true;
    }

    return false;
}

function valuesAreEqual(val1: unknown, val2: unknown, options: ComparisonOptions): boolean {
    const str1 = normalizeValue(val1);
    const str2 = normalizeValue(val2);

    const v1 = options.caseSensitive === false ? str1.toLowerCase() : str1;
    const v2 = options.caseSensitive === false ? str2.toLowerCase() : str2;

    if (v1 === v2) return true;

    if (v1 && v2 && !isNaN(v1 as any) && !isNaN(v2 as any)) {
        const num1 = parseFloat(v1);
        const num2 = parseFloat(v2);
        const tolerance = options.tolerance ?? 0.01;
        return Math.abs(num1 - num2) <= tolerance;
    }

    return false;
}

function findMatchingColumn(file1Columns: string[], file2Columns: string[]): string | null {
    const priorityColumns = ['id', 'invoice', 'gstin', 'number', 'name', 'code'];

    for (const priority of priorityColumns) {
        const match = file1Columns.find(c =>
            getCanonicalName(c).includes(priority) &&
            file2Columns.some(c2 => getCanonicalName(c2).includes(priority))
        );
        if (match) return match;
    }

    const exactMatch = file1Columns.find(c =>
        file2Columns.some(c2 => getCanonicalName(c) === getCanonicalName(c2))
    );

    return exactMatch || null;
}

function compareRows(
    row1: DataRecord,
    row2: DataRecord,
    columns1: string[],
    columns2: string[],
    options: ComparisonOptions
): { isMatch: boolean; differences?: Record<string, { file1: unknown; file2: unknown }> } {
    const differences: Record<string, { file1: unknown; file2: unknown }> = {};
    const allColumns = new Set([...columns1, ...columns2]);

    for (const col of allColumns) {
        if (options.ignoreColumns?.includes(col)) continue;

        const col1 = columns1.find(c => columnsAreSimilar(c, col)) || col;
        const col2 = columns2.find(c => columnsAreSimilar(c, col)) || col;

        const val1 = row1[col1];
        const val2 = row2[col2];

        if (!valuesAreEqual(val1, val2, options)) {
            differences[col] = { file1: val1, file2: val2 };
        }
    }

    return {
        isMatch: Object.keys(differences).length === 0,
        differences: Object.keys(differences).length > 0 ? differences : undefined
    };
}

function compareData(
    data1: DataRecord[],
    data2: DataRecord[],
    file1Columns: string[],
    file2Columns: string[],
    options: ComparisonOptions = {}
): MatchResult[] {
    const results: MatchResult[] = [];
    const usedInFile2 = new Set<number>();

    const matchColumn = options.matchColumn || findMatchingColumn(file1Columns, file2Columns);

    if (matchColumn) {
        console.log(`[Comparison] Using match column: "${matchColumn}"`);

        const file2IndexMap = new Map<string, number>();
        data2.forEach((row, index) => {
            const matchCol2 = file2Columns.find(c => c.toLowerCase() === matchColumn.toLowerCase()) || matchColumn;
            const key = normalizeValue(row[matchCol2]);
            if (key) file2IndexMap.set(key, index);
        });

        for (let i = 0; i < data1.length; i++) {
            const row1 = data1[i];
            if (!row1) continue;

            const matchCol1 = file1Columns.find(c => c.toLowerCase() === matchColumn.toLowerCase()) || matchColumn;
            const key = normalizeValue(row1[matchCol1]);

            if (key && file2IndexMap.has(key)) {
                const matchIndex = file2IndexMap.get(key)!;
                usedInFile2.add(matchIndex);
                const row2 = data2[matchIndex];

                if (row2) {
                    const { isMatch, differences } = compareRows(row1, row2, file1Columns, file2Columns, options);

                    results.push({
                        status: isMatch ? 'MATCH' : 'DIFFERENCE',
                        file1Row: row1,
                        file2Row: row2,
                        differences
                    });
                }
            } else {
                results.push({
                    status: 'UNIQUE_TO_FILE1',
                    file1Row: row1
                });
            }
        }

        for (let j = 0; j < data2.length; j++) {
            if (!usedInFile2.has(j)) {
                results.push({
                    status: 'UNIQUE_TO_FILE2',
                    file2Row: data2[j]
                });
            }
        }
    } else {
        console.log(`[Comparison] No matching column found, comparing row-by-row`);

        const maxRows = Math.max(data1.length, data2.length);

        for (let i = 0; i < maxRows; i++) {
            const row1 = data1[i];
            const row2 = data2[i];

            if (row1 && row2) {
                const { isMatch, differences } = compareRows(row1, row2, file1Columns, file2Columns, options);

                results.push({
                    status: isMatch ? 'MATCH' : 'DIFFERENCE',
                    file1Row: row1,
                    file2Row: row2,
                    differences
                });
            } else if (row1) {
                results.push({
                    status: 'UNIQUE_TO_FILE1',
                    file1Row: row1
                });
            } else if (row2) {
                results.push({
                    status: 'UNIQUE_TO_FILE2',
                    file2Row: data2[i]
                });
            }
        }
    }

    return results;
}

function filterData(data: DataRecord[]): DataRecord[] {
    return data.filter(record => {
        const values = Object.values(record);
        if (values.length === 0) return false;

        const nonEmptyValues = values.filter(v =>
            v !== null &&
            v !== undefined &&
            v !== '' &&
            String(v).trim() !== '' &&
            String(v).toLowerCase() !== 'none' &&
            String(v).toLowerCase() !== 'null'
        );

        const threshold = Math.max(1, Math.floor(values.length * 0.5));
        return nonEmptyValues.length >= threshold;
    });
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
});

export function createCompareRouter(): Router {
    const router = express.Router();

    router.post(
        "/compare",
        upload.fields([
            { name: "file1", maxCount: 1 },
            { name: "file2", maxCount: 1 },
        ]),
        async (req: Request, res: Response) => {
            console.log("[POST /compare] Incoming request");
            try {
                const files = req.files as { [fieldname: string]: Express.Multer.File[] };
                const file1 = files["file1"]?.[0];
                const file2 = files["file2"]?.[0];

                if (!file1 || !file2) {
                    return res.status(400).json({
                        success: false,
                        error: "Both file1 and file2 are required",
                    });
                }

                const {
                    matchColumn,
                    ignoreColumns,
                    tolerance,
                    caseSensitive
                } = req.body as ComparisonOptions;

                const df1 = await DataLoader.loadFromBuffer(file1.buffer, file1.originalname);
                const df2 = await DataLoader.loadFromBuffer(file2.buffer, file2.originalname);

                const data1 = df1.data;
                const data2 = df2.data;

                const filteredData1 = filterData(data1);
                const filteredData2 = filterData(data2);

                console.log(`[POST /compare] File 1: ${df1.headers.join(", ")}`);
                console.log(`[POST /compare] File 2: ${df2.headers.join(", ")}`);
                console.log(`[POST /compare] Rows: file1=${filteredData1.length}, file2=${filteredData2.length}`);

                const options: ComparisonOptions = {
                    matchColumn,
                    ignoreColumns: typeof ignoreColumns === 'string' ? JSON.parse(ignoreColumns) : (ignoreColumns || []),
                    tolerance: tolerance ? parseFloat(String(tolerance)) : 0.01,
                    caseSensitive: caseSensitive === true
                };

                const comparisonResults = compareData(
                    filteredData1,
                    filteredData2,
                    df1.headers,
                    df2.headers,
                    options
                );

                const matches = comparisonResults.filter(r => r.status === 'MATCH').length;
                const differences = comparisonResults.filter(r => r.status === 'DIFFERENCE').length;
                const unique1 = comparisonResults.filter(r => r.status === 'UNIQUE_TO_FILE1').length;
                const unique2 = comparisonResults.filter(r => r.status === 'UNIQUE_TO_FILE2').length;

                const canonicalToOriginal = new Map<string, string[]>();
                const uniqueCanonicalOrder: string[] = [];

                // Track which group contains columns from which file
                const groupContains = new Map<string, Set<number>>();

                [...df1.headers.map(h => ({h, f: 1})), ...df2.headers.map(h => ({h, f: 2}))].forEach(({h, f}) => {
                    const norm = getCanonicalName(h);
                    
                    // Look for an existing group that is "similar"
                    let targetNorm = norm;
                    for (const existing of canonicalToOriginal.keys()) {
                        const originals = canonicalToOriginal.get(existing)!;
                        const filesInGroup = groupContains.get(existing)!;
                        
                        // Only join if this file is not already represented in the group
                        // AND it's similar to some column already in the group
                        if (!filesInGroup.has(f) && originals.some(orig => columnsAreSimilar(orig, h))) {
                            targetNorm = existing;
                            break;
                        }
                    }

                    if (!canonicalToOriginal.has(targetNorm)) {
                        canonicalToOriginal.set(targetNorm, []);
                        groupContains.set(targetNorm, new Set());
                        uniqueCanonicalOrder.push(targetNorm);
                    }
                    if (!canonicalToOriginal.get(targetNorm)!.includes(h)) {
                        canonicalToOriginal.get(targetNorm)!.push(h);
                        groupContains.get(targetNorm)!.add(f);
                    }
                });

                const allColumns = uniqueCanonicalOrder;

                const columnsWithDiffs = new Set<string>();
                comparisonResults.forEach(res => {
                    if (res.differences) {
                        Object.keys(res.differences).forEach(col => columnsWithDiffs.add(col));
                    }
                });

                const reportData: DataRecord[] = comparisonResults.map((result, index) => {
                    let matchPercentage = 0;
                    if (result.status === 'MATCH') {
                        matchPercentage = 100;
                    } else if (result.status === 'UNIQUE_TO_FILE1' || result.status === 'UNIQUE_TO_FILE2') {
                        matchPercentage = 0;
                    } else if (result.status === 'DIFFERENCE') {
                        const totalCols = allColumns.length;
                        const diffCols = result.differences ? Object.keys(result.differences).length : 0;
                        matchPercentage = Math.round(((totalCols - diffCols) / totalCols) * 100);
                    }

                    const record: DataRecord = {
                        Row: index + 1,
                        Status: result.status,
                        "Match %": `${matchPercentage}%`,
                    };

                    allColumns.forEach(norm => {
                        const group = canonicalToOriginal.get(norm)!;
                        
                        // Find actual columns in file1/file2 for this group
                        const f1Col = group.find(c => df1.headers.includes(c));
                        const f2Col = group.find(c => df2.headers.includes(c));
                        
                        // Representative name for naming missing columns
                        const repName = f1Col || f2Col || norm;

                        // Always create File1, File2, and Diff columns for every field for consistent layout
                        const file1Key = f1Col ? `File1_${f1Col}` : `File1_${repName}`;
                        const file2Key = f2Col ? `File2_${f2Col}` : `File2_${repName}`;
                        const diffKey = `Diff_${repName}`;

                        record[file1Key] = f1Col ? (result.file1Row?.[f1Col] ?? 'N/A') : 'N/A';
                        record[file2Key] = f2Col ? (result.file2Row?.[f2Col] ?? 'N/A') : 'N/A';

                        let groupDiff = '';
                        group.forEach(col => {
                            if (result.differences?.[col]) {
                                const diff = result.differences[col];
                                groupDiff = `${diff.file1} → ${diff.file2}`;
                            }
                        });
                        
                        // Always add the Diff column for a field to keep the layout consistent
                        record[diffKey] = groupDiff;
                    });

                    return record;
                });

                const reporter = new StyledReporter();
                const report = await reporter.generateReport({
                    data: reportData,
                    summary: {
                        totalRows: comparisonResults.length,
                        differencesFound: differences + unique1 + unique2,
                        matchesFound: matches,
                        status: differences > 0 || unique1 > 0 || unique2 > 0 ? 'PARTIAL' : 'SUCCESS'
                    },
                    metadata: {
                        file1Columns: df1.headers,
                        file2Columns: df2.headers
                    }
                });

                const base64Report = report.toString("base64");

                console.log(`[POST /compare] Results: matches=${matches}, differences=${differences}, unique1=${unique1}, unique2=${unique2}`);

                return res.json({
                    success: true,
                    result: {
                        summary: {
                            totalRows: comparisonResults.length,
                            matchesFound: matches,
                            differencesFound: differences,
                            uniqueToFile1: unique1,
                            uniqueToFile2: unique2,
                            status: differences > 0 || unique1 > 0 || unique2 > 0 ? 'PARTIAL' : 'SUCCESS'
                        },
                        matchColumn: options.matchColumn || findMatchingColumn(df1.headers, df2.headers),
                        metadata: {
                            file1Name: file1.originalname,
                            file1Columns: df1.headers,
                            file1RowCount: filteredData1.length,
                            file2Name: file2.originalname,
                            file2Columns: df2.headers,
                            file2RowCount: filteredData2.length,
                        }
                    },
                    downloadUrl: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64Report}`,
                    fileName: `comparison_result_${Date.now()}.xlsx`,
                });
            } catch (error) {
                console.error("[POST /compare]", error);
                return res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }
    );

    return router;
}
