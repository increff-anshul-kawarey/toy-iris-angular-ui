import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { UploadService, UploadStatus } from '../../shared/services/upload.service';

interface UploadFile {
  id: string;
  displayName: string;
  description: string;
  status: 'pending' | 'processing' | 'success' | 'error' | 'blocked';
  count?: number;
  progress?: number;
  progressMessage?: string;
  errorMessage?: string;
  dependencyMessage?: string;
  taskId?: number;
  canUpload: boolean;
  hasValidationReport?: boolean;
}


@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class UploadComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  uploadFiles: UploadFile[] = [
    {
      id: 'styles',
      displayName: 'Styles Data',
      description: 'Upload style master data - brand, category, MRP, gender info',
      status: 'pending',
      canUpload: true
    },
    {
      id: 'stores',
      displayName: 'Stores Data',
      description: 'Upload store master data - branch and city information',
      status: 'pending',
      canUpload: true
    },
    {
      id: 'skus',
      displayName: 'SKUs Data',
      description: 'Upload SKU master data - style-size combinations',
      status: 'pending',
      canUpload: true
    },
    {
      id: 'sales',
      displayName: 'Sales Data',
      description: 'Upload sales transaction data - depends on styles, stores, and SKUs',
      status: 'pending',
      canUpload: true
    }
  ];

  selectedFile: File | null = null;
  selectedFileType: string = '';
  showUploadModal = false;
  isLoading = false;
  lastRefreshTime = new Date();

  constructor(private uploadService: UploadService) {}

  ngOnInit(): void {
    this.fetchDataStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Fetch current data status from backend
   */
  fetchDataStatus(): void {
    this.isLoading = true;
    this.uploadService.getUploadStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.updateUploadFilesStatus(data);
          this.lastRefreshTime = new Date();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error fetching data status:', error);
          this.isLoading = false;
          // Use fallback data on error
          const fallbackData: UploadStatus = {
            styles: { exists: false, count: 0 },
            stores: { exists: false, count: 0 },
            skus: { exists: false, count: 0 },
            sales: { exists: false, count: 0 }
          };
          this.updateUploadFilesStatus(fallbackData);
        }
      });
  }

  /**
   * Update upload files status based on backend response
   */
  private updateUploadFilesStatus(statusData: UploadStatus): void {
    this.uploadFiles.forEach(file => {
      const status = statusData[file.id];
      if (status) {
        if (status.processing) {
          file.status = 'processing';
          file.progress = status.progressPercentage || 0;
          file.progressMessage = status.progressMessage || 'Processing your file...';
          file.taskId = status.taskId;
        } else if (status.failed) {
          file.status = 'error';
          file.errorMessage = status.errorSummary 
            ? `Upload failed: ${status.errorSummary.totalErrors} errors`
            : 'Upload failed due to error';
          file.taskId = status.taskId;
          // Set hasValidationReport if there are validation errors
          file.hasValidationReport = status.errorSummary && status.errorSummary.totalErrors > 0;
        } else if (status.exists) {
          file.status = 'success';
          file.count = status.count;
        } else {
          // Only set to pending if not already in error state
          if (file.status !== 'error') {
            file.status = 'pending';
          }
        }
      } else {
        // Only set to pending if not already in error state
        if (file.status !== 'error') {
          file.status = 'pending';
        }
      }

      // Check dependencies
      const dependencyCheck = this.checkUploadDependencies(file.id, statusData);
      file.canUpload = dependencyCheck.enabled;
      if (!dependencyCheck.enabled) {
        file.status = 'blocked';
        file.dependencyMessage = dependencyCheck.message;
      }
    });
  }

  /**
   * Check upload dependencies for a file type
   */
  private checkUploadDependencies(fileType: string, statusData: UploadStatus): { enabled: boolean; message: string } {
    return this.uploadService.checkUploadDependencies(fileType, statusData);
  }

  /**
   * Open upload modal for a specific file type
   */
  openUploadModal(fileType: string): void {
    const file = this.uploadFiles.find(f => f.id === fileType);
    if (file && file.canUpload && file.status !== 'processing') {
      this.selectedFileType = fileType;
      this.selectedFile = null;
      this.showUploadModal = true;
    }
  }

  /**
   * Close upload modal
   */
  closeUploadModal(): void {
    this.showUploadModal = false;
    this.selectedFile = null;
    this.selectedFileType = '';
  }

  /**
   * Handle file selection
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
    }
  }

  /**
   * Upload selected file
   */
  uploadFile(): void {
    if (!this.selectedFile || !this.selectedFileType) {
      console.error('No file or file type selected');
      return;
    }

    // Validate file before upload
    if (!this.uploadService.isValidFileType(this.selectedFile)) {
      console.error('Invalid file type. Please select a .tsv or .txt file.');
      return;
    }

    if (!this.uploadService.isValidFileSize(this.selectedFile)) {
      console.error('File size too large. Maximum size is 50MB.');
      return;
    }

    // Store file reference before closing modal
    const fileToUpload = this.selectedFile;
    const fileTypeToUpload = this.selectedFileType;

    // Close modal immediately and start upload
    this.closeUploadModal();

    // Start the upload process
    this.uploadService.uploadFileAsync(fileTypeToUpload, fileToUpload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          // Update the specific file's status in the uploadFiles array
          const file = this.uploadFiles.find(f => f.id === fileTypeToUpload);
          if (file) {
            if (result.task) {
              file.status = 'processing';
              file.progress = result.progress;
              file.progressMessage = result.task.progressMessage || `Processing... ${result.progress}%`;
              file.taskId = result.task.id;
            }
            
            if (result.completed) {
              file.status = 'success';
              file.progress = 100;
              file.progressMessage = 'Upload completed successfully!';
              // Refresh status to get updated counts
              this.fetchDataStatus();
            }
          }
        },
        error: (error) => {
          console.error('Upload error:', error);
          // Update the specific file's status to error
          const file = this.uploadFiles.find(f => f.id === fileTypeToUpload);
          if (file) {
            file.status = 'error';
            file.errorMessage = `Upload failed: ${error.message}`;
            file.progress = 0;
            file.progressMessage = '';
            
            // Check if we have task information attached to the error
            const task = (error as any).task;
            if (task) {
              file.taskId = task.id;
              // Set hasValidationReport if there are validation errors or if the error message indicates validation issues
              if (error.message && (error.message.includes('validation') || error.message.includes('error') || error.message.includes('missing'))) {
                file.hasValidationReport = true;
              }
            } else {
              // Fallback: check if this is a validation error that would have a validation report
              if (error.message && (error.message.includes('validation') || error.message.includes('error') || error.message.includes('missing'))) {
                file.hasValidationReport = true;
              }
            }
          }
          // Don't refresh status immediately after error as it will override the error state
          // The backend status endpoint doesn't include failed upload information
          // this.fetchDataStatus();
        }
      });
  }

  /**
   * Download data file
   */
  downloadDataFile(fileType: string): void {
    const file = this.uploadFiles.find(f => f.id === fileType);
    if (file && file.status === 'success') {
      this.uploadService.downloadDataFileAsync(fileType)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            if (result.blob && result.filename) {
              this.uploadService.triggerDownload(result.blob, result.filename);
            }
            // Progress updates can be handled here if needed
          },
          error: (error) => {
            console.error('Download error:', error);
            // Could show notification here
          }
        });
    }
  }

  /**
   * Download validation report for failed uploads
   */
  downloadValidationReport(fileType: string): void {
    const file = this.uploadFiles.find(f => f.id === fileType);
    if (file && file.status === 'error') {
      if (file.taskId) {
        this.uploadService.downloadValidationReport(file.taskId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (blob) => {
              const filename = `validation_report_${fileType}_task_${file.taskId}.tsv`;
              this.uploadService.triggerDownload(blob, filename);
            },
            error: (error) => {
              console.error('Download validation report error:', error);
              // Could show notification here
            }
          });
      } else {
        // For failed uploads without taskId, we need to find the most recent failed task
        // This is a fallback - in a real implementation, we'd need to track task IDs better
        console.warn('No task ID available for validation report download');
        // Could show a notification to the user
      }
    }
  }

  /**
   * Cancel ongoing upload/task
   */
  cancelTask(fileType: string): void {
    const file = this.uploadFiles.find(f => f.id === fileType);
    if (file && file.status === 'processing' && file.taskId) {
      this.uploadService.cancelTask(file.taskId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.fetchDataStatus(); // Refresh status after cancellation
          },
          error: (error) => {
            console.error('Error cancelling task:', error);
          }
        });
    }
  }


  /**
   * Clear all data (with confirmation)
   */
  clearAllData(): void {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      this.uploadService.clearAllData()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.fetchDataStatus(); // Refresh status after clearing
          },
          error: (error) => {
            console.error('Error clearing data:', error);
          }
        });
    }
  }

  /**
   * Get icon name for material icon
   */
  getIconName(materialIcon: string): string {
    // Return Material Icon names directly - they will be styled by global CSS
    return materialIcon;
  }

  /**
   * Get status icon for upload file
   */
  getStatusIcon(file: UploadFile): string {
    switch (file.status) {
      case 'processing':
        return 'schedule';
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'blocked':
        return 'lock';
      default:
        return 'cloud_upload';
    }
  }

  /**
   * Get status color class
   */
  getStatusClass(file: UploadFile): string {
    return `status-${file.status}`;
  }

  /**
   * Get card class for upload file
   */
  getCardClass(file: UploadFile): string {
    return `upload-card card-${file.status}`;
  }

  /**
   * Get status text for display
   */
  getStatusText(file: UploadFile): string {
    switch (file.status) {
      case 'processing':
        return 'Processing in progress';
      case 'success':
        return 'Processing completed';
      case 'error':
        return 'Processing failed';
      case 'blocked':
        return 'Dependencies required';
      default:
        return 'Ready for upload';
    }
  }

  /**
   * Get selected file display name
   */
  getSelectedFileDisplayName(): string {
    const file = this.uploadFiles.find(f => f.id === this.selectedFileType);
    return file ? file.displayName : '';
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    return this.uploadService.formatFileSize(bytes);
  }
}
