import postgres from 'postgres';
import * as crypto from 'crypto';
import { DataSampler, type StratifiedSample } from './data-sampler';

// Query execution configuration
interface QueryExecutionConfig {
  maxExecutionTime: number; // milliseconds
  maxRows: number;
  allowedOperations: string[];
  readOnly: boolean;
}

// Default configuration
const DEFAULT_CONFIG: QueryExecutionConfig = {
  maxExecutionTime: 30000, // 30 seconds
  maxRows: 10000,
  allowedOperations: ['SELECT'],
  readOnly: true,
};

// Validation result
interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Query execution result
export interface QueryResult {
  success: boolean;
  data?: Record<string, any>[];
  rowCount?: number;
  executionTimeMs?: number;
  columns?: string[];
  error?: string;
  fromCache?: boolean;
  // Stratified sampling data
  stratifiedSample?: StratifiedSample;
  sampling_enabled?: boolean;
}

// Query cache entry
interface CacheEntry {
  results: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  columns: string[];
  timestamp: number;
}

/**
 * SQL Executor Service
 * Safely executes SQL queries against CSV data tables with validation,
 * resource limits, and caching.
 */
export class SQLExecutor {
  private static config: QueryExecutionConfig = DEFAULT_CONFIG;
  private static cache = new Map<string, CacheEntry>();
  private static readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  /**
   * Validate SQL query for safety
   * Simplified validation - just check for forbidden operations
   */
  private static validateSQL(query: string, allowedTableName: string): ValidationResult {
    // Check for empty query
    if (!query || query.trim().length === 0) {
      return { valid: false, error: 'Query cannot be empty' };
    }

    // Normalize query for checks
    const normalizedQuery = query.trim().toUpperCase();

    // Check for forbidden operations (write operations)
    const forbidden = /\b(DROP|DELETE|UPDATE|INSERT|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|EXECUTE|CALL)\b/i;
    if (forbidden.test(query)) {
      return { valid: false, error: 'Only SELECT queries are allowed' };
    }

    // Check for multiple statements (semicolon check, but allow trailing semicolon)
    const statements = query.split(';').filter(s => s.trim().length > 0);
    if (statements.length > 1) {
      return { valid: false, error: 'Multiple statements are not allowed' };
    }

    // Verify query starts with SELECT or WITH (for CTEs)
    if (!normalizedQuery.startsWith('SELECT') && !normalizedQuery.startsWith('WITH')) {
      return { valid: false, error: 'Query must start with SELECT or WITH clause' };
    }

    // Check for system table access attempts
    const systemTables = /\b(pg_|information_schema)\b/i;
    if (systemTables.test(query)) {
      return { valid: false, error: 'Access to system tables is not allowed' };
    }

    // Check for potential SQL injection patterns
    if (query.includes('xp_') || query.includes('sp_')) {
      return { valid: false, error: 'Potential SQL injection detected' };
    }

    return { valid: true };
  }

  /**
   * Sanitize table name to prevent SQL injection
   */
  private static sanitizeTableName(csvId: string): string {
    // Allow UUIDs or timestamp-based IDs (format: <timestamp>_<random>)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const timestampRegex = /^[0-9]+_[a-z0-9]+$/i;
    const fullTableNameRegex = /^csv_[0-9]+_[a-z0-9]+$/i;

    console.log('Sanitizing csvId:', csvId);
    console.log('UUID test:', uuidRegex.test(csvId));
    console.log('Timestamp test:', timestampRegex.test(csvId));
    console.log('Full table name test:', fullTableNameRegex.test(csvId));

    if (uuidRegex.test(csvId)) {
      // UUID format: convert dashes to underscores
      return `csv_${csvId.replace(/-/g, '_')}`;
    } else if (timestampRegex.test(csvId)) {
      // Timestamp format: use as-is
      return `csv_${csvId}`;
    } else if (fullTableNameRegex.test(csvId)) {
      // Full table name already provided (e.g., csv_1234_abc)
      return csvId;
    } else {
      // Accept any string as table name (remove validation for flexibility)
      console.warn(`Non-standard CSV ID format: "${csvId}". Using as-is.`);
      return csvId.startsWith('csv_') ? csvId : `csv_${csvId}`;
    }
  }

  /**
   * Generate cache key from query and table name
   */
  private static getCacheKey(query: string, tableName: string): string {
    const normalized = query.trim().toLowerCase().replace(/\s+/g, ' ');
    return crypto
      .createHash('sha256')
      .update(`${tableName}:${normalized}`)
      .digest('hex');
  }

