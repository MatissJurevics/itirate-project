interface Widget {
  id: string;
  type?: string;
  title?: string;
  highchartsConfig?: any;
  mapData?: any;
  mapType?: string;
  data?: any;
  metadata?: {
    sqlQuery?: string;
    userPrompt?: string;
    createdAt?: string;
  };
}

interface DashboardData {
  id: string;
  title?: string;
  widgets: Widget[];
  file_name?: string;
  row_count?: number;
  csv_table_name?: string;
}

export interface WidgetInsight {
  id: string;
  title: string;
  type: string;
  insights: string[];
  keyMetrics: string[];
  dataContext: string;
}

export interface DashboardAnalysis {
  title: string;
  totalWidgets: number;
  insights: WidgetInsight[];
  overallThemes: string[];
  datasetContext?: {
    fileName?: string;
    rowCount?: number;
    tableName?: string;
  };
}

export class DashboardAnalyzer {
  static async analyzeDashboard(dashboard: DashboardData): Promise<DashboardAnalysis> {
    const insights: WidgetInsight[] = [];
    
    for (const widget of dashboard.widgets) {
      const widgetInsight = this.analyzeWidget(widget);
      if (widgetInsight) {
        insights.push(widgetInsight);
      }
    }

    const overallThemes = this.extractOverallThemes(insights);

    return {
      title: dashboard.title || 'Dashboard Analysis',
      totalWidgets: dashboard.widgets.length,
      insights,
      overallThemes,
      datasetContext: {
        fileName: dashboard.file_name,
        rowCount: dashboard.row_count,
        tableName: dashboard.csv_table_name,
      },
    };
  }

  private static analyzeWidget(widget: Widget): WidgetInsight | null {
    const insights: string[] = [];
    const keyMetrics: string[] = [];
    let dataContext = '';

    // Extract basic info
    const title = widget.title || `${widget.type} Chart`;
    const type = widget.type || 'unknown';

    try {
      if (widget.highchartsConfig) {
        const analysis = this.analyzeHighchartsConfig(widget.highchartsConfig);
        insights.push(...analysis.insights);
        keyMetrics.push(...analysis.keyMetrics);
        dataContext = analysis.dataContext;
      } else if (widget.mapData) {
        const analysis = this.analyzeMapData(widget.mapData, widget.mapType);
        insights.push(...analysis.insights);
        keyMetrics.push(...analysis.keyMetrics);
        dataContext = analysis.dataContext;
      } else if (widget.data) {
        const analysis = this.analyzeGenericData(widget.data);
        insights.push(...analysis.insights);
        keyMetrics.push(...analysis.keyMetrics);
        dataContext = analysis.dataContext;
      }

      // Add context from metadata
      if (widget.metadata?.userPrompt) {
        dataContext += ` Originally created to: ${widget.metadata.userPrompt}`;
      }

      return {
        id: widget.id,
        title,
        type,
        insights,
        keyMetrics,
        dataContext,
      };
    } catch (error) {
      console.error(`Error analyzing widget ${widget.id}:`, error);
      return null;
    }
  }

  private static analyzeHighchartsConfig(config: any): { insights: string[]; keyMetrics: string[]; dataContext: string } {
    const insights: string[] = [];
    const keyMetrics: string[] = [];
    let dataContext = '';

    try {
      // Analyze chart title
      if (config.title?.text) {
        dataContext += `Chart shows: ${config.title.text}`;
      }

      // Analyze series data
      if (config.series && Array.isArray(config.series)) {
        for (const series of config.series) {
          if (series.data && Array.isArray(series.data)) {
            const seriesAnalysis = this.analyzeSeriesData(series);
            insights.push(...seriesAnalysis.insights);
            keyMetrics.push(...seriesAnalysis.keyMetrics);
          }
        }
      }

      // Analyze categories (x-axis)
      if (config.xAxis?.categories && Array.isArray(config.xAxis.categories)) {
        const categories = config.xAxis.categories;
        keyMetrics.push(`${categories.length} categories: ${categories.slice(0, 3).join(', ')}${categories.length > 3 ? '...' : ''}`);
      }

      // Chart type specific analysis
      const chartType = config.chart?.type || 'column';
      if (chartType === 'pie') {
        insights.push('Shows proportional breakdown of categories');
      } else if (chartType === 'line') {
        insights.push('Shows trends over time or sequence');
      } else if (chartType === 'column' || chartType === 'bar') {
        insights.push('Compares values across different categories');
      }

    } catch (error) {
      console.error('Error analyzing Highcharts config:', error);
    }

    return { insights, keyMetrics, dataContext };
  }

