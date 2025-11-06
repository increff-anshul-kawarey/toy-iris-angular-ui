import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

export interface Task {
  id: number;
  taskType: string;
  status: string;
  startTime: Date;
  endTime?: Date;
  progress: number;
  message: string;
  errorMessage?: string;
  userId: string;
  parameters?: string;
}

export interface TaskStats {
  total: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly baseUrl = 'http://localhost:9000/toy-iris/api';

  constructor(private http: HttpClient) {}

  /**
   * Get all tasks
   */
  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/tasks`).pipe(
      catchError(error => {
        console.error('Error fetching tasks:', error);
        return of([]);
      })
    );
  }

  /**
   * Get task by ID
   */
  getTask(taskId: number): Observable<Task> {
    return this.http.get<Task>(`${this.baseUrl}/tasks/${taskId}`).pipe(
      catchError(error => {
        console.error(`Error fetching task ${taskId}:`, error);
        return of({} as Task);
      })
    );
  }

  /**
   * Get task statistics
   */
  getTaskStats(): Observable<TaskStats> {
    return this.http.get<TaskStats>(`${this.baseUrl}/tasks/stats`).pipe(
      catchError(error => {
        console.error('Error fetching task stats:', error);
        return of({
          total: 0,
          running: 0,
          completed: 0,
          failed: 0,
          cancelled: 0
        });
      })
    );
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/tasks/status/${status}`).pipe(
      catchError(error => {
        console.error(`Error fetching tasks with status ${status}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/tasks/${taskId}/cancel`, {}).pipe(
      catchError(error => {
        console.error(`Error cancelling task ${taskId}:`, error);
        return of({});
      })
    );
  }
}