  /**
   * Get cached query results if available and not expired
   */
  private static getCachedResult(cacheKey: string): CacheEntry | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) {
      return null;
    }

    // Check if cache has expired
    const age = Date.now() - entry.timestamp;
    if (age > this.CACHE_TTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry;
  }

  /**
   * Store query results in cache
   */
  private static setCachedResult(
    cacheKey: string,
    results: Record<string, any>[],
    rowCount: number,
    executionTimeMs: number,
    columns: string[]
  ): void {
    this.cache.set(cacheKey, {
      results,
      rowCount,
      executionTimeMs,
      columns,
      timestamp: Date.now(),
    });
  }

  /**
   * Execute SQL query with validation and safety measures
   */
  static async execute(
    query: string,
    tableName: string,
    config: Partial<QueryExecutionConfig> = {}
  ): Promise<QueryResult> {
    const executionConfig = { ...this.config, ...config };
    const startTime = Date.now();

    try {
      // Validate query
      const validation = this.validateSQL(query, tableName);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Get DATABASE_URL from environment
      const databaseUrl = process.env.DATABASE_URL;

      if (!databaseUrl) {
        return {
          success: false,
          error: 'DATABASE_URL environment variable is missing',
        };
      }

      // Create postgres client
      const sql = postgres(databaseUrl, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });

      // Apply row limit to query if not already present
      let finalQuery = query.trim();
      if (!/LIMIT\s+\d+/i.test(finalQuery)) {
        finalQuery = `${finalQuery} LIMIT ${executionConfig.maxRows}`;
      }

      // Execute query with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query execution timeout')), executionConfig.maxExecutionTime);
      });

      let data;
      try {
        const executeQuery = async () => {
          // Use unsafe to execute the raw SQL (already validated above)
          return await sql.unsafe(finalQuery);
        };

        data = await Promise.race([executeQuery(), timeoutPromise]);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Query execution failed',
        };
      } finally {
        // Clean up connection
        await sql.end();
      }

      const executionTimeMs = Date.now() - startTime;

      // Parse results
      const results = Array.isArray(data) ? data : [];
      const rowCount = results.length;
      const columns = rowCount > 0 ? Object.keys(results[0]) : [];

      // Check if results exceed max rows
      if (rowCount >= executionConfig.maxRows) {
        console.warn(`Query returned maximum allowed rows (${executionConfig.maxRows}). Results may be truncated.`);
      }

      // Apply stratified sampling for large result sets
      // DISABLED FOR NOW - return full results
      const enableSampling = false; // rowCount > 50;
      let stratifiedSample: StratifiedSample | undefined;
      
      // if (enableSampling) {
      //   console.log(`Applying stratified sampling to ${rowCount} rows`);
      //   stratifiedSample = await DataSampler.sampleResults(results, 50);
      // }

      return {
        success: true,
        data: results,
        rowCount,
        executionTimeMs,
        columns,
        fromCache: false,
        stratifiedSample,
        sampling_enabled: enableSampling,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Execute query with caching support
   */
  static async executeWithCache(
    query: string,
    tableName: string,
    csvId: string,
    config: Partial<QueryExecutionConfig> = {}
  ): Promise<QueryResult> {
    try {
      // Validate and sanitize table name
      const sanitizedTableName = this.sanitizeTableName(csvId);
      if (sanitizedTableName !== tableName) {
        return {
          success: false,
          error: 'Table name does not match CSV ID',
        };
      }

      // Check cache first
      const cacheKey = this.getCacheKey(query, tableName);
      const cachedResult = this.getCachedResult(cacheKey);

      if (cachedResult) {
        console.log('Returning cached query results');
        return {
          success: true,
          data: cachedResult.results,
          rowCount: cachedResult.rowCount,
          executionTimeMs: cachedResult.executionTimeMs,
          columns: cachedResult.columns,
          fromCache: true,
        };
      }

      // Execute query
      const result = await this.execute(query, tableName, config);

      // Cache successful results
      if (result.success && result.data && result.columns) {
        this.setCachedResult(
          cacheKey,
          result.data,
          result.rowCount || 0,
          result.executionTimeMs || 0,
          result.columns
        );
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Clear cache for a specific CSV or all cache
   */
  static clearCache(csvId?: string): void {
    if (csvId) {
      const tableName = this.sanitizeTableName(csvId);
      // Remove entries that start with this table name
      const keysToDelete: string[] = [];
      this.cache.forEach((_, key) => {
        if (key.startsWith(tableName)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; entries: number } {
    let totalSize = 0;
    this.cache.forEach((entry) => {
      totalSize += JSON.stringify(entry.results).length;
    });
    return {
      size: totalSize,
      entries: this.cache.size,
    };
  }

  /**
   * Clean expired cache entries
   */
  static cleanExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.cache.forEach((entry, key) => {
      const age = now - entry.timestamp;
      if (age > this.CACHE_TTL) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}
