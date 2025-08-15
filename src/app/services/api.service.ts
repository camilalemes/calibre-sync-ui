import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, map, shareReplay, tap, timeout } from 'rxjs/operators';
import { 
  Book, 
  BookCollection, 
  BookMetadata,
  SyncStatusResponse, 
  AddBookRequest, 
  ComparisonResult,
  AddBookResponse,
  DeleteBookResponse
} from '../models/book.model';
import { environment } from '../../environments/environment';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  
  // Configuration
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  // Cache for API responses
  private cache = new Map<string, CacheEntry<any>>();
  
  // Subjects for real-time updates
  private booksSubject = new BehaviorSubject<Book[]>([]);
  private syncStatusSubject = new BehaviorSubject<SyncStatusResponse | null>(null);

  // Public observables
  readonly books$ = this.booksSubject.asObservable();
  readonly syncStatus$ = this.syncStatusSubject.asObservable();

  // Cache utilities
  private getCacheKey(endpoint: string, params?: any): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${endpoint}${paramStr}`;
  }

  private isValidCacheEntry<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < this.CACHE_DURATION;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && this.isValidCacheEntry(entry)) {
      return entry.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Books endpoints
  getBooks(locationId: string = 'calibre', useCache: boolean = true): Observable<Book[]> {
    const cacheKey = this.getCacheKey('/books', { locationId });
    
    if (useCache) {
      const cached = this.getFromCache<Book[]>(cacheKey);
      if (cached) {
        this.booksSubject.next(cached);
        return of(cached);
      }
    }

    return this.http.get<BookCollection>(`${this.baseUrl}/libraries/${locationId}/books`).pipe(
      timeout(this.REQUEST_TIMEOUT),
      map(response => {
        if (!response?.books) {
          throw new Error('Invalid response format: missing books array');
        }
        return response.books;
      }),
      tap(books => {
        this.setCache(cacheKey, books);
        this.booksSubject.next(books);
      }),
      shareReplay(1),
      catchError(this.handleError<Book[]>('getBooks', []))
    );
  }

  getBookMetadata(bookId: number, useCache: boolean = true): Observable<BookMetadata> {
    if (!bookId || bookId <= 0) {
      return throwError(() => new Error('Invalid book ID'));
    }

    const cacheKey = this.getCacheKey('/metadata', { bookId });
    
    if (useCache) {
      const cached = this.getFromCache<BookMetadata>(cacheKey);
      if (cached) {
        return of(cached);
      }
    }

    return this.http.get<{metadata: BookMetadata}>(`${this.baseUrl}/books/${bookId}/metadata`).pipe(
      timeout(this.REQUEST_TIMEOUT),
      map(response => {
        if (!response?.metadata) {
          throw new Error('Invalid response format: missing metadata');
        }
        return response.metadata;
      }),
      tap(metadata => this.setCache(cacheKey, metadata)),
      shareReplay(1),
      catchError(this.handleError<BookMetadata>('getBookMetadata'))
    );
  }

  getBookCover(bookId: number): Observable<Blob> {
    if (!bookId || bookId <= 0) {
      return throwError(() => new Error('Invalid book ID'));
    }

    const cacheKey = this.getCacheKey('/cover', { bookId });
    const cached = this.getFromCache<Blob>(cacheKey);
    if (cached) {
      return of(cached);
    }

    return this.http.get(`${this.baseUrl}/books/${bookId}/cover`, {
      responseType: 'blob'
    }).pipe(
      timeout(this.REQUEST_TIMEOUT),
      tap(blob => this.setCache(cacheKey, blob)),
      catchError(this.handleError<Blob>('getBookCover'))
    );
  }

  addBook(bookData: AddBookRequest): Observable<AddBookResponse> {
    if (!this.validateBookData(bookData)) {
      return throwError(() => new Error('Invalid book data'));
    }

    const formData = this.buildBookFormData(bookData);
    
    return this.http.post<AddBookResponse>(`${this.baseUrl}/books/add`, formData).pipe(
      timeout(this.REQUEST_TIMEOUT),
      tap(() => {
        // Clear books cache to refresh the list
        this.clearCache('/books');
      }),
      catchError(this.handleError<AddBookResponse>('addBook'))
    );
  }

  deleteBook(bookId: number): Observable<DeleteBookResponse> {
    if (!bookId || bookId <= 0) {
      return throwError(() => new Error('Invalid book ID'));
    }

    return this.http.delete<DeleteBookResponse>(`${this.baseUrl}/books/${bookId}`).pipe(
      timeout(this.REQUEST_TIMEOUT),
      tap(() => {
        // Clear related caches
        this.clearCache('/books');
        this.clearCache('/metadata');
        this.clearCache('/cover');
      }),
      catchError(this.handleError<DeleteBookResponse>('deleteBook'))
    );
  }

  // Helper methods
  private validateBookData(bookData: AddBookRequest): boolean {
    return !!(
      bookData.title?.trim() &&
      bookData.authors?.length > 0 &&
      bookData.file &&
      bookData.file.size > 0
    );
  }

  private buildBookFormData(bookData: AddBookRequest): FormData {
    const formData = new FormData();
    
    formData.append('title', bookData.title.trim());
    formData.append('authors', bookData.authors.join(','));
    
    // Add optional fields if present
    if (bookData.publisher?.trim()) formData.append('publisher', bookData.publisher.trim());
    if (bookData.published?.trim()) formData.append('published', bookData.published.trim());
    if (bookData.isbn?.trim()) formData.append('isbn', bookData.isbn.trim());
    if (bookData.language?.trim()) formData.append('language', bookData.language.trim());
    if (bookData.series?.trim()) formData.append('series', bookData.series.trim());
    if (bookData.series_index !== undefined && bookData.series_index > 0) {
      formData.append('series_index', bookData.series_index.toString());
    }
    if (bookData.comments?.trim()) formData.append('comments', bookData.comments.trim());
    
    formData.append('file', bookData.file);
    
    return formData;
  }

  // Sync endpoints
  triggerSync(dryRun: boolean = false): Observable<SyncStatusResponse> {
    const params = new HttpParams().set('dry_run', dryRun.toString());
    
    return this.http.post<SyncStatusResponse>(`${this.baseUrl}/api/v1/sync/trigger`, {}, { params }).pipe(
      timeout(this.REQUEST_TIMEOUT),
      tap(response => {
        this.syncStatusSubject.next(response);
        // Clear books cache after sync trigger
        this.clearCache('/books');
      }),
      catchError(this.handleError<SyncStatusResponse>('triggerSync'))
    );
  }

  getSyncStatus(): Observable<SyncStatusResponse> {
    return this.http.get<SyncStatusResponse>(`${this.baseUrl}/api/v1/sync/status`).pipe(
      timeout(this.REQUEST_TIMEOUT),
      tap(response => this.syncStatusSubject.next(response)),
      catchError(this.handleError<SyncStatusResponse>('getSyncStatus'))
    );
  }

  // Comparison endpoints
  compareLibraries(useCache: boolean = false): Observable<ComparisonResult> {
    const cacheKey = this.getCacheKey('/compare');
    
    if (useCache) {
      const cached = this.getFromCache<ComparisonResult>(cacheKey);
      if (cached) {
        return of(cached);
      }
    }

    return this.http.get<ComparisonResult>(`${this.baseUrl}/api/v1/libraries/compare-all`).pipe(
      timeout(this.REQUEST_TIMEOUT),
      tap(result => this.setCache(cacheKey, result)),
      shareReplay(1),
      catchError(this.handleError<ComparisonResult>('compareLibraries'))
    );
  }

  // Utility methods
  refreshBooks(): Observable<Book[]> {
    this.clearCache('/books');
    return this.getBooks('calibre', false);
  }

  clearAllCache(): void {
    this.clearCache();
  }

  // Generic error handler
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      
      // Create a user-friendly error message
      let errorMessage = 'An unexpected error occurred';
      
      if (error.name === 'TimeoutError') {
        errorMessage = `${operation} timed out. Please try again.`;
      } else if (error.error && typeof error.error === 'string') {
        errorMessage = error.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Return empty result or throw error based on operation
      if (result !== undefined) {
        return of(result);
      }
      
      return throwError(() => new Error(errorMessage));
    };
  }
}