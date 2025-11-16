interface Widget {
  id: string;
  type?: string;
  title?: string;
  highchartsConfig?: any;
  data?: any;
  metadata?: {
    sqlQuery?: string;
    userPrompt?: string;
    createdAt?: string;
    lastUpdated?: string;
    updatePrompt?: string;
  };
}

export interface WidgetAnalysis {
  widgetId: string;
  currentChartType: string;
  title: string;
  dataStructure: {
    hasCategories: boolean;
    hasTimeSeries: boolean;
    hasMultipleSeries: boolean;
    seriesCount: number;
    dataPoints: number;
    dataTypes: string[];
    categories?: string[];
  };
  styling: {
    colors: string[];
    hasLegend: boolean;
    hasTitle: boolean;
    axisLabels: {
      xAxis?: string;
      yAxis?: string;
    };
  };
  compatibility: {
    canBePieChart: boolean;
    canBeLineChart: boolean;
    canBeBarChart: boolean;
    canBeScatterChart: boolean;
    reasons: string[];
  };
  originalConfig: any;
}

export interface UpdateInterpretation {
  updateType: 'chartType' | 'styling' | 'data' | 'layout' | 'axis' | 'mixed';
  specificChanges: {
    newChartType?: string;
    colorChanges?: string[];
    titleChange?: string;
    legendToggle?: boolean;
    axisChanges?: any;
    dataFiltering?: any;
  };
  confidence: number; // 0-1 score of interpretation confidence
  preserveData: boolean;
  warnings: string[];
}

export class WidgetAnalyzer {
  /**
   * Analyze a widget's current configuration and structure
   */
  static analyzeWidget(widget: Widget): WidgetAnalysis {
    const config = widget.highchartsConfig || {};
    
    // Analyze chart type
    const currentChartType = this.detectChartType(widget, config);
    
    // Analyze data structure
    const dataStructure = this.analyzeDataStructure(config);
    
    // Analyze styling
    const styling = this.analyzeStyling(config);
    
    // Determine compatibility
    const compatibility = this.analyzeCompatibility(dataStructure);

    return {
      widgetId: widget.id,
      currentChartType,
      title: widget.title || config.title?.text || 'Untitled Chart',
      dataStructure,
      styling,
      compatibility,
      originalConfig: config
    };
  }

  /**
   * Interpret what the user wants to change based on their prompt
   */
  static interpretUpdatePrompt(prompt: string, analysis: WidgetAnalysis): UpdateInterpretation {
    const lowerPrompt = prompt.toLowerCase();
    let updateType: UpdateInterpretation['updateType'] = 'mixed';
    const specificChanges: any = {};
    let confidence = 0.8;
    const warnings: string[] = [];
    let preserveData = true;

    // Chart type changes
    if (this.containsChartTypeKeywords(lowerPrompt)) {
      updateType = 'chartType';
      const newChartType = this.extractChartType(lowerPrompt);
      if (newChartType) {
        specificChanges.newChartType = newChartType;
        
        // Check compatibility
        const isCompatible = this.isChartTypeCompatible(newChartType, analysis);
        if (!isCompatible.compatible) {
          warnings.push(...isCompatible.warnings);
          confidence = 0.6;
        }
      }
    }

    // Color/styling changes
    if (this.containsColorKeywords(lowerPrompt)) {
      updateType = updateType === 'mixed' ? 'styling' : 'mixed';
      const colors = this.extractColors(lowerPrompt);
      if (colors.length > 0) {
        specificChanges.colorChanges = colors;
      }
    }

    // Title changes
    if (this.containsTitleKeywords(lowerPrompt)) {
      updateType = updateType === 'mixed' ? 'layout' : 'mixed';
      const newTitle = this.extractTitle(lowerPrompt);
      if (newTitle) {
        specificChanges.titleChange = newTitle;
      }
    }

    // Legend changes
    if (this.containsLegendKeywords(lowerPrompt)) {
      updateType = updateType === 'mixed' ? 'layout' : 'mixed';
      specificChanges.legendToggle = this.extractLegendToggle(lowerPrompt);
    }

    // Axis changes
    if (this.containsAxisKeywords(lowerPrompt)) {
      updateType = updateType === 'mixed' ? 'axis' : 'mixed';
      specificChanges.axisChanges = this.extractAxisChanges(lowerPrompt);
    }

    // Data filtering/limiting
    if (this.containsDataKeywords(lowerPrompt)) {
      updateType = updateType === 'mixed' ? 'data' : 'mixed';
      const dataChanges = this.extractDataChanges(lowerPrompt);
      if (dataChanges.requiresNewQuery) {
        preserveData = false;
        warnings.push('This change requires re-querying the data');
      }
      specificChanges.dataFiltering = dataChanges;
    }

    return {
      updateType,
      specificChanges,
      confidence,
      preserveData,
      warnings
    };
  }

