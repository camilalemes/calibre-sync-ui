import { Component, OnInit, OnDestroy, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { interval, Subscription } from 'rxjs';
import { SyncApiService } from '../../services/sync-api.service';
import { SyncStatus, SyncResult, SyncStats, SyncStatusResponse, ComparisonResult } from '../../models/book.model';

@Component({
  selector: 'app-sync',
  templateUrl: './sync.component.html',
  styleUrls: ['./sync.component.scss'],
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatBadgeModule,
    MatTooltipModule,
    MatTabsModule
  ]
})
export class SyncComponent implements OnInit {
  private readonly apiService = inject(SyncApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  
  // Make Object available in template
  protected readonly Object = Object;

  protected readonly syncStatus = signal<SyncStatus | null>(null);
  protected readonly lastSyncResult = signal<SyncResult | null>(null);
  protected readonly syncHistory = signal<any[]>([]);
  protected readonly syncStats = signal<any>(null);
  protected readonly comparingLibraries = signal(false);
  protected readonly comparisonResult = signal<ComparisonResult | null>(null);
  protected readonly expandedFileDetails = signal<Set<string>>(new Set<string>());

  ngOnInit(): void {
    this.refreshStatus();
    this.startStatusPolling();
    this.loadSyncHistory();
    this.loadSyncStats();
  }

  refreshStatus(): void {
    this.apiService.getSyncStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: SyncStatusResponse) => {
          // Convert API response to internal SyncStatus format
          const status: SyncStatus = {
            status: response.status === 'in_progress' ? 'running' : 
                    response.status === 'idle' ? 'idle' : 'idle',
            last_sync: response.last_sync,
            result: response.details?.result,
            errors: response.details?.errors
          };
          
          this.syncStatus.set(status);
          
          // Update last sync result if available
          if (response.details?.result) {
            this.lastSyncResult.set(response.details.result);
          }
        },
        error: (err) => {
          console.error('Error fetching sync status:', err);
          this.snackBar.open('Failed to fetch sync status', 'Close', {
            duration: 3000
          });
        }
      });
  }

  startSync(dryRun: boolean = false): void {
    const action = dryRun ? 'dry run' : 'sync';
    
    this.apiService.triggerSync(dryRun)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.snackBar.open(`${action} started successfully`, 'Close', {
            duration: 3000
          });
          this.refreshStatus();
          
          // Start more frequent polling when sync is running
          this.startStatusPolling(2000); // Poll every 2 seconds during sync
        },
        error: (err) => {
          console.error(`Error starting ${action}:`, err);
          this.snackBar.open(`Failed to start ${action}`, 'Close', {
            duration: 5000
          });
        }
      });
  }

  compareLibraries(): void {
    this.comparingLibraries.set(true);
    
    this.apiService.compareLibraries()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.comparisonResult.set(result);
          this.comparingLibraries.set(false);
          
          // Calculate total differences for success message
          const totalDifferences = result.replicas?.reduce((total: number, replica) => {
            return total + (replica.unique_to_main_library || 0) + (replica.unique_to_replica || 0);
          }, 0) || 0;
          
          this.snackBar.open(
            totalDifferences > 0 
              ? `Library comparison completed - ${totalDifferences} unique books found`
              : 'Library comparison completed - all libraries are in sync',
            'Close',
            { duration: 4000 }
          );
        },
        error: (err) => {
          console.error('Error comparing libraries:', err);
          this.comparingLibraries.set(false);
          this.snackBar.open('Failed to compare libraries', 'Close', {
            duration: 5000
          });
        }
      });
  }

  getStatusClass(): string {
    const status = this.syncStatus()?.status;
    return status || 'unknown';
  }

  private startStatusPolling(intervalMs: number = 5000): void {
    interval(intervalMs)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const currentStatus = this.syncStatus()?.status;
        if (currentStatus === 'running') {
          this.refreshStatus();
        } else if (currentStatus === 'idle' && intervalMs < 5000) {
          // Sync completed, slow down polling and refresh history
          this.startStatusPolling(5000);
          this.refreshHistory(); // Refresh history when sync completes
        }
      });
  }

  // Helper methods for displaying sync results
  getSyncResultSummary(result: SyncResult): string {
    const locations = Object.keys(result);
    let totalAdded = 0, totalUpdated = 0, totalDeleted = 0, totalErrors = 0;
    
    locations.forEach(location => {
      const stats = result[location];
      if ('error' in stats) {
        totalErrors++;
      } else {
        totalAdded += stats.added;
        totalUpdated += stats.updated; 
        totalDeleted += stats.deleted;
        if (stats.errors > 0) totalErrors++;
      }
    });
    
    const parts = [];
    if (totalAdded > 0) parts.push(`${totalAdded} added`);
    if (totalUpdated > 0) parts.push(`${totalUpdated} updated`);
    if (totalDeleted > 0) parts.push(`${totalDeleted} deleted`);
    if (totalErrors > 0) parts.push(`${totalErrors} errors`);
    
    return parts.length > 0 ? parts.join(', ') : 'No changes';
  }

  getLocationDisplayName(path: string): string {
    return path.split('/').pop() || path;
  }

  hasErrors(result: SyncResult): boolean {
    return Object.values(result).some(stats => 
      'error' in stats || ('errors' in stats && stats.errors > 0)
    );
  }

  getTotalChanges(stats: SyncStats): number {
    return stats.added + stats.updated + stats.deleted;
  }

  // Type-safe helpers for templates
  isErrorResult(result: SyncStats | { error: string }): result is { error: string } {
    return 'error' in result;
  }

  isStatsResult(result: SyncStats | { error: string }): result is SyncStats {
    return !('error' in result);
  }

  getStats(result: SyncStats | { error: string }): SyncStats | null {
    return this.isStatsResult(result) ? result : null;
  }

  getError(result: SyncStats | { error: string }): string | null {
    return this.isErrorResult(result) ? result.error : null;
  }

  formatDateTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  }

  // File details expansion methods
  hasFileChanges(stats: SyncStats): boolean {
    return (stats.added_files?.length || 0) > 0 ||
           (stats.updated_files?.length || 0) > 0 ||
           (stats.deleted_files?.length || 0) > 0 ||
           (stats.ignored_files?.length || 0) > 0 ||
           (stats.error_files?.length || 0) > 0;
  }

  toggleFileDetails(location: string): void {
    const expanded = this.expandedFileDetails();
    const newExpanded = new Set(expanded);
    
    if (newExpanded.has(location)) {
      newExpanded.delete(location);
    } else {
      newExpanded.add(location);
    }
    
    this.expandedFileDetails.set(newExpanded);
  }

  isFileDetailsExpanded(location: string): boolean {
    return this.expandedFileDetails().has(location);
  }

  // Sync History Methods
  loadSyncHistory(): void {
    this.apiService.getSyncHistory(20)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (history) => {
          this.syncHistory.set(history);
        },
        error: (err) => {
          console.error('Failed to load sync history:', err);
        }
      });
  }

  loadSyncStats(): void {
    this.apiService.getSyncStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => {
          this.syncStats.set(stats);
        },
        error: (err) => {
          console.error('Failed to load sync stats:', err);
        }
      });
  }

  refreshHistory(): void {
    this.loadSyncHistory();
    this.loadSyncStats();
  }

  clearHistory(): void {
    if (confirm('Are you sure you want to clear all sync history? This action cannot be undone.')) {
      this.apiService.clearSyncHistory()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.syncHistory.set([]);
            this.syncStats.set({
              total_syncs: 0,
              successful_syncs: 0,
              failed_syncs: 0,
              average_duration: 0
            });
            this.snackBar.open('Sync history cleared successfully', 'Close', {
              duration: 3000
            });
          },
          error: (err) => {
            console.error('Failed to clear sync history:', err);
            this.snackBar.open('Failed to clear sync history', 'Close', {
              duration: 5000
            });
          }
        });
    }
  }

  formatTimestamp(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString();
    } catch {
      return timestamp;
    }
  }

  getReplicaName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  }

  formatAbsoluteTime(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  }
}