export enum ChartType {
  BAR = 'BAR',
  LINE = 'LINE',
  SCATTER = 'SCATTER',
  PIE = 'PIE',
  AREA = 'AREA'
}

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  description: string;
  xKey: string;
  yKey: string;
  categoryKey?: string; // For grouping
}

export interface ColumnProfile {
  name: string;
  type: 'numeric' | 'categorical' | 'datetime' | 'text';
  missingCount: number;
  uniqueCount: number;
  exampleValues: string[];
}

export interface AnalysisResult {
  summary: string;
  columns: ColumnProfile[];
  recommendedCharts: ChartConfig[];
  insights: string[]; // Bullet points of statistical findings
}

export interface Dataset {
  id: string;
  name: string;
  data: any[]; // Array of objects
  rowCount: number;
  analysis?: AnalysisResult;
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  ANALYZING = 'ANALYZING',
  DASHBOARD = 'DASHBOARD'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  chart?: {
    config: ChartConfig;
    data: any[];
  };
  isError?: boolean;
}

export type FilterState = Record<string, string | number>;

export interface CorrelationMatrix {
  variables: string[];
  matrix: number[][];
}

// Smart Query Types
export interface QueryFilter {
  column: string;
  operator: '==' | '>' | '<' | '>=' | '<=' | 'contains';
  value: string | number;
}

export interface QueryIntent {
  type: 'query' | 'chat' | 'clarification';
  filters: QueryFilter[];
  groupBy?: string;
  aggregateColumn?: string;
  aggregateType?: 'SUM' | 'AVG' | 'COUNT' | 'COUNT_DISTINCT';
  chartType?: ChartType;
  textResponse?: string; // For general chat or clarification
  title?: string;
}