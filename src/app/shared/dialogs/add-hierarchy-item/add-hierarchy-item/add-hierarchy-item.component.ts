import { Component, OnInit, Inject, signal, inject, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { HierarchyService } from '../../../../layout/rkmain/services/hierarchy.service';
import { ApprovalFlowService } from '../../../../layout/rkmain/services/approval-flow.service';
import { AlertService } from '../../../services/alert.service';
import { firstValueFrom } from 'rxjs';
import { NuevaEntidadComponent } from '../../nueva-entidad/nueva-entidad.component';

export interface AddItemData {
  title: string;
  level: string;
  parentKeys: any;
  showNewEntityButton?: boolean;
}

export interface SelectableItem {
  id: string;
  descripcion: string;
  selected: boolean;
}

@Component({
  selector: 'app-add-hierarchy-item',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './add-hierarchy-item.component.html',
  styleUrls: ['./add-hierarchy-item.component.scss']
})
export class AddHierarchyItemComponent implements OnInit {
  // Servicios
  private dialogRef = inject(MatDialogRef<AddHierarchyItemComponent>);
  private hierarchyService = inject(HierarchyService);
  private approvalFlowService = inject(ApprovalFlowService);
  private alertService = inject(AlertService);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  // Datos
  public data: AddItemData;

  constructor(@Inject(MAT_DIALOG_DATA) data: AddItemData) {
    this.data = data || {
      title: 'Agregar Item',
      level: 'RKA',
      parentKeys: {},
      showNewEntityButton: false
    };
  }

  // Signals
  allItems = signal<SelectableItem[]>([]);
  selectedItems = signal<SelectableItem[]>([]);
  isLoading = signal<boolean>(false);
  hasMoreItems = signal<boolean>(true);
  currentIndex = signal<number>(1);
  searchTerm = '';
  searchTimeout: any = null;

  // Computed
  hasSelectedItems = computed(() => this.selectedItems().length > 0);

  ngOnInit(): void {
    this.loadItems(1);
  }

  loadMoreItems(): void {
    if (this.hasMoreItems() && !this.isLoading()) {
      const nextIndex = this.currentIndex() + 1;
      this.loadItems(nextIndex);
    }
  }

  async loadItems(index: number): Promise<void> {
    if (this.isLoading()) return;

    this.isLoading.set(true);

    const action = this.getListAction();

    const atts: any[] = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: action },
      ...this.buildParentKeysParams(),
      { name: 'index', value: index.toString() }
    ];

    try {
      const response = await firstValueFrom(
        this.approvalFlowService.generic(atts)
      );

      if (response?.success && response.data?.length > 0) {
        const newItems: SelectableItem[] = response.data.map((element: any) => ({
          id: element.atts[0].value.trim(),
          descripcion: element.atts[2]?.value.trim() || element.atts[1]?.value.trim(),
          selected: false
        }));

        this.allItems.update(current => {
          const combined = [...current, ...newItems];
          const unique = combined.filter((item, index, self) =>
            index === self.findIndex(t => t.id === item.id)
          );
          return unique.sort((a, b) => a.id.localeCompare(b.id));
        });

        this.currentIndex.set(index);

        if (newItems.length < 100) {
          this.hasMoreItems.set(false);
        }

        console.log(`✅ Cargados ${newItems.length} items (Total: ${this.allItems().length})`);
      } else {
        this.hasMoreItems.set(false);

        if (index === 1 && this.allItems().length === 0) {
          await this.alertService.info('No se encontraron items disponibles');
        }
      }
    } catch (error) {
      console.error('Error al cargar items:', error);
      await this.alertService.error('Error al cargar los items');
    } finally {
      this.isLoading.set(false);
    }
  }

  getFilteredItems(): SelectableItem[] {
    return this.allItems();
  }

  onSearchChange(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (!this.searchTerm || this.searchTerm.trim().length === 0) {
      this.resetAndLoadAll();
      return;
    }

    if (this.searchTerm.trim().length < 2) {
      return;
    }

    this.searchTimeout = setTimeout(() => {
      this.searchInServer();
    }, 500);
  }

  private async searchInServer(): Promise<void> {
    this.isLoading.set(true);
    this.hasMoreItems.set(false);

    const action = this.getListAction();

    const atts: any[] = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: action },
      ...this.buildParentKeysParams(),
      { name: 'lookupName', value: `%${this.searchTerm.trim()}` }
    ];

    try {
      const response = await firstValueFrom(
        this.approvalFlowService.generic(atts)
      );

      if (response?.success && response.data?.length > 0) {
        const searchItems: SelectableItem[] = response.data.map((element: any) => ({
          id: element.atts[0].value.trim(),
          descripcion: element.atts[2]?.value.trim() || element.atts[1]?.value.trim(),
          selected: false
        }));

        this.allItems.set(searchItems.sort((a, b) => a.id.localeCompare(b.id)));
      } else {
        this.allItems.set([]);
        await this.alertService.info('No se encontraron resultados');
      }
    } catch (error) {
      console.error('Error en búsqueda:', error);
      await this.alertService.error('Error al buscar');
    } finally {
      this.isLoading.set(false);
    }
  }

  private resetAndLoadAll(): void {
    this.allItems.set([]);
    this.currentIndex.set(1);
    this.hasMoreItems.set(true);
    this.loadItems(1);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.resetAndLoadAll();
  }

  toggleSelection(item: SelectableItem): void {
    const originalItem = this.allItems().find(i => i.id === item.id);
    if (!originalItem) return;

    originalItem.selected = !originalItem.selected;

    if (originalItem.selected) {
      const exists = this.selectedItems().some(i => i.id === originalItem.id);
      if (!exists) {
        this.selectedItems.update(items => [...items, originalItem]);
      }
    } else {
      this.selectedItems.update(items =>
        items.filter(i => i.id !== originalItem.id)
      );
    }

    this.allItems.set([...this.allItems()]);
    this.cdr.detectChanges();
  }

  selectAllVisible(): void {
    const visible = this.getFilteredItems();
    let addedCount = 0;

    visible.forEach(item => {
      const originalItem = this.allItems().find(i => i.id === item.id);
      if (originalItem && !originalItem.selected) {
        originalItem.selected = true;

        const exists = this.selectedItems().some(i => i.id === originalItem.id);
        if (!exists) {
          this.selectedItems.update(items => [...items, originalItem]);
          addedCount++;
        }
      }
    });

    this.allItems.set([...this.allItems()]);
    this.cdr.detectChanges();

    this.alertService.toast('success', `${addedCount} items seleccionados`);
  }

  clearAllSelections(): void {
    this.allItems().forEach(item => item.selected = false);
    this.selectedItems.set([]);
    this.allItems.set([...this.allItems()]);
    this.cdr.detectChanges();
    this.alertService.toast('info', 'Selección limpiada');
  }

  removeSelectedItem(item: SelectableItem): void {
    const originalItem = this.allItems().find(i => i.id === item.id);
    if (originalItem) {
      originalItem.selected = false;
    }

    this.selectedItems.update(items =>
      items.filter(i => i.id !== item.id)
    );

    this.allItems.set([...this.allItems()]);
    this.cdr.detectChanges();
  }

  getTotalCount(): number {
    return this.allItems().length;
  }

  getVisibleCount(): number {
    return this.getFilteredItems().length;
  }

  async save(): Promise<void> {
    if (!this.hasSelectedItems()) {
      await this.alertService.warning(
        'Sin selección',
        'Debe seleccionar al menos un elemento'
      );
      return;
    }

    const result = await this.alertService.confirm({
      title: this.data.title,
      text: `¿Desea agregar ${this.selectedItems().length} elemento(s)?`,
      icon: 'question'
    });

    if (!result.isConfirmed) return;

    this.isLoading.set(true);

    const selectedIds = this.selectedItems().map(item => item.id).join(',');

    const action = this.getCreateAction();
    const atts: any[] = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: action },
      ...this.buildParentKeysParams(),
      { name: this.getIdParamName(), value: selectedIds }
    ];

    try {
      const response = await firstValueFrom(
        this.approvalFlowService.generic(atts)
      );

      if (response?.success && response.data?.[0]?.atts?.[1]) {
        await this.alertService.success(
          'Éxito',
          `${this.selectedItems().length} elemento(s) agregado(s) correctamente`
        );
        this.dialogRef.close(true);
      } else {
        await this.alertService.error(
          'Error',
          response?.message || 'No se pudieron agregar los elementos'
        );
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      await this.alertService.error('Error', 'Ocurrió un error al guardar');
    } finally {
      this.isLoading.set(false);
    }
  }

  private getListAction(): string {
    const actions: Record<string, string> = {
      'RKA': 'AREA_LIST',
      'RKP': 'PROCESO_LIST',
      'RKS': 'SUBPROCESO_LIST',
      'RKC': 'ACTIVIDAD_LIST',
      'RKT': 'TAREA_LIST',
      'RKD': 'DIMENSION_LIST',
      'RKR': 'RIESGO_LIST'
    };
    return actions[this.data.level] || 'AREA_LIST';
  }

  private getCreateAction(): string {
    const actions: Record<string, string> = {
      'RKA': 'AREA_CREATE',
      'RKP': 'PROCESO_CREATE',
      'RKS': 'SUBPROCESO_CREATE',
      'RKC': 'ACTIVIDAD_CREATE',
      'RKT': 'TAREA_CREATE',
      'RKD': 'DIMENSION_CREATE',
      'RKR': 'RIESGO_CREATE'
    };
    return actions[this.data.level] || 'AREA_CREATE';
  }

  private getIdParamName(): string {
    const params: Record<string, string> = {
      'RKA': 'areaId',
      'RKP': 'procesoId',
      'RKS': 'subprocesoId',
      'RKC': 'actividadId',
      'RKT': 'tareaId',
      'RKD': 'dimensionId',
      'RKR': 'riesgoId'
    };
    return params[this.data.level] || 'areaId';
  }

  private buildParentKeysParams(): any[] {
    const params: any[] = [];
    const keys = this.data.parentKeys;

    if (keys.areaId) params.push({ name: 'areaId', value: keys.areaId });
    if (keys.procesoId) params.push({ name: 'procesoId', value: keys.procesoId });
    if (keys.subprocesoId) params.push({ name: 'subprocesoId', value: keys.subprocesoId });
    if (keys.actividadId) params.push({ name: 'actividadId', value: keys.actividadId });
    if (keys.tareaId) params.push({ name: 'tareaId', value: keys.tareaId });
    if (keys.dimensionId) params.push({ name: 'dimensionId', value: keys.dimensionId });
    if (keys.riesgoId) params.push({ name: 'riesgoId', value: keys.riesgoId });

    return params;
  }

  openNewEntity(): void {
    const entityTypeMap: Record<string, { code: string, title: string }> = {
      'RKA': { code: '+RKA', title: 'Áreas' },
      'RKP': { code: '+RKP', title: 'Procesos' },
      'RKS': { code: '+RKS', title: 'Subprocesos' },
      'RKC': { code: '+RKC', title: 'Actividades' },
      'RKT': { code: '+RKT', title: 'Tareas' },
      'RKD': { code: '+RKD', title: 'Dimensiones' },
      'RKR': { code: '+RKR', title: 'Riesgos' },
      'RKY': { code: '+RKY', title: 'Consecuencias' }
    };

    const entityConfig = entityTypeMap[this.data.level];

    if (!entityConfig) {
      this.alertService.error('Error', 'No se puede crear este tipo de entidad');
      return;
    }

    const dialogRef = this.dialog.open(NuevaEntidadComponent, {
      width: '900px',
      maxHeight: '90vh',
      data: {
        titulo: `Agregar ${entityConfig.title}`,
        tabla: entityConfig.code
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.success) {
        this.alertService.toast('success', `${result.count} ${entityConfig.title.toLowerCase()} creadas`, 2000);

        // Recargar items manteniendo selecciones
        const currentSelections = this.selectedItems().map(item => item.id);
        this.allItems.set([]);
        this.currentIndex.set(1);
        this.hasMoreItems.set(true);
        this.loadItems(1).then(() => {
          if (currentSelections.length > 0) {
            this.allItems().forEach(item => {
              if (currentSelections.includes(item.id)) {
                item.selected = true;
                if (!this.selectedItems().some(i => i.id === item.id)) {
                  this.selectedItems.update(items => [...items, item]);
                }
              }
            });
            this.allItems.set([...this.allItems()]);
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
