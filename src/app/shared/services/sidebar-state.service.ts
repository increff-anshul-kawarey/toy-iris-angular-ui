import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Service to manage sidebar state across the application
 */
@Injectable({
  providedIn: 'root'
})
export class SidebarStateService {
  private readonly STORAGE_KEY = 'sidebarCollapsed';
  private collapsedSubject: BehaviorSubject<boolean>;

  constructor() {
    // Load initial state from localStorage, defaulting to false (expanded)
    const savedState = localStorage.getItem(this.STORAGE_KEY);
    const initialState = savedState !== null ? savedState === 'true' : false;
    this.collapsedSubject = new BehaviorSubject<boolean>(initialState);
  }

  /**
   * Get the current collapsed state as an observable
   */
  get isCollapsed$(): Observable<boolean> {
    return this.collapsedSubject.asObservable();
  }

  /**
   * Get the current collapsed state value
   */
  get isCollapsed(): boolean {
    return this.collapsedSubject.value;
  }

  /**
   * Set the collapsed state
   */
  setCollapsed(collapsed: boolean): void {
    this.collapsedSubject.next(collapsed);
    localStorage.setItem(this.STORAGE_KEY, String(collapsed));
  }

  /**
   * Toggle the collapsed state
   */
  toggle(): void {
    this.setCollapsed(!this.isCollapsed);
  }
}

