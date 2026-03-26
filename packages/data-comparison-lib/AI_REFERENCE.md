# AI Reference Guide for @krutai/data-comparison-lib

This document provides comprehensive context for AI assistants to help users integrate and use the data-comparison-lib library effectively.

## Library Purpose

The `@krutai/data-comparison-lib` library compares Excel (.xlsx, .xls) and CSV files, finding:
- Matching rows between two files
- Different values in matching rows
- Unique rows in each file
- Generates downloadable Excel reports with differences highlighted

## Core Classes and Exports

### Primary Classes (most common use)

```typescript
// Main class - use this for comparing files
import { ExcelComparator } from "@krutai/data-comparison-lib";

// File comparison when you already have data arrays
import { FileComparator } from "@krutai/data-comparison-lib";

// Load Excel/CSV files into data structures
import { DataLoader } from "@krutai/data-comparison-lib";

// Generate styled Excel reports
import { StyledReporter } from "@krutai/data-comparison-lib";

// API client for backend communication (optional)
import { ComparisonApiClient } from "@krutai/data-comparison-lib";
```

### Type Exports

```typescript
import type {
  ComparisonOptions,    // Configuration options
  ComparisonResult,      // Result from compare()
  MatchResult,          // Individual row comparison
  FilePreview,          // Preview info for files
  DataRecord,           // Row data as object
  ExcelDataFrame,       // Loaded file data structure
} from "@krutai/data-comparison-lib";
```

## Common Use Cases

### 1. Basic File Comparison (Browser/Node.js)

```typescript
import { ExcelComparator } from "@krutai/data-comparison-lib";

// For browser - using File objects from <input type="file">
const comparator = new ExcelComparator();
const result = await comparator.compareFileObjects(file1, file2);

// For Node.js - using Buffer
const result = await comparator.compareFiles(buffer1, "file1.xlsx", buffer2, "file2.xlsx");
```

### 2. With Comparison Options

```typescript
const comparator = new ExcelComparator({
  matchColumn: "Invoice",      // Required: column to match rows
  tolerance: 0.01,             // Optional: numeric tolerance (default: 0.01)
  caseSensitive: false,         // Optional: case insensitive (default: true)
  ignoreColumns: ["Timestamp"]  // Optional: ignore these columns
});
```

### 3. Preview Files Before Comparison

```typescript
// Browser
const preview = await comparator.getPreviewFromFileObjects(file1, file2);

// Node.js
const preview = await comparator.getPreview(buffer1, "f1.xlsx", buffer2, "f2.xlsx");

// Returns:
{
  file1: { name: "sales.xlsx", rowCount: 100, columns: [...], sample: [...] },
  file2: { name: "sales2.xlsx", rowCount: 95, columns: [...], sample: [...] },
  suggestedMatchColumn: "Invoice"
}
```

### 4. Generate Excel Report

