import { Component, inject, signal, computed, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { HierarchyService } from '../../../../../layout/rkmain/services/hierarchy.service';
import { AlertService } from '../../../../../shared/services/alert.service';



/**
 * Interface para Control Blando
 */
export interface ControlBlando {
  id: string;           // → cblandoId (para delete)
  codigo: string;       // → Mostrado en tabla
  descripcion: string;  // → Mostrado en tabla
  tipo?: string;        // → Mostrado en tabla
  version?: string;     // → versionId (para delete)
  status?: string;      // → statusId (para delete)
}

/**
 * Componente TAB para gestionar Controles Blandos asociados a una consecuencia.
 *
 * Características:
 * - Lista los controles blandos asociados
 * - Permite agregar nuevos controles (abre modal hijo)
 * - Permite eliminar controles asociados
 * - Uso de signals para estado reactivo
 * - Lazy loading del modal hijo
 *
 * @example
 * ```html
 * <app-rky-controles-blandos
 *   [ids]="nodeIds()"
 *   [disabled]="isDisabled()">
 * </app-rky-controles-blandos>
 * ```
 */
@Component({
  selector: 'app-rky-controles-blandos',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MatCardModule
  ],
  templateUrl: './rky-controles-blandos.component.html',
  styleUrl: './rky-controles-blandos.component.scss'
})
export class RkyControlesBlandosComponent implements OnInit {
  // ==================== DEPENDENCIES ====================
  private readonly dialog = inject(MatDialog);
  private readonly hierarchyService = inject(HierarchyService);
  private readonly alertService = inject(AlertService);

  // ==================== INPUTS ====================
  /** IDs jerárquicos [areaId, procesoId, ..., consecuenciaId] */
  @Input({ required: true }) ids!: string[];

  /** Deshabilita las acciones (agregar/eliminar) */
  @Input() disabled: boolean = false;

  // ==================== SIGNALS ====================
  /** Lista de controles blandos asociados */
  readonly controlesBlandos = signal<ControlBlando[]>([]);

  /** Flag de carga inicial */
  readonly isLoading = signal<boolean>(true);

  // ==================== COMPUTED ====================
  /** Verifica si hay controles para mostrar */
  readonly hasControles = computed(() => this.controlesBlandos().length > 0);

  /** Contador de controles */
  readonly controlesCount = computed(() => this.controlesBlandos().length);

  // ==================== TABLE CONFIG ====================
  readonly displayedColumns: string[] = ['codigo', 'descripcion', 'tipo', 'acciones'];

  // ==================== LIFECYCLE ====================
  /**
   * Inicialización del componente
   * Carga la lista de controles blandos asociados
   */
  ngOnInit(): void {
    this.loadControlesBlandos();
  }

  // ==================== DATA LOADING ====================

  /**
   * Mapea la respuesta del backend (formato atts[]) a la interface ControlBlando
   */
  private mapControlBlandoFromAtts(item: any): ControlBlando | null {
    try {
      if (!item || !item.atts || !Array.isArray(item.atts)) {
        console.warn('Item inválido, no tiene atts[]:', item);
        return null;
      }

      const atts = item.atts;
      const control: ControlBlando = {
        id: '',
        codigo: '',
        descripcion: ''
      };

      // Mapear cada atributo según los nombres reales del backend
      for (const att of atts) {
        const name = att.name?.toLowerCase();
        const value = att.value || '';

        switch (name) {
          // ID del control blando
          case 'cblandoid':
            control.id = value;
            control.codigo = value;  // Usamos el ID como código también
            break;

          // Descripción
          case 'cblandodescripcion':
            control.descripcion = value;
            break;

          // Tipo (familia del control)
          case 'cblandofamiliadesc':
            control.tipo = value;
            break;

          // Version
          case 'cblandoversion':
            control.version = value;
            break;

          // Status
          case 'cblandostatus':
            control.status = value;
            break;
        }
      }

      // Validar que tenga los campos mínimos requeridos
      if (!control.id || !control.codigo) {
        console.warn('Control blando sin ID o código:', control);
        return null;
      }

      return control;
    } catch (error) {
      console.error('Error mapeando control blando:', error, item);
      return null;
    }
  }

