/**
 * Dashboard Data Model - matches Java backend DashBoardData
 */
export interface DashboardData {
  // Tile 1: Data Records
  totalSalesRecords: number;
  salesDataStatus: string;
  
  // Tile 2: Master Data
  totalSkus: number;
  totalStores: number;
  totalStyles: number;
  masterDataStatus: string;
  
  // Tile 3: Recent Activity
  recentUploads: number;
  uploadSuccessRate: number;
  recentActivityStatus: string;
  
  // Tile 4: Processing Status
  activeTasks: number;
  pendingTasks: number;
  processingStatus: string;
}

/**
 * Dashboard Tile Model for UI display
 */
export interface DashboardTile {
  id: string;
  title: string;
  value: string | number;
  icon: string;
  color: string;
  subtitle: string;
  lastUpdated: string;
}

/**
 * NOOS Result Model - matches Java backend NoosResult
 */
export interface NoosResult {
  id?: number;
  category: string;
  styleCode: string;
  styleROS: number;
  type: string; // "core", "bestseller", "liquidation", "other"
  styleRevContribution: number;
  calculatedDate: string;
  totalQuantitySold?: number;
  totalRevenue?: number;
  daysAvailable?: number;
  daysWithSales?: number;
  avgDiscount?: number;
}

/**
 * NOOS Dashboard Data Model - matches backend API response
 */
export interface NoosDashboardData {
  summary: { [key: string]: number };
  totalResults: number;
  lastRunDate?: string;
  hasResults: boolean;
  percentages: { [key: string]: number };
}

/**
 * NOOS Result Summary for UI display
 */
export interface NoosResultSummary {
  type: string;
  count: number;
  percentage: number;
  description: string;
  lastRun: string;
}