  /**
   * Validate that an update is safe and makes sense
   */
  static validateUpdate(oldConfig: any, newConfig: any, analysis: WidgetAnalysis): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    let isValid = true;

    // Check if data is preserved
    if (newConfig.series && oldConfig.series) {
      if (newConfig.series.length !== oldConfig.series.length) {
        warnings.push('Number of data series changed');
      }
    }

    // Check chart type compatibility
    if (newConfig.chart?.type !== oldConfig.chart?.type) {
      const newType = newConfig.chart?.type || 'column';
      const compatibility = this.isChartTypeCompatible(newType, analysis);
      if (!compatibility.compatible) {
        errors.push(`Chart type '${newType}' is not compatible with current data`);
        isValid = false;
      }
    }

    // Validate required properties
    if (!newConfig.series || newConfig.series.length === 0) {
      errors.push('Chart must have at least one data series');
      isValid = false;
    }

    return {
      isValid,
      warnings,
      errors
    };
  }

  // Helper methods

  private static detectChartType(widget: Widget, config: any): string {
    // Try widget type first
    if (widget.type) {
      return widget.type;
    }
    
    // Try config chart type
    if (config.chart?.type) {
      return config.chart.type;
    }

    // Try to infer from series
    if (config.series?.[0]?.type) {
      return config.series[0].type;
    }

    // Default
    return 'column';
  }

  private static analyzeDataStructure(config: any) {
    const series = config.series || [];
    const firstSeries = series[0] || {};
    const data = firstSeries.data || [];
    
    // Check for categories (x-axis labels)
    const hasCategories = !!(config.xAxis?.categories?.length);
    const categories = config.xAxis?.categories || [];

    // Check for time series (date/time data)
    const hasTimeSeries = this.detectTimeSeries(data, categories);

    // Check for multiple series
    const hasMultipleSeries = series.length > 1;
    const seriesCount = series.length;

    // Count data points
    const dataPoints = data.length;

    // Analyze data types
    const dataTypes = this.detectDataTypes(data);

    return {
      hasCategories,
      hasTimeSeries,
      hasMultipleSeries,
      seriesCount,
      dataPoints,
      dataTypes,
      categories: hasCategories ? categories : undefined
    };
  }

  private static analyzeStyling(config: any) {
    const series = config.series || [];
    
    // Extract colors
    const colors: string[] = [];
    series.forEach((s: any) => {
      if (s.color) colors.push(s.color);
    });
    if (config.colors) {
      colors.push(...config.colors);
    }

    // Check for legend
    const hasLegend = config.legend?.enabled !== false;

    // Check for title
    const hasTitle = !!(config.title?.text);

    // Extract axis labels
    const axisLabels = {
      xAxis: config.xAxis?.title?.text,
      yAxis: config.yAxis?.title?.text
    };

    return {
      colors: [...new Set(colors)], // Remove duplicates
      hasLegend,
      hasTitle,
      axisLabels
    };
  }

  private static analyzeCompatibility(dataStructure: any) {
    const { dataPoints, seriesCount, hasCategories, hasTimeSeries } = dataStructure;
    const reasons: string[] = [];

    // Pie chart compatibility
    const canBePieChart = seriesCount === 1 && dataPoints <= 20 && hasCategories;
    if (!canBePieChart) {
      if (seriesCount > 1) reasons.push('Pie charts require single series data');
      if (dataPoints > 20) reasons.push('Too many data points for pie chart');
      if (!hasCategories) reasons.push('Pie charts require categorical data');
    }

    // Line chart compatibility
    const canBeLineChart = dataPoints >= 2;
    if (!canBeLineChart) {
      reasons.push('Line charts require at least 2 data points');
    }

    // Bar chart compatibility (always possible with categorical data)
    const canBeBarChart = hasCategories;
    if (!canBeBarChart) {
      reasons.push('Bar charts work best with categorical data');
    }

    // Scatter chart compatibility
    const canBeScatterChart = dataPoints >= 2;
    if (!canBeScatterChart) {
      reasons.push('Scatter charts require at least 2 data points');
    }

    return {
      canBePieChart,
      canBeLineChart,
      canBeBarChart,
      canBeScatterChart,
      reasons
    };
  }

  private static detectTimeSeries(data: any[], categories: string[]): boolean {
    // Check if categories look like dates
    if (categories.length > 0) {
      const datePattern = /\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4}/;
      return categories.some(cat => datePattern.test(cat));
    }

    // Check if data points have x values that look like timestamps
    if (data.length > 0 && typeof data[0] === 'object' && data[0].x !== undefined) {
      return typeof data[0].x === 'number' && data[0].x > 1000000000; // Unix timestamp range
    }

    return false;
  }

  private static detectDataTypes(data: any[]): string[] {
    if (data.length === 0) return ['empty'];

    const types = new Set<string>();
    
    data.slice(0, 5).forEach(point => { // Sample first 5 points
      if (typeof point === 'number') {
        types.add('numeric');
      } else if (typeof point === 'object' && point !== null) {
        if (point.y !== undefined) types.add('numeric');
        if (point.x !== undefined) types.add('coordinate');
        if (point.name !== undefined) types.add('labeled');
      } else if (typeof point === 'string') {
        types.add('categorical');
      }
    });

    return Array.from(types);
  }

  // Keyword detection methods
  private static containsChartTypeKeywords(prompt: string): boolean {
    const chartTypeKeywords = ['pie', 'line', 'bar', 'column', 'scatter', 'area', 'chart type'];
    return chartTypeKeywords.some(keyword => prompt.includes(keyword));
  }

  private static containsColorKeywords(prompt: string): boolean {
    const colorKeywords = ['color', 'blue', 'red', 'green', 'yellow', 'purple', 'orange', 'pink', 'darker', 'lighter'];
    return colorKeywords.some(keyword => prompt.includes(keyword));
  }

  private static containsTitleKeywords(prompt: string): boolean {
    const titleKeywords = ['title', 'heading', 'name it', 'call it'];
    return titleKeywords.some(keyword => prompt.includes(keyword));
  }

  private static containsLegendKeywords(prompt: string): boolean {
    const legendKeywords = ['legend', 'remove legend', 'hide legend', 'show legend'];
    return legendKeywords.some(keyword => prompt.includes(keyword));
  }

  private static containsAxisKeywords(prompt: string): boolean {
    const axisKeywords = ['axis', 'label', 'rotate', 'scale', 'logarithmic'];
    return axisKeywords.some(keyword => prompt.includes(keyword));
  }

  private static containsDataKeywords(prompt: string): boolean {
    const dataKeywords = ['top', 'limit', 'filter', 'only show', 'first', 'last'];
    return dataKeywords.some(keyword => prompt.includes(keyword));
  }

  // Extraction methods
  private static extractChartType(prompt: string): string | null {
    if (prompt.includes('pie')) return 'pie';
    if (prompt.includes('line')) return 'line';
    if (prompt.includes('bar')) return 'bar';
    if (prompt.includes('column')) return 'column';
    if (prompt.includes('scatter')) return 'scatter';
    if (prompt.includes('area')) return 'area';
    return null;
  }

  private static extractColors(prompt: string): string[] {
    const colorMap: { [key: string]: string } = {
      'blue': '#2563eb',
      'red': '#dc2626',
      'green': '#16a34a',
      'yellow': '#eab308',
      'purple': '#9333ea',
      'orange': '#ea580c',
      'pink': '#ec4899'
    };

    const colors: string[] = [];
    for (const [colorName, colorValue] of Object.entries(colorMap)) {
      if (prompt.includes(colorName)) {
        colors.push(colorValue);
      }
    }
    return colors;
  }

  private static extractTitle(prompt: string): string | null {
    const titleMatch = prompt.match(/(?:title|name it|call it)\s+["']([^"']+)["']/) ||
                      prompt.match(/(?:title|name it|call it)\s+(.+?)(?:\.|$)/);
    return titleMatch ? titleMatch[1].trim() : null;
  }

  private static extractLegendToggle(prompt: string): boolean {
    if (prompt.includes('remove legend') || prompt.includes('hide legend')) {
      return false;
    }
    if (prompt.includes('show legend') || prompt.includes('add legend')) {
      return true;
    }
    return true; // Default to showing legend
  }

  private static extractAxisChanges(prompt: string): any {
    const changes: any = {};
    
    if (prompt.includes('rotate')) {
      changes.rotateLabels = true;
    }
    if (prompt.includes('logarithmic')) {
      changes.logarithmic = true;
    }
    
    return changes;
  }

  private static extractDataChanges(prompt: string): { filter?: string; limit?: number; requiresNewQuery: boolean } {
    const changes: any = { requiresNewQuery: false };
    
    // Extract numeric limits
    const limitMatch = prompt.match(/(?:top|first|only)\s+(\d+)/);
    if (limitMatch) {
      changes.limit = parseInt(limitMatch[1]);
      changes.requiresNewQuery = true;
    }
    
    return changes;
  }

  private static isChartTypeCompatible(chartType: string, analysis: WidgetAnalysis): {
    compatible: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let compatible = true;

    const { compatibility } = analysis;

    switch (chartType) {
      case 'pie':
        compatible = compatibility.canBePieChart;
        if (!compatible) {
          warnings.push('Pie charts work best with categorical data and single series');
        }
        break;
      case 'line':
        compatible = compatibility.canBeLineChart;
        if (!compatible) {
          warnings.push('Line charts require at least 2 data points');
        }
        break;
      case 'bar':
        compatible = compatibility.canBeBarChart;
        if (!compatible) {
          warnings.push('Bar charts work best with categorical data');
        }
        break;
      case 'scatter':
        compatible = compatibility.canBeScatterChart;
        if (!compatible) {
          warnings.push('Scatter charts require at least 2 data points');
        }
        break;
    }

    return { compatible, warnings };
  }
}