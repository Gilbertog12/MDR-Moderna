import { CommonModule } from '@angular/common';
import { Component, computed, Input, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { RiskSummaryData, DimensionConfig } from '../../models/risk-evaluation.models';

@Component({
  selector: 'app-risk-summary',
  imports: [
      CommonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule
  ],
  templateUrl: './risk-summary.component.html',
  styleUrl: './risk-summary.component.scss'
})
export class RiskSummaryComponent {

   @Input({ required: true }) set data(value: RiskSummaryData[] | null) {
    if (value) {
      this._data.set(value);
    }
  }

  @Input({ required: true }) dimensions: DimensionConfig[] = [];

  // Signals
  private _data = signal<RiskSummaryData[]>([]);

  // Computed
  readonly summaryData = computed(() => this._data());
  readonly displayedColumns = computed(() => [
    'dimension',
    'totalItems',
    'pureLow',
    'pureMedium',
    'pureHigh',
    'pureCritical',
    'residualLow',
    'residualMedium',
    'residualHigh',
    'residualCritical'
  ]);

  readonly totalItems = computed(() => {
    const data = this.summaryData();
    return data.length > 0 ? data[0].totalItems : 0;
  });

  readonly overallStats = computed(() => {
    const data = this.summaryData();

    const stats = {
      pure: { low: 0, medium: 0, high: 0, critical: 0 },
      residual: { low: 0, medium: 0, high: 0, critical: 0 }
    };

    data.forEach(dim => {
      stats.pure.low += dim.pureRisk.low;
      stats.pure.medium += dim.pureRisk.medium;
      stats.pure.high += dim.pureRisk.high;
      stats.pure.critical += dim.pureRisk.critical;

      stats.residual.low += dim.residualRisk.low;
      stats.residual.medium += dim.residualRisk.medium;
      stats.residual.high += dim.residualRisk.high;
      stats.residual.critical += dim.residualRisk.critical;
    });

    return stats;
  });

  getDimensionIcon(dimension: string): string {
    const icons: Record<string, string> = {
      'SSO': 'health_and_safety',
      'MA': 'eco',
      'OP': 'engineering'
    };
    return icons[dimension] || 'analytics';
  }

  getDimensionColor(dimension: string): string {
    const dim = this.dimensions.find(d => d.id === dimension);
    return dim?.color || '#666';
  }

  getRiskPercentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }
}
