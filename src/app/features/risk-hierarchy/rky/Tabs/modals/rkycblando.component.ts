import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HierarchyService } from '../../../../../layout/rkmain/services/hierarchy.service';
import { AlertService } from '../../../../../shared/services/alert.service';



/**
 * Interface para control blando disponible
 */
export interface ControlBlandoDisponible {
  id: string;
  descripcion: string;
  codigo?: string;
  tipo?: string;
}

/**
 * Interface para los datos de entrada del modal
 */
export interface ControlesBlandosDialogData {
  title: string;
  areaId: string;
  procesoId: string;
  subprocesoId: string;
  actividadId: string;
  tareaId: string;
  dimensionId: string;
  riesgoId: string;
  consecuenciaId: string;
  button_confirm?: string;
  button_close?: string;
  nuevo?: boolean;
  tabla?: string;
}

/**
 * Interface para el resultado del modal
 */
export interface ControlesBlandosDialogResult {
  success: boolean;
  idsCreados?: string[];
}

/**
 * Modal standalone para agregar controles blandos a una consecuencia.
 *
 * Características:
 * - Búsqueda directa (usuario escribe → Enter/botón → carga resultados)
 * - Selección múltiple con checkboxes
 * - Chips visuales para items seleccionados
 * - Sin scroll infinito ni paginación
 *
 * @example
 * ```typescript
 * const dialogRef = this.dialog.open(RkycblandoComponent, {
 *   width: '900px',
 *   data: {
 *     title: 'Agregar Controles Blandos',
 *     areaId: '01',
 *     // ... otros IDs
 *   }
 * });
 * ```
 */
@Component({
  selector: 'app-rkycblando',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatTableModule,
    MatCheckboxModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './rkycblando.component.html',
  styleUrl: './rkycblando.component.scss'
})
export class RkycblandoComponent implements OnInit {
  // ==================== DEPENDENCIES ====================
  private readonly dialogRef = inject(MatDialogRef<RkycblandoComponent>);
  readonly data = inject<ControlesBlandosDialogData>(MAT_DIALOG_DATA);
  private readonly hierarchyService = inject(HierarchyService);
  private readonly alertService = inject(AlertService);

  // ==================== SIGNALS ====================
  /** Lista de controles blandos disponibles */
  readonly controlesBlandos = signal<ControlBlandoDisponible[]>([]);

  /** Término de búsqueda actual */
  readonly searchTerm = signal<string>('');

  /** Set de IDs seleccionados para mejor performance */
  private readonly selectedIds = signal<Set<string>>(new Set());

  /** Flag para deshabilitar botones durante operaciones */
  readonly isSaving = signal<boolean>(false);

  // ==================== COMPUTED ====================
  /** Lista de controles seleccionados (reactivo) */
  readonly selectedControles = computed(() => {
    const ids = this.selectedIds();
    const controles = this.controlesBlandos();
    return controles.filter(c => ids.has(c.id));
  });

  /** Contador de seleccionados */
  readonly selectedCount = computed(() => this.selectedIds().size);

  /** Verifica si un control está seleccionado */
  isSelected = (controlId: string): boolean => {
    return this.selectedIds().has(controlId);
  };

  // ==================== TABLE CONFIGURATION ====================
  readonly displayedColumns: string[] = ['select', 'id', 'descripcion'];

  // ==================== LIFECYCLE ====================
  /**
   * Inicialización del componente
   * Carga controles disponibles al abrir el modal
   */
  ngOnInit(): void {
    // Cargar controles disponibles al abrir
    this.loadControles();
  }

