import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, Subject } from 'rxjs';
import { map, shareReplay, takeUntil } from 'rxjs/operators';

import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { SidebarStateService } from '../../shared/services/sidebar-state.service';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    SidebarComponent
  ]
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  isHandset$: Observable<boolean>;
  sidebarCollapsed = false;
  sidebarOpen = false;
  private destroy$ = new Subject<void>();

  constructor(
    private breakpointObserver: BreakpointObserver,
    private sidebarStateService: SidebarStateService
  ) {
    this.isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset)
      .pipe(
        map(result => result.matches),
        shareReplay()
      );
  }

  ngOnInit(): void {
    // Load persisted sidebar state
    this.sidebarCollapsed = this.sidebarStateService.isCollapsed;
    
    // Initialize sidebar state based on screen size
    this.isHandset$.pipe(takeUntil(this.destroy$)).subscribe(isHandset => {
      if (isHandset) {
        // Mobile: start with sidebar closed
        this.sidebarOpen = false;
        this.sidebarCollapsed = false;
      } else {
        // Desktop: use persisted state
        this.sidebarOpen = false;
        // sidebarCollapsed is already set from persisted state
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar(): void {
    // Get current breakpoint state synchronously
    const isHandset = window.innerWidth <= 1024; // $breakpoint-lg
    
    if (isHandset) {
      // Mobile: toggle overlay
      this.sidebarOpen = !this.sidebarOpen;
      this.sidebarCollapsed = false; // Ensure not collapsed on mobile
    } else {
      // Desktop: toggle collapsed state and persist it
      this.sidebarCollapsed = !this.sidebarCollapsed;
      this.sidebarStateService.setCollapsed(this.sidebarCollapsed);
      this.sidebarOpen = true; // Ensure sidebar is open on desktop
    }
  }

  closeSidebar(): void {
    const isHandset = window.innerWidth <= 1024;
    
    if (isHandset) {
      // Mobile: close the overlay
      this.sidebarOpen = false;
      this.sidebarCollapsed = false; // Ensure not collapsed on mobile
    } else {
      // Desktop: Don't close the sidebar when clicking nav items
      // Keep sidebar state as is
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    const isHandset = event.target.innerWidth <= 1024;
    
    if (isHandset) {
      // On mobile, ensure sidebar is closed and not collapsed
      this.sidebarOpen = false;
      this.sidebarCollapsed = false;
    } else {
      // On desktop, ensure sidebar is open
      this.sidebarOpen = false;
      // Keep collapsed state as is (user preference)
    }
  }
}