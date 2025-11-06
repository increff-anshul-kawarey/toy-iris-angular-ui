import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../shared/services/notification.service';
import { NotificationPanelComponent } from '../../shared/components/notification-panel/notification-panel.component';
import { ThemeService, ThemeMode } from '../../shared/services/theme.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    NotificationPanelComponent
  ]
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Output() toggleSidenav = new EventEmitter<void>();
  @Input() sidebarCollapsed = false;
  
  notificationCount = 0;
  showNotifications = false;
  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService,
    public themeService: ThemeService
  ) {}

  ngOnInit(): void {
    // Subscribe to notifications to update count
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        // Count only unread notifications
        this.notificationCount = notifications.filter(n => !n.isRead).length;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onToggleSidenav(): void {
    this.toggleSidenav.emit();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const notificationSection = target.closest('.notifications-section');
    
    if (!notificationSection) {
      this.showNotifications = false;
    }
  }

}
