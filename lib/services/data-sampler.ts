/**
 * Stratified Data Sampling Service
 * 
 * Instead of returning all query results to the AI, we return:
 * - Statistical summary (min, max, mean, median, percentiles)
 * - Random sample of rows (15-50)
 * - Distribution information
 * 
 * This reduces token usage while maintaining data understanding.
 */

export interface ColumnStatistics {
  name: string;
  type: 'numeric' | 'text' | 'timestamp' | 'boolean' | 'unknown';
  distinct_count: number;
  null_count: number;
  min?: string | number;
  max?: string | number;
  mean?: number;
  median?: number;
  mode?: any;
  percentile_25?: number;
  percentile_50?: number;
  percentile_75?: number;
  percentile_95?: number;
  sample_values?: any[];
}

export interface StratifiedSample {
  // Original query results summary
  total_rows: number;
  columns: string[];
  
  // Statistical summary for each column
  statistics: ColumnStatistics[];
  
  // Random sample of actual rows
  sample_rows: Record<string, any>[];
  sample_size: number;
  
  // Metadata
  sampled: boolean; // true if data was sampled, false if full results returned
  sampling_method: 'random' | 'stratified' | 'full';
}

export class DataSampler {
  /**
   * Apply stratified sampling to query results
   * 
   * @param data - Full query results
   * @param maxSampleRows - Maximum number of sample rows to return (default: 50)
   * @returns Stratified sample with statistics
   */
  static async sampleResults(
    data: Record<string, any>[],
    maxSampleRows: number = 50
  ): Promise<StratifiedSample> {
    if (data.length === 0) {
      return {
        total_rows: 0,
        columns: [],
        statistics: [],
        sample_rows: [],
        sample_size: 0,
        sampled: false,
        sampling_method: 'full',
      };
    }

    const totalRows = data.length;
    const columns = Object.keys(data[0]);

    // If dataset is small, return everything
    if (totalRows <= maxSampleRows) {
      return {
        total_rows: totalRows,
        columns,
        statistics: await this.computeStatistics(data, columns),
        sample_rows: data,
        sample_size: totalRows,
        sampled: false,
        sampling_method: 'full',
      };
    }

    // For larger datasets, sample and compute statistics
    const sampleSize = Math.min(maxSampleRows, totalRows);
    const sampleRows = this.randomSample(data, sampleSize);

    return {
      total_rows: totalRows,
      columns,
      statistics: await this.computeStatistics(data, columns),
      sample_rows: sampleRows,
      sample_size: sampleSize,
      sampled: true,
      sampling_method: 'random',
    };
  }

