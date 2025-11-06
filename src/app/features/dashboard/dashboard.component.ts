import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { interval, Subscription } from 'rxjs';

import { DashboardService } from '../../shared/services/dashboard.service';
import { TaskService, Task, TaskStats } from '../../shared/services/task.service';
import { NotificationService } from '../../shared/services/notification.service';
import { NoosResultSummary, DashboardData } from '../../shared/models/dashboard-data.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ]
})
export class DashboardComponent implements OnInit, OnDestroy {
  noosResults: NoosResultSummary[] = [];
  isNoosLoading = false;
  lastRefreshTime: Date = new Date();
  
  // Dashboard metrics
  dashboardData: DashboardData | null = null;
  isDashboardLoading = false;
  
  // Task monitoring
  taskStats: TaskStats | null = null;
  recentTasks: Task[] = [];
  isTaskLoading = false;
  
  // System health
  systemHealth: any[] = [];
  isHealthLoading = false;
  showHealthModal = false;
  selectedHealthMetric: any = null;
  
  // Tab management
  selectedTabIndex = 0;
  
  private refreshSubscription?: Subscription;
  private readonly REFRESH_INTERVAL = 30000; // 30 seconds

  constructor(
    private dashboardService: DashboardService,
    private taskService: TaskService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.loadNoosResults();
    this.loadTaskData();
    this.loadSystemHealth();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadNoosResults(): void {
    this.isNoosLoading = true;
    this.dashboardService.getNoosDashboardData().subscribe({
      next: (data) => {
        this.noosResults = this.dashboardService.convertToNoosSummary(data);
        this.isNoosLoading = false;
      },
      error: (error) => {
        console.error('Error loading NOOS results:', error);
        this.isNoosLoading = false;
        // Fallback to empty results
        this.noosResults = [];
      }
    });
  }

  downloadNoosResults(): void {
    this.dashboardService.downloadNoosResults().subscribe({
      next: (blob) => {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `noos-results-${timestamp}.tsv`;
        this.dashboardService.downloadFile(blob, filename);
        this.notificationService.success('Download Complete', 'NOOS results downloaded successfully');
      },
      error: (error) => {
        console.error('Error downloading NOOS results:', error);
        this.notificationService.error('Download Failed', 'Failed to download NOOS results');
      }
    });
  }


  startAutoRefresh(): void {
    this.refreshSubscription = interval(this.REFRESH_INTERVAL).subscribe(() => {
      this.loadNoosResults();
    });
  }

  refreshNoosResults(): void {
    this.loadNoosResults();
    this.notificationService.info('Refresh Complete', 'NOOS results refreshed');
  }

  loadDashboardData(): void {
    this.isDashboardLoading = true;
    this.dashboardService.getDashboardMetrics().subscribe({
      next: (data) => {
        this.dashboardData = data;
        this.isDashboardLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.isDashboardLoading = false;
      }
    });
  }

  loadTaskData(): void {
    this.isTaskLoading = true;
    
    // Load task stats
    this.taskService.getTaskStats().subscribe({
      next: (stats) => {
        this.taskStats = stats;
      },
      error: (error) => {
        console.error('Error loading task stats:', error);
      }
    });

    // Load recent tasks
    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.recentTasks = tasks.slice(0, 5); // Show only last 5 tasks
        this.isTaskLoading = false;
      },
      error: (error) => {
        console.error('Error loading recent tasks:', error);
        this.isTaskLoading = false;
      }
    });
  }

  loadSystemHealth(): void {
    this.isHealthLoading = true;
    this.dashboardService.getSystemHealth().subscribe({
      next: (health) => {
        this.systemHealth = health;
        this.isHealthLoading = false;
      },
      error: (error) => {
        console.error('Error loading system health:', error);
        this.isHealthLoading = false;
      }
    });
  }

  onTabChange(index: number): void {
    this.selectedTabIndex = index;
  }

  getTaskStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed': return 'success';
      case 'running': return 'primary';
      case 'failed': return 'warn';
      case 'cancelled': return 'accent';
      default: return 'primary';
    }
  }

  getTaskStatusIcon(status: string): string {
    // Return Material Icon names for task status
    switch (status.toLowerCase()) {
      case 'completed': return 'check_circle';
      case 'running': return 'play_circle';
      case 'failed': return 'error';
      case 'cancelled': return 'cancel';
      default: return 'help';
    }
  }

  getIconName(materialIcon: string): string {
    // Return Material Icon names directly - they will be styled by global CSS
    return materialIcon;
  }

  getHealthValue(health: any): string {
    if (health.taskType === 'SYSTEM_OVERVIEW') {
      return health.totalTasks?.toString() || '0';
    }
    return health.totalTasks?.toString() || '0';
  }

  getHealthLabel(health: any): string {
    if (health.taskType === 'SYSTEM_OVERVIEW') {
      return 'Active Tasks';
    }
    
    // Map backend task types to user-friendly labels
    const typeMap: { [key: string]: string } = {
      'UPLOAD_SALES': 'Sales Upload',
      'UPLOAD_STYLES': 'Styles Upload', 
      'UPLOAD_STORES': 'Stores Upload',
      'UPLOAD_SKUS': 'SKUs Upload',
      'RUN_NOOS': 'NOOS Algorithm'
    };
    
    return typeMap[health.taskType] || health.taskType || 'Unknown';
  }

  getAverageTimeInSeconds(timeInMinutes?: number): string {
    if (!timeInMinutes || timeInMinutes === 0) {
      return 'N/A';
    }
    
    const seconds = timeInMinutes * 60;
    
    if (seconds < 1) {
      // Show in milliseconds if less than 1 second
      return `${(seconds * 1000).toFixed(0)}ms`;
    } else {
      // Show in seconds
      return `${seconds.toFixed(1)}s`;
    }
  }

  showHealthDetails(health: any): void {
    this.selectedHealthMetric = health;
    this.showHealthModal = true;
  }

  closeHealthModal(): void {
    this.showHealthModal = false;
    this.selectedHealthMetric = null;
  }
}
