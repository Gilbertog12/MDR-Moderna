import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface AvailableItem {
  id: string;
  descripcion: string;
  selected: boolean;
}

export interface AddItemRequest {
  level: 'RKA' | 'RKP' | 'RKS' | 'RKC' | 'RKT' | 'RKD' | 'RKR' | 'RKY';
  parentKeys: {
    areaId?: string;
    procesoId?: string;
    subprocesoId?: string;
    actividadId?: string;
    tareaId?: string;
    dimensionId?: string;
    riesgoId?: string;
  };
  selectedIds: string[];
  riskEvaluation?: {
    riesgoPuroP: string;
    riesgoPuroS: string;
    riesgoPuroC: string;
    riesgoResidualP: string;
    riesgoResidualS: string;
    riesgoResidualC: string;
  };
}

const LEVEL_CONFIG = {
  RKA: { listAction: 'AREA_LIST', createAction: 'AREA_CREATE', name: 'Área' },
  RKP: { listAction: 'PROCESO_LIST', createAction: 'PROCESO_CREATE', name: 'Proceso' },
  RKS: { listAction: 'SUBPROCESO_LIST', createAction: 'SUBPROCESO_CREATE', name: 'Subproceso' },
  RKC: { listAction: 'ACTIVIDAD_LIST', createAction: 'ACTIVIDAD_CREATE', name: 'Actividad' },
  RKT: { listAction: 'TAREA_LIST', createAction: 'TAREA_CREATE', name: 'Tarea' },
  RKD: { listAction: 'DIMENSION_LIST', createAction: 'DIMENSION_CREATE', name: 'Dimensión' },
  RKR: { listAction: 'RIESGO_LIST', createAction: 'RIESGO_CREATE', name: 'Riesgo' },
  RKY: { listAction: 'CONSECUENCIA_LIST', createAction: 'CONSECUENCIA_CREATE', name: 'Consecuencia' }
};

@Injectable({
  providedIn: 'root'
})
export class HierarchyManagementService {
  private http = inject(HttpClient);
  private readonly API_URL = '/MatrizRsk/api/values/generic';

