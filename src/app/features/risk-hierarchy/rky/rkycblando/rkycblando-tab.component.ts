import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AlertService } from '../../../../shared/services/alert.service';
import { HierarchyService } from '../../../../layout/rkmain/services/hierarchy.service';
import { RkycblandoComponent } from './rkycblando.component';

/**
 * Interface para control blando asociado
 */
export interface ControlBlandoAssociated {
  offset: string;
  id: string;
  descripcion: string;
  codigo?: string;
  tipo?: string;
  canDelete: boolean;
}

/**
 * Componente tab para gestionar controles blandos asociados a una consecuencia.
 *
 * Funcionalidades:
 * - Visualizar controles blandos asociados en una tabla
 * - Agregar nuevos controles (abre modal)
 * - Eliminar controles existentes
 * - Carga lazy (solo cuando se selecciona el tab)
 *
 * @example
 * ```html
 * <app-rkycblando-tab
 *   #cblandoTab
 *   [areaId]="areaId()"
 *   [procesoId]="procesoId()"
 *   [subprocesoId]="subprocesoId()"
 *   [actividadId]="actividadId()"
 *   [tareaId]="tareaId()"
 *   [dimensionId]="dimensionId()"
 *   [riesgoId]="riesgoId()"
 *   [consecuenciaId]="consecuenciaId()"
 *   [autoLoad]="false" />
 * ```
 */
@Component({
  selector: 'app-rkycblando-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './rkycblando-tab.component.html',
  styleUrl: './rkycblando-tab.component.scss'
})
export class RkycblandoTabComponent {
  // ==================== DEPENDENCIES ====================
  private hierarchyService = inject(HierarchyService);
  private alertService = inject(AlertService);
  private dialog = inject(MatDialog);

  // ==================== INPUTS ====================
  /** ID del área */
  areaId = input.required<string>();

  /** ID del proceso */
  procesoId = input.required<string>();

  /** ID del subproceso */
  subprocesoId = input.required<string>();

  /** ID de la actividad */
  actividadId = input.required<string>();

  /** ID de la tarea */
  tareaId = input.required<string>();

  /** ID de la dimensión */
  dimensionId = input.required<string>();

  /** ID del riesgo */
  riesgoId = input.required<string>();

  /** ID de la consecuencia */
  consecuenciaId = input.required<string>();

  /** Cargar automáticamente al inicializar */
  autoLoad = input<boolean>(false);

  // ==================== SIGNALS ====================
  /** Estado de carga */
  isLoading = signal<boolean>(false);

  /** Lista de controles blandos asociados */
  controlesBlandos = signal<ControlBlandoAssociated[]>([]);

  /** Flag para controlar si ya se cargó la data */
  hasLoaded = signal<boolean>(false);

  // ==================== COMPUTED ====================
  /** Indica si hay controles blandos */
  hasControles = computed(() => this.controlesBlandos().length > 0);

  /** Indica si está vacío (sin loading y sin datos) */
  isEmpty = computed(() => !this.isLoading() && !this.hasControles() && this.hasLoaded());

  // ==================== TABLE CONFIGURATION ====================
  displayedColumns = ['id', 'descripcion', 'actions'];

  // ==================== CONSTRUCTOR ====================
  constructor() {
    // Effect para resetear cuando cambien los IDs
    effect(() => {
      const areaId = this.areaId();
      const procesoId = this.procesoId();
      const subprocesoId = this.subprocesoId();
      const actividadId = this.actividadId();
      const tareaId = this.tareaId();
      const dimensionId = this.dimensionId();
      const riesgoId = this.riesgoId();
      const consecuenciaId = this.consecuenciaId();

      // Si algún ID cambió, resetear el flag
      if (areaId && procesoId && subprocesoId && actividadId &&
          tareaId && dimensionId && riesgoId && consecuenciaId) {
        this.hasLoaded.set(false);
      }
    });
  }

  // ==================== LIFECYCLE ====================
  /**
   * Método llamado por el componente padre cuando se selecciona el tab
   * Implementa lazy loading
   */
  initTab(): void {
    if (!this.hasLoaded() && this.areaId() && this.procesoId() &&
        this.subprocesoId() && this.actividadId() && this.tareaId() &&
        this.dimensionId() && this.riesgoId() && this.consecuenciaId()) {
      this.loadData();
      this.hasLoaded.set(true);
    }
  }

  /**
   * Cargar datos (puede ser llamado manualmente)
   */
  loadData(): void {
    // Evitar cargar múltiples veces
    if (this.hasLoaded()) {
      return;
    }

    this.loadControlesBlandos();
  }

