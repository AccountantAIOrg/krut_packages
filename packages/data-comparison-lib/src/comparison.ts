import type { DataRecord } from './types';

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
    matchPercentage: number;
}

export interface FilePreview {
    name: string;
    rowCount: number;
    columns: string[];
    sample: DataRecord[];
}

export interface ComparisonResult {
    success: boolean;
    results: MatchResult[];
    summary: {
        totalRows: number;
        matchesFound: number;
        differencesFound: number;
        uniqueToFile1: number;
        uniqueToFile2: number;
        status: 'SUCCESS' | 'PARTIAL' | 'NO_MATCH';
    };
    matchColumn: string;
    metadata: {
        file1Name: string;
        file1Columns: string[];
        file1RowCount: number;
        file2Name: string;
        file2Columns: string[];
        file2RowCount: number;
    };
    allColumns: string[];
    columnsWithDiffs: string[];
}

export class FileComparator {
    private options: Required<ComparisonOptions>;

    constructor(options: ComparisonOptions = {}) {
        this.options = {
            matchColumn: options.matchColumn ?? '',
            ignoreColumns: options.ignoreColumns ?? [],
            tolerance: options.tolerance ?? 0.01,
            caseSensitive: options.caseSensitive ?? true,
        };
    }

    private normalizeValue(value: unknown): string {
        if (value === null || value === undefined) return '';
        if (typeof value === 'number') return String(value);
        if (value instanceof Date) return value.toISOString();
        return String(value).trim();
    }

    private valuesAreEqual(val1: unknown, val2: unknown): boolean {
        const str1 = this.normalizeValue(val1);
        const str2 = this.normalizeValue(val2);

        const v1 = this.options.caseSensitive ? str1 : str1.toLowerCase();
        const v2 = this.options.caseSensitive ? str2 : str2.toLowerCase();

        if (v1 === v2) return true;

        if (v1 && v2 && !isNaN(Number(v1)) && !isNaN(Number(v2))) {
            const num1 = parseFloat(v1);
            const num2 = parseFloat(v2);
            return Math.abs(num1 - num2) <= this.options.tolerance;
        }

        return false;
    }

    private findMatchingColumn(file1Columns: string[], file2Columns: string[]): string | null {
        if (this.options.matchColumn) {
            const found = file1Columns.find(c => c.toLowerCase() === this.options.matchColumn!.toLowerCase());
            if (found) return found;
        }

        const priorityColumns = ['id', 'invoice', 'gstin', 'number', 'name', 'code', 'date'];

        for (const priority of priorityColumns) {
            const match = file1Columns.find(c =>
                c.toLowerCase().includes(priority) &&
                file2Columns.some(c2 => c2.toLowerCase().includes(priority))
            );
            if (match) return match;
        }

        const exactMatch = file1Columns.find(c =>
            file2Columns.some(c2 => c.toLowerCase() === c2.toLowerCase())
        );

        return exactMatch || file1Columns[0] || null;
    }

    private columnsAreSimilar(col1: string, col2: string): boolean {
        const c1 = col1.toLowerCase().replace(/[\s_-]/g, '');
        const c2 = col2.toLowerCase().replace(/[\s_-]/g, '');

        if (c1 === c2) return true;

        if (c1.includes(c2) || c2.includes(c1)) return true;

        const mappings: [string, string][] = [
            ['description', 'desc'], ['amount', 'amt'], ['total', 'sum'],
            ['gstin', 'gstno'], ['invoice', 'inv'], ['date', 'dt'],
        ];

        for (const [a, b] of mappings) {
            if (c1.includes(a) && c2.includes(b)) return true;
            if (c1.includes(b) && c2.includes(a)) return true;
        }

        return false;
    }

    private findMatchInColumns(col: string, file2Columns: string[]): string | undefined {
        const exactMatch = file2Columns.find(c => c.toLowerCase() === col.toLowerCase());
        if (exactMatch) return exactMatch;

        return file2Columns.find(c => this.columnsAreSimilar(col, c));
    }

    private compareRows(
        row1: DataRecord,
        row2: DataRecord,
        columns1: string[],
        columns2: string[],
        allColumns: string[]
    ): { isMatch: boolean; differences?: Record<string, { file1: unknown; file2: unknown }> } {
        const differences: Record<string, { file1: unknown; file2: unknown }> = {};

        for (const col of allColumns) {
            if (this.options.ignoreColumns?.includes(col)) continue;

            const col1 = this.findMatchInColumns(col, columns1) || col;
            const col2 = this.findMatchInColumns(col, columns2) || col;

            const val1 = row1[col1];
            const val2 = row2[col2];

            if (!this.valuesAreEqual(val1, val2)) {
                differences[col] = { file1: val1 ?? 'N/A', file2: val2 ?? 'N/A' };
            }
        }

        return {
            isMatch: Object.keys(differences).length === 0,
            differences: Object.keys(differences).length > 0 ? differences : undefined,
        };
    }

