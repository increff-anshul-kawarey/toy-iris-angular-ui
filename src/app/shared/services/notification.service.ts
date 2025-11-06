import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, catchError } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  duration?: number; // in milliseconds, 0 means persistent
  isRead?: boolean;
  category?: string;
  taskId?: number;
  fileType?: string;
  fileName?: string;
}

// Backend notification interface
export interface BackendNotification {
  id: number;
  userId: string;
  title: string;
  message: string;
  type: string;
  category: string;
  taskId?: number;
  fileType?: string;
  fileName?: string;
  isRead: boolean;
  isGlobal: boolean;
  createdDate: string;
  lastUpdatedDate?: string;
  actionUrl?: string;
  actionText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly baseUrl = 'http://localhost:9000/toy-iris/api';
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private notificationId = 0;

  constructor(private http: HttpClient) {
    this.loadNotifications();
  }

  /**
   * Show a success notification
   */
  success(title: string, message: string, duration = 5000): void {
    this.addNotification({
      id: this.generateId(),
      type: 'success',
      title,
      message,
      timestamp: new Date(),
      duration
    });
  }

  /**
   * Show an error notification
   */
  error(title: string, message: string, duration = 0): void {
    this.addNotification({
      id: this.generateId(),
      type: 'error',
      title,
      message,
      timestamp: new Date(),
      duration
    });
  }

  /**
   * Show a warning notification
   */
  warning(title: string, message: string, duration = 5000): void {
    this.addNotification({
      id: this.generateId(),
      type: 'warning',
      title,
      message,
      timestamp: new Date(),
      duration
    });
  }

  /**
   * Show an info notification
   */
  info(title: string, message: string, duration = 5000): void {
    this.addNotification({
      id: this.generateId(),
      type: 'info',
      title,
      message,
      timestamp: new Date(),
      duration
    });
  }

  /**
   * Add a notification to the list
   */
  private addNotification(notification: Notification): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = [...currentNotifications, notification];
    this.notificationsSubject.next(updatedNotifications);

    // Auto-remove notification after duration if specified
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, notification.duration);
    }
  }

  /**
   * Remove a notification by ID
   */
  removeNotification(id: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.filter(n => n.id !== id);
    this.notificationsSubject.next(updatedNotifications);
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notificationsSubject.next([]);
  }

  /**
   * Get current notifications
   */
  getNotifications(): Notification[] {
    return this.notificationsSubject.value;
  }

  /**
   * Load notifications from backend
   */
  loadNotifications(): void {
    console.log('Loading notifications from backend...');
    this.http.get<{notifications: BackendNotification[], totalCount: number, unreadCount: number, page: number, size: number, totalPages: number}>(`${this.baseUrl}/notifications?page=0&size=15&userId=system`)
      .pipe(
        catchError(error => {
          console.error('Error loading notifications from backend:', error);
          // Return empty array if backend is not available
          return of({notifications: [], totalCount: 0, unreadCount: 0, page: 0, size: 15, totalPages: 0});
        })
      )
      .subscribe(response => {
        console.log('Notifications response:', response);
        if (response && response.notifications) {
          const notifications = response.notifications.map(backend => this.mapBackendToFrontend(backend));
          console.log('Mapped notifications:', notifications);
          this.notificationsSubject.next(notifications);
        } else {
          console.log('No notifications found, setting empty array');
          this.notificationsSubject.next([]);
        }
      });
  }

  /**
   * Refresh notifications from backend
   */
  refreshNotifications(): void {
    console.log('Refreshing notifications...');
    this.loadNotifications();
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    // Extract numeric ID from string ID
    const numericId = parseInt(notificationId.replace('backend-', ''));
    
    this.http.put(`${this.baseUrl}/notifications/${numericId}/read`, {})
      .pipe(
        catchError(error => {
          console.error('Error marking notification as read:', error);
          return of(null);
        })
      )
      .subscribe(() => {
        // Update local state
        const currentNotifications = this.notificationsSubject.value;
        const updatedNotifications = currentNotifications.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        );
        this.notificationsSubject.next(updatedNotifications);
      });
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.http.put<{message: string, success: boolean}>(`${this.baseUrl}/notifications/read-all`, {})
      .pipe(
        catchError(error => {
          console.error('Error marking all notifications as read:', error);
          return of(null);
        })
      )
      .subscribe((response) => {
        if (response && response.success) {
          // Update local state
          const currentNotifications = this.notificationsSubject.value;
          const updatedNotifications = currentNotifications.map(n => ({ ...n, isRead: true }));
          this.notificationsSubject.next(updatedNotifications);
        }
      });
  }

  /**
   * Map backend notification to frontend format
   */
  private mapBackendToFrontend(backend: BackendNotification): Notification {
    return {
      id: `backend-${backend.id}`,
      type: this.mapBackendTypeToFrontend(backend.type),
      title: backend.title,
      message: backend.message,
      timestamp: new Date(backend.createdDate),
      duration: 0, // Backend notifications are persistent
      isRead: backend.isRead,
      category: backend.category,
      taskId: backend.taskId,
      fileType: backend.fileType,
      fileName: backend.fileName
    };
  }

  /**
   * Map backend type to frontend type
   */
  private mapBackendTypeToFrontend(backendType: string): 'success' | 'error' | 'warning' | 'info' {
    switch (backendType.toUpperCase()) {
      case 'SUCCESS': return 'success';
      case 'ERROR': return 'error';
      case 'WARNING': return 'warning';
      case 'INFO': return 'info';
      default: return 'info';
    }
  }


  /**
   * Generate unique notification ID
   */
  private generateId(): string {
    return `notification-${++this.notificationId}-${Date.now()}`;
  }
}
