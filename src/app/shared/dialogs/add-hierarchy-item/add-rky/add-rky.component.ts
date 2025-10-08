import { CommonModule } from '@angular/common';
import { Component, inject, signal, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { AvailableItem, HierarchyManagementService } from '../../../services/hierarchy-management.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { AlertService } from '../../../services/alert.service';


export interface AddRkyDialogData {
  title: string;
  parentKeys: {
    areaId: string;
    procesoId: string;
    subprocesoId: string;
    actividadId: string;
    tareaId: string;
    dimensionId: string;
    riesgoId: string;
  };
  showNewEntityButton?: boolean;
}
@Component({
  selector: 'app-add-rky',
  imports: [CommonModule,
    MatDialogModule,
    MatStepperModule,
    MatTableModule,
    MatPaginatorModule,
    MatCheckboxModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    FormsModule,
    ReactiveFormsModule],
  templateUrl: './add-rky.component.html',
  styleUrl: './add-rky.component.scss'
})
export class AddRkyComponent {

  data = inject<AddRkyDialogData>(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef<AddRkyComponent>);
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

  // Lists para selects
  probabilityList = signal<any[]>([]);
  severityList = signal<any[]>([]);
  criticalityLevel = signal<any>(null);

  // Form controls
  probabilityPureControl = new FormControl('', Validators.required);
  severityPureControl = new FormControl('', Validators.required);

  ngOnInit() {
    this.loadItems();
    this.loadProbabilityList();
    this.loadSeverityList();
  }

  loadItems(reset = false) {
    if (reset) {
      this.currentPage = 1;
      this.allItems.set([]);
    }

    this.isLoading.set(true);

    this.hierarchyService.getAvailableItems(
      'RKY',
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
          this.alertService.info('Información', 'No se encontraron consecuencias');
          this.isLoading.set(false);
          return;
        }

        const currentItems = this.allItems();
        const newItems = [...currentItems, ...items];
        const uniqueItems = newItems.filter((item, index, self) =>
          index === self.findIndex(t => t.id === item.id)
        );

        this.allItems.set(uniqueItems);
        this.dataSource.data = uniqueItems;
        this.restoreSelections();
        this.isLoading.set(false);
      },
      error: () => {
        this.alertService.error('Error', 'No se pudieron cargar las consecuencias');
        this.isLoading.set(false);
      }
    });
  }

  loadProbabilityList() {
    this.hierarchyService.getProbabilityList().subscribe({
      next: (list) => this.probabilityList.set(list)
    });
  }

  loadSeverityList() {
    this.hierarchyService.getSeverityList().subscribe({
      next: (list) => this.severityList.set(list)
    });
  }

  applyFilter() {
    this.loadItems(true);
  }

  onPageChange() {
    if (!this.paginator.hasNextPage()) {
      this.currentPage++;
      this.loadItems();
    }
  }

  toggleSelection(item: AvailableItem) {
    const selected = this.selectedItems();

    if (item.selected) {
      if (!selected.find(i => i.id === item.id)) {
        this.selectedItems.set([...selected, item]);
      }
    } else {
      this.selectedItems.set(selected.filter(i => i.id !== item.id));
    }
  }

  removeSelection(item: AvailableItem) {
    const tableItem = this.dataSource.data.find(i => i.id === item.id);
    if (tableItem) {
      tableItem.selected = false;
    }
    const selected = this.selectedItems();
    this.selectedItems.set(selected.filter(i => i.id !== item.id));
  }

  private restoreSelections() {
    const selected = this.selectedItems();
    this.dataSource.data.forEach(item => {
      if (selected.find(s => s.id === item.id)) {
        item.selected = true;
      }
    });
  }

  goToRiskEvaluation() {
    if (this.selectedItems().length === 0) {
      this.alertService.warning('Atención', 'Debe seleccionar al menos una consecuencia');
      return;
    }
    // El stepper avanzará automáticamente
  }

  calculateCriticality() {
    const probability = this.probabilityPureControl.value;
    const severity = this.severityPureControl.value;

    if (!probability || !severity) {
      this.criticalityLevel.set(null);
      return;
    }

    this.hierarchyService.calculateCriticality(
      this.data.parentKeys.dimensionId,
      probability,
      severity
    ).subscribe({
      next: (result) => {
        this.criticalityLevel.set(result);
      }
    });
  }

  isRiskEvaluationValid(): boolean {
    return this.probabilityPureControl.valid &&
           this.severityPureControl.valid &&
           this.criticalityLevel() !== null;
  }

  async save() {
    if (!this.isRiskEvaluationValid()) {
      await this.alertService.warning('Atención', 'Complete todos los campos de evaluación de riesgo');
      return;
    }

    const confirmed = await this.alertService.confirm({
      title: 'Agregar Consecuencia',
      text: '¿Desea guardar las consecuencias con la evaluación de riesgo?',
      icon: 'question'
    });

    if (!confirmed.isConfirmed) return;

    this.loadingService.show();

    const request = {
      level: 'RKY' as const,
      parentKeys: this.data.parentKeys,
      selectedIds: this.selectedItems().map(item => item.id),
      riskEvaluation: {
        riesgoPuroP: this.probabilityPureControl.value!,
        riesgoPuroS: this.severityPureControl.value!,
        riesgoPuroC: this.criticalityLevel()?.id || '',
        riesgoResidualP: '',
        riesgoResidualS: '',
        riesgoResidualC: ''
      }
    };

    this.hierarchyService.createItems(request).subscribe({
      next: async () => {
        this.loadingService.hide();
        await this.alertService.success('Éxito', 'Consecuencia agregada correctamente');
        this.dialogRef.close(true);
      },
      error: async (error) => {
        this.loadingService.hide();
        await this.alertService.error('Error', error.message || 'No se pudo guardar');
      }
    });
  }

  async requestNewEntity() {
    await this.alertService.info(
      'Solicitud de nueva entidad',
      'Esta funcionalidad se implementará próximamente'
    );
  }

  cancel() {
    this.dialogRef.close(false);
  }

}
