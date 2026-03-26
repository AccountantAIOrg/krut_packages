import vm from 'vm';
import type { DataRecord, ComparisonResult, EngineOptions } from './types';

declare global {
    var data1: DataRecord[];
    var data2: DataRecord[];
    var comparisonResult: DataRecord[];
}

export class ExecutionEngine {
    private timeout: number;
    constructor(options: EngineOptions = {}) {
        this.timeout = options.timeout || 30000;
    }

    execute(
        code: string,
        data1: DataRecord[],
        data2: DataRecord[]
    ): ComparisonResult {
        const startTime = Date.now();
        let comparisonResult: DataRecord[] = [];

        const sandbox = {
            data1: data1,
            data2: data2,
            comparisonResult: [],
            console: {
                log: (...args: unknown[]) => console.log('[Sandbox]', ...args),
                error: (...args: unknown[]) => console.error('[Sandbox]', ...args),
                warn: (...args: unknown[]) => console.warn('[Sandbox]', ...args),
            },
            Array,
            Object,
            String,
            Number,
            Boolean,
            Date,
            JSON,
            Math,
            Map,
            Set,
            parseInt,
            parseFloat,
            isNaN,
            isFinite,
            undefined,
        };

        const context = vm.createContext(sandbox);

        const wrappedCode = `
            'use strict';
            ${code}
        `;

        try {
            vm.runInContext(wrappedCode, context, {
                timeout: this.timeout,
                displayErrors: true,
            });

            comparisonResult = context.comparisonResult || [];

            const differencesFound = comparisonResult.filter((row) => {
                const status = String(row.status || row.STATUS || '').toUpperCase();
                return status.includes('DIFFERENCE') || status.includes('MISMATCH');
            }).length;

            const matchesFound = comparisonResult.filter((row) => {
                const status = String(row.status || row.STATUS || '').toUpperCase();
                return status.includes('MATCH') || status.includes('SAME');
            }).length;

            let status: 'SUCCESS' | 'PARTIAL' | 'NO_MATCH' = 'SUCCESS';
            if (differencesFound === 0 && matchesFound === 0) {
                status = 'NO_MATCH';
            } else if (differencesFound > 0 && matchesFound > 0) {
                status = 'PARTIAL';
            }

            return {
                data: comparisonResult,
                summary: {
                    totalRows: comparisonResult.length,
                    differencesFound,
                    matchesFound,
                    status,
                },
                metadata: {
                    file1Columns: data1.length > 0 ? Object.keys(data1[0]) : [],
                    file2Columns: data2.length > 0 ? Object.keys(data2[0]) : [],
                    executionTime: Date.now() - startTime,
                },
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Code execution failed: ${errorMessage}`);
        }
    }

    validateCode(code: string): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        try {
            new vm.Script(code);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            errors.push(`Syntax error: ${errorMessage}`);
        }

        const forbiddenPatterns = [
            /require\s*\(/,
            /import\s+/,
            /process\./,
            /global\./,
            /eval\s*\(/,
            /Function\s*\(/,
        ];

        for (const pattern of forbiddenPatterns) {
            if (pattern.test(code)) {
                errors.push(`Forbidden pattern detected: ${pattern.source}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