  // ==================== DATA LOADING ====================
  /**
   * Cargar controles blandos asociados a la consecuencia
   */
  private loadControlesBlandos(): void {
    this.isLoading.set(true);

    this.hierarchyService.searchControlesBlandos(
      this.areaId(),
      this.procesoId(),
      this.subprocesoId(),
      this.actividadId(),
      this.tareaId(),
      this.dimensionId(),
      this.riesgoId(),
      this.consecuenciaId()
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const controles = this.parseControlesBlandos(response.data);
          this.controlesBlandos.set(controles);
        } else {
          this.controlesBlandos.set([]);
        }
        this.hasLoaded.set(true);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error cargando controles blandos:', error);
        this.alertService.error(
          'Error',
          'No se pudieron cargar los controles blandos'
        );
        this.controlesBlandos.set([]);
        this.hasLoaded.set(true);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Parsear respuesta del backend a ControlBlandoAssociated[]
   */
  private parseControlesBlandos(data: any[]): ControlBlandoAssociated[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((element: any) => {
      const atts = element.atts || [];
      return {
        offset: atts[0]?.value || '',
        id: (atts[1]?.value || '').trim(),
        descripcion: (atts[2]?.value || '').trim(),
        codigo: (atts[3]?.value || '').trim(),
        tipo: (atts[4]?.value || '').trim(),
        canDelete: atts[5]?.value === '1' || atts[5]?.value === 'Y'
      };
    });
  }

  // ==================== ACTIONS ====================
  /**
   * Abrir modal para agregar nuevos controles blandos
   */
  async openAddControlesBlandosModal(): Promise<void> {
    try {
      const dialogRef = this.dialog.open(RkycblandoComponent, {
        width: '900px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        disableClose: true,
        data: {
          title: 'Agregar Controles Blandos',
          areaId: this.areaId(),
          procesoId: this.procesoId(),
          subprocesoId: this.subprocesoId(),
          actividadId: this.actividadId(),
          tareaId: this.tareaId(),
          dimensionId: this.dimensionId(),
          riesgoId: this.riesgoId(),
          consecuenciaId: this.consecuenciaId(),
          button_confirm: 'Guardar',
          button_close: 'Cancelar'
        }
      });

      const result = await dialogRef.afterClosed().toPromise();

      if (result?.success) {
        this.alertService.toast('success', 'Controles blandos agregados exitosamente');
        // Recargar la lista
        this.hasLoaded.set(false);
        this.loadControlesBlandos();
      }
    } catch (error) {
      console.error('Error abriendo modal:', error);
      this.alertService.error('Error', 'Error al abrir el modal de controles blandos');
    }
  }

  /**
   * Eliminar un control blando asociado
   */
  async deleteControlBlando(control: ControlBlandoAssociated): Promise<void> {
    // Validar que se pueda eliminar
    if (!control.canDelete) {
      this.alertService.warning(
        'No permitido',
        'No se puede eliminar este control blando'
      );
      return;
    }

    // Confirmar eliminación
    const result = await this.alertService.confirmDelete(
      `¿Está seguro de eliminar el control blando "${control.id} - ${control.descripcion}"?`
    );

    if (!result.isConfirmed) {
      return;
    }

    this.alertService.showLoading('Eliminando control blando...');

    this.hierarchyService.deleteControlBlando(
      this.areaId(),
      this.procesoId(),
      this.subprocesoId(),
      this.actividadId(),
      this.tareaId(),
      this.dimensionId(),
      this.riesgoId(),
      this.consecuenciaId(),
      control.id
    ).subscribe({
      next: (response) => {
        this.alertService.closeLoading();

        if (response.success) {
          this.alertService.toast('success', 'Control blando eliminado exitosamente');

          // Actualizar la lista local (optimista)
          const currentList = this.controlesBlandos();
          const updatedList = currentList.filter(item => item.id !== control.id);
          this.controlesBlandos.set(updatedList);
        } else {
          this.alertService.error(
            'Error',
            response.message || 'No se pudo eliminar el control blando'
          );
        }
      },
      error: (error) => {
        console.error('Error eliminando control blando:', error);
        this.alertService.closeLoading();
        this.alertService.error(
          'Error',
          'No se pudo eliminar el control blando'
        );
      }
    });
  }

  /**
   * Recargar datos manualmente
   */
  refresh(): void {
    this.hasLoaded.set(false);
    this.loadControlesBlandos();
  }
}
