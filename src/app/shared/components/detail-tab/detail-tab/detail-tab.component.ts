import { Component, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { HierarchyService } from '../../../../layout/rkmain/services/hierarchy.service';


interface DetailRow {
  tareaDesc: string;
  riesgoDesc: string;
  consecuenciaDesc: string;
  seguridad: {
    puro: { probabilidad: string; severidad: string; criticidad: string };
    residual: { probabilidad: string; severidad: string; criticidad: string };
  };
  medioAmbiente: {
    puro: { probabilidad: string; severidad: string; criticidad: string };
    residual: { probabilidad: string; severidad: string; criticidad: string };
  };
  operacional: {
    puro: { probabilidad: string; severidad: string; criticidad: string };
    residual: { probabilidad: string; severidad: string; criticidad: string };
  };
}

@Component({
  selector: 'app-detail-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ],
  templateUrl: './detail-tab.component.html',
  styleUrls: ['./detail-tab.component.scss']
})
export class DetailTabComponent {
  // Inputs
  action = input.required<string>(); // 'ACTIVIDAD_READ_DETAIL' o 'TAREA_READ_DETAIL'
  areaId = input.required<string>();
  procesoId = input.required<string>();
  subprocesoId = input.required<string>();
  actividadId = input.required<string>();
  tareaId = input<string>(''); // Solo para RKT

  // State
  private dataCache = signal<DetailRow[]>([]);
  private loaded = signal(false);
  loading = signal(false);
  searchTerm = signal('');

  // Computed
  data = computed(() => {
    const cache = this.dataCache();
    const term = this.searchTerm().toLowerCase().trim();

    if (!term) return cache;

    return cache.filter(row =>
      row.tareaDesc.toLowerCase().includes(term) ||
      row.riesgoDesc.toLowerCase().includes(term) ||
      row.consecuenciaDesc.toLowerCase().includes(term)
    );
  });

  stats = computed(() => {
    const rows = this.dataCache();
    const total = rows.length;

    let intolerables = 0;
    let tolerables = 0;

    rows.forEach(row => {
      // Contar por criticidades de evaluación residual
      const criticidades = [
        row.seguridad.residual.criticidad,
        row.medioAmbiente.residual.criticidad,
        row.operacional.residual.criticidad
      ];

      criticidades.forEach(crit => {
        const c = crit.trim().toUpperCase();
        if (c === 'INTOLERABLE') intolerables++;
        else if (c === 'TOLERABLE') tolerables++;
      });
    });

    return { total, intolerables, tolerables };
  });

  displayedColumns = [
    'tarea',
    'riesgo',
    'consecuencia',
    'seguridad',
    'medioAmbiente',
    'operacional'
  ];

  constructor(private hierarchyService: HierarchyService) {}

  // Método público para cargar datos (lazy loading)
  loadData(): void {
    if (this.loaded()) return; // Cache

    this.loading.set(true);

    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: this.action() },
      { name: 'areaId', value: this.areaId() },
      { name: 'procesoId', value: this.procesoId() },
      { name: 'subprocesoId', value: this.subprocesoId() },
      { name: 'actividadId', value: this.actividadId() }
    ];

    // Si es RKT, agregar tareaId
    if (this.tareaId()) {
      atts.push({ name: 'tareaId', value: this.tareaId() });
    }

    this.hierarchyService.executeGenericAction(atts).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const rows = this.parseResponse(response.data);
          this.dataCache.set(rows);
          this.loaded.set(true);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading detail:', err);
        this.loading.set(false);
      }
    });
  }

  private parseResponse(data: any[]): DetailRow[] {
    return data.map(item => {
      const atts = item.atts || [];
      const getValue = (name: string) =>
        atts.find((a: any) => a.name === name)?.value || '';

      return {
        tareaDesc: getValue('tareaDesc'),
        riesgoDesc: getValue('riesgoDesc'),
        consecuenciaDesc: getValue('consecuenciaDesc'),
        seguridad: {
          puro: {
            probabilidad: getValue('probabilidadS'),
            severidad: getValue('severidadS'),
            criticidad: getValue('criticidadS')
          },
          residual: {
            probabilidad: getValue('probabilidadResidualS'),
            severidad: getValue('severidadResidualS'),
            criticidad: getValue('criticidadResidualS')
          }
        },
        medioAmbiente: {
          puro: {
            probabilidad: getValue('probabilidadM'),
            severidad: getValue('severidadM'),
            criticidad: getValue('criticidadM')
          },
          residual: {
            probabilidad: getValue('probabilidadResidualM'),
            severidad: getValue('severidadResidualM'),
            criticidad: getValue('criticidadResidualM')
          }
        },
        operacional: {
          puro: {
            probabilidad: getValue('probabilidadN'),
            severidad: getValue('severidadN'),
            criticidad: getValue('criticidadN')
          },
          residual: {
            probabilidad: getValue('probabilidadResidualN'),
            severidad: getValue('severidadResidualN'),
            criticidad: getValue('criticidadResidualN')
          }
        }
      };
    });
  }

  getCriticalityClass(criticidad: string): string {
    const c = criticidad.trim().toUpperCase();
    if (c === 'INTOLERABLE') return 'criticality-intolerable';
    if (c === 'TOLERABLE') return 'criticality-tolerable';
    return 'criticality-empty';
  }
}
