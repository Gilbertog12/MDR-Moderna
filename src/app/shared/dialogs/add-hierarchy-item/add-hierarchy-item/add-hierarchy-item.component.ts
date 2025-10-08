import { CommonModule } from '@angular/common';
import { Component, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { LoadingService } from '../../../../core/services/loading.service';
import { AlertService } from '../../../services/alert.service';
import { HierarchyManagementService, AvailableItem } from '../../../services/hierarchy-management.service';

export interface AddHierarchyDialogData {
  title: string;
  level: 'RKA' | 'RKP' | 'RKS' | 'RKC' | 'RKT' | 'RKD' | 'RKR';
  parentKeys: {
    areaId?: string;
    procesoId?: string;
    subprocesoId?: string;
    actividadId?: string;
    tareaId?: string;
    dimensionId?: string;
  };
  showNewEntityButton?: boolean;
}

@Component({
  selector: 'app-add-hierarchy-item',
  imports:[
     CommonModule,
    MatDialogModule,
    MatTableModule,
    MatPaginatorModule,
    MatCheckboxModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    FormsModule],
  templateUrl: './add-hierarchy-item.component.html',
  styleUrl: './add-hierarchy-item.component.scss'
})
export class AddHierarchyItemComponent {

  data = inject<AddHierarchyDialogData>(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef<AddHierarchyItemComponent>);
  private hierarchyService = inject(HierarchyManagementService);
  private alertService = inject(AlertService);
  private loadingService = inject(LoadingService);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns = ['select', 'id', 'descripcion'];
  dataSource = new MatTableDataSource<AvailableItem>([]);

  allItems = signal<AvailableItem[]>([]);
  selectedItems = signal<AvailableItem[]>([]);
  isLoading = signal(false);
  searchTerm = '';
  currentPage = 1;

  ngOnInit() {
    this.loadItems();
  }

  /**
   * Carga los items disponibles
   */
  loadItems(reset = false) {
    if (reset) {
      this.currentPage = 1;
      this.allItems.set([]);
    }

    this.isLoading.set(true);

    this.hierarchyService.getAvailableItems(
      this.data.level,
      this.data.parentKeys,
      this.searchTerm || undefined,
      this.currentPage
    ).subscribe({
      next: (items) => {
        if (items.length === 0 && this.currentPage > 1) {
          this.alertService.info('Información', 'No hay más items disponibles');
          this.isLoading.set(false);
          return;
        }

        if (items.length === 0 && this.currentPage === 1) {
          this.alertService.info('Información', 'No se encontraron items');
          this.isLoading.set(false);
          return;
        }

        // Combinar items previos con nuevos (para paginación incremental)
        const currentItems = this.allItems();
        const newItems = [...currentItems, ...items];

        // Eliminar duplicados
        const uniqueItems = newItems.filter((item, index, self) =>
          index === self.findIndex(t => t.id === item.id)
        );

        this.allItems.set(uniqueItems);
        this.dataSource.data = uniqueItems;

        // Restaurar selecciones previas
        this.restoreSelections();

        this.isLoading.set(false);
      },
      error: (error) => {
        this.alertService.error('Error', 'No se pudieron cargar los items');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Aplica filtro de búsqueda
   */
  applyFilter() {
    this.loadItems(true);
  }

  /**
   * Maneja cambio de página
   */
  onPageChange() {
    if (!this.paginator.hasNextPage()) {
      this.currentPage++;
      this.loadItems();
    }
  }

  /**
   * Toggle selección de un item
   */
  toggleSelection(item: AvailableItem) {
    const selected = this.selectedItems();

    if (item.selected) {
      // Agregar a seleccionados si no existe
      if (!selected.find(i => i.id === item.id)) {
        this.selectedItems.set([...selected, item]);
      }
    } else {
      // Remover de seleccionados
      this.selectedItems.set(selected.filter(i => i.id !== item.id));
    }
  }

  /**
   * Remueve un item seleccionado
   */
  removeSelection(item: AvailableItem) {
    // Actualizar en la tabla
    const tableItem = this.dataSource.data.find(i => i.id === item.id);
    if (tableItem) {
      tableItem.selected = false;
    }

    // Remover de seleccionados
    const selected = this.selectedItems();
    this.selectedItems.set(selected.filter(i => i.id !== item.id));
  }

  /**
   * Restaura las selecciones en la tabla
   */
  private restoreSelections() {
    const selected = this.selectedItems();
    this.dataSource.data.forEach(item => {
      if (selected.find(s => s.id === item.id)) {
        item.selected = true;
      }
    });
  }

  /**
   * Guarda los items seleccionados
   */
  async save() {
    const selected = this.selectedItems();

    if (selected.length === 0) {
      await this.alertService.warning(
        'Atención',
        'Debe seleccionar al menos un item'
      );
      return;
    }

    const confirmed = await this.alertService.confirm({
      title: this.data.title,
      text: '¿Desea guardar los items seleccionados?',
      icon: 'question'
    });

    if (!confirmed.isConfirmed) return;

    this.loadingService.show();

    const request = {
      level: this.data.level,
      parentKeys: this.data.parentKeys,
      selectedIds: selected.map(item => item.id)
    };

    this.hierarchyService.createItems(request).subscribe({
      next: async () => {
        this.loadingService.hide();
        await this.alertService.success(
          'Éxito',
          `${this.hierarchyService.getLevelName(this.data.level)} agregado correctamente`
        );
        this.dialogRef.close(true);
      },
      error: async (error) => {
        this.loadingService.hide();
        await this.alertService.error(
          'Error',
          error.message || 'No se pudo guardar'
        );
      }
    });
  }

  /**
   * Abre modal para solicitar nueva entidad
   */
  async requestNewEntity() {
    await this.alertService.info(
      'Solicitud de nueva entidad',
      'Esta funcionalidad se implementará próximamente'
    );
    // TODO: Implementar modal de nueva entidad
  }

  /**
   * Cancela y cierra el modal
   */
  cancel() {
    this.dialogRef.close(false);
  }

}
