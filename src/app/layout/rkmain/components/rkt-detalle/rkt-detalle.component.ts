import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RktDetalleModel } from '../../../../shared/models/rkt-detail.interface';
import { HierarchyService } from '../../services/hierarchy.service';
import { AlertService } from '../../../../shared/services/alert.service';
import { tap, catchError, of } from 'rxjs';

@Component({
  selector: 'app-rkt-detalle',
  imports: [],
  templateUrl: './rkt-detalle.component.html',
  styleUrl: './rkt-detalle.component.scss'
})
export class RktDetalleComponent {

  private readonly hierarchyService = inject(HierarchyService)
  private readonly alertService = inject(AlertService);

  readonly detalleList = input<RktDetalleModel[]>([])

  readonly containerHeight = input<string>('500px');

  readonly areaId = input<string>()
  readonly procesoId = input<string>()
  readonly subprocesoId = input<string>()
  readonly actividadId = input<string>()
  readonly tareaId = input<string>()

  readonly autoLoad = input<boolean>(false);

    private readonly internalData = signal<RktDetalleModel[]>([]);


  readonly effectiveData = computed(() => {
    const providedData = this.detalleList();
    return providedData.length > 0 ? providedData : this.internalData();
  });

   readonly hasData = computed(() => {
    return this.effectiveData().length > 0;
  });

    readonly recordCount = computed(() => {
    return this.effectiveData().length;
  });

   private readonly canAutoLoad = computed(() => {
    return !!(
      this.areaId() &&
      this.procesoId() &&
      this.subprocesoId() &&
      this.actividadId() &&
      this.tareaId()
    );
  });

  constructor(){

    effect(() => {
      if (this.autoLoad() && this.canAutoLoad()) {
        this.loadData();
      }
    }, { allowSignalWrites: true });
  }

   loadData(): void {
      if (!this.canAutoLoad()) {
        console.error('RkcDetalleComponent: Faltan IDs necesarios para cargar datos');
        return;
      }

      // this.internalLoading.set(true);
      this.internalData.set([]);

      const atts = [
        { name: 'scriptName', value: 'coemdr' },
        { name: 'action', value: 'TAREA_READ_DETAIL' },
        { name: 'areaId', value: this.areaId()! },
        { name: 'procesoId', value: this.procesoId()! },
        { name: 'subprocesoId', value: this.subprocesoId()! },
        { name: 'actividadId', value: this.actividadId()! },
        { name: 'tareaId', value: this.tareaId()! }
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
        // this.internalLoading.set(false);
      });
    }

     private mapResponseToModel(data: any[]): RktDetalleModel[] {
        if (!data || !Array.isArray(data)) {
          return [];
        }

        return data.map((element: any) => ({
          offset: element.atts[0]?.value || '',
          dimensionId: element.atts[1]?.value || '',
          dimensionDesc: element.atts[2]?.value || '',
          riesgoId: element.atts[3]?.value || '',
          riesgoDesc: element.atts[4]?.value || '',
          consecuenciaId: element.atts[5]?.value || '',
          consecuenciaDesc: element.atts[6]?.value || '',
          probabilidad: element.atts[7]?.value || '',
          severidad: element.atts[8]?.value || '',
          criticidad: element.atts[9]?.value || '',

        }));
      }

      refresh(): void {
    if (this.canAutoLoad()) {
      this.loadData();
    }
  }

  trackByOffset(index: number, item: RktDetalleModel): string {
      return item.offset;
    }
}
