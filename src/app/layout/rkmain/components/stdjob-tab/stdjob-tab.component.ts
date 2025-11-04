import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AlertService } from '../../../../shared/services/alert.service';
import { HierarchyService } from '../../services/hierarchy.service';
import { StdJobAssociated, StdJobSelectionResult } from './stdjob-tab.interface';
import { StdjobSearchModalComponent } from './stdjob-search-modal.component';

@Component({
  selector: 'app-stdjob-tab',
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './stdjob-tab.component.html',
  styleUrl: './stdjob-tab.component.scss'
})
export class StdjobTabComponent {

   // Inyección de dependencias (Angular 19 style)
  private hierarchyService = inject(HierarchyService);
  private alertService = inject(AlertService);
  private dialog = inject(MatDialog);

  // Inputs desde el componente padre
  areaId = input.required<string>();
  procesoId = input.required<string>();
  subprocesoId = input.required<string>();
  actividadId = input.required<string>();
  tareaId = input<string>(''); // ← Opcional: para RKT (tarea)
  statusId = input.required<string>();
  versionId = input.required<string>();
  autoLoad = input<boolean>(false);

  // Signals de estado
  isLoading = signal<boolean>(false);
  stdJobsAssociated = signal<StdJobAssociated[]>([]);
  hasLoaded = signal<boolean>(false);

  // Computed signals
  hasStdJobs = computed(() => this.stdJobsAssociated().length > 0);
  isEmpty = computed(() => !this.isLoading() && !this.hasStdJobs() && this.hasLoaded());

  // ✅ Nuevo: Detectar si es modo tarea (RKT) o actividad (RKC)
  isTareaMode = computed(() => this.tareaId() !== '' && this.tareaId() !== undefined);

  // Columnas de la tabla
  displayedColumns = ['stdJobNo', 'stdJobDesc', 'stdJobTaskNo', 'taskDesc', 'actions'];

  constructor(){

      effect(() => {
    const areaId = this.areaId();
    const procesoId = this.procesoId();
    const subprocesoId = this.subprocesoId();
    const actividadId = this.actividadId();
    const tareadId = this.tareaId();

    // Si algún ID cambió, resetear el flag para que vuelva a cargar
    if (areaId && procesoId && subprocesoId && actividadId && tareadId) {
      this.hasLoaded.set(false);
    }
  });
  }

  initTab(): void {
  if (!this.hasLoaded() && this.areaId() && this.procesoId() &&
      this.subprocesoId() && this.actividadId()) {
    this.loadData();
    this.hasLoaded.set(true);
  }
}

  /**
   * Cargar datos (llamado por lazy loading desde el padre)
   */
  loadData(): void {
    // Evitar cargar múltiples veces
    if (this.hasLoaded()) {
      return;
    }

    this.loadStdJobsAssociated();
  }

