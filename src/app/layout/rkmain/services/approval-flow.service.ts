import { AlertService } from './../../../shared/services/alert.service';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import Swal2 from 'sweetalert2';
import { Router } from '@angular/router';
import { DashboardData, TipoStatusPendiente, PendingItem, STATUS_MAP, TableroListResponse, PendienteValidarListResponse } from '../../../shared/models/approval_flow.interface';


/**
 * ApprovalFlowService - Servicio para manejo de flujos de aprobación
 *
 * ESTRUCTURA:
 * 1. Métodos Legacy (existentes, ya probados)
 * 2. Métodos del Dashboard (nuevos)
 * 3. Métodos de Items (nuevos)
 * 4. Métodos de Acciones (nuevos)
 * 5. Métodos Helper Privados (nuevos)
 */
@Injectable({
  providedIn: 'root'
})
export class ApprovalFlowService {

  private apiUrl = '/MatrizRsk/api/values/generic';
  private alertService = inject(AlertService);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // ==================== MÉTODOS LEGACY (MANTENER TAL CUAL) ====================

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': 'bearer ' + localStorage.getItem('tk')
    });
  }

  /**
   * Método generic limpio del legacy
   * ✅ MANTENER - Es la base para todos los requests
   */
  generic(atts: any[]): Observable<any> {
    const body = { atts };
    return this.http.post<any>(this.apiUrl, body, { headers: this.getHeaders() });
  }

  /**
   * Determina qué botón mostrar según permisos y estado
   * ✅ MANTENER - Lógica de permisos ya probada
   */
  botonesFlujoAprobacion(parametros: string[]): string {
    const [allow, statusId, canAdd] = parametros;

    console.log('🔍 botonesFlujoAprobacion - Input:', { allow, statusId, canAdd });

    // Estados donde NO se muestran botones (flujo terminado/archivado)
    if (statusId === '008' || statusId === '009' || statusId === '010') {
      console.log('❌ Estado de flujo terminado, no mostrar botones');
      return '';
    }

    if (!allow || allow.trim() === '') {
      console.log('❌ Allow está vacío');
      return '';
    }



    // Administrador puede todo
    if (allow.includes('administrador')) {
      if (statusId === '004') return 'validar';
      if (statusId === '007') return 'aprobar';
      if (statusId === '001' || statusId === '002' || statusId === '006') return 'enviar-validar';
    }

    // Creador
    if (allow.includes('creacion') && canAdd === 'Y') {
      if (statusId === '001' || statusId === '002' || statusId === '006') return 'enviar-validar';
    }

    // Validador
    if (allow.includes('validacion')) {
      if (statusId === '004') return 'validar';
    }

    // Aprobador
    if (allow.includes('aprobacion') || allow.includes('aprobador')) {
      if (statusId === '007') return 'aprobar';
    }

    console.log('❌ No hay coincidencias para mostrar botones');
    return '';
  }

  /**
   * Mensaje de flujo limpio del legacy
   * ✅ MANTENER - Ya funciona bien
   */
  mensajeFlujoAprobacion(titulo: string): void {
    Swal2.fire({
      title: titulo,
      text: 'Verifique en el icono de notificaciones, que la solicitud ha sido ejecutada exitosamente',
      imageUrl: 'assets/images/notificacion.png',
      imageWidth: 150,
      imageHeight: 150,
      imageAlt: 'Notificacion',
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500
    });

    this.router.navigate(['/rkmain']);
  }

  /**
   * Generar reporte limpio del legacy
   * ✅ MANTENER - Ya usa la acción correcta del backend
   */
  generarReporte(key: string): Observable<any> {
    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'SEND_REPORT_MDR' },
      { name: 'key', value: key }
    ];

    return this.generic(atts);
  }

  // ==================== MÉTODOS DEL DASHBOARD (NUEVOS) ====================

  /**
   * Obtiene los contadores del dashboard de flujo de aprobación
   * 🆕 NUEVO - Para el modal de dashboard
   */
  getContadores(key: string, status: string): Observable<DashboardData> {
    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'TABLERO_LIST' },
      { name: 'status', value: status },
      { name: 'key', value: key }
    ];

    return this.generic(atts).pipe(
      map(response => this.mapearContadores(response, status))
    );
  }

  /**
   * Envía items a validar (acción global del dashboard)
   * 🆕 NUEVO - Para botón "Enviar a Validar" del dashboard
   */
  async enviarAValidarGlobal(key: string, status: string): Promise<void> {
    try {
      // 1. Obtener UUID para la validación
      const uuid = await this.getPendingValidationUuid(key, status, 'IV');

      // 2. Ejecutar envío
      const atts = [
        { name: 'scriptName', value: 'coemdr' },
        { name: 'action', value: 'SEND_VALIDATE' },
        { name: 'onlyActualNode', value: 'Y' },
        { name: 'uuid', value: uuid }
      ];

      const response = await firstValueFrom(this.generic(atts));

      if (!response.success) {
        throw new Error(response.message || 'Error al enviar a validar');
      }

      // 3. Mostrar mensaje de éxito (usa método legacy)
      this.mensajeFlujoAprobacion('Envío a Validación en Proceso');

    } catch (error: any) {
      throw new Error(error.message || 'Error al enviar a validar');
    }
  }

  // ==================== MÉTODOS DE ITEMS (NUEVOS) ====================

  /**
   * Obtiene la lista de items pendientes según el tipo
   * 🆕 NUEVO - Para los modales de items (EV, RE, IV, IA)
   */
  getItemsPendientes(
    key: string,
    status: string,
    tipo: TipoStatusPendiente,
    empezarDesde: number = 0
  ): Observable<PendingItem[]> {
    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'PENDIENTE_VALIDAR_LIST' },
      { name: 'status', value: STATUS_MAP[tipo] },
      { name: 'key', value: key },
      { name: 'statusItem', value: status },
      { name: 'showCompleted', value: 'Y' },
      { name: 'empezarDesde', value: empezarDesde.toString() }
    ];

    // Para tipo EV (Pendientes), agregar soloNodos
    if (tipo === 'EV') {
      atts.push({ name: 'soloNodos', value: 'Y' });
    }

    return this.generic(atts).pipe(
      map(response => this.mapearItems(response))
    );
  }

  // ==================== MÉTODOS DE ACCIONES (NUEVOS) ====================

  /**
   * Valida los items seleccionados
   * 🆕 NUEVO - Para modal "Por Validar" (IV → IA)
   */
  async validarItems(keys: string[]): Promise<void> {
    if (!keys || keys.length === 0) {
      throw new Error('Debe seleccionar al menos un item para validar');
    }

    try {
      const firstKey = keys[0];
      const uuid = await this.obtenerUuidParaValidacion(firstKey, '004');

      const atts = [
        { name: 'scriptName', value: 'coemdr' },
        { name: 'action', value: 'VALIDATE' },
        { name: 'onlyActualNode', value: 'Y' },
        { name: 'uuid', value: uuid }
      ];

      const response = await firstValueFrom(this.generic(atts));

      if (!response.success) {
        throw new Error(response.message || 'Error al validar items');
      }

      this.mensajeFlujoAprobacion('Validación');

    } catch (error: any) {
      throw new Error(error.message || 'Error al validar items');
    }
  }

  /**
   * Aprueba los items seleccionados con comentarios editados
   * 🆕 NUEVO - Para modal "Por Aprobar" (IA → Aprobado)
   */
  async aprobarItems(keys: string[], comentarios: { [key: string]: string }): Promise<void> {
    if (!keys || keys.length === 0) {
      throw new Error('Debe seleccionar al menos un item para aprobar');
    }

    try {
      const firstKey = keys[0];
      const uuid = await this.obtenerUuidParaValidacion(firstKey, '007');

      const atts = [
        { name: 'scriptName', value: 'coemdr' },
        { name: 'action', value: 'VALIDATE' },
        { name: 'onlyActualNode', value: 'Y' },
        { name: 'uuid', value: uuid }
      ];

      const response = await firstValueFrom(this.generic(atts));

      if (!response.success) {
        throw new Error(response.message || 'Error al aprobar items');
      }

      this.mensajeFlujoAprobacion('Aprobación');

    } catch (error: any) {
      throw new Error(error.message || 'Error al aprobar items');
    }
  }

  /**
   * Rechaza los items seleccionados con una razón
   * 🆕 NUEVO - Para modales "Por Validar" (IV) y "Por Aprobar" (IA)
   */
  async rechazarItems(keys: string[], razon: string): Promise<void> {
    if (!keys || keys.length === 0) {
      throw new Error('Debe seleccionar al menos un item para rechazar');
    }

    if (!razon || razon.trim().length === 0) {
      throw new Error('Debe ingresar una razón para el rechazo');
    }

    try {
      const firstKey = keys[0];
      const uuid = await this.obtenerUuidParaValidacion(firstKey, '004');

      const atts = [
        { name: 'scriptName', value: 'coemdr' },
        { name: 'action', value: 'VALIDATE' },
        { name: 'onlyActualNode', value: 'Y' },
        { name: 'uuid', value: uuid },
        { name: 'approveInd', value: 'U' },
        { name: 'comments', value: razon }
      ];

      const response = await firstValueFrom(this.generic(atts));

      if (!response.success) {
        throw new Error(response.message || 'Error al rechazar items');
      }

      this.mensajeFlujoAprobacion('Rechazo');

    } catch (error: any) {
      throw new Error(error.message || 'Error al rechazar items');
    }
  }

  /**
   * Restaura items rechazados
   * 🆕 NUEVO - Para modal "Items Rechazados" (RE)
   */
  async restaurarItems(keys: string[]): Promise<void> {
    if (!keys || keys.length === 0) {
      throw new Error('Debe seleccionar al menos un item para restaurar');
    }

    try {
      const firstKey = keys[0];
      const uuid = await this.obtenerUuidParaRestauracion(firstKey);

      const atts = [
        { name: 'scriptName', value: 'coemdr' },
        { name: 'action', value: 'VALIDATE' },
        { name: 'onlyActualNode', value: 'Y' },
        { name: 'uuid', value: uuid },
        { name: 'approveInd', value: 'R' }
      ];

      const response = await firstValueFrom(this.generic(atts));

      if (!response.success) {
        throw new Error(response.message || 'Error al restaurar items');
      }

      await this.alertService.success(
        'Restauración Exitosa',
        'Los items han sido restaurados correctamente'
      );

    } catch (error: any) {
      throw new Error(error.message || 'Error al restaurar items');
    }
  }

  // ==================== MÉTODOS HELPER PRIVADOS (NUEVOS) ====================

  /**
   * Mapea la respuesta del backend a la interfaz DashboardData
   * 🆕 NUEVO - Helper privado
   */
  private mapearContadores(response: TableroListResponse, status: string): DashboardData {
    if (!response.success || !response.data || response.data.length === 0) {
      return {
        ENVIAR_A_VALIDAR: 0,
        ENVIAR_A_VALIDAR_CONSTRUCCION: 0,
        RECHAZADO: 0,
        POR_VALIDAR: 0,
        POR_APROBAR: 0
      };
    }

    const atts = response.data[0].atts;

    // Verificar TIMEOUT
    if (atts[0]?.name === 'TIMEOUT') {
      const count = atts[0]?.value?.trim() || '0';
      throw new Error(
        `Número de items en Validación/Construcción excedido: ${count}. Baje de nivel en la jerarquía.`
      );
    }

    // Mapeo según el status del nodo
    if (status === '001' || status === '002' || status === '003' || status === '006') {
      return {
        ENVIAR_A_VALIDAR: parseInt(atts[1]?.value?.trim() || '0', 10),
        ENVIAR_A_VALIDAR_CONSTRUCCION: parseInt(atts[2]?.value?.trim() || '0', 10),
        RECHAZADO: parseInt(atts[3]?.value?.trim() || '0', 10),
        POR_VALIDAR: 0,
        POR_APROBAR: 0
      };
    } else if (status === '004') {
      return {
        ENVIAR_A_VALIDAR: 0,
        ENVIAR_A_VALIDAR_CONSTRUCCION: 0,
        RECHAZADO: 0,
        POR_VALIDAR: parseInt(atts[1]?.value?.trim() || '0', 10),
        POR_APROBAR: 0
      };
    } else if (status === '007') {
      return {
        ENVIAR_A_VALIDAR: 0,
        ENVIAR_A_VALIDAR_CONSTRUCCION: 0,
        RECHAZADO: 0,
        POR_VALIDAR: 0,
        POR_APROBAR: parseInt(atts[1]?.value?.trim() || '0', 10)
      };
    } else {
      return {
        ENVIAR_A_VALIDAR: 0,
        ENVIAR_A_VALIDAR_CONSTRUCCION: 0,
        RECHAZADO: 0,
        POR_VALIDAR: parseInt(atts[1]?.value?.trim() || '0', 10),
        POR_APROBAR: 0
      };
    }
  }

  /**
   * Mapea la respuesta del backend a un array de PendingItem
   * 🆕 NUEVO - Helper privado
   */
  private mapearItems(response: PendienteValidarListResponse): PendingItem[] {
    if (!response.success || !response.data || response.data.length === 0) {
      return [];
    }

    // Verificar TIMEOUT
    if (response.data[0]?.atts?.[0]?.name === 'TIMEOUT') {
      const count = response.data[0].atts[0].value?.trim() || '0';
      throw new Error(
        `Número de items en Validación/Construcción excedido: ${count}. Baje de nivel en la jerarquía.`
      );
    }

    const items: PendingItem[] = [];

    response.data.forEach(element => {
      if (!element.atts || element.atts.length === 0) {
        return;
      }

      const atts = element.atts;
      const key = atts[6]?.value?.trim() || '';
      const fecha = this.convertirFechaYHora(atts[5]?.value?.trim() || '');
      const rutaJerarquia = this.construirRutaJerarquia(key);
      const jerarquia = this.construirJerarquiaVisual(key);

      items.push({
        accion: atts[1]?.value?.trim() || '',
        entidad: atts[2]?.value?.trim() || '',
        id: atts[3]?.value?.trim() || '',
        descripcion: atts[4]?.value?.trim() || '',
        key: key,
        version: atts[7]?.value?.trim() || '',
        fecha: fecha,
        comentarios: atts[8]?.value?.trim() || '',
        status: atts[9]?.value?.trim() || '',
        jerarquia: jerarquia,
        rutaJerarquia: rutaJerarquia,
        check: false,
        bloqueo: false
      });
    });

    return items;
  }

  /**
   * Convierte la fecha del backend al formato MM/DD/YYYY HH:mm
   * 🆕 NUEVO - Helper privado
   */
  private convertirFechaYHora(valor: string): string {
    if (!valor || valor.length < 13) {
      return '';
    }

    const year = valor.substring(0, 4);
    const mes = valor.substring(4, 6);
    const dia = valor.substring(6, 8);
    const hora = valor.substring(9, 11);
    const min = valor.substring(11, 13);

    return `${mes}/${dia}/${year} ${hora}:${min}`;
  }

  /**
   * Construye la ruta jerárquica visual separada por guiones
   * 🆕 NUEVO - Helper privado
   */
  private construirRutaJerarquia(key: string): string {
    if (!key) return '';

    const longitud = key.length;
    const partes: string[] = [];

    switch (longitud) {
      case 2:
        partes.push(key.substring(0, 2));
        break;
      case 6:
        partes.push(key.substring(0, 2), key.substring(2, 6));
        break;
      case 10:
        partes.push(key.substring(0, 2), key.substring(2, 6), key.substring(6, 10));
        break;
      case 14:
        partes.push(key.substring(0, 2), key.substring(2, 6), key.substring(6, 10), key.substring(10, 14));
        break;
      case 18:
        partes.push(key.substring(0, 2), key.substring(2, 6), key.substring(6, 10), key.substring(10, 14), key.substring(14, 18));
        break;
      case 19:
        partes.push(key.substring(0, 2), key.substring(2, 6), key.substring(6, 10), key.substring(10, 14), key.substring(14, 18), key.substring(18, 19));
        break;
      case 23:
        partes.push(key.substring(0, 2), key.substring(2, 6), key.substring(6, 10), key.substring(10, 14), key.substring(14, 18), key.substring(18, 19), key.substring(19, 23));
        break;
      case 27:
        partes.push(key.substring(0, 2), key.substring(2, 6), key.substring(6, 10), key.substring(10, 14), key.substring(14, 18), key.substring(18, 19), key.substring(19, 23), key.substring(23, 27));
        break;
      case 31:
        partes.push(key.substring(0, 2), key.substring(2, 6), key.substring(6, 10), key.substring(10, 14), key.substring(14, 18), key.substring(18, 19), key.substring(19, 23), key.substring(23, 27), key.substring(27, 31));
        break;
    }

    return partes.join('-');
  }

  /**
   * Construye la jerarquía visual (nombre del nivel)
   * 🆕 NUEVO - Helper privado
   */
  private construirJerarquiaVisual(key: string): string {
    if (!key) return '';

    const longitud = key.length;

    switch (longitud) {
      case 2: return 'AREA';
      case 6: return 'PROCESO';
      case 10: return 'SUBPROCESO';
      case 14: return 'ACTIVIDAD';
      case 18: return 'TAREA';
      case 19: return 'DIMENSION';
      case 23: return 'RIESGO';
      case 27:
      case 31: return 'CONSECUENCIA';
      default: return '';
    }
  }

  /**
   * Obtiene el UUID necesario para ejecutar una acción de validación/aprobación
   * 🆕 NUEVO - Helper privado
   */
  private async getPendingValidationUuid(
    key: string,
    status: string,
    tipo: 'IV' | 'IA'
  ): Promise<string> {
    const tipoStatus = tipo === 'IV' ? 'IV' : 'IA';
    const statusItem = tipo === 'IV' ? '004' : '007';

    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'PENDIENTE_VALIDAR_LIST' },
      { name: 'status', value: tipoStatus },
      { name: 'key', value: key },
      { name: 'soloNodos', value: 'Y' },
      { name: 'statusItem', value: statusItem },
      { name: 'showCompleted', value: 'Y' },
      { name: 'empezarDesde', value: '0' }
    ];

    const response = await firstValueFrom(this.generic(atts));

    if (!response.success) {
      throw new Error('Error al obtener UUID de validación');
    }

    // Verificar TIMEOUT
    if (response.data?.[0]?.atts?.[0]?.name === 'TIMEOUT') {
      const count = response.data[0].atts[0].value?.trim();
      throw new Error(`Número de items excedido: ${count}`);
    }

    // Buscar el UUID
    const uuidElement = response.data?.find((element: any) =>
      element.atts?.some((att: any) => att.name === 'uuid')
    );

    if (!uuidElement) {
      throw new Error('No se encontró UUID en la respuesta');
    }

    const uuidAtt = uuidElement.atts.find((att: any) => att.name === 'uuid');
    return uuidAtt?.value || '';
  }

  /**
   * Obtiene el UUID necesario para validar o aprobar items
   * 🆕 NUEVO - Helper privado
   */
  private async obtenerUuidParaValidacion(key: string, statusItem: string): Promise<string> {
    const tipo = statusItem === '004' ? 'IV' : 'IA';

    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'PENDIENTE_VALIDAR_LIST' },
      { name: 'status', value: tipo },
      { name: 'key', value: key },
      { name: 'soloNodos', value: 'Y' },
      { name: 'statusItem', value: statusItem },
      { name: 'showCompleted', value: 'Y' },
      { name: 'empezarDesde', value: '0' }
    ];

    const response = await firstValueFrom(this.generic(atts));

    if (!response.success) {
      throw new Error('Error al obtener UUID para validación');
    }

    // Verificar TIMEOUT
    if (response.data?.[0]?.atts?.[0]?.name === 'TIMEOUT') {
      const count = response.data[0].atts[0].value?.trim();
      throw new Error(`Número de items excedido: ${count}`);
    }

    // Buscar el UUID
    const uuidElement = response.data?.find((element: any) =>
      element.atts?.some((att: any) => att.name === 'uuid')
    );

    if (!uuidElement) {
      throw new Error('No se encontró UUID en la respuesta');
    }

    const uuidAtt = uuidElement.atts.find((att: any) => att.name === 'uuid');
    return uuidAtt?.value || '';
  }

  /**
   * Obtiene el UUID necesario para restaurar items rechazados
   * 🆕 NUEVO - Helper privado
   */
  private async obtenerUuidParaRestauracion(key: string): Promise<string> {
    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'PENDIENTE_VALIDAR_LIST' },
      { name: 'status', value: 'RE' },
      { name: 'key', value: key },
      { name: 'soloNodos', value: 'Y' },
      { name: 'showCompleted', value: 'Y' },
      { name: 'empezarDesde', value: '0' }
    ];

    const response = await firstValueFrom(this.generic(atts));

    if (!response.success) {
      throw new Error('Error al obtener UUID para restauración');
    }

    // Buscar el UUID
    const uuidElement = response.data?.find((element: any) =>
      element.atts?.some((att: any) => att.name === 'uuid')
    );

    if (!uuidElement) {
      throw new Error('No se encontró UUID en la respuesta');
    }

    const uuidAtt = uuidElement.atts.find((att: any) => att.name === 'uuid');
    return uuidAtt?.value || '';
  }
}