```typescript
import { StyledReporter } from "@krutai/data-comparison-lib";

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
));

const report = await reporter.generateReport({
  data: reportData,
  summary: result.summary,
});

// Download as base64
const downloadUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${report.toString('base64')}`;
```

### 5. Next.js API Route Integration

```typescript
// app/api/compare/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ExcelComparator, StyledReporter } from "@krutai/data-comparison-lib";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file1 = formData.get("file1") as File;
  const file2 = formData.get("file2") as File;
  
  // Use form data for options
  const matchColumn = formData.get("matchColumn") as string | undefined;
  const tolerance = formData.get("tolerance") as string | undefined;

  const comparator = new ExcelComparator({
    matchColumn,
    tolerance: tolerance ? parseFloat(tolerance) : undefined
  });

  const result = await comparator.compareFileObjects(file1, file2);

  // Generate report
  const reporter = new StyledReporter();
  const report = await reporter.generateReport({
    data: transformToReportData(result),
    summary: result.summary,
  });

  return NextResponse.json({
    success: true,
    ...result,
    downloadUrl: `data:...;base64,${report.toString('base64')}`,
    fileName: `comparison_${Date.now()}.xlsx`
  });
}
```

### 6. Express.js Integration

```typescript
import express from 'express';
import multer from 'multer';
import { ExcelComparator } from "@krutai/data-comparison-lib";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.post('/compare', upload.fields([
  { name: 'file1', maxCount: 1 },
  { name: 'file2', maxCount: 1 }
]), async (req, res) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  
  const comparator = new ExcelComparator({
    matchColumn: req.body.matchColumn,
    tolerance: req.body.tolerance ? parseFloat(req.body.tolerance) : undefined
  });

  const result = await comparator.compareFiles(
    files.file1[0].buffer, files.file1[0].originalname,
    files.file2[0].buffer, files.file2[0].originalname
  );

  res.json(result);
});
```

## ComparisonResult Structure

```typescript
{
  success: boolean,           // true if comparison succeeded
  results: MatchResult[],     // Array of row comparisons
  summary: {
    totalRows: number,        // Total rows compared
    matchesFound: number,    // Rows with all values matching
    differencesFound: number,// Rows with at least one difference
    uniqueToFile1: number,   // Rows only in first file
    uniqueToFile2: number,   // Rows only in second file
    status: 'SUCCESS' | 'PARTIAL' | 'NO_MATCH'
  },
  matchColumn: string,        // Column used for row matching
  metadata: {
    file1Name: string,
    file1Columns: string[],
    file1RowCount: number,
    file2Name: string,
    file2Columns: string[],
    file2RowCount: number
  },
  allColumns: string[],       // All columns from both files
  columnsWithDiffs: string[] // Columns that have differences
}
```

## MatchResult Structure

```typescript
{
  status: 'MATCH' | 'DIFFERENCE' | 'UNIQUE_TO_FILE1' | 'UNIQUE_TO_FILE2',
  file1Row: { [column: string]: unknown },  // Data from file 1
  file2Row: { [column: string]: unknown },  // Data from file 2
  differences: {                             // Only for DIFFERENCE status
    [column: string]: {
      file1: unknown,  // Value in file 1
      file2: unknown  // Value in file 2
    }
  },
  matchPercentage: number  // 0-100, how much matches
}
```

## Key Behaviors

### Column Matching
- If `matchColumn` is provided, uses that column to match rows
- If not provided, auto-detects: prioritizes id, invoice, gstin, number, name, code
- Falls back to first column if no match found

### Value Comparison
- Strings: trimmed and compared (case-sensitive by default)
- Numbers: compared with tolerance (default 0.01)
- Dates: converted to ISO string for comparison
- Empty/null values: treated as empty string

### Data Filtering
- Removes rows with less than 50% non-empty values
- Filters out rows with "none", "null", "N/A" values

## Common Integration Patterns

### Pattern 1: Simple Comparison
```typescript
const comparator = new ExcelComparator();
const result = await comparator.compareFileObjects(file1, file2);
// Use result.summary for statistics
```

### Pattern 2: Comparison with Options
```typescript
const comparator = new ExcelComparator({
  matchColumn: "Invoice No",
  tolerance: 0.001,
  caseSensitive: false,
  ignoreColumns: ["Created At", "Updated At"]
});
```

### Pattern 3: Comparison with Preview
```typescript
// Step 1: Preview to show user column info
const preview = await comparator.getPreviewFromFileObjects(f1, f2);
// User sees columns and suggests matchColumn

// Step 2: Compare with user's choice
const comparator = new ExcelComparator({ matchColumn: userChoice });
const result = await comparator.compareFileObjects(f1, f2);
```

### Pattern 4: Full Workflow with Report
```typescript
// 1. Load and preview
const preview = await comparator.getPreviewFromFileObjects(f1, f2);

// 2. User selects match column
const comparator = new ExcelComparator({ matchColumn: selectedColumn });

// 3. Compare
const result = await comparator.compareFileObjects(f1, f2);

// 4. Generate report
const reporter = new StyledReporter();
const report = await reporter.generateReport(transform(result));

// 5. Send to client
return json({ success: true, ...result, downloadUrl: base64(report) });
```

## Error Handling

```typescript
try {
  const result = await comparator.compareFileObjects(file1, file2);
} catch (error) {
  if (error.message.includes("Unsupported file type")) {
    // Handle unsupported file
  } else if (error.message.includes("zip")) {
    // Corrupted Excel file
  } else {
    // Generic error
  }
}
```

## Package Dependencies

The library uses:
- `xlsx` - Excel file parsing and generation
- `danfojs` - DataFrame operations (optional, for advanced use)

## Environment Notes

- Works in Node.js (v14+) and modern browsers
- Uses dynamic imports for xlsx to support Next.js
- File objects from HTML inputs work in browser
- Buffer objects work in Node.js

## Contributing Guidelines for AI Assistants

When helping users with this library:

1. Start with `ExcelComparator` - it's the main entry point
2. Show the simplest use case first, then add options
3. Explain the comparison result structure
4. Show how to generate reports if user wants downloadable output
5. Mention auto-detection of match columns
6. Clarify tolerance for numeric comparisons
7. Note the difference between browser (File) and Node.js (Buffer) usage