  /**
   * Obtiene la lista de items disponibles para agregar
   */
  getAvailableItems(
    level: keyof typeof LEVEL_CONFIG,
    parentKeys: Record<string, string>,
    searchTerm?: string,
    pageIndex: number = 1
  ): Observable<AvailableItem[]> {
    const config = LEVEL_CONFIG[level];
    const atts: any[] = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: config.listAction },
      { name: 'areaId', value: parentKeys['areaId'] || '' },
      { name: 'procesoId', value: parentKeys['procesoId'] || '' },
      { name: 'subprocesoId', value: parentKeys['subprocesoId'] || '' },
      { name: 'actividadId', value: parentKeys['actividadId'] || '' },
      { name: 'tareaId', value: parentKeys['tareaId'] || '' },
      { name: 'dimensionId', value: parentKeys['dimensionId'] || '' },
      { name: 'riesgoId', value: parentKeys['riesgoId'] || '' }
    ];

    if (searchTerm) {
      atts.push({ name: 'lookupName', value: `%${searchTerm}` });
    }

    atts.push({ name: 'index', value: pageIndex.toString() });

    return this.http.post<any>(this.API_URL, { atts }).pipe(
      map(response => {
        if (!response.success || !response.data) {
          return [];
        }

        return response.data.map((item: any) => ({
          id: item.atts[0].value.trim(),
          descripcion: item.atts[2].value.trim(),
          selected: false
        })).sort((a: AvailableItem, b: AvailableItem) =>
          a.id.localeCompare(b.id)
        );
      })
    );
  }

  /**
   * Crea nuevos items en la jerarquía
   */
  createItems(request: AddItemRequest): Observable<any> {
    const config = LEVEL_CONFIG[request.level];
    const atts = this.buildCreateRequest(request, config.createAction);

    return this.http.post<any>(this.API_URL, { atts }).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Error al crear items');
        }
        return response;
      })
    );
  }

  /**
   * Construye la petición de creación según el nivel
   */
  private buildCreateRequest(request: AddItemRequest, action: string): any[] {
    const atts: any[] = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: action }
    ];

    const keys = request.parentKeys;
    const idsString = request.selectedIds.join(',');

    switch (request.level) {
      case 'RKA':
        atts.push({ name: 'areaId', value: idsString });
        break;
      case 'RKP':
        atts.push({ name: 'areaId', value: keys.areaId });
        atts.push({ name: 'procesoId', value: idsString });
        break;
      case 'RKS':
        atts.push({ name: 'areaId', value: keys.areaId });
        atts.push({ name: 'procesoId', value: keys.procesoId });
        atts.push({ name: 'subprocesoId', value: idsString });
        break;
      case 'RKC':
        atts.push({ name: 'areaId', value: keys.areaId });
        atts.push({ name: 'procesoId', value: keys.procesoId });
        atts.push({ name: 'subprocesoId', value: keys.subprocesoId });
        atts.push({ name: 'actividadId', value: idsString });
        break;
      case 'RKT':
        atts.push({ name: 'areaId', value: keys.areaId });
        atts.push({ name: 'procesoId', value: keys.procesoId });
        atts.push({ name: 'subprocesoId', value: keys.subprocesoId });
        atts.push({ name: 'actividadId', value: keys.actividadId });
        atts.push({ name: 'tareaId', value: idsString });
        break;
      case 'RKD':
        atts.push({ name: 'areaId', value: keys.areaId });
        atts.push({ name: 'procesoId', value: keys.procesoId });
        atts.push({ name: 'subprocesoId', value: keys.subprocesoId });
        atts.push({ name: 'actividadId', value: keys.actividadId });
        atts.push({ name: 'tareaId', value: keys.tareaId });
        atts.push({ name: 'dimensionId', value: idsString });
        break;
      case 'RKR':
        atts.push({ name: 'areaId', value: keys.areaId });
        atts.push({ name: 'procesoId', value: keys.procesoId });
        atts.push({ name: 'subprocesoId', value: keys.subprocesoId });
        atts.push({ name: 'actividadId', value: keys.actividadId });
        atts.push({ name: 'tareaId', value: keys.tareaId });
        atts.push({ name: 'dimensionId', value: keys.dimensionId });
        atts.push({ name: 'riesgoId', value: idsString });
        break;
      case 'RKY':
        atts.push({ name: 'areaId', value: keys.areaId });
        atts.push({ name: 'procesoId', value: keys.procesoId });
        atts.push({ name: 'subprocesoId', value: keys.subprocesoId });
        atts.push({ name: 'actividadId', value: keys.actividadId });
        atts.push({ name: 'tareaId', value: keys.tareaId });
        atts.push({ name: 'dimensionId', value: keys.dimensionId });
        atts.push({ name: 'riesgoId', value: keys.riesgoId });
        atts.push({ name: 'consecuenciaId', value: idsString });

        // RKY incluye evaluación de riesgos
        if (request.riskEvaluation) {
          atts.push({ name: 'riesgoPuroP', value: request.riskEvaluation.riesgoPuroP });
          atts.push({ name: 'riesgoPuroS', value: request.riskEvaluation.riesgoPuroS });
          atts.push({ name: 'riesgoPuroC', value: request.riskEvaluation.riesgoPuroC });
          atts.push({ name: 'riesgoResidualP', value: request.riskEvaluation.riesgoResidualP });
          atts.push({ name: 'riesgoResidualS', value: request.riskEvaluation.riesgoResidualS });
          atts.push({ name: 'riesgoResidualC', value: request.riskEvaluation.riesgoResidualC });
        }
        break;
    }

    return atts;
  }

  /**
   * Obtiene lista de probabilidades para RKY
   */
  getProbabilityList(): Observable<any[]> {
    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'RKM_LIST' }
    ];

    return this.http.post<any>(this.API_URL, { atts }).pipe(
      map(response => {
        if (!response.success) return [];
        return response.data.map((item: any) => ({
          id: item.atts[0].value.trim(),
          descripcion: item.atts[1].value
        }));
      })
    );
  }

  /**
   * Obtiene lista de severidades para RKY
   */
  getSeverityList(): Observable<any[]> {
    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'RKN_LIST' }
    ];

    return this.http.post<any>(this.API_URL, { atts }).pipe(
      map(response => {
        if (!response.success) return [];
        return response.data.map((item: any) => ({
          id: item.atts[0].value.trim(),
          descripcion: item.atts[1].value
        }));
      })
    );
  }

  /**
   * Calcula la criticidad basada en probabilidad y severidad
   */
  calculateCriticality(
    dimensionId: string,
    probabilityId: string,
    severityId: string
  ): Observable<any> {
    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'READ_CRITICIDAD' },
      { name: 'dimensionId', value: dimensionId },
      { name: 'severidadId', value: probabilityId },
      { name: 'probabilidadId', value: severityId }
    ];

    return this.http.post<any>(this.API_URL, { atts }).pipe(
      map(response => {
        if (!response.success || !response.data[0]) {
          return null;
        }
        return {
          id: response.data[0].atts[0].value.trim(),
          color: response.data[0].atts[1].value
        };
      })
    );
  }

  /**
   * Obtiene detalles de probabilidades para modal auxiliar
   */
  getProbabilityDetails(): Observable<any[]> {
    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'CONSECUENCIA_PRO_LIST' }
    ];

    return this.http.post<any>(this.API_URL, { atts }).pipe(
      map(response => {
        if (!response.success) return [];
        return response.data.map((item: any) => ({
          id: item.atts[1].value,
          descripcion: item.atts[2].value,
          valoracion: item.atts[3].value,
          cualitativo: item.atts[4].value,
          cuantitativo: item.atts[5].value,
          selected: false
        }));
      })
    );
  }

  /**
   * Obtiene detalles de severidades para modal auxiliar
   */
  getSeverityDetails(): Observable<any[]> {
    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'CONSECUENCIA_SEV_LIST' }
    ];

    return this.http.post<any>(this.API_URL, { atts }).pipe(
      map(response => {
        if (!response.success) return [];
        return response.data.map((item: any) => ({
          id: item.atts[1].value,
          descripcion: item.atts[2].value,
          danosPersonas: item.atts[3].value,
          medioAmbiente: item.atts[4].value,
          interrupcionOperacion: item.atts[5].value,
          reputacionSocial: item.atts[6].value,
          legal: item.atts[7].value,
          selected: false
        }));
      })
    );
  }

  /**
   * Obtiene el nombre legible del nivel
   */
  getLevelName(level: keyof typeof LEVEL_CONFIG): string {
    return LEVEL_CONFIG[level]?.name || level;
  }
}