  /**
   * Random sampling without replacement
   */
  private static randomSample(
    data: Record<string, any>[],
    sampleSize: number
  ): Record<string, any>[] {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, sampleSize);
  }

  /**
   * Compute statistics for each column
   */
  private static async computeStatistics(
    data: Record<string, any>[],
    columns: string[]
  ): Promise<ColumnStatistics[]> {
    return columns.map(columnName => {
      const values = data.map(row => row[columnName]);
      const type = this.inferColumnType(values);

      const stats: ColumnStatistics = {
        name: columnName,
        type,
        distinct_count: new Set(values.filter(v => v != null)).size,
        null_count: values.filter(v => v == null).length,
      };

      if (type === 'numeric') {
        const numericValues = values
          .filter(v => v != null && !isNaN(Number(v)))
          .map(v => Number(v))
          .sort((a, b) => a - b);

        if (numericValues.length > 0) {
          stats.min = numericValues[0];
          stats.max = numericValues[numericValues.length - 1];
          stats.mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
          stats.median = this.percentile(numericValues, 50);
          stats.percentile_25 = this.percentile(numericValues, 25);
          stats.percentile_50 = this.percentile(numericValues, 50);
          stats.percentile_75 = this.percentile(numericValues, 75);
          stats.percentile_95 = this.percentile(numericValues, 95);
          stats.mode = this.mode(numericValues);
        }
      } else if (type === 'text') {
        const nonNullValues = values.filter(v => v != null);
        if (nonNullValues.length > 0) {
          stats.sample_values = [...new Set(nonNullValues)].slice(0, 10);
          stats.mode = this.mode(nonNullValues);
        }
      }

      return stats;
    });
  }

  /**
   * Infer column type from values
   */
  private static inferColumnType(values: any[]): ColumnStatistics['type'] {
    const nonNullValues = values.filter(v => v != null);
    if (nonNullValues.length === 0) return 'unknown';

    // Check if numeric
    const numericCount = nonNullValues.filter(v => !isNaN(Number(v))).length;
    if (numericCount / nonNullValues.length > 0.8) {
      return 'numeric';
    }

    // Check if boolean
    const booleanValues = new Set(['true', 'false', '1', '0', 'yes', 'no', true, false, 1, 0]);
    const booleanCount = nonNullValues.filter(v => 
      booleanValues.has(String(v).toLowerCase()) || typeof v === 'boolean'
    ).length;
    if (booleanCount / nonNullValues.length > 0.8) {
      return 'boolean';
    }

    // Check if timestamp
    const timestampCount = nonNullValues.filter(v => {
      if (v instanceof Date) return true;
      const parsed = Date.parse(String(v));
      return !isNaN(parsed);
    }).length;
    if (timestampCount / nonNullValues.length > 0.8) {
      return 'timestamp';
    }

    return 'text';
  }

  /**
   * Calculate percentile
   */
  private static percentile(sortedValues: number[], p: number): number {
    const index = (p / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sortedValues[lower];
    }

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * Find mode (most common value)
   */
  private static mode(values: any[]): any {
    const frequency = new Map<any, number>();
    let maxFreq = 0;
    let modeValue = values[0];

    for (const value of values) {
      const count = (frequency.get(value) || 0) + 1;
      frequency.set(value, count);
      if (count > maxFreq) {
        maxFreq = count;
        modeValue = value;
      }
    }

    return modeValue;
  }

  /**
   * Format stratified sample for LLM consumption
   */
  static formatForLLM(sample: StratifiedSample): string {
    let output = `Query Results Summary:\n`;
    output += `Total Rows: ${sample.total_rows}\n`;
    output += `Sample Size: ${sample.sample_size} rows\n`;
    output += `Sampling Method: ${sample.sampling_method}\n\n`;

    output += `Column Statistics:\n`;
    output += `${'='.repeat(80)}\n`;

    for (const stat of sample.statistics) {
      output += `\nColumn: ${stat.name}\n`;
      output += `  Type: ${stat.type}\n`;
      output += `  Distinct Values: ${stat.distinct_count}\n`;
      output += `  Null Count: ${stat.null_count}\n`;

      if (stat.type === 'numeric') {
        output += `  Min: ${stat.min}\n`;
        output += `  Max: ${stat.max}\n`;
        output += `  Mean: ${stat.mean?.toFixed(2)}\n`;
        output += `  Median: ${stat.median?.toFixed(2)}\n`;
        output += `  25th Percentile: ${stat.percentile_25?.toFixed(2)}\n`;
        output += `  75th Percentile: ${stat.percentile_75?.toFixed(2)}\n`;
        output += `  95th Percentile: ${stat.percentile_95?.toFixed(2)}\n`;
        output += `  Mode: ${stat.mode}\n`;
      } else if (stat.type === 'text' && stat.sample_values) {
        output += `  Sample Values: ${stat.sample_values.slice(0, 5).join(', ')}\n`;
        output += `  Mode: ${stat.mode}\n`;
      }
    }

    output += `\n${'='.repeat(80)}\n`;
    output += `\nSample Rows (${sample.sample_size} of ${sample.total_rows}):\n`;
    output += JSON.stringify(sample.sample_rows, null, 2);

    return output;
  }
}
