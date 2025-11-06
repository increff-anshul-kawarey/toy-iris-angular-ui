import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface UploadStatus {
  [key: string]: {
    exists: boolean;
    count: number;
    processing?: boolean;
    failed?: boolean;
    progressPercentage?: number;
    progressMessage?: string;
    errorSummary?: {
      totalErrors: number;
      validationErrors: number;
      skippedRows: number;
    };
    taskId?: number;
  };
}

export interface UploadResponse {
  success: boolean;
  message: string;
  taskId?: number;
  errors?: string[];
  errorCount?: number;
}

export interface Task {
  id: number;
  taskType: string;
  status: string;
  fileName?: string;
  totalRecords?: number;
  processedRecords?: number;
  errorCount?: number;
  startTime: string;
  endTime?: string;
  errorMessage?: string;
  userId?: string;
  parameters?: string;
  progressMessage?: string;
  progressPercentage?: number;
  resultUrl?: string;
  cancellationRequested?: boolean;
  createdDate: string;
  lastUpdatedDate?: string;
}

export interface ValidationError {
  rowNumber: number;
  errorType: string;
  errorReason: string;
  fieldName?: string;
  fieldValue?: string;
}

export interface ErrorReport {
  errors: ValidationError[];
  totalCount: number;
  page: number;
  size: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private readonly baseUrl = 'http://localhost:9000/toy-iris/api/file';
  private uploadStatusSubject = new BehaviorSubject<UploadStatus>({});
  public uploadStatus$ = this.uploadStatusSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get current upload status for all file types
   */
  getUploadStatus(): Observable<UploadStatus> {
    return this.http.get<UploadStatus>(`${this.baseUrl}/status`)
      .pipe(
        map(status => {
          this.uploadStatusSubject.next(status);
          return status;
        }),
        catchError((error) => {
          // Handle different types of non-JSON responses
          if (error.error && typeof error.error === 'string') {
            // Check if it's HTML (common when backend is down or endpoint doesn't exist)
            if (error.error.includes('<!doctype') || error.error.includes('<html')) {
              console.warn('Backend returned HTML response - likely backend is not running or endpoint not found');
            } else {
              console.warn('Backend returned plain text error:', error.error);
            }
            
            // Return fallback status instead of throwing error
            const fallbackStatus: UploadStatus = {
              styles: { exists: false, count: 0 },
              stores: { exists: false, count: 0 },
              skus: { exists: false, count: 0 },
              sales: { exists: false, count: 0 }
            };
            this.uploadStatusSubject.next(fallbackStatus);
            return of(fallbackStatus);
          }
          return this.handleError(error);
        })
      );
  }

