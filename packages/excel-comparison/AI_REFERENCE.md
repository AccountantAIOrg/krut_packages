# AI Reference Guide for @krutai/excel-comparison

This document provides comprehensive context for AI assistants to help users integrate and use the excel-comparison library effectively.

## Library Purpose

The `@krutai/excel-comparison` library compares Excel (.xlsx, .xls) and CSV files, finding:
- Matching rows between two files
- Different values in matching rows
- Unique rows in each file
- Generates downloadable Excel reports with differences highlighted

## Core Classes and Exports

// Main class - use this for comparing files via API
import { krutExcelComparison, createComparisonClient } from "@krutai/excel-comparison";

// Create client using convenience factory (recommended)
const client = krutExcelComparison({
  serverUrl: "https://api.krut.ai",
  apiKey: "your-krut-api-key"
});

// Or using createComparisonClient
const client2 = createComparisonClient({
  apiKey: "..."
});

// API client class
import { ComparisonApiClient } from "@krutai/excel-comparison";

### Type Exports

```typescript
import type {
  ComparisonApiResponse, // Result from API comparison
  PreviewResponse,        // Preview info for files
  CompareFilesOptions,    // Configuration options
  DataRecord,             // Row data as object (used in reporting/engine)
} from "@krutai/excel-comparison";
```

## Common Use Cases

### 1. Basic File Comparison (via API)

```typescript
import { krutExcelComparison } from "@krutai/excel-comparison";

const client = krutExcelComparison({
  apiKey: "your-api-key"
});

// For browser - using File objects
const result = await client.compareFilesFromFileObjects(file1, file2);

// For Node.js/Server - using Buffer
const result2 = await client.compareFiles(buffer1, "file1.xlsx", buffer2, "file2.xlsx");
```

### 2. With Comparison Options

```typescript
const result = await client.compareFilesFromFileObjects(file1, file2, {
  matchColumn: "Invoice",      // Optional: column to match rows
  tolerance: 0.01,             // Optional: numeric tolerance
  caseSensitive: false,         // Optional: case insensitive
  ignoreColumns: ["Timestamp"]  // Optional: ignore these columns
});
```

### 3. Preview Files Before Comparison

```typescript
// Get preview metadata and suggested match columns
const preview = await client.previewFiles(file1, file2);

// Returns:
{
  success: true,
  file1: { name: "sales.xlsx", rowCount: 100, columns: [...], sample: [...] },
  file2: { name: "sales2.xlsx", rowCount: 95, columns: [...], sample: [...] },
  suggestedMatchColumn: "Invoice"
}
```

### 4. Generate Excel Report

```typescript
import { StyledReporter } from "@krutai/excel-comparison";

const reporter = new StyledReporter({
  headerColor: "4472C4",      // Blue header
  differenceColor: "FFCCCC",   // Red for differences
  matchColor: "CCFFCC",        // Green for matches
  includeSummary: true
});

// Transform comparison results for report
const reportData = result.results.map((r, i) => ({
  Row: i + 1,
  Status: r.status,
  "Match %": `${r.matchPercentage}%`,
  ...Object.fromEntries(
    result.allColumns.flatMap(col => [
      [`File1_${col}`, r.file1Row?.[col] ?? 'N/A'],
      [`File2_${col}`, r.file2Row?.[col] ?? 'N/A'],
    ])
  )
}));

const report = await reporter.generateReport({
  data: reportData,
  summary: result.summary,
});

// Download as base64
const downloadUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${report.toString('base64')}`;
```

### 5. Next.js API Route Integration (Recommended)

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

function getComparisonErrorMessage(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes("can't find end of central directory") || lower.includes("zip file")) {
        return "One of the uploaded files is not a valid .xlsx file archive. For Excel inputs, use a valid .xlsx or .xls file.";
    }
    if (lower.includes("request timed out")) {
        return "Comparison request timed out. Please try smaller files or increase the timeout.";
    }
    return raw;
}

function parseIgnoreColumns(value?: string): string[] | undefined {
    if (!value?.trim()) return undefined;

    if (value.trim().startsWith("[")) {
        try {
            const parsed = JSON.parse(value) as unknown;
            if (Array.isArray(parsed)) {
                return parsed
                    .filter((item): item is string => typeof item === "string")
                    .map((item) => item.trim())
                    .filter(Boolean);
            }
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
        const ignoreColumns = formData.get("ignoreColumns") as string | undefined;
        const tolerance = formData.get("tolerance") as string | undefined;
        const caseSensitive = formData.get("caseSensitive") as string | undefined;

        if (!file1 || !file2) {
            return NextResponse.json({ error: "Both file1 and file2 are required" }, { status: 400 });
        }

        if (!isSupportedFile(file1) || !isSupportedFile(file2)) {
            return NextResponse.json({ error: "Unsupported file type. Use .xlsx, .xls, or .csv files." }, { status: 400 });
        }

        const options: CompareFilesOptions = {};
        if (matchColumn?.trim()) options.matchColumn = matchColumn.trim();
        const parsedIgnore = parseIgnoreColumns(ignoreColumns);
        if (parsedIgnore) options.ignoreColumns = parsedIgnore;
        if (tolerance?.trim()) options.tolerance = Number(tolerance);
        if (caseSensitive !== undefined) options.caseSensitive = caseSensitive === "true";

        const client = createComparisonClient({
            apiKey: process.env.KRUTAI_API_KEY || '',
            serverUrl: process.env.KRUTAI_SERVER_URL || "http://localhost:8000",
            validateOnInit: false,
        });

        const apiResponse = await client.compareFilesFromFileObjects(file1, file2, options);

        if (!apiResponse.success || !apiResponse.result) {
            return NextResponse.json({ error: apiResponse.error ?? "Comparison failed" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            result: apiResponse.result,
            results: [],
            allColumns: [...new Set([
                ...(apiResponse.result.metadata.file1Columns ?? []),
                ...(apiResponse.result.metadata.file2Columns ?? []),
            ])],
            columnsWithDiffs: [],
            downloadUrl: apiResponse.downloadUrl,
            fileName: apiResponse.fileName,
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Comparison failed";
        return NextResponse.json({ error: getComparisonErrorMessage(msg) }, { status: 500 });
    }
}
```

