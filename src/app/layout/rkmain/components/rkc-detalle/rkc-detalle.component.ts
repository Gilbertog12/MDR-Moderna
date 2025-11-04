import { Component, computed, effect, inject, input, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RkcDetalleModel } from '../../../../shared/models/rkc-detail.interface';
import { tap, catchError, of } from 'rxjs';
import { AlertService } from '../../../../shared/services/alert.service';
import { HierarchyService } from '../../services/hierarchy.service';


/**
 * Componente standalone para mostrar el tab Detalle de RKC (Actividad)
 * Muestra una tabla con evaluación de riesgos en tres dimensiones:
 * - Seguridad y Salud Ocupacional
 * - Medio ambiente
 * - Operacional
 *
 * Cada dimensión muestra valores Puro y Residual
 */
@Component({
  selector: 'app-rkc-detalle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rkc-detalle.component.html',
  styleUrls: ['./rkc-detalle.component.scss']
})
export class RkcDetalleComponent  {

   // ✨ SERVICIOS - Usar inject() (Angular 19 best practice)
  private readonly hierarchyService = inject(HierarchyService);
  private readonly alertService = inject(AlertService);

  // ✨ INPUTS - Usar input() signals en lugar de @Input()

  /**
   * Lista de detalles a mostrar en la tabla
   * Si se proporciona, el componente no cargará datos automáticamente
   */
  readonly detalleList = input<RkcDetalleModel[]>([]);

  /**
   * Indica si se está cargando la información externamente
   */
  readonly loading = input<boolean>(false);

  /**
   * Altura personalizada del contenedor
   */
  readonly containerHeight = input<string>('500px');

  /**
   * ID del área (para carga automática)
   */
  readonly areaId = input<string>();

  /**
   * ID del proceso (para carga automática)
   */
  readonly procesoId = input<string>();

  /**
   * ID del subproceso (para carga automática)
   */
  readonly subprocesoId = input<string>();

  /**
   * ID de la actividad (para carga automática)
   */
  readonly actividadId = input<string>();

  /**
   * Si es true, carga los datos automáticamente al inicializar
   */
  readonly autoLoad = input<boolean>(false);

  // ✨ ESTADO INTERNO - Usar signal() en lugar de variables normales

  /**
   * Lista interna de datos (usada cuando autoLoad está activo)
   */
  private readonly internalData = signal<RkcDetalleModel[]>([]);

  /**
   * Estado de carga interno (cuando autoLoad está activo)
   */
  private readonly internalLoading = signal<boolean>(false);

  // ✨ COMPUTED - Usar computed() en lugar de getters

  /**
   * Lista efectiva de datos a mostrar
   * Si el padre provee detalleList, usa eso; sino usa los datos internos
   */
  readonly effectiveData = computed(() => {
    const providedData = this.detalleList();
    return providedData.length > 0 ? providedData : this.internalData();
  });

  /**
   * Estado de carga efectivo
   * Si el padre provee loading, usa eso; sino usa el loading interno
   */
  readonly effectiveLoading = computed(() => {
    return this.loading() || this.internalLoading();
  });

  /**
   * Verifica si hay datos para mostrar
   */
  readonly hasData = computed(() => {
    return this.effectiveData().length > 0;
  });

  /**
   * Retorna el número de registros
   */
  readonly recordCount = computed(() => {
    return this.effectiveData().length;
  });

  /**
   * Verifica si se pueden cargar datos automáticamente
   */
  private readonly canAutoLoad = computed(() => {
    return !!(
      this.areaId() &&
      this.procesoId() &&
      this.subprocesoId() &&
      this.actividadId()
    );
  });

  // ✨ EFFECT - Reaccionar a cambios en los inputs
  constructor() {
    // Effect para cargar datos automáticamente cuando cambian los IDs
    effect(() => {
      if (this.autoLoad() && this.canAutoLoad()) {
        this.loadData();
      }
    }, { allowSignalWrites: true });
  }




  /**
   * Carga los datos desde el servicio
   * Método público para permitir recarga manual
   */
  loadData(): void {
    if (!this.canAutoLoad()) {
      console.error('RkcDetalleComponent: Faltan IDs necesarios para cargar datos');
      return;
    }

    this.internalLoading.set(true);
    this.internalData.set([]);

    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'ACTIVIDAD_READ_DETAIL' },
      { name: 'areaId', value: this.areaId()! },
      { name: 'procesoId', value: this.procesoId()! },
      { name: 'subprocesoId', value: this.subprocesoId()! },
      { name: 'actividadId', value: this.actividadId()! }
    ];

    this.hierarchyService.executeGenericAction({ atts }).pipe(
      tap(response => {
        if (response.success) {
          const mappedData = this.mapResponseToModel(response.data);
          this.internalData.set(mappedData);
        } else {
          this.alertService.error(
            'Error',
            response.message || 'No se pudieron cargar los datos del detalle'
          );
        }
      }),
      catchError(error => {
        console.error('Error al cargar detalle:', error);
        this.alertService.error('Error', 'Ha ocurrido un error al cargar el detalle');
        return of(null);
      })
    ).subscribe(() => {
      this.internalLoading.set(false);
    });
  }

  /**
   * Mapea la respuesta de la API al modelo del componente
   */
  private mapResponseToModel(data: any[]): RkcDetalleModel[] {
    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.map((element: any) => ({
      offset: element.atts[0]?.value || '',
      tareaId: element.atts[1]?.value || '',
      tareaDesc: element.atts[2]?.value || '',
      riesgoId: element.atts[3]?.value || '',
      riesgoDesc: element.atts[4]?.value || '',
      consecuenciaId: element.atts[5]?.value || '',
      consecuenciaDesc: element.atts[6]?.value || '',
      probabilidadM: element.atts[7]?.value || '',
      severidadM: element.atts[8]?.value || '',
      criticidadM: element.atts[9]?.value || '',
      probabilidadN: element.atts[10]?.value || '',
      severidadN: element.atts[11]?.value || '',
      criticidadN: element.atts[12]?.value || '',
      probabilidadS: element.atts[13]?.value || '',
      severidadS: element.atts[14]?.value || '',
      criticidadS: element.atts[15]?.value || ''
    }));
  }

  /**
   * Recarga los datos (útil para refrescar después de cambios)
   */
  refresh(): void {
    if (this.canAutoLoad()) {
      this.loadData();
    }
  }

  /**
   * TrackBy function para ngFor (optimización de performance)
   */
  trackByOffset(index: number, item: RkcDetalleModel): string {
    return item.offset;
  }
}
