import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HierarchyService } from '../../../../layout/rkmain/services/hierarchy.service';
import { AlertService } from '../../../services/alert.service';

interface ProbabilidadItem {
  selected: boolean;
  offset: string;
  id: string;
  descripcion: string;
  valoracion: string;
  cualitativo: string;
  cuantitativo: string;
}

interface SelectProbabilidadData {
  title: string;
  button_confirm: string;
  button_close: string;
  type: 'RP' | 'RR';
  currentSelection?: string;
}

@Component({
  selector: 'app-select-probabilidad',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './select-probabilidad.component.html',
  styleUrls: ['./select-probabilidad.component.scss']
})
export class SelectProbabilidadComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<SelectProbabilidadComponent>);
  private hierarchyService = inject(HierarchyService);
  private alertService = inject(AlertService);
  public data: SelectProbabilidadData = inject(MAT_DIALOG_DATA);

  // Signals
  dataList = signal<ProbabilidadItem[]>([]);
  isLoading = signal(true);
  selectedId = signal<string>('');
  hoveredIndex = signal<number>(-1); // ✨ Para feedback visual

  displayColumns = ['select', 'id', 'descripcion', 'valoracion', 'cualitativo', 'cuantitativo'];

  // ==================== LIFECYCLE ====================

  ngOnInit(): void {
    this.loadData();
  }

  // ==================== KEYBOARD NAVIGATION ====================

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (this.isLoading()) return;

    const items = this.dataList();
    if (items.length === 0) return;

    // ESC para cerrar
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel();
      return;
    }

    // Enter para confirmar
    if (event.key === 'Enter' && this.selectedId()) {
      event.preventDefault();
      this.confirm();
      return;
    }

    // Números 1-5 para selección directa
    const numKey = parseInt(event.key);
    if (numKey >= 1 && numKey <= 5) {
      event.preventDefault();
      const item = items.find(i => i.id === numKey.toString());
      if (item) {
        this.selectItem(item);
      }
      return;
    }

    // Flechas para navegación
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.navigateWithArrows(event.key === 'ArrowDown' ? 1 : -1);
    }
  }

  private navigateWithArrows(direction: number): void {
    const items = this.dataList();
    const currentIndex = this.hoveredIndex();

    let newIndex = currentIndex + direction;

    // Wrap around
    if (newIndex < 0) newIndex = items.length - 1;
    if (newIndex >= items.length) newIndex = 0;

    this.hoveredIndex.set(newIndex);

    // Auto-scroll to visible
    setTimeout(() => {
      const row = document.querySelector(`tr[data-index="${newIndex}"]`);
      if (row) {
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 0);
  }

  // ==================== DATA LOADING ====================

  private async loadData(): Promise<void> {
    this.isLoading.set(true);

    const attributes = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'CONSECUENCIA_PRO_LIST' }
    ];

    try {
      const response = await this.hierarchyService.executeGenericAction({ atts: attributes }).toPromise();

      if (response.success && response.data) {
        const items: ProbabilidadItem[] = response.data
          .filter((element: any) => element.atts && element.atts.length >= 6)
          .map((element: any) => ({
            selected: false,
            offset: element.atts[0].value,
            id: element.atts[1].value.trim(),
            descripcion: element.atts[2].value.trim(),
            valoracion: element.atts[3].value.trim(),
            cualitativo: element.atts[4].value.trim(),
            cuantitativo: element.atts[5].value.trim()
          }));

        // Pre-select if currentSelection provided
        if (this.data.currentSelection) {
          const selectedItem = items.find(item => item.id === this.data.currentSelection);
          if (selectedItem) {
            selectedItem.selected = true;
            this.selectedId.set(selectedItem.id);

            // Set hover index to selected item
            const index = items.findIndex(item => item.id === this.data.currentSelection);
            if (index !== -1) {
              this.hoveredIndex.set(index);
            }
          }
        } else if (items.length > 0) {
          // Si no hay selección previa, hover en el primero
          this.hoveredIndex.set(0);
        }

        this.dataList.set(items);

        console.log('✅ Probabilidad data loaded:', items.length, 'items');
      } else {
        await this.alertService.error('Error', response.message || 'Error al cargar datos de probabilidad');
      }
    } catch (error) {
      console.error('❌ Error loading probabilidad data:', error);
      await this.alertService.error('Error', 'Error de conexión al cargar probabilidades');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ==================== USER ACTIONS ====================

  toggleSelection(item: ProbabilidadItem): void {
    this.selectItem(item);
  }

  private selectItem(item: ProbabilidadItem): void {
    // Deselect all others
    this.dataList().forEach(element => {
      if (element.id !== item.id) {
        element.selected = false;
      }
    });

    // Toggle current
    item.selected = !item.selected;

    // Update selectedId
    this.selectedId.set(item.selected ? item.id : '');

    // Update hover index
    const index = this.dataList().findIndex(i => i.id === item.id);
    if (index !== -1) {
      this.hoveredIndex.set(index);
    }

    console.log('📊 Selected:', item.selected ? item.id : 'none');
  }

  // ✨ DOBLE-CLICK para seleccionar y confirmar
  onRowDoubleClick(item: ProbabilidadItem): void {
    if (!item.selected) {
      this.selectItem(item);
    }
    setTimeout(() => this.confirm(), 100);
  }

  async confirm(): Promise<void> {
    if (!this.selectedId()) {
      await this.alertService.warning('Validación', 'Debe seleccionar una probabilidad');
      return;
    }

    const selectedItem = this.dataList().find(item => item.id === this.selectedId());

    if (selectedItem) {
      console.log('✅ Confirming selection:', selectedItem.id);
      this.dialogRef.close({
        id: selectedItem.id,
        descripcion: selectedItem.descripcion,
        valoracion: selectedItem.valoracion,
        cualitativo: selectedItem.cualitativo,
        cuantitativo: selectedItem.cuantitativo
      });
    }
  }

  cancel(): void {
    console.log('❌ Selection cancelled');
    this.dialogRef.close(null);
  }

  // ==================== VISUAL HELPERS ====================

  getLevelColor(id: string): string {
    const level = parseInt(id);
    if (level === 1) return '#4caf50'; // Verde - Rara
    if (level === 2) return '#8bc34a'; // Verde claro - Posible
    if (level === 3) return '#ffeb3b'; // Amarillo - Probable
    if (level === 4) return '#ff9800'; // Naranja - Casi segura
    if (level === 5) return '#f44336'; // Rojo - Segura
    return '#9e9e9e';
  }

  isRowHovered(index: number): boolean {
    return this.hoveredIndex() === index;
  }

  onRowMouseEnter(index: number): void {
    this.hoveredIndex.set(index);
  }

  onRowMouseLeave(): void {
    // Mantener el hover en el item seleccionado si existe
    if (this.selectedId()) {
      const index = this.dataList().findIndex(item => item.id === this.selectedId());
      if (index !== -1) {
        this.hoveredIndex.set(index);
        return;
      }
    }
    this.hoveredIndex.set(-1);
  }
}
