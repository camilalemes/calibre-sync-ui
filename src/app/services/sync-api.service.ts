import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap, timeout } from 'rxjs/operators';
import { 
  SyncStatus, 
  SyncStatusResponse, 
  ComparisonResult,
  ApiError
} from '../models/book.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SyncApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  
  // Configuration
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  
  // Subjects for real-time updates
  private syncStatusSubject = new BehaviorSubject<SyncStatusResponse | null>(null);

  // Public observables
  readonly syncStatus$ = this.syncStatusSubject.asObservable();

  // Error handling
  private handleError<T>(operation: string, result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      
      const apiError: ApiError = {
        error: error.statusText || 'Unknown Error',
        message: error.error?.message || error.message || 'Unknown error occurred',
        status: error.status || 0
      };

      if (result !== undefined) {
        return throwError(() => apiError);
      }
      
      throw apiError;
    };
  }

  // Sync endpoints
  triggerSync(dryRun: boolean = false): Observable<SyncStatusResponse> {
    const params = new HttpParams().set('dry_run', dryRun.toString());
    
    return this.http.post<SyncStatusResponse>(`${this.baseUrl}/sync/trigger`, {}, { params }).pipe(
      timeout(this.REQUEST_TIMEOUT),
      tap(response => {
        this.syncStatusSubject.next(response);
      }),
      catchError(this.handleError<SyncStatusResponse>('triggerSync'))
    );
  }

  getSyncStatus(): Observable<SyncStatusResponse> {
    return this.http.get<SyncStatusResponse>(`${this.baseUrl}/sync/status`).pipe(
      timeout(this.REQUEST_TIMEOUT),
      tap(response => this.syncStatusSubject.next(response)),
      catchError(this.handleError<SyncStatusResponse>('getSyncStatus'))
    );
  }

  // Library comparison endpoint
  compareLibraries(): Observable<ComparisonResult> {
    return this.http.get<ComparisonResult>(`${this.baseUrl}/libraries/compare-all`).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(this.handleError<ComparisonResult>('compareLibraries'))
    );
  }

  // Sync history endpoints
  getSyncHistory(limit?: number): Observable<any[]> {
    let url = `${this.baseUrl}/sync/history`;
    if (limit) {
      url += `?limit=${limit}`;
    }
    return this.http.get<any[]>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(this.handleError<any[]>('getSyncHistory', []))
    );
  }

  getSyncStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/sync/history/stats`).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(this.handleError<any>('getSyncStats', {}))
    );
  }

  getLatestSync(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/sync/history/latest`).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(this.handleError<any>('getLatestSync', null))
    );
  }

  clearSyncHistory(): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/sync/history`).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(this.handleError<any>('clearSyncHistory'))
    );
  }

  // Health check
  checkHealth(): Observable<any> {
    return this.http.get(`${this.baseUrl.replace('/api/v1', '')}/health`).pipe(
      timeout(5000),
      catchError(this.handleError('checkHealth'))
    );
  }
}