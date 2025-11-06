import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

/**
 * Frontend model for algorithm parameters
 */
export interface AlgorithmParameters {
  parameterSetName: string;
  isActive: boolean;
  lastUpdated: Date;
  liquidationThreshold: number;
  bestsellerMultiplier: number;
  minVolumeThreshold: number;
  consistencyThreshold: number;
  analysisStartDate: Date;
  analysisEndDate: Date;
  coreDurationMonths: number;
  bestsellerDurationDays: number;
}

/**
 * Backend DTO that matches AlgoParametersData.java
 */
export interface AlgoParametersData {
  // Parameter Set Information
  parameterSetName: string;
  isActive: boolean;
  lastUpdated: string;
  
  // NOOS Algorithm Parameters
  liquidationThreshold: number;
  bestsellerMultiplier: number;
  minVolumeThreshold: number;
  consistencyThreshold: number;
  
  // Date Analysis Parameters
  analysisStartDate: string;
  analysisEndDate: string;
  coreDurationMonths: number;
  bestsellerDurationDays: number;
}

@Injectable({
  providedIn: 'root'
})
export class AlgorithmParametersService {
  private readonly baseUrl = 'http://localhost:9000/toy-iris/api';

  constructor(private http: HttpClient) {}

  /**
   * Get all active algorithm parameter sets
   */
  getParameterSets(): Observable<AlgoParametersData[]> {
    return this.http.get<AlgoParametersData[]>(`${this.baseUrl}/algo/sets`).pipe(
      catchError(error => {
        console.error('Error fetching parameter sets:', error);
        return of([]);
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
        return of(this.getFallbackParameters());
      })
    );
  }

  /**
   * Get parameter set by name
   */
  getParameterSet(parameterSet: string): Observable<AlgoParametersData> {
    return this.http.get<AlgoParametersData>(`${this.baseUrl}/algo/set/${parameterSet}`).pipe(
      catchError(error => {
        console.error(`Error fetching parameter set ${parameterSet}:`, error);
        return of(this.getFallbackParameters());
      })
    );
  }

  /**
   * Create a new parameter set
   */
  saveParameterSet(parameters: AlgorithmParameters): Observable<AlgoParametersData> {
    const backendData = this.convertToBackendModel(parameters);
    return this.http.post<AlgoParametersData>(`${this.baseUrl}/algo/create`, backendData).pipe(
      catchError(error => {
        console.error('Error saving parameter set:', error);
        throw error;
      })
    );
  }

  /**
   * Update existing parameter set
   */
  updateParameterSet(parameterSet: string, parameters: AlgorithmParameters): Observable<AlgoParametersData> {
    const backendData = this.convertToBackendModel(parameters);
    return this.http.put<AlgoParametersData>(`${this.baseUrl}/algo/set/${parameterSet}`, backendData).pipe(
      catchError(error => {
        console.error(`Error updating parameter set ${parameterSet}:`, error);
        throw error;
      })
    );
  }

  /**
   * Get current active parameters
   */
  getCurrentParameters(): Observable<AlgoParametersData> {
    return this.http.get<AlgoParametersData>(`${this.baseUrl}/algo/current`).pipe(
      catchError(error => {
        console.error('Error fetching current parameters:', error);
        return of(this.getFallbackParameters());
      })
    );
  }

  /**
   * Get recent parameter sets (active and inactive)
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
   * Activate a parameter set
   */
  activateParameterSet(parameterSet: string): Observable<AlgoParametersData> {
    return this.http.post<AlgoParametersData>(`${this.baseUrl}/algo/set/${parameterSet}/activate`, {}).pipe(
      catchError(error => {
        console.error(`Error activating parameter set ${parameterSet}:`, error);
        throw error;
      })
    );
  }

  /**
   * Convert backend AlgoParametersData to frontend model
   */
  convertToFrontendModel(backendData: AlgoParametersData): AlgorithmParameters {
    return {
      parameterSetName: backendData.parameterSetName,
      isActive: backendData.isActive,
      lastUpdated: new Date(backendData.lastUpdated),
      liquidationThreshold: backendData.liquidationThreshold,
      bestsellerMultiplier: backendData.bestsellerMultiplier,
      minVolumeThreshold: backendData.minVolumeThreshold,
      consistencyThreshold: backendData.consistencyThreshold,
      analysisStartDate: new Date(backendData.analysisStartDate),
      analysisEndDate: new Date(backendData.analysisEndDate),
      coreDurationMonths: backendData.coreDurationMonths,
      bestsellerDurationDays: backendData.bestsellerDurationDays
    };
  }

  /**
   * Convert frontend model to backend AlgoParametersData format
   */
  convertToBackendModel(frontendParams: AlgorithmParameters): AlgoParametersData {
    return {
      parameterSetName: frontendParams.parameterSetName,
      isActive: frontendParams.isActive !== undefined ? frontendParams.isActive : true,
      lastUpdated: new Date().toISOString(),
      liquidationThreshold: frontendParams.liquidationThreshold,
      bestsellerMultiplier: frontendParams.bestsellerMultiplier,
      minVolumeThreshold: frontendParams.minVolumeThreshold,
      consistencyThreshold: frontendParams.consistencyThreshold,
      analysisStartDate: this.formatDate(frontendParams.analysisStartDate),
      analysisEndDate: this.formatDate(frontendParams.analysisEndDate),
      coreDurationMonths: frontendParams.coreDurationMonths,
      bestsellerDurationDays: frontendParams.bestsellerDurationDays
    };
  }

  /**
   * Format date to yyyy-MM-dd string
   */
  private formatDate(date: Date | string): string {
    if (typeof date === 'string') {
      return date.split('T')[0];
    }
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  /**
   * Get fallback parameters when backend is unavailable
   */
  private getFallbackParameters(): AlgoParametersData {
    return {
      parameterSetName: 'default',
      isActive: true,
      lastUpdated: new Date().toISOString(),
      liquidationThreshold: 0.25,
      bestsellerMultiplier: 1.20,
      minVolumeThreshold: 25.0,
      consistencyThreshold: 0.75,
      analysisStartDate: '2019-01-01',
      analysisEndDate: '2019-06-23',
      coreDurationMonths: 6,
      bestsellerDurationDays: 90
    };
  }
}
