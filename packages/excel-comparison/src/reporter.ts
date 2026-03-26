import ExcelJS from 'exceljs';
import type { ComparisonResult, ReporterOptions } from './types';

export class StyledReporter {
    private options: Required<ReporterOptions>;

    constructor(options: ReporterOptions = {}) {
        this.options = {
            headerColor: options.headerColor || '#8b5cf6',
            differenceColor: options.differenceColor || '#fee2e2',
            matchColor: options.matchColor || '#d1fae5',
            sheetName: options.sheetName || 'Comparison Result',
            includeSummary: options.includeSummary ?? true,
        };
    }

    async generateReport(
        result: ComparisonResult,
        _file1Columns?: string[],
        _file2Columns?: string[]
    ): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'DataComparisonLib';
        workbook.created = new Date();

        if (this.options.includeSummary) {
            this.addSummarySheet(workbook, result);
        }

        this.addResultSheet(workbook, result);

        const buffer = Buffer.from(await workbook.xlsx.writeBuffer()) as Buffer;
        return buffer;
    }

    private addSummarySheet(workbook: ExcelJS.Workbook, result: ComparisonResult): void {
        const sheet = workbook.addWorksheet('Summary');

        sheet.columns = [
            { header: 'Metric', key: 'metric', width: 25 },
            { header: 'Value', key: 'value', width: 20 },
        ];

        const headerStyle: Partial<ExcelJS.Style> = {
            font: { bold: true, color: { argb: 'FFFFFFFF' } },
            fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF8b5cf6' },
            },
            alignment: { horizontal: 'center', vertical: 'middle' },
            border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            },
        };

        const cellStyle: Partial<ExcelJS.Style> = {
            alignment: { horizontal: 'left', vertical: 'middle' },
            border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            },
        };

        const headerCell = sheet.getCell('A1');
        headerCell.style = headerStyle;
        headerCell.value = 'Metric';

        const valueHeaderCell = sheet.getCell('B1');
        valueHeaderCell.style = headerStyle;
        valueHeaderCell.value = 'Value';

        const summaryData = [
            { metric: 'Total Rows', value: result.summary.totalRows },
            { metric: 'Differences Found', value: result.summary.differencesFound },
            { metric: 'Matches Found', value: result.summary.matchesFound },
            { metric: 'Status', value: result.summary.status },
            {
                metric: 'Execution Time (ms)',
                value: result.metadata?.executionTime ?? 'N/A',
            },
        ];

        summaryData.forEach((row, index) => {
            const rowNum = index + 2;
            const metricCell = sheet.getCell(`A${rowNum}`);
            metricCell.style = cellStyle;
            metricCell.value = row.metric;

            const valueCell = sheet.getCell(`B${rowNum}`);
            valueCell.style = cellStyle;
            valueCell.value = String(row.value);

            const numValue = typeof row.value === 'number' ? row.value : parseInt(String(row.value), 10);
            if (row.metric === 'Differences Found' && !isNaN(numValue) && numValue > 0) {
                valueCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFfef3c7' },
                };
            } else if (row.metric === 'Matches Found' && !isNaN(numValue) && numValue > 0) {
                valueCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFd1fae5' },
                };
            }
        });

        sheet.getRow(1).height = 25;
        sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    }

    private addResultSheet(workbook: ExcelJS.Workbook, result: ComparisonResult): void {
        const sheet = workbook.addWorksheet(this.options.sheetName);

        if (result.data.length === 0) {
            sheet.addRow(['No comparison results available']);
            return;
        }

        // Collect all possible headers from ALL rows to ensure no columns are missed
        // (especially important for rows with unique columns or status-specific fields)
        const allKeys = new Set<string>();
        result.data.forEach(row => {
            Object.keys(row).forEach(key => allKeys.add(key));
        });

        // Identify which Diff_ columns actually have differences across ALL rows
        const diffColsWithValues = new Set<string>();
        result.data.forEach(row => {
            Object.entries(row).forEach(([key, val]) => {
                if (key.startsWith('Diff_')) {
                    // Consider it a real difference if it's not empty, not "N/A"
                    if (val !== undefined && val !== null && val !== '' && val !== 'N/A') {
                        const strVal = String(val);
                        // Filter out cases that are essentially "no change"
                        if (
                            !strVal.includes('undefined -> undefined') &&
                            !strVal.includes('null -> null') &&
                            strVal.trim().length > 0
                        ) {
                            diffColsWithValues.add(key);
                        }
                    }
                }
            });
        });

        // Filter headers: remove Diff_ columns that have no differences
        const rawHeaders = Array.from(allKeys).filter(h => {
            if (h.startsWith('Diff_')) {
                return diffColsWithValues.has(h);
            }
            return true;
        });

        // Reorder headers: Group File1_X, File2_X, Diff_X together
        const metadataHeaders = ['Row', 'Status', 'STATUS', 'status', 'Match %'];
        const orderedHeaders: string[] = [];

        // 1. Add metadata headers first in preferred order
        metadataHeaders.forEach(h => {
            const found = rawHeaders.find(rh => rh.toLowerCase() === h.toLowerCase());
            if (found && !orderedHeaders.includes(found)) {
                orderedHeaders.push(found);
            }
        });

        // 2. Group prefixed headers (File1_, File2_, Diff_) by their base names
        const fieldGroups = new Map<string, string[]>();
        const fieldDiscoveryOrder: string[] = [];

        rawHeaders.forEach(h => {
            const isMetadata = metadataHeaders.some(m => m.toLowerCase() === h.toLowerCase());
            if (isMetadata) return;

            let base: string | null = null;
            if (h.startsWith('File1_')) base = h.substring(6);
            else if (h.startsWith('File2_')) base = h.substring(6);
            else if (h.startsWith('Diff_')) base = h.substring(5);

            if (base) {
                // Normalize base name to group similar names (e.g. "WD Name" and "WD_Name")
                const normalized = base.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (!fieldGroups.has(normalized)) {
                    fieldGroups.set(normalized, []);
                    fieldDiscoveryOrder.push(normalized);
                }
                if (!fieldGroups.get(normalized)!.includes(h)) {
                    fieldGroups.get(normalized)!.push(h);
                }
            } else {
                // Not a prefixed column, treat as its own field group
                const normalized = h.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (!fieldGroups.has(normalized)) {
                    fieldGroups.set(normalized, [h]);
                    fieldDiscoveryOrder.push(normalized);
                } else if (!fieldGroups.get(normalized)!.includes(h)) {
                    fieldGroups.get(normalized)!.push(h);
                }
            }
        });

        // 3. Add grouped fields to orderedHeaders
        fieldDiscoveryOrder.forEach(norm => {
            const group = fieldGroups.get(norm)!;
            // Sort within group: File1, then File2, then Diff
            group.sort((a, b) => {
                const getScore = (s: string) => {
                    if (s.startsWith('File1_')) return 1;
                    if (s.startsWith('File2_')) return 2;
                    if (s.startsWith('Diff_')) return 3;
                    return 4;
                };
                const scoreA = getScore(a);
                const scoreB = getScore(b);
                if (scoreA !== scoreB) return scoreA - scoreB;
                return a.localeCompare(b); // Alphabetical for same prefix
            });
            group.forEach(h => {
                if (!orderedHeaders.includes(h)) {
                    orderedHeaders.push(h);
                }
            });
        });

        // 4. Add any remaining headers that might have been missed
        rawHeaders.forEach(h => {
            if (!orderedHeaders.includes(h)) {
                orderedHeaders.push(h);
            }
        });

        const headers = orderedHeaders;
        sheet.columns = headers.map((header) => ({
            header,
            key: header,
            width: Math.max(15, header.length + 2),
        }));

        const headerStyle: Partial<ExcelJS.Style> = {
            font: { bold: true, color: { argb: 'FFFFFFFF' } },
            fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: `FF${this.options.headerColor.replace('#', '')}` },
            },
            alignment: { horizontal: 'center', vertical: 'middle' },
            border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            },
        };

        const baseCellStyle: Partial<ExcelJS.Style> = {
            alignment: { horizontal: 'left', vertical: 'middle' },
            border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            },
        };

        headers.forEach((_, colIndex) => {
            const cell = sheet.getRow(1).getCell(colIndex + 1);
            cell.style = headerStyle;
        });

        result.data.forEach((row, rowIndex) => {
            const status = String(row.status || row.Status || row.STATUS || '').toUpperCase();
            const isDifference = status.includes('DIFFERENCE') || status.includes('MISMATCH') || status.startsWith('UNIQUE');
            const isMatch = status.includes('MATCH') || status.includes('SAME');

            let rowFill: ExcelJS.Fill | undefined;
            if (isDifference) {
                rowFill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: `FF${this.options.differenceColor.replace('#', '')}` },
                };
            } else if (isMatch) {
                rowFill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: `FF${this.options.matchColor.replace('#', '')}` },
                };
            }

            headers.forEach((headerKey, colIndex) => {
                const cell = sheet.getRow(rowIndex + 2).getCell(colIndex + 1);
                const value = row[headerKey];
                cell.value = this.formatValue(value);

                let cellFill = rowFill;

                // Highlight specific mismatches if it's a difference row (but not a unique row)
                if (isDifference && !status.startsWith('UNIQUE')) {
                    if (headerKey.startsWith('File1_') || headerKey.startsWith('File2_') || headerKey.startsWith('Diff_')) {
                        const baseKey = headerKey.replace(/^(File1_|File2_|Diff_)/, '');
                        const diffValue = row[`Diff_${baseKey}`];
                        if (diffValue && diffValue !== '' && diffValue !== 'N/A') {
                            // Keep rowFill (light red)
                        } else {
                            // Clear fill for matching columns in a difference row
                            cellFill = undefined;
                        }
                    } else if (headerKey !== 'Row' && headerKey !== 'Status' && headerKey !== 'STATUS' && headerKey !== 'status' && headerKey !== 'Match %') {
                        // For other columns in a difference row, clear fill unless it's a metadata column
                        cellFill = undefined;
                    }
                }

                cell.style = {
                    ...baseCellStyle,
                    ...(cellFill ? { fill: cellFill } : {}),
                };
            });
        });

        sheet.getRow(1).height = 25;
        sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    }

    private formatValue(value: unknown): string {
        if (value === null || value === undefined) {
            return 'N/A';
        }
        if (Array.isArray(value)) {
            return JSON.stringify(value);
        }
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return String(value);
    }

    async generateDetailedReport(
        result: ComparisonResult,
        file1Columns?: string[],
        file2Columns?: string[]
    ): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'DataComparisonLib';
        workbook.created = new Date();

        this.addSummarySheet(workbook, result);

        if (file1Columns && file1Columns.length > 0) {
            this.addDataSheet(workbook, 'File 1 Data', file1Columns);
        }
        if (file2Columns && file2Columns.length > 0) {
            this.addDataSheet(workbook, 'File 2 Data', file2Columns);
        }

        this.addResultSheet(workbook, result);

        const buffer = Buffer.from(await workbook.xlsx.writeBuffer()) as Buffer;
        return buffer;
    }

    private addDataSheet(workbook: ExcelJS.Workbook, name: string, columns: string[]): void {
        const sheet = workbook.addWorksheet(name);
        sheet.columns = columns.map((col) => ({
            header: col,
            key: col,
            width: Math.max(15, col.length + 2),
        }));
    }
}