  // ==================== DATA MAPPING ====================
  /**
   * Mapea la respuesta del backend (formato atts[]) a la interface ControlBlandoDisponible
   */
  private mapControlBlandoFromAtts(item: any): ControlBlandoDisponible | null {
    try {
      if (!item || !item.atts || !Array.isArray(item.atts)) {
        console.warn('Item inválido, no tiene atts[]:', item);
        return null;
      }

      const atts = item.atts;
      const control: ControlBlandoDisponible = {
        id: '',
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
            break;

          // Descripción
          case 'cblandodescripcion':
            control.descripcion = value;
            break;

          // Código (si existe en disponibles)
          case 'codigo':
            control.codigo = value;
            break;

          // Tipo (familia del control)
          case 'cblandofamiliadesc':
          case 'tipo':
            control.tipo = value;
            break;
        }
      }

      // Validar que tenga los campos mínimos requeridos
      if (!control.id) {
        console.warn('Control blando sin ID:', control);
        return null;
      }

      return control;
    } catch (error) {
      console.error('Error mapeando control blando disponible:', error, item);
      return null;
    }
  }

  // ==================== SEARCH METHODS ====================
  /**
   * Carga los controles blandos disponibles desde el servicio
   *
   * @param reset - Si es true, limpia la lista antes de cargar
   */
  loadControles(reset: boolean = false): void {
    const term = this.searchTerm().trim();

    this.hierarchyService.getControlesBlandosDisponibles(
      this.data.areaId,
      this.data.procesoId,
      this.data.subprocesoId,
      this.data.actividadId,
      this.data.tareaId,
      this.data.dimensionId,
      this.data.riesgoId,
      this.data.consecuenciaId,
      term || ''  // Permitir búsqueda vacía para cargar todos
    ).subscribe({
      next: (response) => {
        console.log('📥 Respuesta disponibles:', response);

        if (response.success && response.data) {
          // Mapear cada item del backend al formato de la interface
          const controlesMapeados = response.data
            .map((item: any) => this.mapControlBlandoFromAtts(item))
            .filter((control: ControlBlandoDisponible | null) => control !== null) as ControlBlandoDisponible[];

          console.log('✅ Controles disponibles mapeados:', controlesMapeados);
          this.controlesBlandos.set(controlesMapeados);

          if (controlesMapeados.length === 0 && term) {
            this.alertService.info(
              'Sin resultados',
              `No se encontraron controles blandos con el criterio "${term}"`
            );
          }
        } else {
          this.controlesBlandos.set([]);
          if (response.message) {
            this.alertService.error(
              'Error',
              response.message || 'No se pudieron cargar los controles blandos'
            );
          }
        }
      },
      error: (error) => {
        this.controlesBlandos.set([]);
        this.alertService.error(
          'Error',
          'Ocurrió un error al cargar los controles blandos'
        );
        console.error('Error loading controles blandos:', error);
      }
    });
  }

  /**
   * Aplica el filtro de búsqueda
   * Se dispara con Enter o botón "Buscar"
   *
   * @param searchValue - Término de búsqueda ingresado
   */
  applyFilter(searchValue: string): void {
    this.searchTerm.set(searchValue);
    this.loadControles();
  }

  /**
   * Limpia el filtro y resultados
   */
  clearSearch(): void {
    this.searchTerm.set('');
    this.controlesBlandos.set([]);
  }

  /**
   * Maneja el evento Enter en el input de búsqueda
   *
   * @param event - Evento del teclado
   */
  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const input = event.target as HTMLInputElement;
      this.applyFilter(input.value);
    }
  }

  // ==================== SELECTION METHODS ====================
  /**
   * Alterna la selección de un control (checkbox)
   *
   * @param control - Control blando a seleccionar/deseleccionar
   */
  toggleSelection(control: ControlBlandoDisponible): void {
    const newSet = new Set(this.selectedIds());

    if (newSet.has(control.id)) {
      newSet.delete(control.id);
    } else {
      newSet.add(control.id);
    }

    this.selectedIds.set(newSet);
  }

  /**
   * Remueve un control desde el chip
   *
   * @param control - Control a remover
   */
  removeChip(control: ControlBlandoDisponible): void {
    const newSet = new Set(this.selectedIds());
    newSet.delete(control.id);
    this.selectedIds.set(newSet);
  }

  // ==================== ACTION METHODS ====================
  /**
   * Guarda los controles blandos seleccionados
   * Asocia todos los seleccionados mediante el servicio
   * Envía un array de IDs al backend
   */
  async guardar(): Promise<void> {
    const selected = this.selectedControles();

    // Validar que haya selección
    if (selected.length === 0) {
      await this.alertService.warning(
        'Sin selección',
        'Debe seleccionar al menos un control blando'
      );
      return;
    }

    // Confirmar acción
    const confirmResult = await this.alertService.confirm({
      title: 'Confirmar',
      text: `¿Desea agregar ${selected.length} control(es) blando(s)?`,
      icon: 'question',
      confirmButtonText: 'Sí, agregar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    // Construir array de IDs
    const idsArray = selected.map(c => c.id);

    // Deshabilitar botones durante guardado
    this.isSaving.set(true);

    this.hierarchyService.createControlesBlandos(
      this.data.areaId,
      this.data.procesoId,
      this.data.subprocesoId,
      this.data.actividadId,
      this.data.tareaId,
      this.data.dimensionId,
      this.data.riesgoId,
      this.data.consecuenciaId,
      idsArray
    ).subscribe({
      next: async (response) => {
        this.isSaving.set(false);

        if (response.success) {
          await this.alertService.success(
            '¡Éxito!',
            response.message || 'Controles blandos agregados correctamente'
          );

          // Cerrar modal con resultado exitoso
          this.dialogRef.close({
            success: true,
            idsCreados: selected.map(c => c.id)
          } as ControlesBlandosDialogResult);
        } else {
          await this.alertService.error(
            'Error',
            response.message || 'No se pudieron agregar los controles blandos'
          );
        }
      },
      error: async (error) => {
        this.isSaving.set(false);
        await this.alertService.error(
          'Error',
          'Ocurrió un error al guardar los controles blandos'
        );
        console.error('Error saving controles blandos:', error);
      }
    });
  }

  /**
   * Cancela la operación y cierra el modal sin guardar
   */
  cancelar(): void {
    this.dialogRef.close({
      success: false
    } as ControlesBlandosDialogResult);
  }

  // ==================== HELPERS ====================
  /**
   * Track by function para optimizar @for
   *
   * @param index - Índice del item
   * @param item - Control blando
   * @returns ID único del control
   */
  trackById(index: number, item: ControlBlandoDisponible): string {
    return item.id;
  }
}