  /**
   * Start async upload task
   */
  startUploadTask(fileType: string, file: File): Observable<Task> {
    if (!file) {
      return throwError(() => new Error('No file provided for upload'));
    }

    const formData = new FormData();
    formData.append('file', file);

    const url = `${this.baseUrl}/upload/${fileType}/async`;
    console.log('Upload URL:', url);
    console.log('File type:', fileType);
    console.log('File name:', file.name);

    return this.http.post<Task>(url, formData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Upload file asynchronously with proper task polling
   */
  uploadFileAsync(fileType: string, file: File): Observable<{ progress: number; task?: Task; completed?: boolean; error?: string }> {
    return new Observable(observer => {
      // Start the upload task
      this.startUploadTask(fileType, file).subscribe({
        next: (task) => {
          if (task.status === 'FAILED') {
            observer.error(new Error(task.errorMessage || 'Upload failed'));
            return;
          }
          
          // Start polling for completion
          this.pollUploadTaskStatus(task.id, observer, fileType);
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Poll upload task status until completion
   */
  private pollUploadTaskStatus(taskId: number, observer: any, fileType: string, pollCount: number = 0): void {
    const maxPolls = 240; // Maximum 20 minutes (240 * 5 seconds) for uploads
    
    if (pollCount >= maxPolls) {
      observer.error(new Error('Upload timeout - task is taking too long'));
      return;
    }

    this.getTaskStatus(taskId).subscribe({
      next: (task) => {
        if (task.status === 'COMPLETED') {
          observer.next({ progress: 100, task, completed: true });
          observer.complete();
        } else if (task.status === 'FAILED') {
          const error = new Error(task.errorMessage || 'Upload failed');
          // Attach task information to the error for the component to use
          (error as any).task = task;
          observer.error(error);
        } else if (task.status === 'CANCELLED') {
          observer.error(new Error('Upload was cancelled'));
        } else if (task.status === 'PENDING' || task.status === 'RUNNING') {
          // Update progress and continue polling
          const progress = task.progressPercentage || 0;
          observer.next({ progress, task });
          
          // Continue polling after 2 seconds (more frequent for uploads)
          setTimeout(() => {
            this.pollUploadTaskStatus(taskId, observer, fileType, pollCount + 1);
          }, 2000);
        } else {
          observer.error(new Error('Unknown task status: ' + task.status));
        }
      },
      error: (error) => {
        // Retry polling on error
        setTimeout(() => {
          this.pollUploadTaskStatus(taskId, observer, fileType, pollCount + 1);
        }, 2000);
      }
    });
  }

  /**
   * Upload file synchronously (for smaller files) - DEPRECATED: Use async upload instead
   * @deprecated This method calls the sync endpoint. Use uploadFileAsync for better performance.
   */
  uploadFileSync(fileType: string, file: File): Observable<UploadResponse> {
    if (!file) {
      return throwError(() => new Error('No file provided for upload'));
    }

    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<UploadResponse>(`${this.baseUrl}/upload/${fileType}`, formData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Start async download task
   */
  startDownloadTask(fileType: string): Observable<Task> {
    return this.http.post<Task>(`${this.baseUrl}/download/${fileType}/async`, {})
      .pipe(catchError(this.handleError));
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: number): Observable<Task> {
    return this.http.get<Task>(`http://localhost:9000/toy-iris/api/tasks/${taskId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Download task result file
   */
  downloadTaskResult(taskId: number): Observable<Blob> {
    return this.http.get(`http://localhost:9000/toy-iris/api/tasks/${taskId}/result`, {
      responseType: 'blob'
    }).pipe(catchError(this.handleError));
  }

  /**
   * Poll task status until completion and then download result
   */
  downloadDataFileAsync(fileType: string): Observable<{ progress: number; blob?: Blob; filename?: string }> {
    return new Observable(observer => {
      // Start the download task
      this.startDownloadTask(fileType).subscribe({
        next: (task) => {
          if (task.status === 'FAILED') {
            observer.error(new Error(task.errorMessage || 'Download failed'));
            return;
          }
          
          // Start polling for completion
          this.pollTaskStatus(task.id, observer, fileType);
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Poll task status until completion
   */
  private pollTaskStatus(taskId: number, observer: any, fileType: string, pollCount: number = 0): void {
    const maxPolls = 120; // Maximum 10 minutes (120 * 5 seconds)
    
    if (pollCount >= maxPolls) {
      observer.error(new Error('Download timeout - task is taking too long'));
      return;
    }

    this.getTaskStatus(taskId).subscribe({
      next: (task) => {
        if (task.status === 'COMPLETED') {
          // Download the result file
          this.downloadTaskResult(taskId).subscribe({
            next: (blob) => {
              const filename = `${fileType}_data.tsv`;
              observer.next({ progress: 100, blob, filename });
              observer.complete();
            },
            error: (error) => {
              observer.error(error);
            }
          });
        } else if (task.status === 'FAILED') {
          observer.error(new Error(task.errorMessage || 'Download failed'));
        } else if (task.status === 'CANCELLED') {
          observer.error(new Error('Download was cancelled'));
        } else if (task.status === 'PENDING' || task.status === 'RUNNING') {
          // Update progress and continue polling
          const progress = task.progressPercentage || 0;
          observer.next({ progress });
          
          // Continue polling after 5 seconds
          setTimeout(() => {
            this.pollTaskStatus(taskId, observer, fileType, pollCount + 1);
          }, 5000);
        } else {
          observer.error(new Error('Unknown task status: ' + task.status));
        }
      },
      error: (error) => {
        // Retry polling on error
        setTimeout(() => {
          this.pollTaskStatus(taskId, observer, fileType, pollCount + 1);
        }, 5000);
      }
    });
  }

  /**
   * Download error file by file path
   */
  downloadErrorFile(filePath: string): Observable<Blob> {
    return this.http.get(`http://localhost:9000/toy-iris/api/download/error-file?filePath=${encodeURIComponent(filePath)}`, {
      responseType: 'blob'
    }).pipe(catchError(this.handleError));
  }

  /**
   * Download validation report for a task
   */
  downloadValidationReport(taskId: number): Observable<Blob> {
    return this.http.get(`http://localhost:9000/toy-iris/api/upload/errors/${taskId}/validation-report`, {
      responseType: 'blob'
    }).pipe(catchError(this.handleError));
  }

  /**
   * Download error report for a task
   */
  downloadErrorReport(taskId: number): Observable<Blob> {
    return this.http.get(`http://localhost:9000/toy-iris/api/upload/errors/${taskId}/download`, {
      responseType: 'blob'
    }).pipe(catchError(this.handleError));
  }

  /**
   * Download skipped records for a task
   */
  downloadSkippedRecords(taskId: number): Observable<Blob> {
    return this.http.get(`http://localhost:9000/toy-iris/api/upload/errors/${taskId}/skipped`, {
      responseType: 'blob'
    }).pipe(catchError(this.handleError));
  }

  /**
   * Get error report data for a task
   */
  getErrorReport(taskId: number, page: number = 0, size: number = 50): Observable<ErrorReport> {
    return this.http.get<ErrorReport>(`http://localhost:9000/toy-iris/api/upload/errors/${taskId}?page=${page}&size=${size}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Cancel a running task
   */
  cancelTask(taskId: number): Observable<any> {
    return this.http.post(`http://localhost:9000/toy-iris/api/tasks/${taskId}/cancel`, {})
      .pipe(catchError(this.handleError));
  }

  /**
   * Clear all data
   */
  clearAllData(): Observable<any> {
    return this.http.delete(`http://localhost:9000/toy-iris/api/data/clear-all`, {})
      .pipe(catchError(this.handleError));
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`http://localhost:9000/toy-iris/api/tasks`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Trigger file download in browser
   */
  triggerDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Open file download in new tab
   */
  openDownload(url: string): void {
    window.open(url, '_blank');
  }

  /**
   * Check if file type is valid for upload
   */
  isValidFileType(file: File): boolean {
    const validTypes = ['.tsv', '.txt'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    return validTypes.includes(fileExtension);
  }

  /**
   * Check if file size is within limits
   */
  isValidFileSize(file: File, maxSizeMB: number = 50): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file type display name
   */
  getFileTypeDisplayName(fileType: string): string {
    const displayNames: { [key: string]: string } = {
      'styles': 'Styles Data',
      'stores': 'Stores Data',
      'skus': 'SKUs Data',
      'sales': 'Sales Data'
    };
    return displayNames[fileType] || fileType;
  }

  /**
   * Get file type description
   */
  getFileTypeDescription(fileType: string): string {
    const descriptions: { [key: string]: string } = {
      'styles': 'Upload style master data - brand, category, MRP, gender info',
      'stores': 'Upload store master data - branch and city information',
      'skus': 'Upload SKU master data - style-size combinations',
      'sales': 'Upload sales transaction data - depends on styles, stores, and SKUs'
    };
    return descriptions[fileType] || '';
  }

  /**
   * Check upload dependencies
   */
  checkUploadDependencies(fileType: string, statusData: UploadStatus): { enabled: boolean; message: string } {
    switch (fileType) {
      case 'styles':
      case 'stores':
        return { enabled: true, message: '' };
      
      case 'skus':
        if (!statusData['styles']?.exists) {
          return {
            enabled: false,
            message: 'Upload styles first (styles → skus → sales)'
          };
        }
        return { enabled: true, message: '' };
      
      case 'sales':
        const missingDeps = [];
        if (!statusData['styles']?.exists) missingDeps.push('styles');
        if (!statusData['skus']?.exists) missingDeps.push('skus');
        if (!statusData['stores']?.exists) missingDeps.push('stores');
        
        if (missingDeps.length > 0) {
          return {
            enabled: false,
            message: `Upload ${missingDeps.join(', ')} first`
          };
        }
        return { enabled: true, message: '' };
      
      default:
        return { enabled: true, message: '' };
    }
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      
      // Handle different response types
      if (error.error) {
        if (typeof error.error === 'string') {
          // Check if it's HTML (backend down or endpoint not found)
          if (error.error.includes('<!doctype') || error.error.includes('<html')) {
            errorMessage = 'Backend server is not running or endpoint not found. Please check if the Spring backend is running on port 9000.';
          } else {
            // Plain text error response
            errorMessage = error.error;
          }
        } else if (error.error.message) {
          // JSON error response with message
          errorMessage = error.error.message;
        } else if (error.error.error) {
          // Nested error object
          errorMessage = error.error.error;
        }
      }
    }
    
    console.error('Upload service error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
