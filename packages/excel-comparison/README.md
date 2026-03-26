# @krutai/excel-comparison

A powerful library for comparing Excel and CSV files by leveraging Backend APIs for high-performance processing.

## Features

- **API-Driven Comparison**: Offloads heavy Excel processing to a dedicated comparison service.
- **Smart Column Matching**: Automatically detects matching columns between files on the server.
- **Detailed Summaries**: Get row counts, matches, and differences instantly.
- **Professional Reports**: Automatically generates styled Excel reports with highlighted differences.
- **Next.js & Serverless Ready**: Optimized for modern web frameworks with zero heavy dependencies like `xlsx`.

## Installation

```bash
npm install @krutai/excel-comparison
```

## Quick Start

### Basic Usage (Server-side)

```typescript
import { krutExcelComparison } from "@krutai/excel-comparison";

// Create client
const client = krutExcelComparison({
  apiKey: process.env.KRUTAI_API_KEY,
  serverUrl: process.env.KRUTAI_SERVER_URL || "https://api.krut.ai"
});

// Compare files using buffers
const result = await client.compareFiles(
  file1Buffer, "file1.xlsx",
  file2Buffer, "file2.xlsx",
  { matchColumn: "Invoice" }
);

if (result.success) {
  console.log('Report URL:', result.downloadUrl);
}
```

### Next.js API Route Integration

This is the recommended way to use the library in a Next.js application.

```typescript
// app/api/compare/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
    createComparisonClient,
    type CompareFilesOptions,
} from "@krutai/excel-comparison";

const SUPPORTED_EXTENSIONS = new Set(["xlsx", "xls", "csv"]);

function getFileExtension(fileName: string): string {
    const parts = fileName.toLowerCase().split(".");
    return parts.length > 1 ? parts[parts.length - 1] : "";
}

function isSupportedFile(file: File): boolean {
    return SUPPORTED_EXTENSIONS.has(getFileExtension(file.name));
}

function parseIgnoreColumns(value?: string): string[] | undefined {
    if (!value?.trim()) return undefined;
    if (value.trim().startsWith("[")) {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed.filter(i => typeof i === "string");
        } catch { }
    }
    return value.split(",").map(i => i.trim()).filter(Boolean);
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file1 = formData.get("file1") as File | null;
        const file2 = formData.get("file2") as File | null;
        const matchColumn = formData.get("matchColumn") as string | undefined;

        if (!file1 || !file2) {
            return NextResponse.json({ error: "Both file1 and file2 are required" }, { status: 400 });
        }

        const client = createComparisonClient({
            apiKey: process.env.KRUTAI_API_KEY || '',
            serverUrl: process.env.KRUTAI_SERVER_URL || "http://localhost:8000"
        });

        const apiResponse = await client.compareFilesFromFileObjects(file1, file2, {
            matchColumn: matchColumn?.trim()
        });

        return NextResponse.json(apiResponse);
    } catch (err: unknown) {
        return NextResponse.json({ error: "Comparison failed" }, { status: 500 });
    }
}
```

## API Reference

### krutExcelComparison(config)

Convenience factory to create a `ComparisonApiClient`.

### ComparisonApiClient

#### `compareFiles(buffer1, name1, buffer2, name2, options)`
Compare files using Node.js Buffers.

#### `compareFilesFromFileObjects(file1, file2, options)`
Compare files using Web File objects (useful in Browser or Next.js).

#### `previewFiles(file1, file2)`
Get a preview of the files (columns, row counts, and sample data) before committing to a full comparison.

### Types

#### ComparisonApiResponse
```typescript
interface ComparisonApiResponse {
  success: boolean;
  result?: {
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
  };
  downloadUrl?: string; // Link to the Excel report
  fileName?: string;
  error?: string;
}
```

## Supported File Formats

- `.xlsx` (Excel 2007+)
- `.xls` (Excel 97-2003)
- `.csv` (Comma Separated Values)

## License

MIT
