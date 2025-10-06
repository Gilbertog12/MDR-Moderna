import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TreeNode, TreeNodeApiResponse, HierarchyLevel } from '../components/tree-sidebar/tree-node.interface';
import { TreeNodeMapper } from '../components/tree-sidebar/tree-node.mapper';

@Injectable({
  providedIn: 'root'
})
export class HierarchyService {

   private http = inject(HttpClient);
  private apiUrl = '/MatrizRsk/api/values/generic';

  /**
   * Busca nodos de un nivel específico
   */
  searchNodes(level: HierarchyLevel, parentId: string = '', mostrarTodo: boolean = false): Observable<TreeNode[]> {
    const scriptName = level === 1 ? 'coersk' : 'coemdr';

    const atts = [
      { name: 'scriptName', value: scriptName },
      { name: 'action', value: 'SEARCH_NODE' },
      { name: 'level', value: level.toString() },
      { name: 'id', value: parentId }
    ];

    if (mostrarTodo && level === 1) {
      atts.push({ name: 'mostrarTodo', value: 'Y' });
    }

    return this.http.post<TreeNodeApiResponse>(
      this.apiUrl,
      { atts }, // ✅ Enviar como JSON
      { headers: this.getHeaders() }
    ).pipe(
      map(response => {
        if (!response.success) {
          console.error('Error al cargar nodos:', response.message);
          return [];
        }
        return TreeNodeMapper.fromApiResponse(response);
      })
    );
  }

  /**
   * Obtiene el detalle de un nodo específico
   */
  getNodeDetail(level: HierarchyLevel, ids: string[]): Observable<any> {
    const actions: Record<HierarchyLevel, string> = {
      1: 'AREA_READ',
      2: 'PROCESO_READ',
      3: 'SUBPROCESO_READ',
      4: 'ACTIVIDAD_READ',
      5: 'TAREA_READ',
      6: 'DIMENSION_READ',
      7: 'RIESGO_READ',
      8: 'CONSECUENCIA_READ'
    };

    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: actions[level] }
    ];

    const idNames = ['areaId', 'procesoId', 'subprocesoId', 'actividadId', 'tareaId', 'dimensionId', 'riesgoId', 'consecuenciaId'];
    ids.forEach((id, index) => {
      if (id) {
        atts.push({ name: idNames[index], value: id });
      }
    });

    return this.http.post<any>(this.apiUrl, { atts }, { headers: this.getHeaders() });
  }

  /**
   * Obtiene los hijos (tabla de riesgos) de un nodo
   */
  getNodeChildren(key: string): Observable<any> {
    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'ITEM_EVALRISK_DETAIL_READ' },
      { name: 'key', value: key }
    ];

    return this.http.post<any>(this.apiUrl, { atts }, { headers: this.getHeaders() });
  }

  /**
   * Elimina un nodo
   */
  deleteNode(level: HierarchyLevel, ids: string[], version: string, status: string, warning: boolean = false): Observable<any> {
    const actions: Record<HierarchyLevel, string> = {
      1: 'AREA_DELETE',
      2: 'PROCESO_DELETE',
      3: 'SUBPROCESO_DELETE',
      4: 'ACTIVIDAD_DELETE',
      5: 'TAREA_DELETE',
      6: 'DIMENSION_DELETE',
      7: 'RIESGO_DELETE',
      8: 'CONSECUENCIA_DELETE'
    };

    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: actions[level] }
    ];

    const idNames = ['areaId', 'procesoId', 'subprocesoId', 'actividadId', 'tareaId', 'dimensionId', 'riesgoId', 'consecuenciaId'];
    ids.forEach((id, index) => {
      if (id) {
        atts.push({ name: idNames[index], value: id });
      }
    });

    atts.push({ name: 'versionId', value: version });
    atts.push({ name: 'statusId', value: status });

    if (warning) {
      atts.push({ name: 'warning', value: 'Y' });
    }

    return this.http.post<any>(this.apiUrl, { atts }, { headers: this.getHeaders() });
  }

  /**
   * Copia un nodo
   */
  copyNode(targetKey: string, sourceKey: string): Observable<any> {
    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'COPIAR_NODO' },
      { name: 'nodoTo', value: targetKey },
      { name: 'nodoFrom', value: sourceKey }
    ];

    return this.http.post<any>(this.apiUrl, { atts }, { headers: this.getHeaders() });
  }

  /**
   * Reordena items
   */
  reorderItems(parentId: string, beforeItems: any[], afterItems: any[]): Observable<any> {
    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'REORDENAR_ITEM' },
      { name: 'parentId', value: parentId },
      { name: 'procesoId', value: JSON.stringify(beforeItems) },
      { name: 'afterItems', value: JSON.stringify(afterItems) }
    ];

    return this.http.post<any>(this.apiUrl, { atts }, { headers: this.getHeaders() });
  }

  /**
   * Genera reporte
   */
  generateReport(key: string): Observable<any> {
    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'GENERAR_REPORTE' },
      { name: 'key', value: key }
    ];

    return this.http.post<any>(this.apiUrl, { atts }, { headers: this.getHeaders() });
  }

  /**
   * Obtiene resumen de un nodo
   */
  getNodeSummary(key: string): Observable<any> {
    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'RESUMEN_NODO' },
      { name: 'key', value: key }
    ];

    return this.http.post<any>(this.apiUrl, { atts }, { headers: this.getHeaders() });
  }

  /**
   * Obtiene headers con token de autorización
   */
  private getHeaders(): HttpHeaders {
  const token = localStorage.getItem('tk') || ''; // ✅ Cambiar 'token' por 'tk'
  console.log(token)
  return new HttpHeaders({
    'Content-Type': 'application/json',
    'Authorization': `bearer ${token}` // ✅ Minúscula 'bearer' como en legacy
  });
}

  /**
   * Extrae IDs de una key jerárquica
   */
  extractIdsFromKey(key: string, level: HierarchyLevel): string[] {
    const ids: string[] = [];

    switch (level) {
      case 1:
        ids.push(key.substring(0, 2));
        break;
      case 2:
        ids.push(key.substring(0, 2), key.substring(2, 6));
        break;
      case 3:
        ids.push(key.substring(0, 2), key.substring(2, 6), key.substring(6, 10));
        break;
      case 4:
        ids.push(key.substring(0, 2), key.substring(2, 6), key.substring(6, 10), key.substring(10, 14));
        break;
      case 5:
        ids.push(key.substring(0, 2), key.substring(2, 6), key.substring(6, 10), key.substring(10, 14), key.substring(14, 18));
        break;
      case 6:
        ids.push(key.substring(0, 2), key.substring(2, 6), key.substring(6, 10), key.substring(10, 14), key.substring(14, 18), key.substring(18, 19));
        break;
      case 7:
        ids.push(key.substring(0, 2), key.substring(2, 6), key.substring(6, 10), key.substring(10, 14), key.substring(14, 18), key.substring(18, 19), key.substring(19, 23));
        break;
      case 8:
        ids.push(key.substring(0, 2), key.substring(2, 6), key.substring(6, 10), key.substring(10, 14), key.substring(14, 18), key.substring(18, 19), key.substring(19, 23), key.substring(23, 27));
        break;
    }

    return ids;
  }


  executeGenericAction(body: any): Observable<any> {
  return this.http.post<any>(this.apiUrl, body, { headers: this.getHeaders() });
}
}
