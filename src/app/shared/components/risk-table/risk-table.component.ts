import { CommonModule } from '@angular/common';
import { Component, computed, HostListener, Input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RiskTableData, ColumnConfig, DimensionConfig } from '../../models/risk-evaluation.models';

@Component({
  selector: 'app-risk-table',
  imports: [
    CommonModule,
    MatTableModule,
    MatTooltipModule,
    MatIconModule
  ],
  templateUrl: './risk-table.component.html',
  styleUrl: './risk-table.component.scss'
})
export class RiskTableComponent {

  @Input({ required: true }) set data(value: RiskTableData[]) {
    this._data.set(value || []);
  }

  @Input({ required: true }) columns: ColumnConfig[] = [];
  @Input({ required: true }) dimensions: DimensionConfig[] = [];
  @Input() readonly = false;

  // Signals
  private _data = signal<RiskTableData[]>([]);
  readonly selectedRowIndex = signal<number | null>(null);

  // Computed
  readonly tableData = computed(() => this._data());

  readonly displayedColumns = computed(() => {
    return this.columns.map(col => col.id);
  });

  readonly hasData = computed(() => this.tableData().length > 0);

  // Keyboard navigation
  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    if (!this.hasData()) return;

    const currentIndex = this.selectedRowIndex();
    const dataLength = this.tableData().length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex === null) {
          this.selectedRowIndex.set(0);
        } else if (currentIndex < dataLength - 1) {
          this.selectedRowIndex.set(currentIndex + 1);
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex !== null && currentIndex > 0) {
          this.selectedRowIndex.set(currentIndex - 1);
        }
        break;

      case 'Escape':
        this.selectedRowIndex.set(null);
        break;
    }
  }

  onRowClick(index: number) {
    this.selectedRowIndex.set(index);
  }

  getRiskClass(value: string): string {
    if (!value || value.trim() === '' || value === ' ') return 'risk-empty';

    const lower = value.toLowerCase();
    if (lower.includes('bajo') || lower.includes('low')) return 'risk-low';
    if (lower.includes('medio') || lower.includes('medium')) return 'risk-medium';
    if (lower.includes('alto') || lower.includes('high')) return 'risk-high';
    if (lower.includes('crítico') || lower.includes('critical')) return 'risk-critical';

    return 'risk-empty';
  }

  getStatusBadge(status: string): string {
    const badges: Record<string, string> = {
      '001': '(*)',
      '002': '(*)',
      '003': '(*)',
      '004': '(**)',
      '006': '(*)',
      '007': '(***)',
      '000': '(R)',
      '008': ''
    };
    return badges[status] || '';
  }

  getStatusTitle(status: string, pendingDelete: string): string {
    if (pendingDelete === 'Y') {
      return 'Pendiente de inactivación (Eliminación)';
    }

    const titles: Record<string, string> = {
      '001': 'Ítem pendiente por enviar a validar',
      '002': 'Ítem pendiente por enviar a validar',
      '003': 'Ítem pendiente por enviar a validar',
      '004': 'Ítem pendiente de validar',
      '006': 'Ítem pendiente por enviar a validar',
      '007': 'Ítem pendiente por aprobar',
      '000': 'Ítem rechazado',
      '008': 'Aprobado'
    };
    return titles[status] || '';
  }

  getDimensionColor(dimensionId: string): string {
    const dimension = this.dimensions.find(d => d.id === dimensionId);
    return dimension?.color || '#666';
  }

}
