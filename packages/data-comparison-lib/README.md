# @krutai/data-comparison-lib

A powerful library for comparing Excel and CSV files with intelligent column matching and detailed difference reporting.

## Features

- **Smart Column Matching**: Automatically detects matching columns between files
- **Multiple Comparison Modes**: Match by ID, invoice, GSTIN, or any column
- **Tolerance Support**: Compare numeric values with configurable tolerance
- **Case Insensitive**: Option to compare strings case-insensitively
- **Preview Mode**: Preview file schemas before comparison
- **Excel Report Generation**: Generate downloadable Excel reports with highlighted differences
- **Server-Side & Client-Side**: Works in both Node.js and browser environments

## Installation

```bash
npm install @krutai/data-comparison-lib
```

## Quick Start

### Basic Usage

```typescript
import { ExcelComparator } from "@krutai/data-comparison-lib";

// Create comparator with optional settings
const comparator = new ExcelComparator({
  matchColumn: "Invoice",      // Column to match rows
  tolerance: 0.01,              // Numeric tolerance (default: 0.01)
  caseSensitive: false,         // Case insensitive string comparison
  ignoreColumns: ["Timestamp"]  // Columns to ignore
});

// Compare files
const result = await comparator.compareFiles(
  file1Buffer, "file1.xlsx",   // First file
  file2Buffer, "file2.xlsx"    // Second file
);

console.log(result.summary);
// { totalRows: 100, matchesFound: 85, differencesFound: 15, ... }
```

### Using File Objects (Browser)

```typescript
const comparator = new ExcelComparator();

const file1 = document.querySelector('#file1').files[0];
const file2 = document.querySelector('#file2').files[0];

const result = await comparator.compareFileObjects(file1, file2);
```

### Preview Files Before Comparison

```typescript
const comparator = new ExcelComparator();

const preview = await comparator.getPreviewFromFileObjects(file1, file2);

console.log(preview.file1.columns);  // ["Invoice", "Amount", "Date"]
console.log(preview.file2.columns);  // ["Inv No", "Total", "Date"]
console.log(preview.suggestedMatchColumn);  // "Date" or best match
```

## API Reference

### ExcelComparator

The main class for comparing Excel/CSV files.

#### Constructor

```typescript
new ExcelComparator(options?: ComparisonOptions)
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `matchColumn` | `string` | Auto-detect | Column name to match rows between files |
| `ignoreColumns` | `string[]` | `[]` | Columns to ignore during comparison |
| `tolerance` | `number` | `0.01` | Tolerance for numeric comparisons |
| `caseSensitive` | `boolean` | `true` | Whether string comparison is case-sensitive |

#### Methods

##### `compareFiles(buffer1, name1, buffer2, name2)`

Compare two files using Buffers (Node.js).

```typescript
const result = await comparator.compareFiles(
  Buffer.from(file1Content), "sales_q1.xlsx",
  Buffer.from(file2Content), "sales_q2.xlsx"
);
```

##### `compareFileObjects(file1, file2)`

Compare two files using File objects (Browser).

```typescript
const result = await comparator.compareFileObjects(file1, file2);
```

##### `getPreview(buffer1, name1, buffer2, name2)`

Get preview of files (Buffers).

##### `getPreviewFromFileObjects(file1, file2)`

Get preview of files (File objects).

### ComparisonResult

The result object returned from comparison methods.

```typescript
interface ComparisonResult {
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
```

### MatchResult

Individual row comparison result.

```typescript
interface MatchResult {
  status: 'MATCH' | 'DIFFERENCE' | 'UNIQUE_TO_FILE1' | 'UNIQUE_TO_FILE2';
  file1Row?: DataRecord;
  file2Row?: DataRecord;
  differences?: Record<string, { file1: unknown; file2: unknown }>;
  matchPercentage: number;
}
```

### FilePreview

Preview information about a file.

```typescript
interface FilePreview {
  name: string;
  rowCount: number;
  columns: string[];
  sample: DataRecord[];
}
```

## Advanced Usage

### Using with Next.js API Routes

```typescript
// app/api/compare/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ExcelComparator, StyledReporter } from "@krutai/data-comparison-lib";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file1 = formData.get("file1") as File;
  const file2 = formData.get("file2") as File;

  const comparator = new ExcelComparator({ caseSensitive: false });
  const result = await comparator.compareFileObjects(file1, file2);

  // Generate Excel report
  const reporter = new StyledReporter();
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

  return NextResponse.json({
    success: true,
    ...result,
    downloadUrl: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${report.toString('base64')}`,
  });
}
```

### Using with Express

```typescript
import express from 'express';
import multer from 'multer';
import { ExcelComparator } from "@krutai/data-comparison-lib";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.post('/compare', upload.fields([
  { name: 'file1' },
  { name: 'file2' }
]), async (req, res) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  
  const comparator = new ExcelComparator({
    matchColumn: 'Invoice',
    tolerance: 0.001
  });

  const result = await comparator.compareFiles(
    files.file1[0].buffer, files.file1[0].originalname,
    files.file2[0].buffer, files.file2[0].originalname
  );

  res.json(result);
});
```

## FileComparator

For comparing already-loaded data arrays.

```typescript
import { FileComparator } from "@krutai/data-comparison-lib";

const comparator = new FileComparator({ matchColumn: "id" });

const result = comparator.compare(
  { name: "file1.xlsx", headers: ["id", "name"], data: [...] },
  { name: "file2.xlsx", headers: ["id", "name"], data: [...] }
);
```

## DataLoader

Load and parse Excel/CSV files.

```typescript
import { DataLoader } from "@krutai/data-comparison-lib";

const df = await DataLoader.loadFromBuffer(buffer, "sales.xlsx", {
  sheetIndex: 0,      // Sheet index to load
  headerRow: 1,       // Row number containing headers
  sampleRows: 5       // Number of sample rows to include
});

console.log(df.headers);   // ["Invoice", "Amount", "Date"]
console.log(df.data);      // Array of row objects
console.log(df.rowCount);  // 1000
```

## StyledReporter

Generate styled Excel reports.

```typescript
import { StyledReporter } from "@krutai/data-comparison-lib";

const reporter = new StyledReporter({
  headerColor: "4472C4",      // Header background color
  differenceColor: "FFCCCC",  // Difference row color
  matchColor: "CCFFCC",      // Match row color
  includeSummary: true
});

const report = await reporter.generateReport(result);
await fs.writeFileSync("report.xlsx", report);
```

## ComparisonApiClient

For making API calls to comparison backend services.

```typescript
import { ComparisonApiClient } from "@krutai/data-comparison-lib";

const client = new ComparisonApiClient({
  baseUrl: "https://api.example.com",
  apiKey: "your-api-key",
  timeout: 60000
});

const result = await client.compareFilesFromFileObjects(file1, file2);
const preview = await client.previewFiles(file1, file2);
```

## Supported File Formats

- `.xlsx` - Excel 2007+ format
- `.xls` - Excel 97-2003 format
- `.csv` - Comma-separated values

## License

MIT