  /**
   * Carga los controles blandos asociados a la consecuencia
   */
  loadControlesBlandos(): void {
    if (!this.ids || this.ids.length < 8) {
      console.error('IDs jerárquicos incompletos');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);

    this.hierarchyService.searchControlesBlandos(
      this.ids[0], // areaId
      this.ids[1], // procesoId
      this.ids[2], // subprocesoId
      this.ids[3], // actividadId
      this.ids[4], // tareaId
      this.ids[5], // dimensionId
      this.ids[6], // riesgoId
      this.ids[7]  // consecuenciaId
    ).subscribe({
      next: (response) => {
        this.isLoading.set(false);

        console.log('📥 Respuesta del backend:', response);

        if (response.success && response.data) {
          // Mapear cada item del backend al formato de la interface
          const controlesMapeados = response.data
            .map((item: any) => this.mapControlBlandoFromAtts(item))
            .filter((control: ControlBlando | null) => control !== null) as ControlBlando[];

          console.log('✅ Controles mapeados:', controlesMapeados);
          this.controlesBlandos.set(controlesMapeados);
        } else {
          this.controlesBlandos.set([]);
          if (response.message) {
            console.warn('Advertencia al cargar controles blandos:', response.message);
          }
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.controlesBlandos.set([]);
        this.alertService.error(
          'Error',
          'No se pudieron cargar los controles blandos'
        );
        console.error('Error loading controles blandos:', error);
      }
    });
  }

  // ==================== MODAL ACTIONS ====================
  /**
   * Abre el modal hijo para agregar controles blandos
   * Usa lazy loading para optimizar el bundle
   */
  async openAddControlBlandoModal(): Promise<void> {
    if (this.disabled) {
      await this.alertService.warning(
        'Acción no permitida',
        'No tiene permisos para agregar controles en este estado'
      );
      return;
    }

    try {
      // ✅ Lazy loading del componente modal hijo
      const { RkycblandoComponent } = await import('../modals/rkycblando.component');

      // Abrir el modal
      const dialogRef = this.dialog.open(RkycblandoComponent, {
        width: '900px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        disableClose: true,
        data: {
          title: 'Agregar Controles Blandos',
          areaId: this.ids[0] || '',
          procesoId: this.ids[1] || '',
          subprocesoId: this.ids[2] || '',
          actividadId: this.ids[3] || '',
          tareaId: this.ids[4] || '',
          dimensionId: this.ids[5] || '',
          riesgoId: this.ids[6] || '',
          consecuenciaId: this.ids[7] || '',
          button_confirm: 'Guardar',
          button_close: 'Cancelar'
        }
      });

      // Manejar el cierre del modal
      dialogRef.afterClosed().subscribe((result) => {
        if (result?.success) {
          this.alertService.toast('success', 'Controles blandos agregados correctamente');
          this.loadControlesBlandos();  // Recargar la tabla
        }
      });
    } catch (error) {
      console.error('Error loading modal component:', error);
      await this.alertService.error(
        'Error',
        'No se pudo cargar el modal de controles blandos'
      );
    }
  }

  // ==================== CRUD ACTIONS ====================
  /**
   * Elimina un control blando asociado
   *
   * @param control - Control blando a eliminar
   */
  async deleteControlBlando(control: ControlBlando): Promise<void> {
    if (this.disabled) {
      await this.alertService.warning(
        'Acción no permitida',
        'No tiene permisos para eliminar controles en este estado'
      );
      return;
    }

    // Confirmar eliminación
    const confirmResult = await this.alertService.confirmDelete(
      `¿Desea eliminar el control blando "${control.codigo}"?`
    );

    if (!confirmResult.isConfirmed) {
      return;
    }

    // Obtener version y status del control
    const version = control.version || '';
    const status = control.status || '';

    this.hierarchyService.deleteControlBlando(
      this.ids[0], // areaId
      this.ids[1], // procesoId
      this.ids[2], // subprocesoId
      this.ids[3], // actividadId
      this.ids[4], // tareaId
      this.ids[5], // dimensionId
      this.ids[6], // riesgoId
      this.ids[7], // consecuenciaId
      control.id,  // cblandoId
      version,     // version
      status       // status
    ).subscribe({
      next: async (response) => {
        if (response.success) {
          await this.alertService.success(
            '¡Eliminado!',
            response.message || 'Control blando eliminado correctamente'
          );
          this.loadControlesBlandos();  // Recargar la tabla
        } else {
          await this.alertService.error(
            'Error',
            response.message || 'No se pudo eliminar el control blando'
          );
        }
      },
      error: async (error) => {
        await this.alertService.error(
          'Error',
          'Ocurrió un error al eliminar el control blando'
        );
        console.error('Error deleting control blando:', error);
      }
    });
  }

  // ==================== HELPERS ====================
  /**
   * Track by function para optimizar @for
   *
   * @param index - Índice del item
   * @param item - Control blando
   * @returns ID único del control
   */
  trackById(index: number, item: ControlBlando): string {
    return item.id;
  }

  /**
   * Método público para recargar desde el componente padre (RKY)
   * Útil cuando se cambia de nodo en el árbol
   */
  refresh(): void {
    this.loadControlesBlandos();
  }
}