### 6. Express.js Integration

```typescript
import express from 'express';
import multer from 'multer';
import { krutExcelComparison } from "@krutai/excel-comparison";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const client = krutExcelComparison({ apiKey: process.env.KRUTAI_API_KEY });

app.post('/compare', upload.fields([
  { name: 'file1', maxCount: 1 },
  { name: 'file2', maxCount: 1 }
]), async (req, res) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  
  const result = await client.compareFiles(
    files.file1[0].buffer, files.file1[0].originalname,
    files.file2[0].buffer, files.file2[0].originalname,
    {
      matchColumn: req.body.matchColumn,
      tolerance: req.body.tolerance ? parseFloat(req.body.tolerance) : undefined
    }
  );

  res.json(result);
});
```

## ComparisonApiResponse Structure

```typescript
{
  success: boolean,           // true if comparison succeeded
  result?: {
    summary: {
      totalRows: number,      // Total rows compared
      matchesFound: number,   // Rows with all values matching
      differencesFound: number,// Rows with differences
      uniqueToFile1: number,  // Rows only in first file
      uniqueToFile2: number,  // Rows only in second file
      status: 'SUCCESS' | 'PARTIAL' | 'NO_MATCH'
    },
    matchColumn: string,
    metadata: {
      file1Name: string,
      file1Columns: string[],
      file1RowCount: number,
      file2Name: string,
      file2Columns: string[],
      file2RowCount: number
    }
  },
  downloadUrl?: string,       // URL to download the Excel report
  fileName?: string,          // Suggested file name for download
  error?: string              // Error message if success is false
}
```

## Key Behaviors

### API Comparison
- The package now acts as a client for a backend comparison service.
- It offloads heavy Excel processing and comparison logic to the server.
- It returns a summary of results and a link to a professionally styled Excel report.

### Column Matching
- If `matchColumn` is provided, uses that column to match rows
- If not provided, auto-detects: prioritizes id, invoice, gstin, number, name, code
- Falls back to first column if no match found

### Value Comparison (Backend)
- Done on the server side using intelligent algorithms.
- Supports fuzzy matching, numeric tolerance, and case sensitivity.

## Common Integration Patterns

### Pattern 1: Basic Comparison
```typescript
const client = krutExcelComparison({ apiKey: "..." });
const result = await client.compareFilesFromFileObjects(f1, f2);
```

### Pattern 2: Comparison with Options
```typescript
const result = await client.compareFilesFromFileObjects(f1, f2, {
  matchColumn: "Invoice No",
  tolerance: 0.001,
  caseSensitive: false
});
```

## Error Handling

```typescript
try {
  const result = await client.compareFilesFromFileObjects(file1, file2);
} catch (error) {
  if (error.message.includes("Request timed out")) {
    // Handle timeout
  } else {
    // Generic error
  }
}
```

## Package Dependencies

The library is lightweight and depends on:
- `exceljs` - For local reporting (optional)

## Environment Notes

- Works in Node.js (v14+) and modern browsers
- Uses dynamic imports for xlsx to support Next.js
- File objects from HTML inputs work in browser
- Buffer objects work in Node.js

## Contributing Guidelines for AI Assistants

When helping users with this library:

1. Use `krutExcelComparison` or `ComparisonApiClient`.
2. Emphasize that comparison is done via API.
3. Show Next.js API route as the primary integration example.
4. Note that heavy parsing (xlsx) is done on the backend.
