import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { SelectionModel } from '@angular/cdk/collections';
import { AlertService } from '../../../../shared/services/alert.service';
import { HierarchyService } from '../../services/hierarchy.service';


export interface SolicitudEntidad {
  tipo: string;
  tablaTipo: string;
  tableCode: string;
  tableDesc: string;
  textoExtendido: string;
  comentarios: string;
}

type TipoTabla = '+RKC' | '+RKT' | '+RKR' | '+RKY' | '+RKB' | '+RKF';

@Component({
  selector: 'app-entidades-pendientes',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './entidades-pendientes.component.html',
  styleUrls: ['./entidades-pendientes.component.scss']
})
export class EntidadesPendientesComponent implements OnInit {
  // Dependency Injection
  private readonly dialogRef = inject(MatDialogRef<EntidadesPendientesComponent>);
  private readonly hierarchyService = inject(HierarchyService);
  private readonly alertService = inject(AlertService);
  readonly data = inject(MAT_DIALOG_DATA, { optional: true });

  // Signals
  readonly solicitudes = signal<SolicitudEntidad[]>([]);
  readonly loading = signal(false);
  readonly selectionCount = signal(0);

  // Selection Model
  readonly selection = new SelectionModel<SolicitudEntidad>(
    true,
    [],
    true,
    (o1, o2) => o1.tableCode === o2.tableCode && o1.tablaTipo === o2.tablaTipo
  );

  // Computed
  readonly hasSelection = computed(() => this.selectionCount() > 0);
  readonly allSelected = computed(() => {
    const numSelected = this.selectionCount();
    const numRows = this.solicitudes().length;
    return numSelected === numRows && numRows > 0;
  });
  readonly someSelected = computed(() => {
    const numSelected = this.selectionCount();
    return numSelected > 0 && numSelected < this.solicitudes().length;
  });

  // Table columns
  readonly displayedColumns: string[] = [
    'select',
    'tipo',
    'codigo',
    'descripcion',
    'textoExtendido'
  ];

  // Constants
  private readonly TIPO_MAP: Record<TipoTabla, string> = {
    '+RKC': 'Actividad',
    '+RKT': 'Tarea',
    '+RKR': 'Riesgo',
    '+RKY': 'Consecuencia',
    '+RKB': 'Control Blando',
    '+RKF': 'Control Epf'
  };

  private readonly TABLA_AUXILIAR_MAP: Record<TipoTabla, string> = {
    '+RKC': 'Actividad',
    '+RKT': '+MR5',
    '+RKR': '+MR7',
    '+RKY': '+MR8',
    '+RKB': '+MR9',
    '+RKF': '+MRF'
  };

  ngOnInit(): void {
    this.cargarSolicitudes();
  }

