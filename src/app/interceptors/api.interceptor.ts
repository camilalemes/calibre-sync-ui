import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retryWhen, delayWhen, tap, finalize } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoadingService } from '../services/loading.service';

@Injectable()
export class ApiInterceptor implements HttpInterceptor {
  private readonly snackBar = inject(MatSnackBar);
  private readonly loadingService = inject(LoadingService);

  private readonly RETRY_COUNT = 3;
  private readonly RETRY_DELAY = 1000;
  private readonly RETRYABLE_ERROR_CODES = [0, 408, 429, 500, 502, 503, 504];

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add common headers
    const apiReq = req.clone({
      setHeaders: {
        'Content-Type': req.headers.get('Content-Type') || 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    // Start loading indicator
    this.loadingService.setLoading(true);

    const startTime = Date.now();

    return next.handle(apiReq).pipe(
      // Log successful responses
      tap(event => {
        if (event instanceof HttpResponse) {
          const duration = Date.now() - startTime;
          console.log(`✅ ${req.method} ${req.url} - ${event.status} (${duration}ms)`);
        }
      }),
      // Retry logic for specific errors
      retryWhen(errors => 
        errors.pipe(
          delayWhen((error: HttpErrorResponse, retryIndex) => {
            if (retryIndex >= this.RETRY_COUNT || !this.shouldRetry(error)) {
              return throwError(error);
            }
            const delay = this.RETRY_DELAY * Math.pow(2, retryIndex); // Exponential backoff
            console.log(`🔄 Retrying request (${retryIndex + 1}/${this.RETRY_COUNT}) in ${delay}ms`);
            return timer(delay);
          })
        )
      ),
      // Handle errors
      catchError((error: HttpErrorResponse) => {
        const duration = Date.now() - startTime;
        this.handleError(error, req, duration);
        return throwError(() => error);
      }),
      // Stop loading indicator
      finalize(() => {
        this.loadingService.setLoading(false);
      })
    );
  }

  private shouldRetry(error: HttpErrorResponse): boolean {
    return this.RETRYABLE_ERROR_CODES.includes(error.status);
  }

  private handleError(error: HttpErrorResponse, req: HttpRequest<any>, duration: number): void {
    console.error(`❌ ${req.method} ${req.url} - ${error.status} (${duration}ms)`, error);

    let errorMessage = 'An unexpected error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Network error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 0:
          errorMessage = 'Unable to connect to server. Please check your internet connection.';
          break;
        case 400:
          errorMessage = error.error?.message || 'Invalid request';
          break;
        case 401:
          errorMessage = 'Unauthorized access. Please check your credentials.';
          break;
        case 403:
          errorMessage = 'Access forbidden';
          break;
        case 404:
          errorMessage = 'Requested resource not found';
          break;
        case 408:
          errorMessage = 'Request timeout. Please try again.';
          break;
        case 429:
          errorMessage = 'Too many requests. Please wait a moment.';
          break;
        case 500:
          errorMessage = 'Internal server error. Please try again later.';
          break;
        case 502:
        case 503:
        case 504:
          errorMessage = 'Server temporarily unavailable. Please try again later.';
          break;
        default:
          errorMessage = error.error?.message || `Error ${error.status}: ${error.statusText}`;
      }
    }

    // Show user-friendly error message for non-background requests
    if (!req.url.includes('/sync/status')) {
      this.snackBar.open(errorMessage, 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    }
  }
}