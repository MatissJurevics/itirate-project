-- Create charts table for storing chart configurations
CREATE TABLE IF NOT EXISTS charts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  csv_id UUID NOT NULL,
  chart_options JSONB NOT NULL,
  sql_query TEXT NOT NULL,
  chart_type TEXT,
  user_prompt TEXT,
  dashboard_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_charts_csv_id ON charts(csv_id);
CREATE INDEX IF NOT EXISTS idx_charts_chart_type ON charts(chart_type);
CREATE INDEX IF NOT EXISTS idx_charts_created_at ON charts(created_at);
CREATE INDEX IF NOT EXISTS idx_charts_dashboard_id ON charts(dashboard_id);