  private static analyzeSeriesData(series: any): { insights: string[]; keyMetrics: string[] } {
    const insights: string[] = [];
    const keyMetrics: string[] = [];

    if (!series.data || !Array.isArray(series.data)) {
      return { insights, keyMetrics };
    }

    const data = series.data.filter((d: any) => typeof d === 'number' || (d && typeof d.y === 'number'));
    
    if (data.length === 0) return { insights, keyMetrics };

    // Extract numeric values
    const values = data.map((d: any) => typeof d === 'number' ? d : d.y);
    
    // Calculate statistics
    const total = values.reduce((sum, val) => sum + val, 0);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = total / values.length;

    keyMetrics.push(`${series.name || 'Series'}: Total ${total.toLocaleString()}`);
    keyMetrics.push(`Range: ${min.toLocaleString()} - ${max.toLocaleString()}`);
    keyMetrics.push(`Average: ${avg.toLocaleString()}`);

    // Generate insights based on patterns
    if (max > avg * 2) {
      insights.push('Shows significant outliers with values much higher than average');
    }

    if (values.length > 1) {
      const trend = this.calculateTrend(values);
      if (trend > 0.1) {
        insights.push('Shows an overall increasing trend');
      } else if (trend < -0.1) {
        insights.push('Shows an overall decreasing trend');
      } else {
        insights.push('Shows relatively stable values');
      }
    }

    return { insights, keyMetrics };
  }

  private static analyzeMapData(mapData: any, mapType?: string): { insights: string[]; keyMetrics: string[]; dataContext: string } {
    const insights: string[] = [];
    const keyMetrics: string[] = [];
    let dataContext = `Map visualization${mapType ? ` (${mapType})` : ''}`;

    try {
      if (mapData.series && Array.isArray(mapData.series)) {
        const series = mapData.series[0];
        if (series.data && Array.isArray(series.data)) {
          const countries = series.data.length;
          const values = series.data.map((d: any) => d.value).filter((v: any) => typeof v === 'number');
          
          if (values.length > 0) {
            const total = values.reduce((sum: number, val: number) => sum + val, 0);
            const max = Math.max(...values);
            const min = Math.min(...values);
            
            keyMetrics.push(`${countries} regions/countries`);
            keyMetrics.push(`Total value: ${total.toLocaleString()}`);
            keyMetrics.push(`Range: ${min} - ${max}`);
            
            insights.push('Shows geographical distribution of data');
            
            const topCountry = series.data.find((d: any) => d.value === max);
            if (topCountry) {
              insights.push(`Highest value in ${topCountry.name}: ${max}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error analyzing map data:', error);
    }

    return { insights, keyMetrics, dataContext };
  }

  private static analyzeGenericData(data: any): { insights: string[]; keyMetrics: string[]; dataContext: string } {
    const insights: string[] = [];
    const keyMetrics: string[] = [];
    const dataContext = 'Generic data widget';

    try {
      if (Array.isArray(data)) {
        keyMetrics.push(`${data.length} data points`);
        insights.push('Contains tabular or list data');
      } else if (typeof data === 'object' && data !== null) {
        const keys = Object.keys(data);
        keyMetrics.push(`${keys.length} properties`);
        insights.push('Contains structured object data');
      }
    } catch (error) {
      console.error('Error analyzing generic data:', error);
    }

    return { insights, keyMetrics, dataContext };
  }

  private static calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  private static extractOverallThemes(insights: WidgetInsight[]): string[] {
    const themes: string[] = [];
    
    // Count chart types
    const typeCount = insights.reduce((acc, insight) => {
      acc[insight.type] = (acc[insight.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (typeCount.column > 0 || typeCount.bar > 0) {
      themes.push('Category comparisons and rankings');
    }
    if (typeCount.line > 0) {
      themes.push('Trend analysis and time series');
    }
    if (typeCount.pie > 0) {
      themes.push('Proportional breakdowns');
    }
    if (typeCount.map > 0) {
      themes.push('Geographical analysis');
    }

    // Look for common keywords in insights
    const allInsights = insights.flatMap(i => i.insights).join(' ').toLowerCase();
    
    if (allInsights.includes('trend') || allInsights.includes('increasing') || allInsights.includes('decreasing')) {
      themes.push('Trend analysis');
    }
    if (allInsights.includes('outlier') || allInsights.includes('higher') || allInsights.includes('peak')) {
      themes.push('Outlier detection');
    }
    if (allInsights.includes('comparison') || allInsights.includes('compare')) {
      themes.push('Comparative analysis');
    }

    return [...new Set(themes)]; // Remove duplicates
  }
}