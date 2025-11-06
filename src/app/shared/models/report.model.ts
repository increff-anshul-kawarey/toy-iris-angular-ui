/**
 * NOOS Analytics Report Data Model (Report 1)
 * Matches backend Report1Data.java
 */
export interface NoosAnalyticsReport {
  id?: number;
  executionDate: string;
  algorithmLabel: string;
  executionStatus: string;
  totalStylesProcessed: number;
  coreStyles: number;
  bestsellerStyles: number;
  fashionStyles: number;
  executionTimeMinutes: number;
  parameters: string;
}

/**
 * System Health Report Data Model (Report 2)
 * Matches backend Report2Data.java
 */
export interface SystemHealthReport {
  date: string;
  taskType: string;
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  successRate: number;
  averageExecutionTime: number;
  systemStatus: string;
}

/**
 * Chart data structure for displaying graphs
 */
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

