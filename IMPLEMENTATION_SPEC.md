# Data Analysis and Visualization System - Implementation Specification

## Overview

This document provides a comprehensive breakdown for implementing an AI-powered data analysis system that allows users to upload CSV files, perform natural language queries, and generate interactive visualizations through an iterative LLM-driven process.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Phase 1: CSV Upload and Storage](#phase-1-csv-upload-and-storage)
3. [Phase 2: Data Processing and SQL Conversion](#phase-2-data-processing-and-sql-conversion)
4. [Phase 3: Sample Compression](#phase-3-sample-compression)
5. [Phase 4: LLM Analysis and Query Generation](#phase-4-llm-analysis-and-query-generation)
6. [Phase 5: Iterative Query Refinement](#phase-5-iterative-query-refinement)
7. [Phase 6: Chart Generation](#phase-6-chart-generation)
8. [Phase 7: Data Persistence and Frontend Display](#phase-7-data-persistence-and-frontend-display)
9. [Database Schema](#database-schema)
10. [API Endpoints](#api-endpoints)
11. [Security and Safety](#security-and-safety)
12. [Error Handling](#error-handling)
13. [Testing Strategy](#testing-strategy)

---

## System Architecture

### Technology Stack

**Frontend:**
- Next.js (App Router)
- React
- Highcharts React wrapper
- TailwindCSS

**Backend:**
- Next.js API Routes (or separate Node.js/Express server)
- Supabase (Storage + PostgreSQL)
- OpenAI/Anthropic SDK for LLM integration

**Database:**
- Supabase PostgreSQL for:
  - Uploaded CSV data (converted to tables)
  - Chart definitions and results
  - User sessions and metadata

---

## Phase 1: CSV Upload and Storage

### Components Required

#### 1.1 Frontend Upload Component

**File:** `components/csv-upload.tsx`

**Responsibilities:**
- File input with drag-and-drop support
- Client-side validation (file type, size limits)
- Upload progress indicator
- Error display

**Validation Rules:**
- Maximum file size: 50MB
- Accepted formats: `.csv` only
- Minimum 1 row of data (excluding headers)

**Implementation Details:**
```typescript
interface UploadResponse {
  csvId: string;
  fileName: string;
  storageUrl: string;
  rowCount: number;
  columnCount: number;
  columns: string[];
}
```

#### 1.2 Backend Upload Endpoint

**Endpoint:** `POST /api/upload-csv`

**Steps:**
1. Receive multipart/form-data file upload
2. Generate unique CSV ID (UUID)
3. Validate file format and size
4. Upload to Supabase Storage bucket `csv-uploads/`
5. Parse CSV headers to extract column names
6. Return metadata to frontend

**Libraries:**
- `formidable` or `multer` for file handling
- `csv-parser` or `papaparse` for CSV parsing
- `@supabase/supabase-js` for storage operations

---

## Phase 2: Data Processing and SQL Conversion

### Components Required

#### 2.1 CSV to SQL Converter Service

**File:** `lib/services/csv-to-sql.ts`

**Responsibilities:**
- Download CSV from Supabase Storage
- Parse CSV and infer column data types
- Create SQL table with appropriate schema
- Bulk insert data into PostgreSQL
- Handle data cleaning and validation

**Type Inference Strategy:**
```typescript
interface ColumnType {
  name: string;
  sqlType: 'INTEGER' | 'NUMERIC' | 'TEXT' | 'TIMESTAMP' | 'BOOLEAN';
  nullable: boolean;
  samples: any[];
}
```

**Type Detection Logic:**
1. Try parsing as INTEGER
2. Try parsing as NUMERIC (float)
3. Try parsing as TIMESTAMP/DATE
4. Try parsing as BOOLEAN
5. Default to TEXT

**Table Naming Convention:**
```
csv_data_{csvId}
```

**Implementation Steps:**
1. Stream CSV file from storage
2. Sample first 100 rows for type inference
3. Generate CREATE TABLE statement
4. Execute table creation
5. Bulk INSERT using COPY or batch inserts
6. Create indexes on potential query columns
7. Store metadata in `csv_metadata` table

#### 2.2 Data Cleaning

**Handle:**
- Empty strings → NULL
- Inconsistent date formats → standardize or keep as TEXT
- Special characters in column names → sanitize
- Duplicate column names → append suffix

---

## Phase 3: Sample Compression

### Components Required

#### 3.1 Sample Compressor Service

**File:** `lib/services/sample-compressor.ts`

**Responsibilities:**
- Extract representative sample from full dataset
- Balance between context size and data representativeness
- Include statistical metadata

**Sampling Strategy:**

**Option A: Stratified Sampling**
- Identify categorical columns
- Sample proportionally from each category
- Target: 100-500 rows depending on column count

**Option B: Statistical Summary + Sample**
```typescript
interface CompressedSample {
  sample: Record<string, any>[];
  statistics: {
    totalRows: number;
    columns: {
      name: string;
      type: string;
      distinct: number;
      null_count: number;
      min?: number | string;
      max?: number | string;
      mean?: number;
      median?: number;
      mode?: any;
    }[];
  };
  correlations?: Record<string, Record<string, number>>;
}
```

**Implementation:**
```sql
-- Get stratified sample
WITH stats AS (
  SELECT 
    COUNT(*) as total_rows,
    COUNT(DISTINCT category_column) as distinct_categories
  FROM csv_data_{csvId}
)
SELECT * FROM csv_data_{csvId}
TABLESAMPLE BERNOULLI (10) -- 10% sample
LIMIT 200;
```

**Statistical Pre-computation:**
- Run basic aggregations (COUNT, MIN, MAX, AVG, STDDEV)
- Identify potential date/time columns
- Detect categorical vs continuous columns
- Store results in cache for repeated queries

---

## Phase 4: LLM Analysis and Query Generation

### Components Required

#### 4.1 LLM Agent Service

**File:** `lib/ai/data-analysis-agent.ts`

**Responsibilities:**
- Receive user prompt + compressed sample
- Analyze user intent
- Generate initial SQL query
- Evaluate query results
- Iterate until satisfied

**System Prompt Template:**
```typescript
const SYSTEM_PROMPT = `
You are a data analysis expert. You help users analyze CSV data by writing SQL queries.

Dataset Information:
- Table name: {tableName}
- Total rows: {totalRows}
- Columns: {columnInfo}

Sample data (first {sampleSize} rows):
{sampleData}

Statistical summary:
{statistics}

User's request: {userPrompt}

Your task:
1. Understand what the user wants to discover
2. Write a SQL query to answer their question
3. The query should return data suitable for visualization

Rules:
- Use ONLY the columns provided
- Ensure column names are properly quoted if they contain spaces
- Return results in a format suitable for charting
- Limit results to reasonable sizes (max 1000 rows)
- Use aggregations where appropriate
`;
```

#### 4.2 Tool Definitions

**Tool: `execute_sql`**
```typescript
interface ExecuteSQLTool {
  name: "execute_sql";
  description: "Execute a SQL query against the uploaded dataset";
  parameters: {
    query: string;
    explanation: string; // Why this query answers the user's question
  };
}
```

**Tool: `generate_line_chart`**
```typescript
interface GenerateLineChartTool {
  name: "generate_line_chart";
  description: "Generate a line chart configuration after confirming the data is correct";
  parameters: {
    title: string;
    subtitle?: string;
    xAxisTitle: string;
    yAxisTitle: string;
    series: {
      name: string;
      dataKey: string; // Column name from SQL result
    }[];
    tooltip?: {
      valueSuffix?: string;
      valuePrefix?: string;
      shared?: boolean;
    };
    legend?: {
      enabled: boolean;
      layout?: "horizontal" | "vertical";
    };
  };
}
```

**Additional Chart Tools:**
- `generate_bar_chart`
- `generate_pie_chart`
- `generate_scatter_plot`
- `generate_area_chart`

#### 4.3 Intent Classification

**Pre-analysis step:**
```typescript
enum AnalysisIntent {
  TREND_OVER_TIME = "trend_over_time",
  COMPARISON = "comparison",
  DISTRIBUTION = "distribution",
  CORRELATION = "correlation",
  AGGREGATION = "aggregation",
  FILTERING = "filtering"
}
```

This helps the LLM choose appropriate:
- SQL aggregations
- Chart types
- Grouping strategies

---

## Phase 5: Iterative Query Refinement

### Components Required

#### 5.1 Query Execution Engine

**File:** `lib/services/sql-executor.ts`

**Responsibilities:**
- Execute SQL queries safely
- Apply timeout and resource limits
- Return results in structured format
- Log query execution for debugging

**Safety Measures:**
```typescript
interface QueryExecutionConfig {
  maxExecutionTime: number; // 30 seconds
  maxRows: number; // 10,000 rows
  allowedOperations: string[]; // ["SELECT"]
  readOnly: boolean; // true
}
```

**SQL Validation:**
```typescript
function validateSQL(query: string): ValidationResult {
  // Disallow:
  // - DROP, DELETE, UPDATE, INSERT, TRUNCATE
  // - Multiple statements (semicolon check)
  // - Comments that might hide malicious code
  // - System table access
  
  const forbidden = /\b(DROP|DELETE|UPDATE|INSERT|TRUNCATE|ALTER|CREATE)\b/i;
  if (forbidden.test(query)) {
    return { valid: false, error: "Only SELECT queries allowed" };
  }
  
  // Additional checks...
  return { valid: true };
}
```

#### 5.2 Iterative Refinement Loop

**File:** `lib/ai/refinement-loop.ts`

**Flow:**
```typescript
interface RefinementIteration {
  iteration: number;
  query: string;
  results: any[];
  llmEvaluation: {
    satisfied: boolean;
    reasoning: string;
    suggestedChanges?: string;
  };
}

async function refineQuery(
  userPrompt: string,
  sampleData: CompressedSample,
  maxIterations: number = 5
): Promise<RefinementResult> {
  const iterations: RefinementIteration[] = [];
  
  for (let i = 0; i < maxIterations; i++) {
    // 1. LLM generates/refines query
    const query = await llm.generateQuery(userPrompt, sampleData, iterations);
    
    // 2. Execute query
    const results = await executeSQL(query);
    
    // 3. LLM evaluates results
    const evaluation = await llm.evaluateResults(
      userPrompt,
      query,
      results,
      sampleData
    );
    
    iterations.push({ iteration: i, query, results, llmEvaluation: evaluation });
    
    // 4. Check if satisfied
    if (evaluation.satisfied) {
      return {
        success: true,
        finalQuery: query,
        results,
        iterations
      };
    }
  }
  
  // Max iterations reached
  return {
    success: false,
    error: "Could not generate satisfactory query",
    iterations
  };
}
```

**Evaluation Prompt:**
```typescript
const EVALUATION_PROMPT = `
You previously generated this SQL query:
{query}

The query returned {rowCount} rows:
{results}

Original user request: {userPrompt}

Questions to assess:
1. Does the data answer the user's question?
2. Are there any anomalies or unexpected results?
3. Should the query be modified (different aggregation, filtering, grouping)?
4. Is this data ready for visualization?

Respond with:
- satisfied: true/false
- reasoning: explain your assessment
- suggestedChanges: if not satisfied, what to change
`;
```

---

## Phase 6: Chart Generation

### Components Required

#### 6.1 Chart Definition Generator

**File:** `lib/ai/chart-generator.ts`

**Responsibilities:**
- Receive final SQL results
- Generate Highcharts configuration
- Validate against Highcharts schema
- Combine definition with actual data

**Process:**
1. LLM calls `generate_line_chart` tool with metadata
2. Backend validates the chart definition
3. Backend maps SQL results to chart series
4. Combine into final Highcharts options object

**Chart Definition Validation:**
```typescript
import { z } from 'zod';

const LineChartSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  xAxisTitle: z.string(),
  yAxisTitle: z.string(),
  series: z.array(z.object({
    name: z.string(),
    dataKey: z.string() // Must match a column in SQL results
  })),
  tooltip: z.object({
    valueSuffix: z.string().optional(),
    valuePrefix: z.string().optional(),
    shared: z.boolean().optional()
  }).optional(),
  legend: z.object({
    enabled: z.boolean(),
    layout: z.enum(["horizontal", "vertical"]).optional()
  }).optional()
});
```

#### 6.2 Data Mapping

**File:** `lib/services/chart-data-mapper.ts`

**Transform SQL results into Highcharts data format:**
```typescript
interface SQLResult {
  rows: Record<string, any>[];
  columns: string[];
}

interface HighchartsData {
  categories?: string[];
  series: {
    name: string;
    data: number[] | [number, number][];
  }[];
}

function mapSQLToHighcharts(
  sqlResults: SQLResult,
  chartDef: ChartDefinition
): HighchartsData {
  // Extract x-axis categories (typically first column)
  const xColumn = sqlResults.columns[0];
  const categories = sqlResults.rows.map(row => row[xColumn]);
  
  // Map each series
  const series = chartDef.series.map(seriesDef => ({
    name: seriesDef.name,
    data: sqlResults.rows.map(row => 
      parseFloat(row[seriesDef.dataKey]) || 0
    )
  }));
  
  return { categories, series };
}
```

#### 6.3 Complete Highcharts Options

**Combine all pieces:**
```typescript
interface CompleteChartOptions {
  chart: {
    type: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
  };
  title: {
    text: string;
  };
  subtitle?: {
    text: string;
  };
  xAxis: {
    categories?: string[];
    title: {
      text: string;
    };
  };
  yAxis: {
    title: {
      text: string;
    };
  };
  series: {
    name: string;
    data: number[] | [number, number][];
  }[];
  tooltip?: any;
  legend?: any;
  credits: {
    enabled: boolean;
  };
}
```

---

## Phase 7: Data Persistence and Frontend Display

### Components Required

#### 7.1 Chart Persistence

**Store complete chart in database:**
```typescript
interface ChartRecord {
  id: string; // UUID
  csv_id: string; // Reference to uploaded CSV
  user_id: string;
  created_at: timestamp;
  
  // Query information
  user_prompt: string;
  final_sql_query: string;
  refinement_iterations: number;
  
  // Chart definition
  chart_type: string;
  chart_definition: jsonb; // LLM-generated chart config
  
  // Data
  sql_results: jsonb; // Raw SQL query results
  highcharts_options: jsonb; // Complete Highcharts config
  
  // Metadata
  row_count: number;
  execution_time_ms: number;
}
```

**Insert Query:**
```sql
INSERT INTO charts (
  id,
  csv_id,
  user_id,
  user_prompt,
  final_sql_query,
  refinement_iterations,
  chart_type,
  chart_definition,
  sql_results,
  highcharts_options,
  row_count,
  execution_time_ms
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING id;
```

#### 7.2 Frontend Chart Component

**File:** `components/chart-display.tsx`

```typescript
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

interface ChartDisplayProps {
  options: Highcharts.Options;
  loading?: boolean;
}

export function ChartDisplay({ options, loading }: ChartDisplayProps) {
  if (loading) {
    return <ChartSkeleton />;
  }
  
  return (
    <div className="w-full h-[500px]">
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
      />
    </div>
  );
}
```

#### 7.3 Analysis Page

**File:** `app/analyze/[csvId]/page.tsx`

**Features:**
- Display CSV metadata (filename, row count, columns)
- Prompt input for analysis query
- Loading states during LLM processing
- Display refinement iterations (optional debug view)
- Render final chart
- Export chart as PNG/SVG
- Save chart to gallery
- Share chart link

**State Management:**
```typescript
interface AnalysisState {
  csvId: string;
  prompt: string;
  status: 'idle' | 'analyzing' | 'refining' | 'generating' | 'complete' | 'error';
  currentIteration: number;
  maxIterations: number;
  iterations: RefinementIteration[];
  chartOptions?: Highcharts.Options;
  error?: string;
}
```

---

## Database Schema

### Table: `csv_metadata`

```sql
CREATE TABLE csv_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  table_name TEXT NOT NULL UNIQUE,
  
  -- Data characteristics
  row_count INTEGER NOT NULL,
  column_count INTEGER NOT NULL,
  columns JSONB NOT NULL, -- Array of {name, type, nullable}
  
  -- Statistics (pre-computed)
  statistics JSONB,
  
  -- Timestamps
  uploaded_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  
  -- Status
  status TEXT DEFAULT 'processing', -- 'processing' | 'ready' | 'error'
  error_message TEXT
);

CREATE INDEX idx_csv_user ON csv_metadata(user_id);
CREATE INDEX idx_csv_status ON csv_metadata(status);
```

### Table: `charts`

```sql
CREATE TABLE charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  csv_id UUID NOT NULL REFERENCES csv_metadata(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Query info
  user_prompt TEXT NOT NULL,
  final_sql_query TEXT NOT NULL,
  refinement_iterations INTEGER DEFAULT 0,
  
  -- Chart data
  chart_type TEXT NOT NULL, -- 'line' | 'bar' | 'pie' | 'scatter' | 'area'
  chart_definition JSONB NOT NULL,
  sql_results JSONB NOT NULL,
  highcharts_options JSONB NOT NULL,
  
  -- Metadata
  row_count INTEGER,
  execution_time_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Sharing
  is_public BOOLEAN DEFAULT FALSE,
  share_token TEXT UNIQUE
);

CREATE INDEX idx_charts_csv ON charts(csv_id);
CREATE INDEX idx_charts_user ON charts(user_id);
CREATE INDEX idx_charts_public ON charts(is_public) WHERE is_public = true;
```

### Table: `query_cache`

```sql
CREATE TABLE query_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  csv_id UUID NOT NULL REFERENCES csv_metadata(id) ON DELETE CASCADE,
  query_hash TEXT NOT NULL,
  sql_query TEXT NOT NULL,
  results JSONB NOT NULL,
  row_count INTEGER,
  execution_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_query_cache_hash ON query_cache(csv_id, query_hash);
CREATE INDEX idx_query_cache_accessed ON query_cache(last_accessed_at);
```

---

## API Endpoints

### 1. Upload CSV

**Endpoint:** `POST /api/csv/upload`

**Request:**
```typescript
// multipart/form-data
{
  file: File;
  userId: string;
}
```

**Response:**
```typescript
{
  csvId: string;
  fileName: string;
  storageUrl: string;
  status: 'processing';
  message: 'CSV uploaded successfully. Processing in background.';
}
```

### 2. Get CSV Status

**Endpoint:** `GET /api/csv/{csvId}/status`

**Response:**
```typescript
{
  csvId: string;
  status: 'processing' | 'ready' | 'error';
  rowCount?: number;
  columnCount?: number;
  columns?: ColumnInfo[];
  statistics?: StatisticalSummary;
  error?: string;
}
```

### 3. Analyze Data

**Endpoint:** `POST /api/analyze`

**Request:**
```typescript
{
  csvId: string;
  prompt: string;
  userId: string;
  maxIterations?: number; // default: 5
}
```

**Response (Streaming):**
```typescript
// Server-Sent Events (SSE) stream
{
  type: 'iteration';
  data: {
    iteration: number;
    query: string;
    rowCount: number;
    satisfied: boolean;
    reasoning: string;
  };
}
// ... more iterations ...
{
  type: 'complete';
  data: {
    chartId: string;
    chartOptions: Highcharts.Options;
    finalQuery: string;
    iterations: number;
  };
}
```

### 4. Get Chart

**Endpoint:** `GET /api/charts/{chartId}`

**Response:**
```typescript
{
  chartId: string;
  csvId: string;
  userPrompt: string;
  chartOptions: Highcharts.Options;
  metadata: {
    createdAt: string;
    iterations: number;
    executionTimeMs: number;
    rowCount: number;
  };
}
```

### 5. List Charts

**Endpoint:** `GET /api/charts?csvId={csvId}&userId={userId}`

**Response:**
```typescript
{
  charts: Array<{
    chartId: string;
    chartType: string;
    userPrompt: string;
    thumbnail?: string;
    createdAt: string;
  }>;
  total: number;
}
```

### 6. Execute SQL (Direct)

**Endpoint:** `POST /api/csv/{csvId}/query`

**Request:**
```typescript
{
  query: string;
  userId: string;
}
```

**Response:**
```typescript
{
  results: Array<Record<string, any>>;
  rowCount: number;
  executionTimeMs: number;
  columns: string[];
}
```

---

## Security and Safety

### 1. SQL Injection Prevention

**Measures:**
- Whitelist allowed SQL operations (SELECT only)
- Parameterized queries where possible
- Table name validation (must match pattern `csv_data_*`)
- Column name sanitization
- Query parsing and AST validation
- Read-only database user for query execution

**Implementation:**
```typescript
function sanitizeTableName(csvId: string): string {
  // Only allow UUIDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(csvId)) {
    throw new Error('Invalid CSV ID');
  }
  return `csv_data_${csvId}`;
}

function validateQuery(query: string, allowedTableName: string): boolean {
  // Parse SQL using sql-parser library
  const ast = parseSQL(query);
  
  // Ensure only SELECT
  if (ast.type !== 'select') {
    return false;
  }
  
  // Ensure only querying allowed table
  const tables = extractTables(ast);
  if (!tables.every(t => t === allowedTableName)) {
    return false;
  }
  
  return true;
}
```

### 2. Resource Limits

**Query Execution:**
```typescript
const QUERY_LIMITS = {
  maxExecutionTime: 30000, // 30 seconds
  maxRows: 10000,
  maxResultSize: 10 * 1024 * 1024, // 10MB
  statementTimeout: '30s'
};

// Set PostgreSQL statement timeout
await db.query(`SET statement_timeout = '30s'`);
```

**Rate Limiting:**
- Max 10 analysis requests per minute per user
- Max 50 SQL queries per minute per user
- Max 5 concurrent analyses per user

### 3. Data Privacy

**Measures:**
- User isolation: Users can only access their own CSVs and charts
- Row-level security (RLS) in Supabase
- Secure file storage with signed URLs
- Optional: End-to-end encryption for sensitive data
- Automatic cleanup of old CSVs (configurable retention)

**Supabase RLS Policies:**
```sql
-- csv_metadata
CREATE POLICY "Users can only view their own CSVs"
  ON csv_metadata FOR SELECT
  USING (auth.uid() = user_id);

-- charts
CREATE POLICY "Users can view their own or public charts"
  ON charts FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);
```

### 4. LLM Safety

**Prompt Injection Prevention:**
- Clear system/user message boundaries
- Input sanitization
- Output validation against schema
- Monitoring for anomalous behavior

**Cost Controls:**
- Token usage tracking per request
- Maximum tokens per analysis (e.g., 50k tokens)
- Fallback to smaller models for simple queries
- Caching of common patterns

---

## Error Handling

### Error Categories

#### 1. Upload Errors

```typescript
enum UploadError {
  FILE_TOO_LARGE = 'File size exceeds 50MB limit',
  INVALID_FORMAT = 'File must be a valid CSV',
  EMPTY_FILE = 'File contains no data',
  STORAGE_FAILED = 'Failed to upload file to storage',
  PARSE_FAILED = 'Unable to parse CSV file'
}
```

#### 2. Processing Errors

```typescript
enum ProcessingError {
  TYPE_INFERENCE_FAILED = 'Unable to determine column data types',
  TABLE_CREATION_FAILED = 'Failed to create database table',
  INSERT_FAILED = 'Failed to insert data into database',
  TIMEOUT = 'Processing timeout - file may be too large'
}
```

#### 3. Query Errors

```typescript
enum QueryError {
  INVALID_SQL = 'Generated SQL query is invalid',
  EXECUTION_FAILED = 'Query execution failed',
  TIMEOUT = 'Query exceeded maximum execution time',
  NO_RESULTS = 'Query returned no results',
  TOO_MANY_ROWS = 'Query returned too many rows'
}
```

#### 4. LLM Errors

```typescript
enum LLMError {
  API_FAILURE = 'LLM API request failed',
  RATE_LIMIT = 'LLM rate limit exceeded',
  TOKEN_LIMIT = 'Context length exceeded',
  INVALID_RESPONSE = 'LLM returned invalid response',
  MAX_ITERATIONS = 'Could not generate satisfactory results'
}
```

#### 5. Chart Errors

```typescript
enum ChartError {
  INVALID_DEFINITION = 'Chart definition validation failed',
  DATA_MAPPING_FAILED = 'Unable to map SQL results to chart format',
  UNSUPPORTED_TYPE = 'Requested chart type not supported for this data'
}
```

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string; // Error enum value
    message: string; // User-friendly message
    details?: any; // Additional context
    suggestion?: string; // What user can do to fix
  };
  requestId: string; // For debugging
  timestamp: string;
}
```

### Retry Strategy

**Transient Errors (should retry):**
- Database connection failures
- LLM API rate limits
- Network timeouts

**Permanent Errors (should not retry):**
- Invalid SQL syntax
- File format errors
- Validation failures

**Implementation:**
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;
    backoff: 'exponential' | 'linear';
    retryableErrors: string[];
  }
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < options.maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!isRetryable(error, options.retryableErrors)) {
        throw error;
      }
      
      const delay = options.backoff === 'exponential'
        ? Math.pow(2, i) * 1000
        : (i + 1) * 1000;
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}
```

---

## Testing Strategy

### Unit Tests

#### 1. CSV Parser
- Valid CSV files
- Malformed CSV files
- Different delimiters
- Special characters in data
- Large files
- Empty files

#### 2. Type Inference
- Integer detection
- Float detection
- Date/timestamp detection
- Boolean detection
- Mixed types in column
- NULL handling

#### 3. Sample Compressor
- Stratified sampling accuracy
- Statistical calculations
- Edge cases (small datasets)
- Performance on large datasets

#### 4. SQL Validator
- Allowed operations (SELECT)
- Forbidden operations (DROP, DELETE, etc.)
- SQL injection attempts
- Table name validation
- Complex queries

#### 5. Chart Data Mapper
- Different SQL result formats
- Missing columns
- Type conversions
- Empty results
- Large result sets

### Integration Tests

#### 1. End-to-End Upload Flow
- Upload CSV → Process → Query → Verify table exists

#### 2. Analysis Flow
- Submit prompt → LLM generates query → Execute → Validate results

#### 3. Chart Generation
- SQL results → Chart definition → Highcharts options → Render

#### 4. Error Scenarios
- Invalid CSV
- SQL timeout
- LLM API failure
- Invalid chart definition

### Load Tests

**Scenarios:**
- 100 concurrent CSV uploads
- 50 concurrent analysis requests
- 1000 SQL queries per minute
- Large CSV files (100k+ rows)
- Complex SQL queries with multiple joins

**Metrics to Track:**
- Response times (p50, p95, p99)
- Error rates
- Database connection pool utilization
- LLM token usage
- Storage I/O

### Test Data

**Sample CSVs:**
1. Sales data (time series)
2. Customer demographics (categorical)
3. Financial transactions (high precision numbers)
4. Mixed data types
5. Large dataset (1M+ rows)
6. Wide dataset (100+ columns)
7. Malformed data (missing headers, inconsistent columns)

---

## Performance Optimizations

### 1. Caching Strategy

**Query Results Cache:**
- Cache SQL query results by hash
- TTL: 1 hour
- Invalidate on CSV updates

**Sample Data Cache:**
- Pre-compute statistical summaries
- Store in `csv_metadata.statistics`
- Recompute only when data changes

**LLM Response Cache:**
- Cache similar prompts (fuzzy matching)
- Store common query patterns
- TTL: 24 hours

### 2. Lazy Loading

**CSV Processing:**
- Upload file immediately
- Process in background job
- Stream progress updates to frontend

**Chart Rendering:**
- Lazy load Highcharts library
- Progressive rendering for large datasets
- Virtual scrolling for data tables

### 3. Database Optimization

**Indexes:**
```sql
-- Optimize aggregation queries
CREATE INDEX idx_csv_data_time_column ON csv_data_{csvId}(timestamp_column);
CREATE INDEX idx_csv_data_category_column ON csv_data_{csvId}(category_column);

-- Optimize chart lookups
CREATE INDEX idx_charts_created ON charts(created_at DESC);
```

**Partitioning:**
- Partition large CSV tables by date range
- Archive old CSVs to cold storage

**Connection Pooling:**
- Max 20 concurrent connections
- Idle timeout: 30 seconds
- Queue requests during high load

### 4. Asset Optimization

**Frontend:**
- Code splitting for chart components
- Lazy load Highcharts modules
- Compress chart JSON before transfer
- Use CDN for static assets

---

## Monitoring and Observability

### Metrics to Track

**System Metrics:**
- API response times
- Database query times
- LLM API latency
- Storage I/O throughput
- Memory usage
- CPU usage

**Business Metrics:**
- CSVs uploaded per day
- Analyses performed per day
- Charts generated per day
- User retention
- Average refinement iterations
- Most common chart types

**Error Metrics:**
- Error rate by category
- Failed uploads
- Failed queries
- LLM API errors
- Timeout rate

### Logging

**Structured Logs:**
```typescript
logger.info('csv_uploaded', {
  csvId,
  userId,
  fileName,
  rowCount,
  columnCount,
  fileSizeMB,
  processingTimeMs
});

logger.info('analysis_complete', {
  csvId,
  userId,
  prompt,
  iterations,
  finalQuery,
  chartType,
  executionTimeMs,
  tokenUsage
});

logger.error('query_failed', {
  csvId,
  userId,
  query,
  error,
  stackTrace
});
```

### Alerting

**Critical Alerts:**
- Error rate > 5%
- LLM API failures
- Database connection failures
- Storage quota exceeded

**Warning Alerts:**
- Response time > 10s (p95)
- Query timeout rate > 1%
- High memory usage (> 80%)

---

## Future Enhancements

### Phase 2 Features

1. **Multi-Chart Dashboards**
   - Combine multiple charts in one view
   - Interactive filtering across charts
   - Export dashboard as PDF

2. **Collaborative Analysis**
   - Share CSVs with team members
   - Comment on charts
   - Version history

3. **Advanced Visualizations**
   - Heatmaps
   - Bubble charts
   - Gantt charts
   - Geographic maps

4. **Scheduled Reports**
   - Auto-refresh charts with new data
   - Email reports
   - Slack notifications

5. **Data Transformations**
   - Join multiple CSVs
   - Calculated columns
   - Data cleaning UI
   - Pivot tables

6. **Export Options**
   - Download results as CSV
   - Export chart as PNG/SVG/PDF
   - Copy SQL query
   - API access to charts

7. **Smart Suggestions**
   - Recommend analyses based on data type
   - Suggest follow-up questions
   - Auto-detect anomalies

---

## Conclusion

This specification provides a comprehensive blueprint for implementing an AI-powered data analysis and visualization system. The architecture prioritizes:

- **Safety**: SQL validation, resource limits, rate limiting
- **Performance**: Caching, lazy loading, background processing
- **User Experience**: Iterative refinement, streaming updates, error recovery
- **Scalability**: Database optimization, connection pooling, horizontal scaling
- **Maintainability**: Type safety, structured logging, comprehensive testing

Implementation should proceed in phases:
1. Core upload and storage
2. CSV to SQL conversion
3. Sample compression and basic querying
4. LLM integration for query generation
5. Iterative refinement loop
6. Chart generation and display
7. Polish, optimization, and monitoring

Each component is designed to be independently testable and replaceable, allowing for iterative improvements without major refactoring.
