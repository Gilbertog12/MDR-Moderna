import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BackendResponse, HierarchyItem, mapBackendItem } from '../models/hierarchy-item.model';

@Injectable({
  providedIn: 'root'
})
export class HierarchyDataService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:54108/MatrizRsk/api/values/generic';

  listItems(
    action: string,
    hierarchyIds: Record<string, string | undefined>,
    searchTerm?: string,
    index?: number
  ): Observable<HierarchyItem[]> {

    const atts: Array<{ name: string; value: string | number }> = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: action },
      { name: 'areaId', value: hierarchyIds['areaId'] || '' },
      { name: 'procesoId', value: hierarchyIds['procesoId'] || '' },
      { name: 'subprocesoId', value: hierarchyIds['subprocesoId'] || '' },
      { name: 'actividadId', value: hierarchyIds['actividadId'] || '' },
      { name: 'tareaId', value: hierarchyIds['tareaId'] || '' },
      { name: 'dimensionId', value: hierarchyIds['dimensionId'] || '' },
      { name: 'riesgoId', value: hierarchyIds['riesgoId'] || '' }
    ];

    if (searchTerm?.trim()) {
      atts.push({ name: 'lookupName', value: '%' + searchTerm });
    }

    if (index !== undefined) {
      atts.push({ name: 'index', value: index });
    }

    return this.post<BackendResponse>({ atts }).pipe(
      map(response => {
        if (!response.success || !response.data) {
          return [];
        }

        const items = response.data
          .map(mapBackendItem)
          .filter((item): item is HierarchyItem => item !== null);

        items.sort((a, b) => {
          if (a.Id > b.Id) return 1;
          if (a.Id < b.Id) return -1;
          return 0;
        });

        return items;
      })
    );
  }

  createItems(
    createAction: string,
    hierarchyIds: Record<string, string | undefined>,
    selectedIds: string[]
  ): Observable<BackendResponse> {

    const atts: Array<{ name: string; value: string }> = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: createAction }
    ];

    Object.entries(hierarchyIds).forEach(([key, value]) => {
      if (value) atts.push({ name: key, value });
    });

    const keyName = this.getKeyForAction(createAction);
    if (keyName) {
      atts.push({ name: keyName, value: selectedIds.join(',') });
    }

    return this.post<BackendResponse>({ atts });
  }

  private getKeyForAction(action: string): string | null {
    const keyMap: Record<string, string> = {
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

  private post<T>(body: unknown): Observable<T> {
    const token = localStorage.getItem('tk');
    const headers = new HttpHeaders({
      'Authorization': `bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post<T>(this.API_URL, body, { headers });
  }
}
