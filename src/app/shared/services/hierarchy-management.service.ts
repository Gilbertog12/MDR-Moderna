import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AvailableItem, mapToAvailableItem, BackendItem } from '../models/available-item.model';

interface BackendResponse {
  redirect: any;
  success: boolean;
  message: string;
  data: BackendItem[];
}

@Injectable({
  providedIn: 'root'
})
export class HierarchyManagementService {
  private readonly apiUrl = 'http://localhost:54108/MatrizRsk/api/values/generic';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene items disponibles según la acción de jerarquía
   */
  getAvailableItems(
    action: string,
    hierarchyIds: {
      areaId?: string;
      procesoId?: string;
      subprocesoId?: string;
      actividadId?: string;
      tareaId?: string;
      dimensionId?: string;
      riesgoId?: string;
    },
    searchTerm?: string,
    pageIndex?: number
  ): Observable<AvailableItem[]> {
    const token = localStorage.getItem('tk');
    const headers = new HttpHeaders({
      'Authorization': `bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const atts: any[] = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: action },
      { name: 'areaId', value: hierarchyIds.areaId || '' },
      { name: 'procesoId', value: hierarchyIds.procesoId || '' },
      { name: 'subprocesoId', value: hierarchyIds.subprocesoId || '' },
      { name: 'actividadId', value: hierarchyIds.actividadId || '' },
      { name: 'tareaId', value: hierarchyIds.tareaId || '' },
      { name: 'dimensionId', value: hierarchyIds.dimensionId || '' },
      { name: 'riesgoId', value: hierarchyIds.riesgoId || '' }
    ];

    if (searchTerm && searchTerm.trim()) {
      atts.push({ name: 'lookupName', value: `%${searchTerm}` });
    }

    if (pageIndex !== undefined) {
      atts.push({ name: 'index', value: pageIndex });
    }

    const body = { atts };

    return this.http.post<BackendResponse>(this.apiUrl, body, { headers }).pipe(
      map(response => this.mapItems(response))
    );
  }

  /**
   * Crea/Agrega items a la jerarquía (método que faltaba)
   */
  createItems(request: {
    action: string;
    hierarchyIds: {
      areaId?: string;
      procesoId?: string;
      subprocesoId?: string;
      actividadId?: string;
      tareaId?: string;
      dimensionId?: string;
      riesgoId?: string;
    };
    selectedIds: string[];
  }): Observable<BackendResponse> {
    const token = localStorage.getItem('tk');
    const headers = new HttpHeaders({
      'Authorization': `bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const atts: any[] = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: request.action },
      { name: 'areaId', value: request.hierarchyIds.areaId || '' },
      { name: 'procesoId', value: request.hierarchyIds.procesoId || '' },
      { name: 'subprocesoId', value: request.hierarchyIds.subprocesoId || '' },
      { name: 'actividadId', value: request.hierarchyIds.actividadId || '' },
      { name: 'tareaId', value: request.hierarchyIds.tareaId || '' },
      { name: 'dimensionId', value: request.hierarchyIds.dimensionId || '' },
      { name: 'riesgoId', value: request.hierarchyIds.riesgoId || '' }
    ];

    // Agregar los IDs seleccionados
    const keyName = this.getKeyNameForAction(request.action);
    if (keyName) {
      atts.push({ name: keyName, value: request.selectedIds.join(',') });
    }

    const body = { atts };

    return this.http.post<BackendResponse>(this.apiUrl, body, { headers });
  }

  /**
   * Obtiene el nombre del nivel según la acción (método que faltaba)
   */
  getLevelName(action: string): string {
    const levelMap: { [key: string]: string } = {
      'PROCESO_LIST': 'Proceso',
      'PROCESO_CREATE': 'Proceso',
      'SUBPROCESO_LIST': 'Subproceso',
      'SUBPROCESO_CREATE': 'Subproceso',
      'ACTIVIDAD_LIST': 'Actividad',
      'ACTIVIDAD_CREATE': 'Actividad',
      'TAREA_LIST': 'Tarea',
      'TAREA_CREATE': 'Tarea',
      'DIMENSION_LIST': 'Dimensión',
      'DIMENSION_CREATE': 'Dimensión',
      'RIESGO_LIST': 'Riesgo',
      'RIESGO_CREATE': 'Riesgo',
      'CONSECUENCIA_LIST': 'Consecuencia',
      'CONSECUENCIA_CREATE': 'Consecuencia',
      'AREA_LIST': 'Área',
      'AREA_CREATE': 'Área'
    };

    return levelMap[action] || 'Item';
  }

  /**
   * Obtiene el nombre de la clave según la acción de creación
   */
  private getKeyNameForAction(action: string): string | null {
    const keyMap: { [key: string]: string } = {
      'PROCESO_CREATE': 'procesoId',
      'SUBPROCESO_CREATE': 'subprocesoId',
      'ACTIVIDAD_CREATE': 'actividadId',
      'TAREA_CREATE': 'tareaId',
      'DIMENSION_CREATE': 'dimensionId',
      'RIESGO_CREATE': 'riesgoId',
      'CONSECUENCIA_CREATE': 'consecuenciaId',
      'AREA_CREATE': 'areaId'
    };

    return keyMap[action] || null;
  }

  private mapItems(response: BackendResponse): AvailableItem[] {
    if (!response?.data || !Array.isArray(response.data)) {
      return [];
    }

    const items = response.data
      .map(mapToAvailableItem)
      .filter(item => item.id && item.descripcion);

    items.sort((a, b) => a.id.localeCompare(b.id));

    return items;
  }
}
