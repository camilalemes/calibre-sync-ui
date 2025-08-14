import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-loading-indicator',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    @if (loadingService.isLoading) {
      <div class="loading-overlay">
        <mat-spinner diameter="50"></mat-spinner>
        <p>Loading...</p>
      </div>
    }
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      gap: 16px;

      p {
        color: rgba(255, 255, 255, 0.9);
        margin: 0;
        font-size: 16px;
      }
    }
  `]
})
export class LoadingIndicatorComponent {
  protected readonly loadingService = inject(LoadingService);
}