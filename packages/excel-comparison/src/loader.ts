import type { DataRecord, ExcelLoaderOptions } from './types';

export interface ExcelDataFrame {
    headers: string[];
    data: DataRecord[];
    rowCount: number;
    columnCount: number;
    sample: DataRecord[];
}

export class DataLoader {
    static async loadFromBuffer(
        buffer: Buffer,
        fileName: string,
        options: ExcelLoaderOptions = {}
    ): Promise<ExcelDataFrame> {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';

        if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
            const XLSX = await import('xlsx');

            const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
            const sheetIndex = options.sheetIndex ?? 0;
            const sheetName = workbook.SheetNames[sheetIndex];

            if (!sheetName) {
                throw new Error(`Sheet index ${sheetIndex} out of bounds or file has no sheets.`);
            }

            const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
                defval: "",
                raw: false,
                dateNF: 'mm/dd/yyyy'
            }) as DataRecord[];

            const data = rawData.map(row => {
                const normalizedRow: DataRecord = {};
                Object.keys(row).forEach(key => {
                    normalizedRow[key.trim()] = row[key];
                });
                return normalizedRow;
            });

            const headers = Object.keys(data[0] || {}).map(col => String(col).trim());
            const sampleCount = options.sampleRows ?? 5;
            const sample = data.slice(0, sampleCount);

            return {
                headers,
                data,
                rowCount: data.length,
                columnCount: headers.length,
                sample,
            };
        }

        throw new Error(`Unsupported file type: ${ext}. Only Excel (.xlsx, .xls) and CSV files are supported.`);
    }

    static getColumnNames(data: DataRecord[]): string[] {
        if (data.length === 0) return [];
        return Object.keys(data[0]);
    }

    static getSampleData(data: DataRecord[], count: number = 3): DataRecord[] {
        return data.slice(0, count);
    }
}