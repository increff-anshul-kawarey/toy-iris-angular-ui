import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { NotificationService, Notification } from '../../services/notification.service';

@Component({
  selector: 'app-notification-panel',
  templateUrl: './notification-panel.component.html',
  styleUrls: ['./notification-panel.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class NotificationPanelComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscription?: Subscription;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.subscription = this.notificationService.notifications$.subscribe(
      notifications => {
        this.notifications = notifications;
      }
    );
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  removeNotification(id: string): void {
    // For backend notifications, mark as read instead of removing
    if (id.startsWith('backend-')) {
      this.notificationService.markAsRead(id);
    } else {
      this.notificationService.removeNotification(id);
    }
  }

  clearAll(): void {
    this.notificationService.markAllAsRead();
  }

  refreshNotifications(): void {
    console.log('Refresh button clicked in notification panel');
    this.notificationService.refreshNotifications();
  }

  getNotificationIcon(type: string): string {
    // Return Material Icon names for notification types
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'notifications';
    }
  }
}
