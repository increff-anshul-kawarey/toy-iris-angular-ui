import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { ReportsService } from '../../shared/services/reports.service';
import { NotificationService } from '../../shared/services/notification.service';
import { NoosAnalyticsReport } from '../../shared/models/report.model';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-noos-analytics',
  templateUrl: './noos-analytics.component.html',
  styleUrls: ['./noos-analytics.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ScrollingModule
  ]
})
export class NoosAnalyticsComponent implements OnInit, AfterViewInit {
  @ViewChild('coreChart') coreChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('bestsellerChart') bestsellerChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fashionChart') fashionChartRef!: ElementRef<HTMLCanvasElement>;

  reportData: NoosAnalyticsReport[] = [];
  isLoading = false;
  lastRefreshTime: Date = new Date();
  isDownloading: boolean[] = [];
  isDeleting: boolean[] = [];

  private coreChart?: Chart;
  private bestsellerChart?: Chart;
  private fashionChart?: Chart;

  constructor(
    private reportsService: ReportsService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadReportData();
  }

  ngAfterViewInit(): void {
    // Charts will be created after data is loaded
  }

  /**
   * Load NOOS Analytics report data
   */
  loadReportData(): void {
    this.isLoading = true;
    this.reportsService.getNoosAnalyticsReport().subscribe({
      next: (data) => {
        // Sort by execution date descending (most recent first)
        this.reportData = data.sort((a, b) => 
          new Date(b.executionDate).getTime() - new Date(a.executionDate).getTime()
        );
        this.isLoading = false;
        this.lastRefreshTime = new Date();
        
        // Create charts after data is loaded
        setTimeout(() => this.createCharts(), 100);
      },
      error: (error) => {
        console.error('Error loading NOOS analytics report:', error);
        this.isLoading = false;
        this.notificationService.error('Load Failed', 'Failed to load NOOS analytics report');
      }
    });
  }

  /**
   * Refresh report data
   */
  refreshData(): void {
    this.loadReportData();
    this.notificationService.info('Refreshed', 'NOOS analytics data refreshed');
  }

  /**
   * Download report as TSV
   */
  downloadReport(): void {
    // Show notification that download is starting
    this.notificationService.info('Download Started', 'Preparing complete NOOS analytics report...');
    
    this.reportsService.downloadNoosAnalyticsReport().subscribe({
      next: (blob) => {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `noos-analytics-report-${timestamp}.tsv`;
        this.reportsService.downloadFile(blob, filename);
        
        this.notificationService.success(
          'Download Complete', 
          `Successfully downloaded complete analytics report (${this.reportData.length} runs)`
        );
      },
      error: (error) => {
        console.error('Error downloading report:', error);
        this.notificationService.error(
          'Download Failed', 
          'Failed to download complete report. Please try again.'
        );
      }
    });
  }

  /**
   * Create all three charts
   */
  private createCharts(): void {
    if (this.reportData.length === 0) {
      return;
    }

    // Prepare data for charts (reverse to show oldest to newest on x-axis)
    const chartData = [...this.reportData].reverse();
    const labels = chartData.map(item => this.formatDate(item.executionDate));
    
    const coreData = chartData.map(item => item.coreStyles);
    const bestsellerData = chartData.map(item => item.bestsellerStyles);
    const fashionData = chartData.map(item => item.fashionStyles);

    // Destroy existing charts if they exist
    this.destroyCharts();

    // Create Core chart
    this.coreChart = this.createLineChart(
      this.coreChartRef.nativeElement,
      labels,
      coreData,
      'Core Styles',
      '#4F46E5'
    );

    // Create Bestseller chart
    this.bestsellerChart = this.createLineChart(
      this.bestsellerChartRef.nativeElement,
      labels,
      bestsellerData,
      'Bestseller Styles',
      '#10B981'
    );

    // Create Fashion chart
    this.fashionChart = this.createLineChart(
      this.fashionChartRef.nativeElement,
      labels,
      fashionData,
      'Fashion Styles',
      '#F59E0B'
    );
  }

