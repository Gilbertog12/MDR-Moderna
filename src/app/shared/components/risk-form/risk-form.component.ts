import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RiskFormData, DimensionConfig } from '../../models/risk-evaluation.models';

@Component({
  selector: 'app-risk-form',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './risk-form.component.html',
  styleUrl: './risk-form.component.scss'
})
export class RiskFormComponent {

   @Input({ required: true }) set data(value: RiskFormData | null) {
    if (value) {
      this._data.set(value);
    }
  }

  @Input({ required: true }) dimensions: DimensionConfig[] = [];
  @Input() readonly = false;
  @Input() canModify = false;

  @Output() onEdit = new EventEmitter<{
    type: 'probability' | 'severity',
    riskType: 'pure' | 'residual'
  }>();

  // Signals
  private _data = signal<RiskFormData>({
    pure: {
      probability: { id: '', desc: '' },
      severity: { id: '', desc: '' },
      mr: '',
      criticality: '',
      criticalityColor: '#e0e0e0'
    },
    residual: {
      probability: { id: '', desc: '' },
      severity: { id: '', desc: '' },
      mr: '',
      criticality: '',
      criticalityColor: '#e0e0e0'
    }
  });

  // Computed
  readonly formData = computed(() => this._data());
  readonly pureRisk = computed(() => this.formData().pure);
  readonly residualRisk = computed(() => this.formData().residual);

  readonly showEditButtons = computed(() =>
    this.canModify && !this.readonly
  );

  handleEdit(type: 'probability' | 'severity', riskType: 'pure' | 'residual') {
    if (!this.showEditButtons()) return;

    this.onEdit.emit({ type, riskType });
  }

  getCriticalityClass(criticality: string): string {
    const lower = criticality.toLowerCase().trim();
    if (lower.includes('bajo') || lower.includes('low')) return 'criticality-low';
    if (lower.includes('medio') || lower.includes('medium')) return 'criticality-medium';
    if (lower.includes('alto') || lower.includes('high')) return 'criticality-high';
    if (lower.includes('crítico') || lower.includes('critical')) return 'criticality-critical';
    return 'criticality-empty';
  }

}
