import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { NoosAnalyticsReport, SystemHealthReport } from '../models/report.model';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private readonly baseUrl = 'http://localhost:9000/toy-iris/api/report';

  constructor(private http: HttpClient) {}

  /**
   * Get NOOS Analytics Report (Report 1)
   * Returns historical NOOS run data with classification counts
   */
  getNoosAnalyticsReport(): Observable<NoosAnalyticsReport[]> {
    return this.http.get<NoosAnalyticsReport[]>(`${this.baseUrl}/report1`).pipe(
      catchError(error => {
        console.error('Error fetching NOOS analytics report:', error);
        return of([]);
      })
    );
  }

  /**
   * Get System Health Report (Report 2)
   * Returns task statistics and system health metrics
   */
  getSystemHealthReport(): Observable<SystemHealthReport[]> {
    return this.http.get<SystemHealthReport[]>(`${this.baseUrl}/report2`).pipe(
      catchError(error => {
        console.error('Error fetching system health report:', error);
        return of([]);
      })
    );
  }

  /**
   * Download NOOS Analytics Report as TSV
   */
  downloadNoosAnalyticsReport(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/download/report1`, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Error downloading NOOS analytics report:', error);
        return of(new Blob());
      })
    );
  }

  /**
   * Download System Health Report as TSV
   */
  downloadSystemHealthReport(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/download/report2`, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Error downloading system health report:', error);
        return of(new Blob());
      })
    );
  }

  /**
   * Download a specific NOOS run by ID
   */
  downloadNoosRun(runId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/download/noos-run/${runId}`, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Error downloading NOOS run:', error);
        return of(new Blob());
      })
    );
  }

  /**
   * Delete a specific NOOS run by ID
   */
  deleteNoosRun(runId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/noos-run/${runId}`).pipe(
      catchError(error => {
        console.error('Error deleting NOOS run:', error);
        throw error;
      })
    );
  }

  /**
   * Trigger file download in browser
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