  /**
   * Create a line chart
   */
  private createLineChart(
    canvas: HTMLCanvasElement,
    labels: string[],
    data: number[],
    label: string,
    color: string
  ): Chart {
    const config: ChartConfiguration = {
      type: 'line' as ChartType,
      data: {
        labels: labels,
        datasets: [{
          label: label,
          data: data,
          backgroundColor: this.hexToRgba(color, 0.1),
          borderColor: color,
          borderWidth: 2,
          fill: true,
          tension: 0.15,
          pointRadius: 4,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#6B7280',
              font: {
                size: 12,
                family: "'Inter', sans-serif"
              },
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: color,
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: (context) => {
                return `${label}: ${context.parsed.y.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              color: '#6B7280',
              font: {
                size: 11
              },
              padding: 8
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#6B7280',
              font: {
                size: 11
              },
              padding: 8
            }
          }
        }
      }
    };

    return new Chart(canvas, config);
  }

  /**
   * Destroy all charts
   */
  private destroyCharts(): void {
    if (this.coreChart) {
      this.coreChart.destroy();
    }
    if (this.bestsellerChart) {
      this.bestsellerChart.destroy();
    }
    if (this.fashionChart) {
      this.fashionChart.destroy();
    }
  }

  /**
   * Format date for display
   */
  formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /**
   * Format date and time for display
   */
  formatDateTime(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Convert hex color to rgba
   */
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Get status badge color
   */
  getStatusColor(status: string): string {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'success';
      case 'RUNNING':
        return 'primary';
      case 'FAILED':
        return 'error';
      default:
        return 'default';
    }
  }

  /**
   * Get icon for material design
   */
  getIconName(materialIcon: string): string {
    // Return Material Icon names directly - they will be styled by global CSS
    return materialIcon;
  }

  /**
   * Get average core styles
   */
  getAverageCoreStyles(): number {
    if (this.reportData.length === 0) return 0;
    const sum = this.reportData.reduce((acc, r) => acc + (r.coreStyles || 0), 0);
    return Math.round(sum / this.reportData.length);
  }

  /**
   * Get average bestseller styles
   */
  getAverageBestsellerStyles(): number {
    if (this.reportData.length === 0) return 0;
    const sum = this.reportData.reduce((acc, r) => acc + (r.bestsellerStyles || 0), 0);
    return Math.round(sum / this.reportData.length);
  }

  /**
   * Get average fashion styles
   */
  getAverageFashionStyles(): number {
    if (this.reportData.length === 0) return 0;
    const sum = this.reportData.reduce((acc, r) => acc + (r.fashionStyles || 0), 0);
    return Math.round(sum / this.reportData.length);
  }

  /**
   * Get average execution time
   */
  getAverageExecutionTime(): string {
    if (this.reportData.length === 0) return '0.0';
    const sum = this.reportData.reduce((acc, r) => acc + (r.executionTimeMinutes || 0), 0);
    return (sum / this.reportData.length).toFixed(1);
  }

  /**
   * Track by function for virtual scroll
   */
  trackByIndex(index: number, item: NoosAnalyticsReport): number {
    return item.id || index;
  }

  /**
   * Download a specific NOOS run
   */
  downloadRun(run: NoosAnalyticsReport, index: number): void {
    if (!run.id) {
      this.notificationService.error('Download Failed', 'Run ID not available');
      return;
    }

    this.isDownloading[index] = true;
    
    // Show notification that download is starting
    this.notificationService.info('Download Started', `Preparing ${run.algorithmLabel} for download...`);
    
    this.reportsService.downloadNoosRun(run.id).subscribe({
      next: (blob) => {
        const timestamp = new Date(run.executionDate).toISOString().split('T')[0];
        const filename = `noos-run-${run.algorithmLabel}-${timestamp}.tsv`;
        this.reportsService.downloadFile(blob, filename);
        
        // Show success notification
        this.notificationService.success(
          'Download Complete', 
          `Successfully downloaded ${run.algorithmLabel} (${run.totalStylesProcessed} styles)`
        );
        this.isDownloading[index] = false;
      },
      error: (error) => {
        console.error('Error downloading run:', error);
        this.notificationService.error(
          'Download Failed', 
          `Failed to download ${run.algorithmLabel}. Please try again.`
        );
        this.isDownloading[index] = false;
      }
    });
  }

  /**
   * Delete a specific NOOS run
   */
  deleteRun(run: NoosAnalyticsReport, index: number): void {
    if (!run.id) {
      this.notificationService.error('Delete Failed', 'Run ID not available');
      return;
    }

    // Confirm deletion with a warning notification
    const confirmed = confirm(
      `⚠️ WARNING: Delete NOOS Run?\n\n` +
      `Run: ${run.algorithmLabel}\n` +
      `Date: ${new Date(run.executionDate).toLocaleDateString()}\n` +
      `Styles: ${run.totalStylesProcessed}\n\n` +
      `This action cannot be undone. All data for this run will be permanently deleted.`
    );
    
    if (!confirmed) {
      return;
    }

    this.isDeleting[index] = true;
    
    // Show warning notification
    this.notificationService.warning('Deleting Run', `Deleting ${run.algorithmLabel}...`);
    
    this.reportsService.deleteNoosRun(run.id).subscribe({
      next: () => {
        this.notificationService.success(
          'Run Deleted', 
          `Successfully deleted ${run.algorithmLabel} and all associated data`
        );
        
        // Remove from local array
        this.reportData.splice(index, 1);
        this.isDeleting.splice(index, 1);
        this.isDownloading.splice(index, 1);
        
        // Recreate charts with updated data
        setTimeout(() => this.createCharts(), 100);
      },
      error: (error) => {
        console.error('Error deleting run:', error);
        this.notificationService.error(
          'Delete Failed', 
          `Failed to delete ${run.algorithmLabel}. Please try again or contact support.`
        );
        this.isDeleting[index] = false;
      }
    });
  }

  /**
   * Cleanup on component destroy
   */
  ngOnDestroy(): void {
    this.destroyCharts();
  }
}