    private filterData(data: DataRecord[]): DataRecord[] {
        return data.filter(record => {
            const values = Object.values(record);
            if (values.length === 0) return false;

            const nonEmptyValues = values.filter(v =>
                v !== null && v !== undefined && v !== '' &&
                String(v).trim() !== '' &&
                !['none', 'null', 'na', 'n/a'].includes(String(v).toLowerCase())
            );

            const threshold = Math.max(1, Math.floor(values.length * 0.5));
            return nonEmptyValues.length >= threshold;
        });
    }

    compare(
        file1Data: { name: string; headers: string[]; data: DataRecord[] },
        file2Data: { name: string; headers: string[]; data: DataRecord[] }
    ): ComparisonResult {
        const filteredData1 = this.filterData(file1Data.data);
        const filteredData2 = this.filterData(file2Data.data);

        const matchColumn = this.findMatchingColumn(file1Data.headers, file2Data.headers);
        const results: MatchResult[] = [];
        const usedInFile2 = new Set<number>();

        const allColumns = Array.from(new Set([
            ...file1Data.headers,
            ...file2Data.headers
        ])).filter(col => !this.options.ignoreColumns?.includes(col));

        const columnsWithDiffs = new Set<string>();

        if (matchColumn) {
            const file2IndexMap = new Map<string, number>();
            filteredData2.forEach((row, index) => {
                const matchCol2 = file2Data.headers.find(c => c.toLowerCase() === matchColumn.toLowerCase()) || matchColumn;
                const key = this.normalizeValue(row[matchCol2]);
                if (key) file2IndexMap.set(key, index);
            });

            for (let i = 0; i < filteredData1.length; i++) {
                const row1 = filteredData1[i];
                if (!row1) continue;

                const matchCol1 = file1Data.headers.find(c => c.toLowerCase() === matchColumn.toLowerCase()) || matchColumn;
                const key = this.normalizeValue(row1[matchCol1]);

                if (key && file2IndexMap.has(key)) {
                    const matchIndex = file2IndexMap.get(key)!;
                    usedInFile2.add(matchIndex);
                    const row2 = filteredData2[matchIndex];

                    if (row2) {
                        const { isMatch, differences } = this.compareRows(row1, row2, file1Data.headers, file2Data.headers, allColumns);

                        if (differences) {
                            Object.keys(differences).forEach(col => columnsWithDiffs.add(col));
                        }

                        const totalCols = allColumns.length;
                        const diffCols = differences ? Object.keys(differences).length : 0;
                        const matchPercentage = totalCols === 0 ? 100 : Math.round(((totalCols - diffCols) / totalCols) * 100);

                        results.push({
                            status: isMatch ? 'MATCH' : 'DIFFERENCE',
                            file1Row: row1,
                            file2Row: row2,
                            differences,
                            matchPercentage,
                        });
                    }
                } else {
                    results.push({
                        status: 'UNIQUE_TO_FILE1',
                        file1Row: row1,
                        matchPercentage: 0,
                    });
                }
            }

            for (let j = 0; j < filteredData2.length; j++) {
                if (!usedInFile2.has(j)) {
                    results.push({
                        status: 'UNIQUE_TO_FILE2',
                        file2Row: filteredData2[j],
                        matchPercentage: 0,
                    });
                }
            }
        } else {
            const maxRows = Math.max(filteredData1.length, filteredData2.length);

            for (let i = 0; i < maxRows; i++) {
                const row1 = filteredData1[i];
                const row2 = filteredData2[i];

                if (row1 && row2) {
                    const { isMatch, differences } = this.compareRows(row1, row2, file1Data.headers, file2Data.headers, allColumns);

                    if (differences) {
                        Object.keys(differences).forEach(col => columnsWithDiffs.add(col));
                    }

                    const totalCols = allColumns.length;
                    const diffCols = differences ? Object.keys(differences).length : 0;
                    const matchPercentage = totalCols === 0 ? 100 : Math.round(((totalCols - diffCols) / totalCols) * 100);

                    results.push({
                        status: isMatch ? 'MATCH' : 'DIFFERENCE',
                        file1Row: row1,
                        file2Row: row2,
                        differences,
                        matchPercentage,
                    });
                } else if (row1) {
                    results.push({
                        status: 'UNIQUE_TO_FILE1',
                        file1Row: row1,
                        matchPercentage: 0,
                    });
                } else if (row2) {
                    results.push({
                        status: 'UNIQUE_TO_FILE2',
                        file2Row: row2,
                        matchPercentage: 0,
                    });
                }
            }
        }

        const matches = results.filter(r => r.status === 'MATCH').length;
        const differences = results.filter(r => r.status === 'DIFFERENCE').length;
        const unique1 = results.filter(r => r.status === 'UNIQUE_TO_FILE1').length;
        const unique2 = results.filter(r => r.status === 'UNIQUE_TO_FILE2').length;

        return {
            success: true,
            results,
            summary: {
                totalRows: results.length,
                matchesFound: matches,
                differencesFound: differences + unique1 + unique2,
                uniqueToFile1: unique1,
                uniqueToFile2: unique2,
                status: differences > 0 || unique1 > 0 || unique2 > 0 ? 'PARTIAL' : 'SUCCESS',
            },
            matchColumn: matchColumn || '',
            metadata: {
                file1Name: file1Data.name,
                file1Columns: file1Data.headers,
                file1RowCount: filteredData1.length,
                file2Name: file2Data.name,
                file2Columns: file2Data.headers,
                file2RowCount: filteredData2.length,
            },
            allColumns,
            columnsWithDiffs: Array.from(columnsWithDiffs),
        };
    }

