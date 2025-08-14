import { Injectable, signal, computed } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private readonly _loading = signal(false);
  private loadingRequests = 0;

  get loading$(): Observable<boolean> {
    return toObservable(this._loading);
  }

  get isLoading(): boolean {
    return this._loading();
  }

  setLoading(loading: boolean): void {
    if (loading) {
      this.loadingRequests++;
    } else {
      this.loadingRequests = Math.max(0, this.loadingRequests - 1);
    }
    
    this._loading.set(this.loadingRequests > 0);
  }

  reset(): void {
    this.loadingRequests = 0;
    this._loading.set(false);
  }
}