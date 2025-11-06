import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { DashboardData, NoosDashboardData, NoosResult, NoosResultSummary } from '../models/dashboard-data.model';
import { AlgorithmParameters, AlgoParametersData } from './algorithm-parameters.service';
import { Task } from './task.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly baseUrl = 'http://localhost:9000/toy-iris/api';

  constructor(private http: HttpClient) {}

  /**
   * Get dashboard metrics from backend
   */
  getDashboardMetrics(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.baseUrl}/run/updates`).pipe(
      catchError(error => {
        console.error('Error fetching dashboard metrics:', error);
        // Return fallback data if backend is unavailable
        return of(this.getFallbackDashboardData());
      })
    );
  }

  /**
   * Get NOOS dashboard data from backend
   */
  getNoosDashboardData(): Observable<NoosDashboardData> {
    return this.http.get<NoosDashboardData>(`${this.baseUrl}/results/noos/dashboard`).pipe(
      catchError(error => {
        console.error('Error fetching NOOS dashboard data:', error);
        // Return empty data if backend is unavailable
        return of({
          summary: {},
          totalResults: 0,
          hasResults: false,
          percentages: {}
        });
      })
    );
  }

  /**
   * Get latest NOOS results
   */
  getLatestNoosResults(): Observable<NoosResult[]> {
    return this.http.get<NoosResult[]>(`${this.baseUrl}/results/noos`).pipe(
      catchError(error => {
        console.error('Error fetching NOOS results:', error);
        return of([]);
      })
    );
  }

  /**
   * Get NOOS results summary
   */
  getNoosResultsSummary(): Observable<{ [key: string]: number }> {
    return this.http.get<{ [key: string]: number }>(`${this.baseUrl}/results/noos/summary`).pipe(
      catchError(error => {
        console.error('Error fetching NOOS summary:', error);
        return of({});
      })
    );
  }

  /**
   * Download NOOS results as TSV
   */
  downloadNoosResults(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/results/noos/download`, {
      responseType: 'blob'
    });
  }

  /**
   * Get task statistics
   */
  getTaskStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/tasks/stats`).pipe(
      catchError(error => {
        console.error('Error fetching task stats:', error);
        return of({});
      })
    );
  }

  /**
   * Get recent tasks
   */
  getRecentTasks(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/tasks`).pipe(
      catchError(error => {
        console.error('Error fetching recent tasks:', error);
        return of([]);
      })
    );
  }

  /**
   * Get fallback dashboard data when backend is unavailable
   */
  private getFallbackDashboardData(): DashboardData {
    return {
      totalSalesRecords: 0,
      salesDataStatus: 'No data available',
      totalSkus: 0,
      totalStores: 0,
      totalStyles: 0,
      masterDataStatus: 'No data available',
      recentUploads: 0,
      uploadSuccessRate: 0,
      recentActivityStatus: 'No recent activity',
      activeTasks: 0,
      pendingTasks: 0,
      processingStatus: 'System offline'
    };
  }

  /**
   * Convert dashboard data to tiles for UI display
   */
  convertToTiles(dashboardData: DashboardData): any[] {
    const now = new Date().toLocaleString();
    
    return [
      {
        id: 'sales',
        title: 'Sales Records',
        value: dashboardData.totalSalesRecords.toLocaleString(),
        icon: 'storage',
        color: 'primary',
        subtitle: dashboardData.salesDataStatus,
        lastUpdated: now
      },
      {
        id: 'master',
        title: 'Master Records',
        value: (dashboardData.totalSkus + dashboardData.totalStores + dashboardData.totalStyles).toLocaleString(),
        icon: 'inventory',
        color: 'success',
        subtitle: dashboardData.masterDataStatus,
        lastUpdated: now
      },
      {
        id: 'uploads',
        title: 'Recent Uploads',
        value: dashboardData.recentUploads.toString(),
        icon: 'cloud_upload',
        color: 'info',
        subtitle: `${dashboardData.uploadSuccessRate.toFixed(1)}% success rate`,
        lastUpdated: now
      },
      {
        id: 'tasks',
        title: 'Active Tasks',
        value: dashboardData.activeTasks.toString(),
        icon: 'settings',
        color: 'warning',
        subtitle: dashboardData.processingStatus,
        lastUpdated: now
      }
    ];
  }

  /**
   * Convert NOOS dashboard data to summary for UI display
   */
  convertToNoosSummary(noosData: NoosDashboardData): NoosResultSummary[] {
    const summaries: NoosResultSummary[] = [];
    const lastRun = noosData.lastRunDate ? 
      new Date(noosData.lastRunDate).toLocaleString() : 
      'Never';

    // Map backend types to display types
    const typeMapping: { [key: string]: { displayName: string; description: string } } = {
      'core': { displayName: 'Core', description: 'High-performing, consistent products' },
      'bestseller': { displayName: 'Bestseller', description: 'Top revenue generating products' },
      'liquidation': { displayName: 'Liquidation', description: 'Products marked for clearance' },
      'other': { displayName: 'Other', description: 'Products requiring further analysis' }
    };

    for (const [type, count] of Object.entries(noosData.summary)) {
      const mapping = typeMapping[type.toLowerCase()] || { 
        displayName: type, 
        description: 'Product category' 
      };
      
      summaries.push({
        type: mapping.displayName,
        count: count,
        percentage: noosData.percentages[type] || 0,
        description: mapping.description,
        lastRun: lastRun
      });
    }

    return summaries;
  }

  /**
   * Run NOOS algorithm with parameters
   */
  runNoosAlgorithm(parameters: AlgorithmParameters): Observable<Task> {
    const backendParams = this.convertToBackendParameters(parameters);
    return this.http.post<Task>(`${this.baseUrl}/run/noos/async`, backendParams).pipe(
      catchError(error => {
        console.error('Error running NOOS algorithm:', error);
        throw error;
      })
    );
  }

  /**
   * Run NOOS algorithm synchronously (legacy)
   */
  runNoosAlgorithmSync(parameters: AlgorithmParameters): Observable<Task> {
    const backendParams = this.convertToBackendParameters(parameters);
    return this.http.post<Task>(`${this.baseUrl}/run/noos`, backendParams).pipe(
      catchError(error => {
        console.error('Error running NOOS algorithm (sync):', error);
        throw error;
      })
    );
  }

  /**
   * Get task by ID
   */
  getTask(taskId: number): Observable<Task> {
    return this.http.get<Task>(`${this.baseUrl}/tasks/${taskId}`).pipe(
      catchError(error => {
        console.error(`Error fetching task ${taskId}:`, error);
        return of({} as Task);
      })
    );
  }

  /**
   * Get system health metrics
   */
  getSystemHealth(): Observable<any> {
    return this.http.get(`${this.baseUrl}/report/report2`).pipe(
      catchError(error => {
        console.error('Error fetching system health:', error);
        return of([]);
      })
    );
  }

  /**
   * Get NOOS analytics report
   */
  getNoosAnalytics(): Observable<any> {
    return this.http.get(`${this.baseUrl}/report/report1`).pipe(
      catchError(error => {
        console.error('Error fetching NOOS analytics:', error);
        return of([]);
      })
    );
  }

  /**
   * Convert frontend parameters to backend AlgoParametersData format
   */
  private convertToBackendParameters(parameters: AlgorithmParameters): AlgoParametersData {
    return {
      parameterSetName: parameters.parameterSetName,
      isActive: parameters.isActive !== undefined ? parameters.isActive : true,
      lastUpdated: new Date().toISOString(),
      liquidationThreshold: parameters.liquidationThreshold,
      bestsellerMultiplier: parameters.bestsellerMultiplier,
      minVolumeThreshold: parameters.minVolumeThreshold,
      consistencyThreshold: parameters.consistencyThreshold,
      analysisStartDate: this.formatDate(parameters.analysisStartDate),
      analysisEndDate: this.formatDate(parameters.analysisEndDate),
      coreDurationMonths: parameters.coreDurationMonths,
      bestsellerDurationDays: parameters.bestsellerDurationDays
    };
  }

  /**
   * Format date to yyyy-MM-dd string
   */
  private formatDate(date: Date | string): string {
    if (typeof date === 'string') {
      return date.split('T')[0];
    }
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  /**
   * Handle file download
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
