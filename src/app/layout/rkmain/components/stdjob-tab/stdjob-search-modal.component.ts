import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AlertService } from '../../../../shared/services/alert.service';
import { HierarchyService } from '../../services/hierarchy.service';
import { StdJobModalData, StdJob, StdJobTask, StdJobSelectionResult } from './stdjob-tab.interface';
import { StdjobTaskModalComponent } from './stdjob-task-modal.component';
import {MatRadioModule} from '@angular/material/radio';

@Component({
  selector: 'app-stdjob-search-modal',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatTableModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './stdjob-search-modal.component.html',
  styleUrl: './stdjob-search-modal.component.scss'
})
export class StdjobSearchModalComponent {

 // Servicios
  private hierarchyService = inject(HierarchyService);
  private alertService = inject(AlertService);
  private dialogRef = inject(MatDialogRef<StdjobSearchModalComponent>);
  private data = inject<StdJobModalData>(MAT_DIALOG_DATA);
  private dialog = inject(MatDialog);

  // Signals de estado
  isLoading = signal<boolean>(false);
  stdJobs = signal<StdJob[]>([]);
  selectedStdJob = signal<StdJob | null>(null);
  currentPage = signal<number>(1);

  // Filtros de búsqueda
  codigoFilter = signal<string>('');
  descripcionFilter = signal<string>('');

  // Computed signals
  hasResults = computed(() => this.stdJobs().length > 0);
  hasSelection = computed(() => this.selectedStdJob() !== null);
  isEmpty = computed(() => !this.isLoading() && !this.hasResults());

  // Columnas de la tabla
  displayedColumns = ['select', 'stdJobNo', 'stdJobDesc', 'numTareas', 'actions'];

  ngOnInit(): void {
    // Cargar la primera página al iniciar
    this.searchStdJobs();
  }

  /**
   * Buscar Std Jobs con los filtros actuales
   */
  searchStdJobs(): void {
    // Reiniciar a página 1 cuando se busca
    this.currentPage.set(1);
    this.loadStdJobs();
  }

  /**
   * Cargar Std Jobs de la API
   */
  private loadStdJobs(): void {
    this.isLoading.set(true);
    this.selectedStdJob.set(null);

    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'LISTA_STD_JOB' },
      { name: 'id', value: this.data.areaId },
      { name: 'stdJobNo', value: this.codigoFilter() },
      { name: 'stdJobName', value: this.descripcionFilter() },
      { name: 'pageRequest', value: this.currentPage().toString() }
    ];

    this.hierarchyService.executeGenericAction({ atts }).subscribe({
      next: (response) => {
        this.isLoading.set(false);

        if (response.success) {
          const stdJobs = this.parseStdJobsResponse(response);
          this.stdJobs.set(stdJobs);

          if (stdJobs.length === 0 && this.currentPage() === 1) {
            this.alertService.info(
              'Sin resultados',
              'No se encontraron Std Jobs con los criterios de búsqueda'
            );
          }
        } else {
          this.alertService.error('Error', response.message || 'No se pudieron cargar los Std Jobs');
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Error al buscar Std Jobs:', error);
        this.alertService.error('Error', 'Error al buscar los Std Jobs');
      }
    });
  }

  /**
   * Parsear la respuesta de la API
   */
  private parseStdJobsResponse(response: any): StdJob[] {
    // La respuesta viene en response.data (array directo)
    if (!response?.data || !Array.isArray(response.data)) {
      return [];
    }

    return response.data.map((element: any) => {
      const atts = element.atts || [];
      return {
        stdJobNo: (atts[1]?.value || '').trim(), // Eliminar espacios
        stdJobDesc: (atts[2]?.value || '').trim(), // Eliminar espacios
        numTareas: atts[3]?.value || '0',
        selected: false
      };
    });
  }

  /**
   * Seleccionar un Std Job
   */
  selectStdJob(stdJob: StdJob): void {
    // Marcar el seleccionado y desmarcar los demás
    const updatedStdJobs = this.stdJobs().map(sj => ({
      ...sj,
      selected: sj.stdJobNo === stdJob.stdJobNo
    }));

    this.stdJobs.set(updatedStdJobs);
    this.selectedStdJob.set(stdJob);
  }

  /**
   * Ir a la página anterior
   */
  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.loadStdJobs();
    }
  }

  /**
   * Ir a la página siguiente
   */
  nextPage(): void {
    // Si hay resultados, asumir que puede haber más páginas
    if (this.hasResults()) {
      this.currentPage.update(page => page + 1);
      this.loadStdJobs();
    }
  }

  /**
   * Abrir modal de selección de tarea (opcional)
   * Si no se abre este modal, se asignan TODAS las tareas (*)
   */
  async openTaskSelectionModal(): Promise<void> {
    const selected = this.selectedStdJob();

    if (!selected) {
      this.alertService.warning('Selección requerida', 'Debe seleccionar un Std Job primero');
      return;
    }

    try {
      const taskDialogRef = this.dialog.open(StdjobTaskModalComponent, {
        width: '700px',
        maxWidth: '95vw',
        maxHeight: '80vh',
        disableClose: false,
        data: {
          areaId: this.data.areaId,
          stdJobNo: selected.stdJobNo,
          stdJobDesc: selected.stdJobDesc
        }
      });

      const selectedTask: StdJobTask | undefined = await taskDialogRef.afterClosed().toPromise();

      if (selectedTask) {
        // El usuario seleccionó una tarea específica
        // Cerrar este modal y devolver el resultado completo
        const result: StdJobSelectionResult = {
          stdJob: selected,
          task: selectedTask
        };
        this.dialogRef.close(result);
      }
    } catch (error) {
      console.error('Error abriendo modal de tareas:', error);
      this.alertService.error('Error', 'Error al abrir el modal de tareas');
    }
  }

  /**
   * Guardar selección (con todas las tareas)
   */
  async saveSelection(): Promise<void> {
    const selected = this.selectedStdJob();

    if (!selected) {
      this.alertService.warning('Selección requerida', 'Debe seleccionar un Std Job');
      return;
    }

    // Cerrar el modal con el resultado
    // task: undefined significa que se asignan TODAS las tareas (*)
    const result: StdJobSelectionResult = {
      stdJob: selected,
      task: undefined
    };

    this.dialogRef.close(result);
  }

  /**
   * Limpiar filtros
   */
  clearFilters(): void {
    this.codigoFilter.set('');
    this.descripcionFilter.set('');
    this.currentPage.set(1);
    this.loadStdJobs();
  }

  /**
   * Cerrar modal sin guardar
   */
  cancel(): void {
    this.dialogRef.close();
  }
}
