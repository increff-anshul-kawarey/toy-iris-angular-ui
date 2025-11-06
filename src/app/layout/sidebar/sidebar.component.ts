import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  children?: NavigationItem[];
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ]
})
export class SidebarComponent {
  @Input() isCollapsed = false;
  @Output() sidebarClose = new EventEmitter<void>();
  @Output() sidebarToggle = new EventEmitter<void>();
  
  navigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      icon: 'home',
      route: '/dashboard'
    },
    {
      label: 'Upload Data',
      icon: 'cloud_upload',
      route: '/upload'
    },
    {
      label: 'Algorithm Parameters',
      icon: 'tune',
      route: '/algorithm-parameters'
    },
    {
      label: 'NOOS Analytics',
      icon: 'trending_up',
      route: '/reports/noos-analytics'
    }
  ];

  expandedItems: Set<string> = new Set();

  toggleExpansion(item: NavigationItem): void {
    if (item.children) {
      if (this.expandedItems.has(item.label)) {
        this.expandedItems.delete(item.label);
      } else {
        this.expandedItems.add(item.label);
      }
    }
  }

  isExpanded(item: NavigationItem): boolean {
    return this.expandedItems.has(item.label);
  }

  onNavClick(): void {
    this.sidebarClose.emit();
  }

  onCloseClick(): void {
    this.sidebarClose.emit();
  }

  onToggleClick(): void {
    this.sidebarToggle.emit();
  }

  getIconName(materialIcon: string): string {
    // Return Material Icon names directly - they will be styled by global CSS
    return materialIcon;
  }
}
