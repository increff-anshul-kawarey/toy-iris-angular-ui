import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

export interface AlgoParametersData {
  liquidationThreshold: number;
  bestsellerMultiplier: number;
  minVolumeThreshold: number;
  consistencyThreshold: number;
  algorithmLabel: string;
  analysisStartDate?: string;
  analysisEndDate?: string;
}

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

@Injectable({
  providedIn: 'root'
})
export class AlgorithmService {
  private readonly baseUrl = 'http://localhost:9000/toy-iris/api';

  constructor(private http: HttpClient) {}

  /**
   * Get current algorithm parameters
   */
  getCurrentParameters(): Observable<AlgoParametersData> {
    return this.http.get<AlgoParametersData>(`${this.baseUrl}/algo/current`).pipe(
      catchError(error => {
        console.error('Error fetching current parameters:', error);
        return of(this.getDefaultParametersFallback());
      })
    );
  }

  /**
   * Get default algorithm parameters
   */
  getDefaultParameters(): Observable<AlgoParametersData> {
    return this.http.get<AlgoParametersData>(`${this.baseUrl}/algo/set/default`).pipe(
      catchError(error => {
        console.error('Error fetching default parameters:', error);
        return of(this.getDefaultParametersFallback());
      })
    );
  }

  /**
   * Update current algorithm parameters
   */
  updateCurrentParameters(parameters: AlgoParametersData): Observable<AlgoParametersData> {
    return this.http.post<AlgoParametersData>(`${this.baseUrl}/algo/update`, parameters).pipe(
      catchError(error => {
        console.error('Error updating parameters:', error);
        return of(parameters);
      })
    );
  }

  /**
   * Run NOOS algorithm asynchronously
   */
  runNoosAlgorithmAsync(parameters: AlgoParametersData): Observable<Task> {
    return this.http.post<Task>(`${this.baseUrl}/run/noos/async`, parameters).pipe(
      catchError(error => {
        console.error('Error running NOOS algorithm:', error);
        return of({} as Task);
      })
    );
  }

  /**
   * Run NOOS algorithm synchronously (legacy)
   */
  runNoosAlgorithm(parameters: AlgoParametersData): Observable<Task> {
    return this.http.post<Task>(`${this.baseUrl}/run/noos`, parameters).pipe(
      catchError(error => {
        console.error('Error running NOOS algorithm:', error);
        return of({} as Task);
      })
    );
  }

  /**
   * Get all active parameter sets
   */
  getActiveParameterSets(): Observable<AlgoParametersData[]> {
    return this.http.get<AlgoParametersData[]>(`${this.baseUrl}/algo/sets`).pipe(
      catchError(error => {
        console.error('Error fetching active parameter sets:', error);
        return of([]);
      })
    );
  }

  /**
   * Get recent parameter sets
   */
  getRecentParameterSets(limit: number = 10): Observable<AlgoParametersData[]> {
    return this.http.get<AlgoParametersData[]>(`${this.baseUrl}/algo/sets/recent?limit=${limit}`).pipe(
      catchError(error => {
        console.error('Error fetching recent parameter sets:', error);
        return of([]);
      })
    );
  }

  /**
   * Create new parameter set
   */
  createParameterSet(parameters: AlgoParametersData, name?: string): Observable<AlgoParametersData> {
    const params = name ? { name } : undefined;
    return this.http.post<AlgoParametersData>(`${this.baseUrl}/algo/create`, parameters, { params }).pipe(
      catchError(error => {
        console.error('Error creating parameter set:', error);
        return of(parameters);
      })
    );
  }

  /**
   * Get default parameters fallback
   */
  private getDefaultParametersFallback(): AlgoParametersData {
    return {
      liquidationThreshold: 0.5,
      bestsellerMultiplier: 2.0,
      minVolumeThreshold: 10,
      consistencyThreshold: 0.7,
      algorithmLabel: 'Default',
      analysisStartDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      analysisEndDate: new Date().toISOString().split('T')[0]
    };
  }
}