  /**
   * Cargar Std Jobs ya asociados a la actividad/tarea
   */
  private loadStdJobsAssociated(): void {
    this.isLoading.set(true);

    // ✅ Usar acción diferente según el modo
    const action = this.isTareaMode() ? 'TAREA_READ_STDJOB' : 'ACTIVIDAD_READ_STDJOB';

    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: action },
      { name: 'areaId', value: this.areaId() },
      { name: 'procesoId', value: this.procesoId() },
      { name: 'subprocesoId', value: this.subprocesoId() },
      { name: 'actividadId', value: this.actividadId() }
    ];

    // ✅ Agregar tareaId solo si estamos en modo tarea
    if (this.isTareaMode()) {
      atts.push({ name: 'tareaId', value: this.tareaId() });
    }

    this.hierarchyService.executeGenericAction({ atts }).subscribe({
      next: (response) => {
        const stdJobs = this.parseStdJobsAssociated(response);
        this.stdJobsAssociated.set(stdJobs);
        this.hasLoaded.set(true);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error cargando Std Jobs asociados:', error);
        this.alertService.error(
          'Error',
          'No se pudieron cargar los Std Jobs asociados'
        );
        this.hasLoaded.set(true);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Parsear respuesta del backend a StdJobAssociated[]
   */
  private parseStdJobsAssociated(response: any): StdJobAssociated[] {
    // La respuesta puede venir en response.data o response.element.elements
    const dataArray = response?.data || response?.element?.elements;

    if (!dataArray || !Array.isArray(dataArray)) {
      return [];
    }

    return dataArray.map((element: any) => {
      const atts = element.atts || [];
      return {
        offset: atts[0]?.value || '',
        stdJobNo: (atts[1]?.value || '').trim(), // Eliminar espacios
        stdJobDesc: (atts[2]?.value || '').trim(), // Eliminar espacios
        stdJobTaskNo: (atts[3]?.value || '').trim(), // Eliminar espacios
        taskDesc: (atts[4]?.value || '').trim(), // Eliminar espacios
        canDelete: atts[9]?.value === '1' || atts[9]?.value === 'Y' // Ambos formatos
      };
    });
  }

  /**
   * Abrir modal para agregar nuevo Std Job
   */
  async openAddStdJobModal(): Promise<void> {
    try {
      const dialogRef = this.dialog.open(StdjobSearchModalComponent, {
        width: '900px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        disableClose: false,
        data: {
          areaId: this.areaId(),
          currentPage: 1
        }
      });

      const result: StdJobSelectionResult | undefined = await dialogRef.afterClosed().toPromise();

      if (result) {
        await this.createStdJobAssociation(result);
      }
    } catch (error) {
      console.error('Error abriendo modal:', error);
      this.alertService.error('Error', 'Error al abrir el modal de búsqueda');
    }
  }

  /**
   * Crear asociación de Std Job con la actividad/tarea
   */
  private async createStdJobAssociation(selection: StdJobSelectionResult): Promise<void> {
    this.alertService.showLoading('Guardando Std Job...');

    const action = this.isTareaMode() ? 'TAREA_STJB_CREATE' : 'ACTIVIDAD_STJB_CREATE';

    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: action },
      { name: 'areaId', value: this.areaId() },
      { name: 'procesoId', value: this.procesoId() },
      { name: 'subprocesoId', value: this.subprocesoId() },
      { name: 'actividadId', value: this.actividadId() }
    ];

    // ✅ Agregar tareaId si estamos en modo tarea
    if (this.isTareaMode()) {
      atts.push({ name: 'tareaId', value: this.tareaId() });
    }

    // Agregar datos del Std Job
    atts.push({ name: 'stdJobNo1', value: selection.stdJob.stdJobNo });
    atts.push({ name: 'stdJobTaskNo1', value: selection.task?.stdJobTask || '*' }); // '*' = todas las tareas
    atts.push({ name: 'statusId', value: this.statusId() });
    atts.push({ name: 'versionId', value: this.versionId() });

    this.hierarchyService.executeGenericAction({ atts }).subscribe({
      next: (response) => {
        this.alertService.closeLoading();

        if (response.success) {
          this.alertService.toast('success', 'Std Job agregado exitosamente');
          // Recargar la lista
          this.hasLoaded.set(false);
          this.loadStdJobsAssociated();
        } else {
          this.alertService.error('Error', response.message || 'No se pudo agregar el Std Job');
        }
      },
      error: (error) => {
        console.error('Error creando asociación:', error);
        this.alertService.closeLoading();
        this.alertService.error('Error', 'No se pudo agregar el Std Job');
      }
    });
  }

  /**
   * Eliminar asociación de Std Job
   */
  async deleteStdJob(stdJob: StdJobAssociated): Promise<void> {
    // Validar que se pueda eliminar
    if (!stdJob.canDelete) {
      this.alertService.warning(
        'No permitido',
        'No se puede eliminar este Std Job'
      );
      return;
    }

    // Confirmar eliminación
    const result = await this.alertService.confirmDelete(
      `¿Está seguro de eliminar el Std Job "${stdJob.stdJobNo}"?`
    );

    if (!result.isConfirmed) {
      return;
    }

    this.alertService.showLoading('Eliminando Std Job...');

    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'ACTIVIDAD_STJB_DELETE' },
      { name: 'areaId', value: this.areaId() },
      { name: 'procesoId', value: this.procesoId() },
      { name: 'subprocesoId', value: this.subprocesoId() },
      { name: 'actividadId', value: this.actividadId() }
    ];

    // ✅ Agregar tareaId si estamos en modo tarea
    if (this.isTareaMode()) {
      atts.push({ name: 'tareaId', value: this.tareaId() });
    }

    // Agregar datos del Std Job a eliminar
    atts.push({ name: 'stdJobNo1', value: stdJob.stdJobNo });
    atts.push({ name: 'stdJobTaskNo1', value: stdJob.stdJobTaskNo });
    atts.push({ name: 'statusId', value: this.statusId() });
    atts.push({ name: 'versionId', value: this.versionId() });

    this.hierarchyService.executeGenericAction({ atts }).subscribe({
      next: () => {
        this.alertService.closeLoading();
        this.alertService.toast('success', 'Std Job eliminado exitosamente');

        // Actualizar la lista local (optimista)
        const currentList = this.stdJobsAssociated();
        const updatedList = currentList.filter(item =>
          !(item.stdJobNo === stdJob.stdJobNo && item.stdJobTaskNo === stdJob.stdJobTaskNo)
        );
        this.stdJobsAssociated.set(updatedList);
      },
      error: (error) => {
        console.error('Error eliminando Std Job:', error);
        this.alertService.closeLoading();
        this.alertService.error(
          'Error',
          'No se pudo eliminar el Std Job'
        );
      }
    });
  }

  /**
   * Recargar datos manualmente
   */
  refresh(): void {
    this.hasLoaded.set(false);
    this.loadStdJobsAssociated();
  }

}