  /**
   * Carga las solicitudes pendientes
   */
  private cargarSolicitudes(): void {
    this.loading.set(true);

    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'LIST_DEFINITION' }
    ];

    this.hierarchyService.executeGenericAction({ atts }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const solicitudesMapeadas = this.mapearSolicitudes(response.data);
          this.solicitudes.set(solicitudesMapeadas);
        } else {
          this.alertService.error(
            'Error',
            'No se pudieron cargar las solicitudes'
          );
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar solicitudes:', error);
        this.alertService.error(
          'Error',
          'Ocurrió un error al cargar las solicitudes'
        );
        this.loading.set(false);
      }
    });
  }

  /**
   * Mapea la respuesta del API a objetos SolicitudEntidad
   */
  private mapearSolicitudes(data: any[]): SolicitudEntidad[] {
    return data.map(element => {
      const tablaTipo = element.atts[1].value.trim() as TipoTabla;

      return {
        tipo: this.getTipo(tablaTipo),
        tablaTipo: tablaTipo,
        tableCode: element.atts[2].value.trim(),
        tableDesc: element.atts[3].value.trim(),
        textoExtendido: element.atts[5].value.trim(),
        comentarios: element.atts[5].value.trim()
      };
    });
  }

  /**
   * Obtiene el nombre del tipo de tabla
   */
  private getTipo(tabla: TipoTabla): string {
    return this.TIPO_MAP[tabla] || 'Desconocido';
  }

  /**
   * Obtiene la tabla auxiliar correspondiente
   */
  private getTablaAuxiliar(tabla: TipoTabla): string {
    return this.TABLA_AUXILIAR_MAP[tabla] || tabla;
  }

  /**
   * Obtiene el ícono según el tipo
   */
  getTipoIcon(tipo: string): string {
    const iconMap: Record<string, string> = {
      'Actividad': 'work',
      'Tarea': 'task',
      'Riesgo': 'warning',
      'Consecuencia': 'report_problem',
      'Control Blando': 'security',
      'Control Epf': 'verified_user'
    };
    return iconMap[tipo] || 'description';
  }

  /**
   * Obtiene el color del chip según el tipo
   */
  getTipoColor(tipo: string): 'primary' | 'accent' | 'warn' {
    const colorMap: Record<string, 'primary' | 'accent' | 'warn'> = {
      'Actividad': 'primary',
      'Tarea': 'accent',
      'Riesgo': 'warn',
      'Consecuencia': 'warn',
      'Control Blando': 'primary',
      'Control Epf': 'accent'
    };
    return colorMap[tipo] || 'primary';
  }

  // Selection Methods
  toggleAllRows(): void {
    if (this.allSelected()) {
      this.selection.clear();
    } else {
      this.selection.clear();
      this.selection.select(...this.solicitudes());
    }
    this.selectionCount.set(this.selection.selected.length);
  }

  toggleRow(row: SolicitudEntidad): void {
    this.selection.toggle(row);
    this.selectionCount.set(this.selection.selected.length);
  }

  isSelected(row: SolicitudEntidad): boolean {
    return this.selection.isSelected(row);
  }

  /**
   * Envía las solicitudes seleccionadas
   */
  enviarSolicitudes(): void {
    if (!this.hasSelection()) {
      this.alertService.warning(
        'Selección requerida',
        'Debe seleccionar al menos una solicitud'
      );
      return;
    }

    const selected = this.selection.selected;
    const codigos = selected.map(s => s.tableCode).join(',');
    const tipos = selected.map(s => s.tablaTipo).join(',');

    this.ejecutarAccion('SEND_DEFINITION', codigos, tipos, 'enviar');
  }

  /**
   * Elimina las solicitudes seleccionadas
   */
  async eliminarSolicitudes(): Promise<void> {
    if (!this.hasSelection()) {
      this.alertService.warning(
        'Selección requerida',
        'Debe seleccionar al menos una solicitud'
      );
      return;
    }

    const result = await this.alertService.confirmDelete(
      `Se eliminarán ${this.selection.selected.length} solicitud(es). ¿Desea continuar?`
    );

    if (result.isConfirmed) {
      const selected = this.selection.selected;
      const codigos = selected.map(s => s.tableCode).join(',');
      const tipos = selected.map(s => s.tablaTipo).join(',');

      this.ejecutarAccion('DELETE_DEFINITION', codigos, tipos, 'eliminar');
    }
  }

  /**
   * Ejecuta una acción sobre las solicitudes
   */
  private ejecutarAccion(
    action: string,
    codigos: string,
    tipos: string,
    tipoAccion: 'enviar' | 'eliminar'
  ): void {
    this.alertService.showLoading('Procesando solicitudes...');

    const atts: any[] = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: action }
    ];

    // El API espera diferentes parámetros según la acción
    if (action === 'DELETE_DEFINITION') {
      atts.push({ name: 'type', value: tipos });
      atts.push({ name: 'code', value: codigos });
    } else {
      atts.push({ name: 'types', value: tipos });
      atts.push({ name: 'codes', value: codigos });
    }

    this.hierarchyService.executeGenericAction({ atts }).subscribe({
      next: (response) => {
        this.alertService.closeLoading();

        if (response.success) {
          const mensaje = tipoAccion === 'eliminar'
            ? 'Solicitudes eliminadas correctamente'
            : 'Solicitudes enviadas a aprobar';

          this.alertService.success('Éxito', mensaje);
          this.dialogRef.close({ success: true, action: tipoAccion });
        } else {
          this.alertService.error(
            'Error',
            response.message || 'No se pudieron procesar las solicitudes'
          );
        }
      },
      error: (error) => {
        this.alertService.closeLoading();
        console.error('Error:', error);
        this.alertService.error(
          'Error',
          'Ocurrió un error al procesar las solicitudes'
        );
      }
    });
  }

  /**
   * Cierra el diálogo
   */
  cerrar(): void {
    this.dialogRef.close();
  }

  /**
   * Actualiza la lista de solicitudes
   */
  actualizar(): void {
    this.selection.clear();
    this.selectionCount.set(0);
    this.cargarSolicitudes();
  }
}