    getPreview(file1Data: { name: string; headers: string[]; data: DataRecord[] }, file2Data: { name: string; headers: string[]; data: DataRecord[] }): { file1: FilePreview; file2: FilePreview; suggestedMatchColumn: string } {
        const filteredData1 = this.filterData(file1Data.data);
        const filteredData2 = this.filterData(file2Data.data);
        const suggestedMatchColumn = this.findMatchingColumn(file1Data.headers, file2Data.headers) || '';

        return {
            file1: {
                name: file1Data.name,
                rowCount: filteredData1.length,
                columns: file1Data.headers,
                sample: filteredData1.slice(0, 5),
            },
            file2: {
                name: file2Data.name,
                rowCount: filteredData2.length,
                columns: file2Data.headers,
                sample: filteredData2.slice(0, 5),
            },
            suggestedMatchColumn,
        };
    }
}

import { DataLoader } from './loader';

export class ExcelComparator {
    private comparator: FileComparator;

    constructor(options: ComparisonOptions = {}) {
        this.comparator = new FileComparator(options);
    }

    async loadFile(buffer: Buffer, fileName: string): Promise<{ name: string; headers: string[]; data: DataRecord[] }> {
        const df = await DataLoader.loadFromBuffer(buffer, fileName);
        return {
            name: fileName,
            headers: df.headers,
            data: df.data,
        };
    }

    async compareFiles(file1Buffer: Buffer, file1Name: string, file2Buffer: Buffer, file2Name: string): Promise<ComparisonResult> {
        const [file1Data, file2Data] = await Promise.all([
            this.loadFile(file1Buffer, file1Name),
            this.loadFile(file2Buffer, file2Name),
        ]);

        return this.comparator.compare(file1Data, file2Data);
    }

    async compareFileObjects(file1: File, file2: File): Promise<ComparisonResult> {
        const [buffer1, buffer2] = await Promise.all([
            file1.arrayBuffer(),
            file2.arrayBuffer(),
        ]);

        return this.compareFiles(Buffer.from(buffer1), file1.name, Buffer.from(buffer2), file2.name);
    }

    async getPreview(file1Buffer: Buffer, file1Name: string, file2Buffer: Buffer, file2Name: string): Promise<{ file1: FilePreview; file2: FilePreview; suggestedMatchColumn: string }> {
        const [file1Data, file2Data] = await Promise.all([
            this.loadFile(file1Buffer, file1Name),
            this.loadFile(file2Buffer, file2Name),
        ]);

        return this.comparator.getPreview(file1Data, file2Data);
    }

    async getPreviewFromFileObjects(file1: File, file2: File): Promise<{ file1: FilePreview; file2: FilePreview; suggestedMatchColumn: string }> {
        const [buffer1, buffer2] = await Promise.all([
            file1.arrayBuffer(),
            file2.arrayBuffer(),
        ]);

        return this.getPreview(Buffer.from(buffer1), file1.name, Buffer.from(buffer2), file2.name);
    }
}
